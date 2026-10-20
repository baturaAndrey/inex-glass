# Деплой Inex Glass: runbook

Файлы: `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`, `src/app/api/health/route.ts`, `e2e/health.spec.ts`.

## 1. Архитектура

Образ собирается **один раз** и дальше только продвигается по окружениям:

```
push в main ─► workflow "CI" (lint, typecheck, test, build, e2e)
                  │ только при conclusion == success (workflow_run)
                  ▼
               workflow "Docker": docker build (target runner + tools)
                  │
                  ▼
               GHCR: ghcr.io/<owner>/inex-glass:sha-<commit>        (runner)
                     ghcr.io/<owner>/inex-glass:sha-<commit>-tools  (seed/импорт)
                  │
                  ▼ Dokploy API (saveDockerProvider → deploy)
               Dokploy (Docker Swarm) + Traefik ─► staging (dev.inexglass.ru)

git tag vX.Y.Z на тот же коммит ─► тот же digest перетегируется в :vX.Y.Z
                  │ (подтверждение в GitHub Environment "production")
                  ▼
               Dokploy ─► prod (inexglass.ru)
```

- `next build` идёт без БД и без секретов: `src/lib/env.ts` в фазе сборки подставляет инертные заглушки `DATABASE_URL`/`PAYLOAD_SECRET`. Все настройки окружения — только runtime env в Dokploy; один образ работает и на staging, и на prod.
- Миграции **не** запускаются при сборке. Payload применяет их (`prodMigrations`) при первой инициализации `getPayload()`. Инициализация ленивая, поэтому healthcheck `GET /api/health/` вызывает `getPayload()` и тем самым применяет миграции и запускает cron очереди задач (при `JOBS_ENABLED=true`).
- Staging выкатывается **только после зелёного CI**: workflow `Docker` запускается через `workflow_run` по завершении workflow `CI` (имя должно совпадать с `name:` в `.github/workflows/ci.yml`) и работает, только если `conclusion == success`, событие — `push` в `main` этого же репозитория (PR из форка с веткой `main` не деплоится). Собирается и тегируется ровно протестированный коммит `workflow_run.head_sha` (а не текущая голова `main`). Красный или отменённый CI → образ не собирается, staging не трогается.
- `workflow_dispatch` убран: ручной запуск обходил бы CI. Повторный деплой — перезапуск CI (Re-run) или откат в Dokploy (раздел 8).
- Тег `v*` можно ставить только на коммит, который уже собран из `main` (т.е. прошёл CI и staging). Иначе job `build` падает с ошибкой — пересборка дала бы другой digest.
- Prod деплоится **по тегу** `:vX.Y.Z`, а не по `image@sha256:…` — решение осознанное: в истории деплоев и списке Rollback Dokploy видны версии релизов. Тег создаётся один раз в job `build` из digest образа `sha-<commit>`, который уже работал на staging; job `deploy-prod` перед деплоем проверяет, что тег всё ещё указывает на этот digest (иначе падает), и пишет тег, digest и коммит в Job Summary.
- Права `GITHUB_TOKEN`: на уровне workflow — только `contents: read`; `packages: write` есть только у job `build` (сборка, push и тег релиза), `deploy-prod` — `packages: read` (проверка digest), `deploy-staging` — без прав.
- `GET /api/health/` → `200 {"status":"ok","release":"<git sha>"}` или `503 {"status":"error"}` (без деталей; причина пишется в лог контейнера). Слеш в конце обязателен (без него 308). `/api` не закрыт staging basic auth.

## 2. Приложения Dokploy

Проект `inex-glass`, в нём:

| Сервис                  | Тип                            | Примечание                                                           |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `inex-glass-staging`    | Application, source **Docker** | образ `ghcr.io/<owner>/inex-glass:sha-…` (выставляет CI)             |
| `inex-glass-prod`       | Application, source **Docker** | образ `ghcr.io/<owner>/inex-glass:vX.Y.Z` (выставляет CI), задача 41 |
| `inex-glass-staging-db` | Postgres 18                    | **отдельная** БД staging                                             |
| `inex-glass-prod-db`    | Postgres 18                    | **отдельная** БД prod (задача 41)                                    |

- Registry: в Dokploy → Registry добавить `ghcr.io` (username — GitHub-пользователь, password — classic PAT с `read:packages`). Тот же логин/PAT передаётся в секреты Actions `GHCR_PULL_USERNAME`/`GHCR_PULL_TOKEN`: `application.saveDockerProvider` требует учётные данные в каждом вызове.
- Порт контейнера: `3000`. Домен в Dokploy → Domains: host, port 3000, HTTPS, Let's Encrypt.
- Используемое API Dokploy (сверено с docs.dokploy.com/docs/api/reference-application; перед первым запуском сверить со Swagger своей инсталляции `<DOKPLOY_URL>/swagger`):
  - заголовок `x-api-key: <ключ из Settings → Profile → API/CLI>`;
  - `POST /api/application.saveDockerProvider` — `{applicationId, dockerImage, username, password, registryUrl}`;
  - `POST /api/application.deploy` — `{applicationId, title?, description?}`.
- Webhook приложения не используется: он передеплоивает уже сохранённый образ и не умеет закрепить конкретный `sha-…`.

## 3. Переменные окружения

| Имя                                                             | Пример                                                         | Staging                        | Prod                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------ |
| `SITE_ENV`                                                      | `staging`                                                      | `staging`                      | `production`                                                 |
| `SITE_URL`                                                      | `https://dev.inexglass.ru`                                     | поддомен staging               | `https://inexglass.ru`                                       |
| `DATABASE_URL`                                                  | `postgresql://user:pass@inex-glass-staging-db:5432/inex_glass` | своя БД                        | своя БД                                                      |
| `PAYLOAD_SECRET`                                                | `openssl rand -base64 48`                                      | свой                           | свой                                                         |
| `FORM_HMAC_SECRET`                                              | `openssl rand -base64 48`                                      | свой                           | свой                                                         |
| `ORDER_TOKEN_SECRET`                                            | `openssl rand -base64 48`                                      | свой                           | свой, **не ротировать** (смена ломает все ссылки `/zakaz/…`) |
| `STAGING_BASIC_AUTH`                                            | `inex:<пароль>`                                                | задать                         | не задавать                                                  |
| `MAIL_INTERCEPT_TO`                                             | `qa@example.ru`                                                | задать (вся почта уходит сюда) | не задавать                                                  |
| `JOBS_ENABLED`                                                  | `true`                                                         | `true`                         | `true` — **только на одном контейнере** (одна реплика)       |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | `smtp.yandex.ru`, `465`, …                                     | задать                         | задать                                                       |
| `UPLOADS_DIR`                                                   | `/data/lead-files`                                             | уже в образе                   | уже в образе                                                 |
| `MEDIA_DIR`                                                     | `/data/media`                                                  | уже в образе                   | уже в образе                                                 |
| `INDEXNOW_KEY`                                                  | `openssl rand -hex 16`                                         | не нужен                       | задать (задача 36/41)                                        |
| `PAYLOAD_DB_PUSH`                                               | —                                                              | **не задавать**                | **не задавать**                                              |

- `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`, `RELEASE_SHA` заданы в образе. `RELEASE_SHA` (build-arg из CI = тестированный коммит) объявлен только в стадиях `runner` и `tools`: он читается в рантайме (`/api/health/`), а стадия `build` от него не зависит, поэтому слой `next build` переиспользуется из кэша при неизменных исходниках.
- Ключи dev-инструментов (`KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`) в env staging/prod **не задаются** и в образ не попадают.
- `NEXT_PUBLIC_*` встраиваются при сборке — в Dokploy их задавать бесполезно.

## 4. Тома

Dokploy → приложение → Advanced → Volumes, тип **Volume** (named volume):

| Volume                        | Путь в контейнере  | Назначение                        |
| ----------------------------- | ------------------ | --------------------------------- |
| `inex-glass-<env>-media`      | `/data/media`      | медиатека Payload                 |
| `inex-glass-<env>-lead-files` | `/data/lead-files` | приватные файлы заявок            |
| `inex-glass-<env>-next-cache` | `/app/.next/cache` | кэш оптимизатора изображений Next |

Контейнер работает от `node` (uid 1000). Каталоги созданы в образе и принадлежат `node`; новый **named volume** при первом монтировании наследует владельца из образа, поэтому entrypoint с `chown` не нужен (проверено локально, см. «Результаты спайка»).

**Bind mount** (Mount type: Bind, каталог хоста) владельца из образа не наследует — каталог на хосте принадлежит root, и запись упадёт с `EACCES`. Если bind mount всё же нужен, один раз на хосте: `chown -R 1000:1000 /path/on/host`.

## 5. Домены и SSL

- Staging: A-запись поддомена (например, `dev.inexglass.ru`) на IP VDS → в Dokploy Domains: host `dev.inexglass.ru`, port `3000`, HTTPS, certificate Let's Encrypt.
- Staging закрыт basic auth (`STAGING_BASIC_AUTH`) и отдаёт noindex. `/api/*` и `/admin` basic auth не закрыты (у админки свой логин).
- Prod — задача 41: apex `inexglass.ru`, `www` → apex 301, HSTS через middleware Traefik.

## 6. Swarm: реплики, обновление, healthcheck

Одна реплика. Стратегия **stop-first**: старый контейнер останавливается до старта нового, поэтому миграции никогда не выполняют два контейнера одновременно (и `JOBS_ENABLED` активен ровно в одном). Цена — несколько секунд простоя при деплое.

Dokploy → приложение → Advanced → Cluster Settings / Swarm Settings. Длительности в наносекундах.

**Health Check**

```json
{
  "Test": ["CMD", "curl", "-fsS", "http://localhost:3000/api/health/"],
  "Interval": 15000000000,
  "Timeout": 5000000000,
  "StartPeriod": 90000000000,
  "Retries": 5
}
```

**Update Config**

```json
{
  "Parallelism": 1,
  "Delay": 10000000000,
  "FailureAction": "rollback",
  "Monitor": 30000000000,
  "MaxFailureRatio": 0,
  "Order": "stop-first"
}
```

**Rollback Config**

```json
{
  "Parallelism": 1,
  "Delay": 0,
  "FailureAction": "pause",
  "Monitor": 30000000000,
  "MaxFailureRatio": 0,
  "Order": "stop-first"
}
```

**Mode**

```json
{ "Replicated": { "Replicas": 1 } }
```

**Restart Policy**

```json
{ "Condition": "on-failure", "Delay": 5000000000, "MaxAttempts": 3 }
```

- `StartPeriod` 90 с (в образе 60 с) — запас на миграции на «холодной» БД и медленный диск VDS. Если миграция дольше — увеличить, иначе Swarm убьёт контейнер посреди миграции.
- **Требование (отдельная доработка, не в задаче 03):** обернуть применение миграций в `pg_advisory_lock`, чтобы защититься от параллельного запуска при ручном scale или ошибочной `start-first` конфигурации.

## 7. Правило миграций: только expand/contract

Откат образа **не откатывает схему БД**. Поэтому:

- релиз N только **добавляет** (колонку nullable/с default, таблицу, индекс) и пишет код, который работает и со старой, и с новой схемой;
- удаление/переименование колонки — только в релизе N+1, когда ни один образ, на который возможен откат, её уже не читает;
- переименование = добавить новую → перенести данные → переключить код → удалить старую (в следующем релизе);
- миграции не запускаются на `next build`; создаются только `pnpm migrate:create` (никогда `push` на общей БД).

## 8. Откат

1. Dokploy → приложение → Deployments → выбрать предыдущий деплой (образ `sha-…` / `vX.Y.Z`) → Rollback. Либо вручную вписать предыдущий тег в Docker provider и нажать Deploy (GitHub Actions для отката не нужен).
2. Swarm сам откатывает обновление, если новый контейнер не стал healthy (`FailureAction: rollback`).

Когда откат **безопасен**: между версиями были только expand-миграции (новые таблицы/nullable колонки) — старый код их просто не видит.

Когда **небезопасен**: новая версия выполнила contract-миграцию (удалила/переименовала колонку, поменяла enum, перенесла данные без обратной совместимости). Тогда откат образа сломает старый код — нужен восстановленный из pre-deploy `pg_dump` бэкап (задача 41) или fix-forward. Перед релизом с contract-миграцией это явно отмечается в описании релиза.

## 9. Образ `tools`: seed и импорт

`ghcr.io/<owner>/inex-glass:sha-<commit>-tools` — полный `node_modules`, исходники и `tsx`; в Dokploy не деплоится. Запуск на VDS в сети Postgres (env-файл на сервере, права 600, не в git):

```bash
docker run --rm --env-file /root/inex-glass-staging.env \
  --network dokploy-network \
  -v inex-glass-staging-media:/data/media \
  ghcr.io/<owner>/inex-glass:sha-<commit>-tools pnpm seed --full
```

- В `--env-file`: `NODE_ENV=production`, `DATABASE_URL` (хост — имя сервиса Postgres в сети Dokploy), `PAYLOAD_SECRET`, `FORM_HMAC_SECRET`, `ORDER_TOKEN_SECRET`, `SITE_URL`, `SITE_ENV`. Ключи dev-инструментов — только если скрипту они действительно нужны (например, импорт через Firecrawl), и только на время запуска.
- Медиа пишутся в `/data/media` — монтировать тот же volume, что у приложения.
- Альтернатива: SSH-туннель к Postgres (`ssh -L 5433:<ip контейнера БД>:5432 root@vds`) и запуск `pnpm seed` локально с `DATABASE_URL=…@localhost:5433/…` (медиафайлы тогда окажутся локально — для импорта с медиа предпочтителен запуск на VDS).
- `JOBS_ENABLED` в tools не задавать.

## 10. Секреты GitHub Actions и первый запуск staging

Secrets (Settings → Secrets and variables → Actions; можно на уровне environments `staging`/`production`):

| Секрет                   | Значение                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| `DOKPLOY_URL`            | `https://<dokploy-host>` без слеша в конце                       |
| `DOKPLOY_API_KEY`        | Dokploy → Settings → Profile → API/CLI                           |
| `DOKPLOY_STAGING_APP_ID` | applicationId `inex-glass-staging` (из URL приложения в Dokploy) |
| `DOKPLOY_PROD_APP_ID`    | applicationId `inex-glass-prod` (задача 41)                      |
| `GHCR_PULL_USERNAME`     | GitHub-пользователь владельца PAT                                |
| `GHCR_PULL_TOKEN`        | classic PAT, scope `read:packages`                               |

Variables: `STAGING_URL` (`https://dev.inexglass.ru`), `PROD_URL` (`https://inexglass.ru`).

Пока `DOKPLOY_API_KEY` пуст, workflow только собирает и публикует образ; шаги деплоя пропускаются с notice. Публикация в GHCR использует встроенный `GITHUB_TOKEN` (`packages: write` только у job `build`), отдельный токен не нужен.

**Чек-лист первого запуска staging (выполняет человек):**

1. Push в `main` → дождаться зелёного workflow `CI`, затем job `build` workflow `Docker`; в GHCR появится пакет `inex-glass` (приватный).
2. Dokploy: создать проект `inex-glass`, Registry `ghcr.io` (PAT `read:packages`).
3. Dokploy: создать Postgres 18 `inex-glass-staging-db`, взять internal connection URL.
4. Dokploy: создать Application `inex-glass-staging`, Provider = Docker, image `ghcr.io/<owner>/inex-glass:sha-<commit>` из шага 1, registry GHCR.
5. Env приложения — по таблице раздела 3 (секреты генерировать: `openssl rand -base64 48`; staging и prod — разные).
6. Volumes — раздел 4; Swarm Settings — JSON из раздела 6; Domains — раздел 5 (DNS A-запись поддомена на IP VDS заранее).
7. Deploy вручную; проверить `curl -fsS https://dev.inexglass.ru/api/health/` → `{"status":"ok",...}`; в логах — применение baseline-миграции.
8. Создать первого администратора на `https://dev.inexglass.ru/admin/`.
9. Загрузить картинку в медиатеку (проверка sharp и записи в `/data/media`).
10. Добавить секреты/variables Actions из таблицы выше; push в `main` → проверить, что job `deploy-staging` выкатил новый `sha-…` и smoke зелёный.
11. GitHub → Settings → Environments: `staging` (без ограничений), `production` (required reviewers) — задача 41.

## 11. Базовый образ и контекст сборки

- Базовый образ закреплён по версии **и** digest индекса (multi-arch): `ARG NODE_IMAGE=node:24.22.0-slim@sha256:…` в `Dockerfile`. Обновление — осознанно (патчи безопасности Node/Debian): `docker buildx imagetools inspect node:24.X.Y-slim` → поле `Digest` → обновить `NODE_IMAGE` → staging. Пересобрать с другим образом разово: `--build-arg NODE_IMAGE=…`.
- `.dockerignore` исключает секреты, `.git`, `node_modules`, `.next`, артефакты тестов (`test-results`, `playwright-report`), документацию и `scripts/.cache` (локальный кэш генерации картинок, ≈ 57 МБ PNG) — в контекст сборки они не попадают. Каталог `e2e/` намеренно остаётся в контексте: `next build` проверяет типы во всех `**/*.ts` (tsconfig `include`), а `playwright.config.ts`, `scripts/test-db.ts` и `*.int.test.ts` импортируют `e2e/helpers` — без него стадия сборки падает с TS2307. Исключать каталоги с `.ts`/`.tsx`, которые входят в tsconfig, нельзя.
- Контракт `/api/health/` (200 `{"status":"ok","release":…}` без basic auth, `/api/health` → 308) закреплён e2e-тестом `e2e/health.spec.ts`.

## 12. Бэкапы (задача 41)

Заглушка, детали — в задаче 41:

- БД: ежедневный бэкап Dokploy в S3 в РФ (Yandex Object Storage / Selectel), хранение ≥ 14 дней;
- pre-deploy `pg_dump` перед каждым prod-деплоем (закомментированный шаг в `deploy-prod`);
- тома `/data/media` и `/data/lead-files`: регулярный бэкап в тот же S3;
- раз до запуска — проверочное восстановление из бэкапа.

## Результаты спайка (задача 03)

Проверено локально 20.10.2026 (Docker 29.4, контейнер против Postgres 18 из `docker-compose.yml`):

- Образ `runner` — 439 МБ (node:24-slim + curl; сейчас закреплён `node:24.22.0-slim@sha256:…`, раздел 11; standalone `node_modules` ≈ 45 МБ, из них libvips ≈ 18 МБ). Образ `tools` ≈ 2,8 ГБ (полный `node_modules`).
- Сборка идёт без БД и без секретов.
- Контейнер работает от `node` (uid 1000). Первый `GET /api/health/` применил baseline-миграцию (≈ 70 мс на пустой БД) и вернул `200 {"status":"ok"}`; Docker HEALTHCHECK → `healthy`. Перезапуск миграции повторно не запускает.
- Недоступная БД → `503 {"status":"error"}`, причина только в логе. Неудачная инициализация Payload не кэшируется: после восстановления БД healthcheck снова зелёный без рестарта.
- Payload сам создаёт базу из `DATABASE_URL`, если её нет (`autoDatabaseCreate`), — в Dokploy базу всё равно лучше создавать вместе с сервисом Postgres.
- `/api/health` без слеша → 308; `/admin/` → 200 (статика `/_next/static` отдаётся); на staging `/` без basic auth → 401, с ним → 200. Первый администратор создаётся через `/admin/`.
- sharp 0.35 (`@img/sharp-linux-x64`) работает внутри `output: "standalone"` (ресайз/кодирование проверены) без `serverExternalPackages`/`outputFileTracingIncludes`.
- Запись в `/data/media`, `/data/lead-files`, `/app/.next/cache` от `node` проходит. `scripts/docker-entrypoint.sh` не нужен: named volumes наследуют владельца из образа.
- `tools`: `pnpm` (corepack) запускается от `node` без повторной загрузки, `pnpm migrate:status` работает.
