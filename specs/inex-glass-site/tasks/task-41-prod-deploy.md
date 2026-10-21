# Task 41: Продакшен — Dokploy prod, домены, SSL, www→apex, HSTS, бэкапы, мониторинг, smoke

## Status

pending

## Wave

7

## Description

Подготовка и проведение выката на боевой домен **inexglass.ru**. Задача 03 уже создала `Dockerfile`, `.github/workflows/docker.yml` (сборка образа один раз → GHCR `sha-<commit>`; staging по `main`; prod по тегу `v*`), health-endpoint и черновик `docs/deploy.md`. Здесь они доводятся до продакшена: домены и SSL, редирект `www → apex`, HSTS, ежедневные бэкапы БД и томов в S3 в РФ, **обязательный pg_dump перед каждым прод-деплоем**, мониторинг, smoke-проверки и финальный runbook. Часть шагов выполняется только человеком в панели Dokploy/у регистратора/DNS — в задаче они чётко отделены от того, что делает агент (изменения в репозитории: workflow, скрипты, документация).

## Dependencies

**Depends on:** task-03-docker-deploy-spike.md, task-36-sitemap-robots-indexnow.md, task-37-inex-import.md (по сути — вся волна 6: контент готов к выкату; staging уже развёрнут)
**Blocks:** task-42-final-acceptance.md

**Context from dependencies:**
- task-03 создал: `Dockerfile` (multi-stage: deps/build/runner/tools; Node 24; `output: 'standalone'`; non-root `node`; `curl` для healthcheck; `chown` на `/data/media`, `/data/lead-files`, `.next/cache`), `.dockerignore`, `src/app/api/health/route.ts` (`getPayload()` + `SELECT 1` — при вызове запускает ленивую инициализацию Payload: миграции через `prodMigrations` и cron задач), `.github/workflows/docker.yml`, `docs/deploy.md` (Dokploy runbook: приложения prod/staging, сервис Postgres, env, volumes, домены, JSON настроек Swarm `UpdateConfig` stop-first и `FailureAction: rollback`, healthcheck `curl -f http://localhost:3000/api/health/` с `start_period`, бэкапы, откат, правило expand/contract, GHCR pull secret, запуск образа `tools` для seed/import).
- Staging развёрнут (поддомен, отдельная БД, `SITE_ENV=staging`, basic auth, `MAIL_INTERCEPT_TO`). Prod ещё не создан.
- Env-переменные (zod, `src/lib/env.ts`): `DATABASE_URL`, `PAYLOAD_SECRET`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `SITE_ENV`, `STAGING_BASIC_AUTH`, `SMTP_HOST/PORT/USER/PASS/FROM`, `MAIL_INTERCEPT_TO`, `UPLOADS_DIR=/data/lead-files`, `MEDIA_DIR=/data/media`, `FORM_HMAC_SECRET`, `ORDER_TOKEN_SECRET` (ключ ссылок `/zakaz/…`; смена инвалидирует все ссылки — не ротировать без необходимости), `JOBS_ENABLED`, `INDEXNOW_KEY`; dev-tools ключи (`KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`) в prod-образе и prod-env **отсутствуют**.
- Данные: загрузки заявок (`/data/lead-files`) содержат персональные данные — хранение на сервере в РФ (152-ФЗ, ТЗ §6.1).
- Первое наполнение: `pnpm seed --full` (task-16 и срезы 22–31) и импорт портфолио (task-37) выполняются из образа `tools`.

## Files to Create

- `scripts/ops/predeploy-dump.sh` — pg_dump перед деплоем (запускается на VDS через SSH по stdin).
- `scripts/ops/smoke-prod.ts` — автоматические проверки боевого домена (Node, без зависимостей кроме стандартных + `tls`).
- `scripts/ops/restore-check.sh` — проверка восстановления дампа во временную БД (для регулярной проверки бэкапов).
- `docs/runbooks/prod-launch-checklist.md` — чек-лист запуска с пометками `[AGENT]` и `[ЧЕЛОВЕК]` (структура ниже). (Это операционный документ внутри `docs/`, не README.)

## Files to Modify

- `.github/workflows/docker.yml` — job деплоя на prod: environment `production` (ручное подтверждение), шаг pre-deploy dump, деплой, ожидание health, smoke, уведомление.
- `docs/deploy.md` — обновить: prod-настройки, домены/SSL/редирект/HSTS, S3-бэкапы (БД и тома), pre-deploy дамп, мониторинг, чек-листы, откат, ротация секретов, restore.
- `package.json` — **не менять**: алиас `smoke:prod` → `tsx scripts/ops/smoke-prod.ts` добавляет task-40, единственный редактор `package.json` в волне 7 (контракт той же волны). В `docker.yml` можно вызывать `pnpm smoke:prod` или напрямую `pnpm tsx scripts/ops/smoke-prod.ts`.
- `src/proxy.ts` — **только** если выбран запасной вариант HSTS (см. ниже) и согласовано с координатором.

НЕ трогать: прикладной код сайта, схему Payload, миграции, `Dockerfile` (если нужны правки образа — описать в отчёте, так как образ общий для staging и prod).

## Technical Details

### A. Что делает агент (изменения в репозитории)

#### A1. Скрипт `scripts/ops/predeploy-dump.sh`

Запускается на VDS: `ssh deploy@VDS 'bash -s' < scripts/ops/predeploy-dump.sh -- "$TAG"` (скрипт не требует установки на сервере).
- Параметры (env или позиционные): `PG_SERVICE_NAME` (имя Swarm-сервиса Postgres в Dokploy — берётся из `docs/deploy.md`/GitHub variable `PROD_PG_SERVICE`), `BACKUP_DIR` (по умолчанию `/var/backups/inex`), `RELEASE_TAG`, `KEEP` (по умолчанию 10).
- Логика: найти контейнер `docker ps -q --filter "label=com.docker.swarm.service.name=$PG_SERVICE_NAME" | head -n1`; если не найден — выход 2; `docker exec "$CID" sh -c 'pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$BACKUP_DIR/pre-$RELEASE_TAG-$(date -u +%Y%m%dT%H%M%SZ).dump"` (учётные данные берутся из окружения контейнера Postgres, пароль в логи не попадает); проверка: размер файла > 10 КБ и `pg_restore --list` (через `docker exec -i … pg_restore --list < файл`) выполняется без ошибок; ротация — оставить `KEEP` последних; права `umask 077`; вывод пути и размера; код выхода ≠ 0 при любой ошибке (деплой при этом **не продолжается**).
- Опциональная выгрузка в S3 (если на VDS установлен `rclone`/`aws` и заданы `S3_*`): копия дампа; отсутствие клиента не считается ошибкой, но выводится предупреждение.
- Скрипт идемпотентен, `set -euo pipefail`, без интерактива, без `sudo` (пользователь деплоя в группе `docker`).

#### A2. `.github/workflows/docker.yml` — прод-деплой

Структура job `deploy-prod` (триггер — push тега `v*`, `needs: [build]`, `environment: production`, `concurrency: deploy-prod`, без отмены):
1. **Гейт:** проверить, что образ `ghcr.io/<owner>/<repo>:sha-<commit тега>` существует (тот же digest, что прошёл staging) — `docker buildx imagetools inspect`; если тег указывает на коммит, образ которого не собирался — упасть. Образ НЕ пересобирать (ключевой принцип: один образ staging → prod). Проверка, что на staging этот SHA уже был развёрнут и smoke прошёл — через GitHub environment `staging` deployments либо через условие `needs: staging-smoke-ok` (если в task-03 уже есть job staging — переиспользуй).
2. **Ручное подтверждение:** GitHub Environment `production` с required reviewers (настраивает человек, см. B).
3. **Pre-deploy dump:** `ssh -o StrictHostKeyChecking=yes` (known_hosts из secret `PROD_SSH_KNOWN_HOSTS`) → `scripts/ops/predeploy-dump.sh`; секреты: `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY` (ключ только для этого пользователя, `command=` ограничение рекомендуется); при ошибке — стоп.
4. **Деплой:** вызвать механизм, уже использованный для staging в task-03 (Dokploy webhook или API). Для Dokploy API: заголовок `x-api-key: $DOKPLOY_API_KEY`, URL `$DOKPLOY_URL/api/...` — **эндпоинты и payload сверить в Swagger вашей инсталляции Dokploy (`$DOKPLOY_URL/swagger`) перед использованием** (обновление `dockerImage` приложения на `…:sha-<commit>` и последующий deploy/redeploy; в публичной документации точный формат не подтверждён, поэтому не угадывать — при расхождении описать в отчёте). Образ прод-приложения должен ссылаться на **конкретный `sha-` тег**, не на `latest`.
5. **Ожидание:** опрос `https://inexglass.ru/api/health/` каждые 10 с до 10 минут (учесть `start_period` и миграции) до `200`; таймаут → job падает, **автоматический откат выполняет Swarm** (`FailureAction: rollback`), агентом дополнительно в логе выводится инструкция ручного отката (предыдущий `sha-` тег).
6. **Smoke:** `pnpm smoke:prod` (`SMOKE_BASE_URL=https://inexglass.ru`); при падении — job красный, уведомление.
7. **Уведомление:** шаг-заглушка через `curl` в Telegram/почту, если заданы secrets `NOTIFY_TELEGRAM_TOKEN`/`NOTIFY_TELEGRAM_CHAT` (опционально, не ломает job при отсутствии).
- Никаких секретов в логах (`::add-mask::`), `permissions` минимальные (`contents: read`, `packages: read`).
- Хранить в GitHub variables: `PROD_PG_SERVICE`, `PROD_URL=https://inexglass.ru`.

#### A3. `scripts/ops/smoke-prod.ts`

Параметры: `SMOKE_BASE_URL` (по умолчанию `https://inexglass.ru`), `SMOKE_EXPECT_ENV=production`. Проверки (каждая — PASS/FAIL, итоговый код 1 при любом FAIL):
1. `http://inexglass.ru/` → 301/308 на `https://inexglass.ru/` (один шаг).
2. `https://www.inexglass.ru/` → 301 на `https://inexglass.ru/` (сохраняя путь: `/kontakty/`).
3. TLS: сертификат валиден, срок действия > 14 дней (`tls.connect`), цепочка доверенная; SAN содержит `inexglass.ru` и `www.inexglass.ru`.
4. Заголовок `Strict-Transport-Security` присутствует (`max-age ≥ 31536000`), `X-Frame-Options: SAMEORIGIN` на HTML, `X-Content-Type-Options: nosniff`.
5. `/api/health/` → 200, ответ JSON ok; `/admin/` → 200 (страница входа), без утечки стек-трейсов.
6. `/robots.txt` → 200, **не** содержит `Disallow: /` для `*` как единственного правила (запрет всего сайта = staging-конфиг); содержит `Sitemap: https://inexglass.ru/sitemap.xml` и `Clean-param`; `/sitemap.xml` → 200, число `<loc>` ≥ 30, все на `https://inexglass.ru`, нет `staging`.
7. Ключевые URL → 200, один `h1`, **нет** `noindex` (кроме 5/15/19 мм и служебных): `/`, `/zakalennoe-steklo/`, `/zakalennoe-steklo/10-mm/`, `/kak-zakazat/`, `/kontakty/`, `/raschet-stoimosti/`, `/obekty/`, `/blog/`.
8. `meta robots` на `/zakalennoe-steklo/5-mm/` = noindex; `/zakaz/xxxx/` → 404 или «ссылка недействительна» без индексации; `/poisk/` — noindex.
9. Нет признаков staging: отсутствует basic auth (`401`), нет `staging` в тексте/ссылках/canonical.
10. Создание заявки НЕ выполняется (smoke не пишет в боевую БД). Опционально `--with-lead` (по умолчанию выключено): тестовая заявка с пометкой `SMOKE` и последующим удалением вручную — не использовать на prod без человека.
11. Публичная загрузка: `OPTIONS/HEAD /api/upload/` доступен (не 404/502); проверка прав записи тома — через health (если health-endpoint проверяет запись в `UPLOADS_DIR`; если нет — отметить как ручной пункт).
12. Cookie-баннер присутствует на главной; в HTML до согласия нет скриптов `mc.yandex.ru` (Метрика только после «Принять»).
13. Скорость: TTFB главной < 800 мс (warn).

#### A4. `scripts/ops/restore-check.sh`

Восстанавливает указанный дамп (`$1`) во временную БД на отдельном контейнере `postgres:18` (`docker run --rm`, tmpfs), выполняет `pg_restore`, затем `SELECT count(*)` по `pages`, `leads`, `payload_migrations`; печатает результат и удаляет временный контейнер. Используется человеком раз в месяц и перед релизом (restore-drill).

#### A5. `docs/deploy.md` — финальный runbook (дополнить разделы)

1. Архитектура: VDS (РФ) → Dokploy (Traefik, Swarm) → приложение `inex-glass-prod` (Docker image из GHCR, 1 реплика) + Postgres 18 (сервис Dokploy, без публичного порта, только внутренняя сеть) + named volumes.
2. Prod env — полный список со значениями-образцами, **что обязательно отсутствует**: `STAGING_BASIC_AUTH`, `MAIL_INTERCEPT_TO`, dev-tools ключи; `SITE_ENV=production`; `SITE_URL=https://inexglass.ru`; `JOBS_ENABLED=true` (только в единственном prod-контейнере); `NODE_ENV=production`; секреты: `PAYLOAD_SECRET`, `FORM_HMAC_SECRET` и `ORDER_TOKEN_SECRET` — `openssl rand -base64 48` (свои для prod, не копировать со staging), `INDEXNOW_KEY` — `openssl rand -hex 16`.
3. Домены, SSL, www (см. B).
4. Бэкапы (см. B): расписания, хранилище, retention, restore-процедура, ежемесячный restore-drill.
5. Деплой/откат: теги `vX.Y.Z`, откат = передеплой предыдущего `sha-` образа; **expand/contract**: миграции прод-релиза N не удаляют колонки, нужные релизу N−1; деструктивные миграции — только следующим релизом после стабилизации.
6. Мониторинг и алерты (см. B).
7. Ротация секретов (`ORDER_TOKEN_SECRET` — только в крайнем случае: смена инвалидирует все ссылки `/zakaz/…`, после неё менеджеры перевыпускают ссылки активных заказов), обновление образов Postgres, продление сертификатов (автоматически Traefik/Let's Encrypt), мониторинг диска и логов (ротация docker-логов `json-file`: `max-size=10m`, `max-file=3` — в настройках демона Docker/Dokploy).
8. Аварийные сценарии: БД не поднялась после миграции; диск заполнен; сертификат не выпустился (проверить DNS и порт 80); нужен срочный откат; восстановление БД из S3.

#### A6. `docs/runbooks/prod-launch-checklist.md`

Чек-лист с блоками «До запуска / Запуск / После запуска (24 ч, 14 дней)» и пометками `[AGENT]` / `[ЧЕЛОВЕК]`, содержащий все пункты разделов A и B ниже (по одному чекбоксу на действие), плюс ссылки на другие отчёты (`docs/reports/acceptance.md`, `seo-audit.md`).

### B. Действия ЧЕЛОВЕКА (панели Dokploy / DNS / GitHub / внешние сервисы) — агент их НЕ выполняет

Пометка в чек-листе: `[ЧЕЛОВЕК]`. Агент может подготовить точные значения для вставки, но не имеет доступа к панелям.

1. **DNS у регистратора домена inexglass.ru:** A-запись `@` → IP VDS; `www` → CNAME на `inexglass.ru` (или A на тот же IP); (опционально CAA: `0 issue "letsencrypt.org"`); TTL 300 на время запуска. Подождать распространения: `dig +short inexglass.ru`, `dig +short www.inexglass.ru`.
2. **Dokploy — Postgres prod:** создать сервис Postgres 18 (не pgvector), сильный пароль, **без публикации порта**; внутренний хост вида `<appName>:5432` → `DATABASE_URL`.
3. **Dokploy — приложение prod:** тип Docker (image) → `ghcr.io/<owner>/inex-glass:sha-<commit>`; учётные данные GHCR (PAT с `read:packages`) в настройках registry; env из `docs/deploy.md`; **Mounts → Volume Mount (именованные тома!, не bind)**: `/data/media`, `/data/lead-files`, `/app/.next/cache`; Swarm-настройки (JSON из `docs/deploy.md`): `UpdateConfig {Order: stop-first, FailureAction: rollback, ...}`, `RollbackConfig`, healthcheck `curl -f http://localhost:3000/api/health/` (`StartPeriod` ≥ 90 с, интервал 30 с, retries 3), реплики = 1.
4. **Dokploy — домены:** добавить `inexglass.ru` (Container Port **3000**, HTTPS включён, Certificate = `letsencrypt`) и `www.inexglass.ru` (HTTPS, letsencrypt). Для `www`: Application → **Advanced → Redirects** → пресет **www → non-www** (в форме домена поля редиректа нет; по документации Dokploy редирект настраивается во вкладке Advanced → Redirects), сохранить. Проверка: `curl -sI https://www.inexglass.ru/kontakty/` → `301`, `Location: https://inexglass.ru/kontakty/`. Принудительный HTTP→HTTPS уже даёт middleware `redirect-to-https`.
5. **HSTS:** предпочтительно — Traefik-middleware `headers` (`stsSeconds: 31536000`, `stsIncludeSubdomains: true`, `stsPreload: false`) через Dokploy (Application → Advanced → Traefik, либо динамический файл Traefik в Dokploy File System) с привязкой к роутеру prod-домена (точный способ в разделе Traefik UI зависит от версии Dokploy — сверить по инсталляции). **Запасной вариант (если middleware подключить не удаётся):** агент добавляет заголовок `Strict-Transport-Security` в `proxy.ts` при `SITE_ENV === 'production'` (runtime-переменная; не в `next.config.ts`, где заголовки фиксируются на этапе сборки и сломали бы принцип «один образ — два окружения»). Сначала включить `max-age=300`, убедиться, что всё открывается по HTTPS, затем поднять до года. `preload` не включать.
6. **Первый запуск и наполнение:** деплой первого образа → дождаться health → открыть `https://inexglass.ru/admin/` и создать первого администратора (надёжный пароль, 2FA нет в Payload из коробки — хранить в менеджере паролей); создать пользователей-менеджеров; затем из образа `tools` (раздел docs/deploy.md «tools») запустить `pnpm seed --full` на prod-БД и (после решения заказчика) импорт портфолио (task-37) **с примонтированным `/data/media`**; проверить в админке `site-settings`: ID Метрики, верификации Вебмастера/Search Console, e-mail уведомлений, праздники, «21 год»; `contacts` и `requisites` — данные Inex.
7. **Бэкапы БД в S3 (РФ):** создать бакет в Yandex Object Storage или Selectel (приватный, шифрование на стороне сервера, lifecycle-правило хранения 30 дней — retention в Dokploy не настраивается, делается политикой бакета). Dokploy → Settings → **Destinations** → добавить S3 (endpoint, регион, ключи сервис-аккаунта с правом записи только в бакет; для Yandex endpoint `https://storage.yandexcloud.net`, регион `ru-central1`; для Selectel — endpoint из личного кабинета, проверить актуальный). Postgres → **Backup**: destination, имя БД, расписание cron `0 3 * * *` (ежедневно 03:00 по времени VDS), prefix `inex-glass/db/`, Enabled, нажать **Test** и убедиться, что файл появился в бакете.
8. **Бэкапы томов:** Application → **Volume Backups** (требуются именованные тома): отдельные расписания для `/data/lead-files` (ежедневно, cron `30 3 * * *`) и `/data/media` (ежедневно `0 4 * * *`), destination = тот же S3, prefix `inex-glass/volumes/`, опция **«Turn off container»** (Dokploy рекомендует включать ради консистентности): для ночного окна 03:30–04:30 включить для lead-files и media — приложение будет недоступно на время бэкапа (секунды–минуты), решение зафиксировать в чек-листе; если простой недопустим — выключить и принять риск неконсистентности файлов, записанных в момент бэкапа. Заявки содержат ПДн → бакет приватный, доступ только сервис-аккаунт.
9. **Pre-deploy дамп:** создать на VDS пользователя `deploy` (группа `docker`), добавить публичный SSH-ключ (ключ GitHub Actions), выложить known_hosts; в GitHub: Secrets `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`, `PROD_SSH_KNOWN_HOSTS`, `DOKPLOY_API_KEY`, `DOKPLOY_URL`, Variables `PROD_PG_SERVICE`, `PROD_URL`; Environment `production` с required reviewers.
10. **Restore-drill:** после первого S3-бэкапа скачать дамп и выполнить `scripts/ops/restore-check.sh`; результат записать в чек-лист.
11. **Мониторинг:** внешний uptime-монитор (например UptimeRobot / Uptime Kuma в Dokploy / Яндекс Cloud Monitoring) на `https://inexglass.ru/api/health/` (интервал 1 мин., ожидание 200, алерт в Telegram и e-mail) и на `https://inexglass.ru/` (ключевое слово «Inex Glass»); монитор срока сертификата (< 14 дней); алерт на заполнение диска VDS > 80% (Dokploy monitoring / node-exporter); логи — Dokploy Logs, при необходимости ротация docker-логов.
12. **Почта:** в DNS домена-отправителя настроить SPF/DKIM/DMARC для SMTP-провайдера (Яндекс 360 / Mail.ru), создать почтовый ящик отправителя; в prod-env заполнить `SMTP_*`; **проверить отсутствие `MAIL_INTERCEPT_TO`**; отправить тестовое письмо о заявке и о статусе заказа на реальный ящик (после чего удалить тестовые данные).
13. **Яндекс.Вебмастер и Search Console:** добавить сайт, подтвердить права токенами из `site-settings` (task-36), отправить sitemap, задать регион «Челябинск»; Яндекс.Метрика: счётчик с Вебвизором, ID в `site-settings`.
14. **Юридическое (152-ФЗ):** утверждённые юристом тексты политики и согласия; уведомление Роскомнадзора об обработке ПДн (оператор); хостинг БД и файлов в РФ — подтвердить расположение VDS.
15. **Включение IndexNow:** после прод-запуска включить `indexNowEnabled` в `site-settings` (task-36) и выполнить `pnpm tsx scripts/indexnow-all.ts` из образа `tools`.
16. **Редиректы inex.su → inexglass.ru** — вне проекта (команда inex.su), включать только после индексации новых страниц (`docs/inex/12-migration-inex-su.md`, порядок).

### C. Контроль безопасности перед запуском (агент проверяет по репозиторию и конфигам)

- В образе runner нет `.env`, dev-ключей, исходников tools; `docker history`/`docker run --rm image env` не содержит секретов.
- Админка Payload: `/admin/` не индексируется (robots), заголовок `X-Frame-Options: SAMEORIGIN`; включён `maxLoginAttempts` и `lockTime` в auth `users` (если нет в конфиге task-01 — зафиксировать как замечание координатору, не менять схему).
- Публичные API не раскрывают лишних коллекций: REST `/api/<collection>` для `leads`, `orders`, `lead-files`, `consent-log`, `rate-limits`, `search` недоступны анонимно (проверка `curl`, ожидается 401/403).
- Приватные файлы (`/data/lead-files`) не отдаются статикой; `/zakaz/<token>/docs/<id>/` — только с валидным токеном.

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck` проходят; `actionlint` (если доступен) на `.github/workflows/docker.yml` без ошибок.
- [ ] Workflow `docker.yml`: прод-деплой запускается только по тегу `v*`, использует тот же образ `sha-<commit>`, что и staging (без пересборки), требует ручного подтверждения environment `production`, делает pre-deploy дамп (падает при неудаче), ждёт health, запускает smoke.
- [ ] `scripts/ops/predeploy-dump.sh` проверен на локальном docker-контейнере Postgres (дамп создаётся, ротация работает, ошибки дают ненулевой код).
- [ ] `scripts/ops/smoke-prod.ts` запускается против staging-образа (с `SMOKE_EXPECT_ENV=staging` и инвертированными проверками индексации) и против локального `next start`; каждый пункт проверки A3 реализован и покрыт тестом/ручным прогоном.
- [ ] `docs/deploy.md` содержит полные разделы A5; `docs/runbooks/prod-launch-checklist.md` содержит все пункты A и B с пометками `[AGENT]`/`[ЧЕЛОВЕК]`.
- [ ] Человек подтвердил выполнение (отметки в чек-листе): DNS, Dokploy-приложение и Postgres, домены + SSL, редирект www→apex (проверка `curl`), HSTS, S3-бэкапы БД и томов (тестовый бэкап виден в бакете), restore-drill, мониторинг, почта (SPF/DKIM), Вебмастер/Search Console, GitHub secrets/environment.
- [ ] `pnpm smoke:prod` на боевом домене: все проверки PASS (результат приложить в `docs/reports/acceptance.md` задачей 42).
- [ ] В prod-env отсутствуют `MAIL_INTERCEPT_TO`, `STAGING_BASIC_AUTH` и dev-tools ключи; `SITE_ENV=production`; `JOBS_ENABLED=true` ровно на одном контейнере.

## Notes

- Премиум-модель для workflow/скриптов; документацию можно писать mid-tier моделью.
- Особо опасные ошибки запуска (внести в чек-лист жирным): оставить `MAIL_INTERCEPT_TO` или `SITE_ENV=staging` на prod (письма клиентов теряются / сайт закрыт noindex); использовать bind mount вместо named volume (нет бэкапа томов); публичный порт Postgres; пересборка образа для prod (другие бинарники, чем на staging); HSTS с `includeSubDomains` до проверки всех поддоменов (staging на поддомене — он под HTTPS, поэтому допустимо).
- Что НЕ подтверждено в документации и требует сверки на месте: точные имена эндпоинтов Dokploy API для смены образа/деплоя (Swagger инсталляции), способ подключения кастомного Traefik-middleware в вашей версии Dokploy, retention бэкапов (задаётся политикой бакета, не Dokploy), endpoint S3 у Selectel.
- Источники: Dokploy — Domains (https://docs.dokploy.com/docs/core/domains), Backups (https://docs.dokploy.com/docs/core/databases/backups), Volume Backups (https://docs.dokploy.com/docs/core/volume-backups).
- (Ревью волны 3) Postgres staging/prod: задать `max_locks_per_transaction=256` (в Dokploy — команда/параметры сервиса БД). Без этого `migrate:down` / откат миграции `content_schema` (~600 таблиц в одной транзакции) падает с «out of shared memory». На применение миграций не влияет.
- (Ревью волны 4) `src/lib/leads/client-ip.ts` берёт IP из `X-Forwarded-For` справа, с фолбэком на `X-Real-IP`/`unknown`. Проверить на staging, что Traefik/ingress передаёт реальный IP клиента (без SNAT); иначе все посетители попадут в одну корзину rate-limit. Зафиксировать число доверенных прокси.
- (Ревью волны 4) ISR catch-all `(site)/[...slug]` кэширует каждую неизвестную URL на диск (`.next/server/route-cache/APP_PAGE/…`, ~186 КБ на URL, включая боты вроде `/wp-login.php`) — рост без ограничений. Решить: custom `cacheHandler` с LRU-вытеснением, или ограниченный по размеру том/периодическая очистка, и/или отсечь очевидные сканер-пути (расширения `.php`, `wp-*`) до catch-all (например в `proxy.ts` → 404 без рендера). Зафиксировать в `docs/deploy.md`.
- (Ревью волны 6) Перед prod-прогоном скриптов:
  - `scripts/attach-generated-media.ts` пишет `draft:false` в опубликованные документы — перекрывает более новый черновик редактора; на prod — режим, который пропускает документы с черновиком новее опубликованной версии.
  - Импорт inex.su на prod невоспроизводим «как есть»: кэш Firecrawl, `scripts/.import-tmp/slugs.json` и индекс media в gitignore — запускать в `tools`-контейнере с примонтированными кэшем и `/data/media`, затем `fix-csv --check-db` против prod. Документировать `IMPORT_PROD_GUARD_HOSTS`. Проверить имена файлов фото на path traversal (`parse-objects.ts:138-144`: `%2F` декодируется после basename).
  - После импорта — `pnpm payload run scripts/reindex-search.ts` (полная переиндексация не атомарна: `src/lib/search/reindex.ts:357-365` — делать в окно низкой нагрузки; скрипт сбрасывает весь кэш сайта → холодный кэш).
  - `INDEXNOW_KEY` — проверить формат в `src/lib/env.ts` (regex 8–128 `[a-zA-Z0-9-]`). `sitemap.xml` при недоступной БД в рантайме отдаёт 200 только с `/` — отдавать 5xx.
  - `e2e/placeholder-media.spec.ts:67` в CI всегда skip (CI не запускает attach-скрипт).
