# Деплой Inex Glass: runbook

Файлы: `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`, `src/app/api/health/route.ts`, `e2e/health.spec.ts`, `scripts/ops/` (pre-deploy дамп, restore-drill, smoke). Чек-лист запуска prod: `docs/runbooks/prod-launch-checklist.md`.

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
               job deploy-prod: гейт staging → pg_dump на VDS → Dokploy ─► prod (inexglass.ru)
                                → ожидание health → smoke → уведомление
```

Прод-контур (задача 41):

```
Интернет ─► VDS в РФ: Traefik (Dokploy, :80/:443, Let's Encrypt, www→apex, HSTS)
                 │ dokploy-network (overlay)
                 ├─► inex-glass-prod     (Swarm, 1 реплика, образ GHCR, порт 3000)
                 │      тома: inex-glass-prod-media, -lead-files, -next-images (named)
                 └─► inex-glass-prod-db  (Postgres 18, БЕЗ публичного порта)
Бэкапы: Dokploy → S3 в РФ (БД ежедневно, тома ежедневно) + pre-deploy pg_dump на VDS (+ S3)
```

- `next build` идёт без БД и без секретов: `src/lib/env.ts` в фазе сборки подставляет инертные заглушки `DATABASE_URL`/`PAYLOAD_SECRET`. Все настройки окружения — только runtime env в Dokploy; один образ работает и на staging, и на prod.
- Миграции **не** запускаются при сборке. Payload применяет их (`prodMigrations`) при первой инициализации `getPayload()`. Инициализация ленивая, поэтому healthcheck `GET /api/health/` вызывает `getPayload()` и тем самым применяет миграции и запускает cron очереди задач (при `JOBS_ENABLED=true`).
- Staging выкатывается **только после зелёного CI**: workflow `Docker` запускается через `workflow_run` по завершении workflow `CI` (имя должно совпадать с `name:` в `.github/workflows/ci.yml`) и работает, только если `conclusion == success`, событие — `push` в `main` этого же репозитория (PR из форка с веткой `main` не деплоится). Собирается и тегируется ровно протестированный коммит `workflow_run.head_sha` (а не текущая голова `main`). Красный или отменённый CI → образ не собирается, staging не трогается.
- `workflow_dispatch` убран: ручной запуск обходил бы CI. Повторный деплой — перезапуск CI (Re-run) или откат в Dokploy (раздел 8).
- Тег `v*` можно ставить только на коммит, который уже собран из `main` (т.е. прошёл CI и staging). Иначе job `build` падает с ошибкой — пересборка дала бы другой digest.
- Prod деплоится **по тегу** `:vX.Y.Z`, а не по `image@sha256:…` — решение осознанное: в истории деплоев и списке Rollback Dokploy видны версии релизов. Тег создаётся один раз в job `build` из digest образа `sha-<commit>`, который уже работал на staging; job `deploy-prod` перед деплоем проверяет, что тег всё ещё указывает на этот digest (иначе падает), и пишет тег, digest и коммит в Job Summary.
- Права `GITHUB_TOKEN`: на уровне workflow — только `contents: read`; `packages: write` есть только у job `build` (сборка, push и тег релиза); `deploy-staging` — `contents: read` (checkout smoke-скрипта) и `deployments: write` (запись «staging проверен»; больше ни у одного job этого права нет); `staging-gate` — только `deployments: read`; `deploy-prod` — `contents: read` (checkout скриптов), `packages: read` (проверка digest).
- **Prod-деплой (job `deploy-prod`, задача 41)** по шагам: **гейт staging** (отдельный job `staging-gate` без environment — выполняется ДО запроса подтверждения, ревьюер не подтверждает заведомо непроходящий релиз) → (ожидание ручного подтверждения environment `production`) → проверка имени тега (`vX.Y.Z`, без спецсимволов) → checkout релизного коммита → проверка digest тега → проверка, что заданы все секреты/переменные (и что `PROD_PG_SERVICE` — допустимое имя `[a-zA-Z0-9_.-]`) → запоминание текущего образа (для подсказки отката) → **pre-deploy `pg_dump`** на VDS по SSH (`scripts/ops/predeploy-dump.sh`; ошибка = стоп, образ не переключается) → `saveDockerProvider` (с `--retry`: идемпотентен) + `deploy` (без `--retry`: повтор после таймаута/5xx мог бы запустить второй деплой; при ошибке — проверить Dokploy → Deployments и перезапустить job) → ожидание `/api/health/` с `release == <коммит>` до 10 минут → **smoke** (`scripts/ops/smoke-prod.ts`, тот же скрипт, что `pnpm smoke:prod`) → при падении — инструкция отката в Job Summary → уведомление в Telegram (если заданы секреты). `concurrency: deploy-prod` — два прод-деплоя никогда не идут параллельно, запущенный не отменяется.
- **Гейт staging:** после успешного health **и полного smoke** (`scripts/ops/smoke-prod.ts` с `SMOKE_EXPECT_ENV=staging`, `SMOKE_BASIC_AUTH` из секрета `STAGING_SMOKE_BASIC_AUTH`) job `deploy-staging` создаёт GitHub Deployment `environment=staging, task=smoke-ok, ref=<проверенный коммит>` со статусом `success`. Job `staging-gate` ищет такую запись для коммита тега и принимает только записи (и их статус), созданные `github-actions[bot]` — запись, созданную человеком через API, гейт не примет; нет записи — job падает («сначала выкатите коммит на staging»), `deploy-prod` не запускается и подтверждение не запрашивается. Автоматическая запись environment не годится: для `workflow_run` она пишет `github.sha` (голову `main`, а не проверенный коммит) и «успешна» даже при пропущенном деплое. Аварийного обхода в workflow нет намеренно: срочный фикс без staging — только вручную в Dokploy (раздел 8), с записью в журнале релизов.
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
- Дополнительно `deploy-prod` вызывает `GET /api/application.one?applicationId=…` только чтобы показать в подсказке отката, какой образ работал до деплоя (best effort: ошибка или иной формат ответа не ломают деплой). Формат ответа сверить в Swagger.
- Образ prod — тег релиза `:vX.Y.Z`, **не** `latest`. Тег неизменяем по процессу: создаётся один раз из digest образа `sha-<commit>`, прошедшего staging, и перед деплоем сверяется с этим digest (раздел 1). Это тот же образ, что `sha-<commit>`, — пересборки нет.

### Postgres (staging и prod)

- Сервис Dokploy Postgres **18** (обычный образ `postgres:18`, не pgvector), сильный пароль (`openssl rand -base64 32`), **External Port пустой** — без публикации порта на хост, доступ только из `dokploy-network` по внутреннему хосту `<appName>:5432`.
- **`max_locks_per_transaction=256`** (обязательно на staging и prod): схема ≈ 620 таблиц, и откат миграции `content_schema` (`migrate:down`) в одной транзакции без этого падает с `out of shared memory`. На применение миграций не влияет. В Dokploy: Postgres → Advanced → поле **Command** (или Args, зависит от версии): `postgres -c max_locks_per_transaction=256` → Save → Redeploy базы. Проверка: `docker exec $(docker ps -q -f label=com.docker.swarm.service.name=<pg-service>) psql -U "$POSTGRES_USER" -tAc 'show max_locks_per_transaction'` → `256`. Точное имя поля сверить на инсталляции.
- Имя Swarm-сервиса Postgres (для pre-deploy дампа) — `docker service ls` на VDS (обычно совпадает с appName базы в Dokploy, например `inex-glass-prod-db-xxxxxx`); записать в GitHub variable `PROD_PG_SERVICE`.

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

### Prod env целиком (задача 41)

Вставить в Dokploy → `inex-glass-prod` → Environment (значения-образцы; секреты сгенерировать **заново для prod**, не копировать со staging):

```dotenv
NODE_ENV=production
SITE_ENV=production
SITE_URL=https://inexglass.ru
DATABASE_URL=postgresql://<user>:<password>@<prod-db-appName>:5432/<db>
PAYLOAD_SECRET=<openssl rand -base64 48>
FORM_HMAC_SECRET=<openssl rand -base64 48>
ORDER_TOKEN_SECRET=<openssl rand -base64 48>
JOBS_ENABLED=true
INDEXNOW_KEY=<openssl rand -hex 16>
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_USER=<ящик-отправитель>
SMTP_PASS=<пароль приложения>
SMTP_FROM=Inex Glass <noreply@inexglass.ru>
```

- **Обязательно отсутствуют:** `STAGING_BASIC_AUTH`, `MAIL_INTERCEPT_TO` (иначе письма клиентов и менеджеров уходят на тестовый ящик), `PAYLOAD_DB_PUSH`, ключи dev-инструментов (`KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`). `SITE_ENV=staging` на prod закрывает сайт `noindex` и `Disallow: /` — smoke это ловит.
- `JOBS_ENABLED=true` — ровно один контейнер (одна реплика, stop-first). В env `tools` его не задавать.
- `INDEXNOW_KEY` проверяется при старте (`src/lib/env.ts`): ровно 32 hex-символа (регистр нормализуется). Ключ другого формата — приложение не стартует, health 503, Swarm откатывает деплой. Пустое значение = IndexNow выключен.
- `UPLOADS_DIR`, `MEDIA_DIR`, `PORT`, `HOSTNAME` уже заданы в образе.

- `NODE_ENV=production`, `PORT=3000`, `HOSTNAME=0.0.0.0`, `RELEASE_SHA` заданы в образе. `RELEASE_SHA` (build-arg из CI = тестированный коммит) объявлен только в стадиях `runner` и `tools`: он читается в рантайме (`/api/health/`), а стадия `build` от него не зависит, поэтому слой `next build` переиспользуется из кэша при неизменных исходниках.
- Ключи dev-инструментов (`KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`) в env staging/prod **не задаются** и в образ не попадают.
- `NEXT_PUBLIC_*` встраиваются при сборке — в Dokploy их задавать бесполезно.
- `ORDER_TOKEN_SECRET` — ключ HMAC ссылок `/zakaz/<токен>/` (`src/lib/orders/access-token.ts`): токен не хранится, а выводится из секрета, id заказа и `tokenCreatedAt`. Не ротировать без необходимости: после смены все выданные ссылки перестают работать — перевыпустить ссылки активных заказов (кнопка «Перевыпустить» в заказе, задача 33) и при необходимости отправить клиентам письмо повторно.
- Почта и задания (задача 18): `MAIL_INTERCEPT_TO` перенаправляет **все** письма (включая служебные письма Payload) на один ящик, тема получает префикс `[STAGING → <исходные получатели>]`. **На staging (`SITE_ENV=staging`) без `MAIL_INTERCEPT_TO` почта заблокирована целиком**: при старте в лог пишется предупреждение «Почта на staging заблокирована…», письма не уходят ни клиентам, ни на `sale@…`, почтовые задания **отменяются без ретраев** (`MailBlockedError` = `JobCancelledError`, в админке — ошибка с `cancelled: true`), служебные письма Payload (сброс пароля) завершаются ошибкой. После того как `MAIL_INTERCEPT_TO` задан, отменённые задания не перезапускаются — это ожидаемо. Ошибки доставки SMTP пишутся в лог и журнал задания без адресов (только имя ошибки, `code`, `responseCode`, SMTP-команда). Без `SMTP_HOST` письма не отправляются, почтовые задания падают и уходят в ретраи (видны в админке: «Система → Payload Jobs»). Cron очереди стартует при первом `getPayload({ cron: true })` — его делает `/api/health/` — и только при `JOBS_ENABLED=true`.

## 4. Тома

Dokploy → приложение → Advanced → Volumes, тип **Volume** (named volume):

| Volume                         | Путь в контейнере         | Назначение                        |
| ------------------------------ | ------------------------- | --------------------------------- |
| `inex-glass-<env>-media`       | `/data/media`             | медиатека Payload                 |
| `inex-glass-<env>-lead-files`  | `/data/lead-files`        | приватные файлы заявок            |
| `inex-glass-<env>-next-images` | `/app/.next/cache/images` | кэш оптимизатора изображений Next |

**Не монтировать весь `/app/.next/cache`.** Там же лежит data cache CMS (`fetch-cache`, `unstable_cache`): на volume он переживал бы редеплои вместе с записями, сделанными мимо админки (seed, импорт, SQL), и устаревшими страницами. Если на окружении уже есть volume `inex-glass-<env>-next-cache` на `/app/.next/cache` — заменить его на `next-images` (старый volume удалить, кэш изображений пересоберётся сам). См. раздел «Кэш Next».

### Кэш Next

- Данные CMS кэшируются `unstable_cache` по тегам (`src/lib/cms/cache.ts`) и сбрасываются хуками Payload при сохранении в админке. Поиск страницы по URL (`lookup:*`), `collection:pages` и `collection:redirects` истекают **сразу** (`{ expire: 0 }`): новая страница/редирект доступны с первого запроса после публикации.
- «Не найдено» не кэшируется (страница по пути, документ по slug, редирект): несуществующие URL от ботов не плодят записи кэша, а страница, созданная мимо админки, не залипает в 404.
- Записи мимо админки (seed, импорт) хуков не вызывают. Поэтому `pnpm seed` в конце сам вызывает `POST <SITE_URL>/api/revalidate/` с одноразовым токеном (HMAC от `PAYLOAD_SECRET`, живёт 5 минут; `src/lib/cms/revalidate-token.ts`) — сайт сбрасывает все теги `collection:*`, `lookup:*`, `global:*` и ISR-кэш. Новых переменных окружения не нужно: у seed и сайта должны совпадать `SITE_URL` и `PAYLOAD_SECRET`.
- Локально и в CI `.next/cache/fetch-cache` переживает пересборки и смену базы: после переключения `DATABASE_URL` на другую БД (или пересоздания тестовой) удалить `.next/cache/fetch-cache` (только его, не `.next/dev`), иначе страницы отдадут данные CMS из прежней базы. `e2e/global-setup.ts` чистит его сам, когда готовит тестовую БД (без `E2E_SKIP_DB`). В CI кэшируется весь `.next/cache` (actions/cache) — шаг e2e работает со свежей БД, поэтому fetch-cache перед ним удаляется.
- Если сайт из seed недоступен (в логе `кэш сайта НЕ сброшен …`), сбросить кэш вручную: redeploy/перезапуск контейнера (data cache не на volume, новый контейнер стартует с пустым кэшем); локально — перезапуск `pnpm dev`. Свои скрипты импорта должны так же завершаться вызовом `revalidateSite()` из `src/seed/context.ts`.

### Рост ISR-кэша от ботов (задача 41)

- Catch-all `(site)/[...slug]` (ISR, `revalidate = 3600`) сохраняет отрендеренный ответ **каждого** запрошенного неизвестного URL (включая 404) в `/app/.next/server/route-cache/APP_PAGE/…` — ≈ 300 КБ на URL (замер 21.10.2026 на образе: `.html` + `.rsc` + сегменты). Каталог лежит в слое контейнера (не на томе) и очищается при каждом редеплое/пересоздании контейнера, но между деплоями растёт без ограничения: 10 000 «мусорных» URL ≈ 3 ГБ.
- Принятые меры: `src/proxy.ts` отвечает простым `404` (`no-store`, без рендера и без записи в кэш) на очевидные пути сканеров уязвимостей: расширения `.php`, `.asp(x)`, `.jsp`, `.cgi`, `.env`, `.ini`, `.sql`, `.bak`, `.git`, `.svn`, `.htaccess`/`.htpasswd` и сегменты `wp-admin`, `wp-content`, `wp-includes`, `wp-json`, `phpmyadmin`, `cgi-bin` (`/.well-known/` никогда не блокируется — ACME). Проверено на образе: `/wp-login.php`, `/.env`, `/xmlrpc.php` → 404 и в `route-cache` не попадают; произвольный `/some-path/` по-прежнему кэшируется.
- Остаточный риск (произвольные несуществующие URL) закрывается мониторингом: алерт на диск VDS > 80 % (раздел 13) и при необходимости — `docker exec <контейнер> du -sh /app/.next/server/route-cache`; если вырос больше ~1 ГБ — перезапуск сервиса (`docker service update --force <service>` или Redeploy в Dokploy; простой — секунды, stop-first). Собственный `cacheHandler` с LRU-вытеснением не реализован (отложено: требует отдельной задачи и нагрузочной проверки); вернуться к нему, если перезапуски понадобятся чаще раза в месяц.

### Реальный IP клиента за Traefik

- `src/lib/leads/client-ip.ts` берёт IP из `X-Forwarded-For` справа налево, пропуская доверенные сети (loopback, 10/8, 172.16/12, 192.168/16, link-local, ULA), затем `X-Real-IP`, затем `unknown`. Это верно при **одном** доверенном прокси (Traefik Dokploy) и ни одном внешнем (CDN/балансировщик не используются). Если перед Traefik появится CDN — список доверенных сетей нужно расширить его адресами.
- Traefik Dokploy запускается отдельным контейнером с портами 80/443 на хосте (не через Swarm ingress), поэтому SNAT нет и Traefik видит реальный адрес. **Проверка на staging/prod (человек):** отправить тестовую заявку и посмотреть IP в `consent-log` (или ключи `rate-limits`) в админке — должен быть внешний IP устройства (сверить с `curl -s https://ifconfig.me`), а не `10.x`/`172.x`/`unknown`. Если там адрес Docker-сети — Traefik опубликован через ingress (`docker service inspect dokploy-traefik` → `PublishMode`), нужно перевести на `mode: host`; иначе все посетители попадут в одну корзину rate-limit.

Контейнер работает от `node` (uid 1000). Каталоги созданы в образе и принадлежат `node`; новый **named volume** при первом монтировании наследует владельца из образа, поэтому entrypoint с `chown` не нужен (проверено локально, см. «Результаты спайка»).

**Bind mount** (Mount type: Bind, каталог хоста) владельца из образа не наследует — каталог на хосте принадлежит root, и запись упадёт с `EACCES`. Если bind mount всё же нужен, один раз на хосте: `chown -R 1000:1000 /path/on/host`.

## 5. Домены и SSL

- Staging: A-запись поддомена (например, `dev.inexglass.ru`) на IP VDS → в Dokploy Domains: host `dev.inexglass.ru`, port `3000`, HTTPS, certificate Let's Encrypt.
- Staging закрыт basic auth (`STAGING_BASIC_AUTH`) и отдаёт noindex. `/api/*` и `/admin` basic auth не закрыты (у админки свой логин).

### Prod (задача 41)

1. **DNS** (у регистратора `inexglass.ru`): `@  A  <IP VDS>`; `www  CNAME  inexglass.ru.` (или A на тот же IP); опционально `@  CAA  0 issue "letsencrypt.org"`; TTL 300 на время запуска (после стабилизации — 3600). Проверка: `dig +short inexglass.ru`, `dig +short www.inexglass.ru` → IP VDS (на 21.10.2026 домен ещё указывает на парковку reg.ru — smoke отвечает 404 на `/api/health/`).
2. **Dokploy → `inex-glass-prod` → Domains:** `inexglass.ru` — Container Port **3000**, HTTPS on, Certificate `letsencrypt`; `www.inexglass.ru` — так же. Порт 80 VDS должен быть открыт (HTTP-01 challenge). HTTP→HTTPS делает middleware `redirect-to-https`, который Dokploy добавляет при включённом HTTPS.
3. **www → apex:** Application → **Advanced → Redirects** → пресет **«www to non-www»** (Permanent) → Save. В форме домена поля редиректа нет. Проверка: `curl -sI https://www.inexglass.ru/kontakty/` → `301`, `Location: https://inexglass.ru/kontakty/` (пресет Dokploy даёт 301; если окажется 308 — допустимо, но smoke ждёт 301: поправить пресет на свой regex-редирект с `permanent: true` или ослабить проверку в `smoke-prod.ts`).
4. **HSTS** (предпочтительно — Traefik, не приложение): динамический файл Traefik в Dokploy (Web Server → Traefik → File System, каталог `dynamic/`), например `dynamic/inex-hsts.yml`:

   ```yaml
   http:
     middlewares:
       inex-hsts:
         headers:
           stsSeconds: 300 # шаг 1: 5 минут; после проверки всего сайта по HTTPS → 31536000
           stsIncludeSubdomains: true
           stsPreload: false
   ```

   и подключить middleware `inex-hsts@file` к роутеру prod-домена: Application → Advanced → Traefik (редактор labels/конфига роутера, добавить `inex-hsts@file` в список `middlewares` роутера `websecure`). Точное место зависит от версии Dokploy — сверить на инсталляции. Через сутки без проблем поднять `stsSeconds` до `31536000`. `preload` не включать. `includeSubDomains` допустим: staging (`dev.inexglass.ru`) тоже только по HTTPS. Проверка: `curl -sI https://inexglass.ru/ | grep -i strict-transport` → `max-age=31536000; includeSubDomains`.
   **Запасной вариант** (если middleware подключить не удаётся): заголовок в `src/proxy.ts` при `SITE_ENV === "production"` (runtime-переменная; не в `next.config.ts` — там заголовки фиксируются при сборке, а образ общий для staging и prod). Сейчас **не реализован** — требует согласования, см. задачу 41.

5. `X-Frame-Options: SAMEORIGIN` и `X-Content-Type-Options: nosniff` отдаёт само приложение (`next.config.ts`).
6. Продление сертификатов — автоматически (Traefik/Let's Encrypt, за 30 дней). Если сертификат не выпустился: DNS указывает на VDS? порт 80 открыт? нет CAA, запрещающей Let's Encrypt? лимиты LE (5 дублей в неделю)? Логи: `docker logs dokploy-traefik 2>&1 | grep -i acme`.

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

- При падении `deploy-prod` в Job Summary выводится инструкция отката с образом, который работал до деплоя.
- Предыдущий релиз: `git tag --sort=-v:refname | head -n 2` → образ `ghcr.io/<owner>/inex-glass:<предыдущий тег>` (он же `sha-<коммит>`).

### Восстановление БД (из pre-deploy дампа или S3)

Выполняет человек, по SSH на VDS; сайт на время восстановления недоступен.

1. Выбрать дамп: pre-deploy — `ls -lt /var/backups/inex/` (`pre-<тег>-<UTC>.dump`, формат `-Fc`); ежедневный — скачать из бакета (`inex-glass/db/…sql.gz`, gzip над `-Fc`, распаковать `gunzip`).
2. Сначала прогнать `scripts/ops/restore-check.sh <файл>` — убедиться, что дамп читается.
3. Остановить приложение: Dokploy → `inex-glass-prod` → Stop (или `docker service scale <app-service>=0`).
4. Восстановить в prod-базу (пересоздаёт объекты дампа):

   ```bash
   CID=$(docker ps -q -f label=com.docker.swarm.service.name=<PROD_PG_SERVICE> | head -n1)
   docker exec -i "$CID" sh -c 'pg_restore --clean --if-exists --no-owner --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < /var/backups/inex/pre-vX.Y.Z-….dump
   ```

   `--single-transaction` требует `max_locks_per_transaction=256` (раздел 2). Таблицы, созданные новой версией и отсутствующие в дампе, `--clean` не удаляет — это безопасно для старого образа (expand).

5. В Dokploy выставить образ, соответствующий дампу (тег из имени файла), → Deploy → health → `pnpm smoke:prod`.
6. Данные, внесённые после дампа (заявки, заказы), теряются — выгрузить их заранее из админки (отчёт по заявкам, задача 32), если БД ещё доступна.

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
- После записи seed вызывает `POST <SITE_URL>/api/revalidate/` (сброс кэша CMS сайта, см. «Кэш Next»). `SITE_URL` и `PAYLOAD_SECRET` в env-файле должны совпадать с приложением; публичный `SITE_URL` из контейнера в `dokploy-network` обычно доступен. Если нет — в логе будет `кэш сайта НЕ сброшен`, тогда перезапустить приложение.

### Скрипты на prod: порядок и предохранители (задача 41)

Env-файл prod для `tools`: `/root/inex-glass-prod.env` (права 600, те же `DATABASE_URL`, `PAYLOAD_SECRET`, `SITE_URL=https://inexglass.ru`, `SITE_ENV=production`, без `JOBS_ENABLED`). Перед любым пакетным скриптом — ручной дамп с рабочей машины: `ssh deploy@<VDS> 'bash -s -- manual-<что> <PROD_PG_SERVICE>' < scripts/ops/predeploy-dump.sh` (попадает в ту же ротацию `KEEP`). Каталог `/app` в `tools` принадлежит root (только чтение для `node`), поэтому всё, что скрипт пишет вне `/data`, монтируется отдельно (bind mount — заранее `chown -R 1000:1000`).

```bash
IMG=ghcr.io/<owner>/inex-glass:sha-<commit>-tools   # тот же коммит, что работает на prod
RUN="docker run --rm --env-file /root/inex-glass-prod.env --network dokploy-network \
     -v inex-glass-prod-media:/data/media"
```

1. **Первое наполнение:** `$RUN $IMG pnpm seed --full`.
2. **Временные изображения** (task 38): `$RUN $IMG pnpm payload run scripts/attach-generated-media.ts -- --dry-run`, затем без `--dry-run`. Скрипт заполняет только пустые слоты и **пропускает документы, у которых последний вариант — черновик** (или которые ни разу не публиковались): строка `skipped: newer draft`, черновик редактора не перезаписывается опубликованной версией.
3. **Импорт inex.su** (task 37, только после решения заказчика): невоспроизводим «как есть» из образа — кэш Firecrawl (`scripts/.cache/firecrawl`), `scripts/.import-tmp/` (`slugs.json`, индекс media) и отчёт `docs/reports/` в git не входят. Перенести кэш с машины, где делался обход, на VDS и смонтировать:

   ```bash
   mkdir -p /root/inex-import/{firecrawl,tmp,reports} && chown -R 1000:1000 /root/inex-import
   $RUN -e IMPORT_PROD_GUARD_HOSTS=<хост prod-БД из DATABASE_URL> \
     -v /root/inex-import/firecrawl:/app/scripts/.cache/firecrawl \
     -v /root/inex-import/tmp:/app/scripts/.import-tmp \
     -v /root/inex-import/reports:/app/docs/reports \
     $IMG pnpm tsx scripts/import-inex/import.ts --dry-run
   # затем тот же запуск без --dry-run, но с --i-know-this-is-prod
   ```

   - Предохранитель: импорт отказывается работать, если `SITE_ENV=production` **или** хост `DATABASE_URL` перечислен в `IMPORT_PROD_GUARD_HOSTS` (через запятую), без флага `--i-know-this-is-prod`. `IMPORT_PROD_GUARD_HOSTS` задавать в env-файлах всех машин, откуда возможен запуск (в т. ч. локально при SSH-туннеле — там хост `localhost`, поэтому полагаться только на `SITE_ENV` нельзя).
   - Имена файлов фото санитизируются (`photoFileName`: декодирование → basename → безопасные символы), путь записи проверяется на выход за `scripts/.import-tmp/photos/`.
   - После импорта: `$RUN -v /root/inex-import/tmp:/app/scripts/.import-tmp -v /root/inex-import/reports:/app/docs/reports $IMG pnpm tsx scripts/import-inex/fix-csv.ts --check-db` — сверка исправленного CSV с prod-БД; передавать CSV команде inex.su только после зелёной проверки.

4. **Переиндексация поиска после импорта/массовых правок:** `$RUN $IMG pnpm payload run scripts/reindex-search.ts`. Полная переиндексация **не атомарна** (`src/lib/search/reindex.ts`: на время работы часть документов отсутствует в поиске) и в конце сбрасывает весь кэш сайта (холодный кэш — первые запросы медленнее). Запускать в окно низкой нагрузки (ночью), после — `pnpm smoke:prod`.
5. **IndexNow** (после индексации и включения `indexNowEnabled`): `$RUN $IMG pnpm payload run scripts/indexnow-all.ts -- --dry-run`, затем без `--dry-run`.

## 10. Секреты GitHub Actions и первый запуск staging

Secrets (Settings → Secrets and variables → Actions). API-ключи Dokploy — **только секреты environments** (Settings → Environments → `staging` / `production` → Environment secrets), не репозиторные: секрет environment доступен только job, объявившему этот environment, а секрет `production` — только после подтверждения ревьюером. Один общий ключ позволял бы job staging (без подтверждения) передеплоить prod.

| Секрет                     | Значение                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DOKPLOY_URL`              | `https://<dokploy-host>` без слеша в конце                                                                                                                                                                                                                                                                                                                                                               |
| `DOKPLOY_STAGING_API_KEY`  | environment `staging`. Отдельный участник Dokploy (Settings → Users → Add, роль Member; Permissions: доступ только к проекту/environment/сервису `inex-glass-staging`, «Access to API» включён, без Docker/Traefik/SSH) → войти им → Profile → API/CLI → Generate. Ключ наследует права пользователя (сверить на инсталляции: этим ключом `application.one` для prod-приложения должен отвечать 401/403) |
| `DOKPLOY_PROD_API_KEY`     | environment `production` **только**. Ключ пользователя с доступом к `inex-glass-prod` (Profile → API/CLI). Репозиторный `DOKPLOY_API_KEY` (если был) удалить, ключ отозвать                                                                                                                                                                                                                              |
| `STAGING_SMOKE_BASIC_AUTH` | environment `staging`: `user:pass` basic auth staging (то же, что `STAGING_BASIC_AUTH` в env staging) — для smoke перед записью «staging проверен»                                                                                                                                                                                                                                                       |
| `DOKPLOY_STAGING_APP_ID`   | applicationId `inex-glass-staging` (из URL приложения в Dokploy)                                                                                                                                                                                                                                                                                                                                         |
| `DOKPLOY_PROD_APP_ID`      | applicationId `inex-glass-prod` (задача 41)                                                                                                                                                                                                                                                                                                                                                              |
| `GHCR_PULL_USERNAME`       | GitHub-пользователь владельца PAT                                                                                                                                                                                                                                                                                                                                                                        |
| `GHCR_PULL_TOKEN`          | classic PAT, scope `read:packages`                                                                                                                                                                                                                                                                                                                                                                       |

Prod-деплой дополнительно (задача 41; лучше на уровне environment `production`, чтобы job staging их не видел):

| Секрет                  | Значение                                                                                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROD_SSH_HOST`         | IP/хост VDS                                                                                                                                                                                                                                                                                          |
| `PROD_SSH_USER`         | `deploy` (группа `docker`, без sudo)                                                                                                                                                                                                                                                                 |
| `PROD_SSH_KEY`          | приватный ключ ed25519, созданный только для Actions (`ssh-keygen -t ed25519 -N '' -C gha-predeploy`)                                                                                                                                                                                                |
| `PROD_SSH_KNOWN_HOSTS`  | вывод `ssh-keyscan -p <PROD_SSH_PORT> -t ed25519 <VDS>` (`-p` обязателен, если порт не 22: иначе в `known_hosts` попадёт ключ с порта 22 в формате без `[host]:port`, и `StrictHostKeyChecking` отвергнет сервер; сверить отпечаток с `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` на сервере) |
| `NOTIFY_TELEGRAM_TOKEN` | опционально: токен бота                                                                                                                                                                                                                                                                              |
| `NOTIFY_TELEGRAM_CHAT`  | опционально: id чата                                                                                                                                                                                                                                                                                 |

Variables: `STAGING_URL` (`https://dev.inexglass.ru`), `PROD_URL` (`https://inexglass.ru`), `PROD_PG_SERVICE` (имя Swarm-сервиса prod Postgres, раздел 2), `PROD_SSH_PORT` (если не 22).

Пользователь `deploy` на VDS (человек, один раз):

```bash
adduser --disabled-password --gecos "" deploy && usermod -aG docker deploy
install -d -m 750 -o deploy -g deploy /var/backups/inex
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Рекомендуется ограничить ключ одной командой: скопировать scripts/ops/predeploy-dump.sh в
# /usr/local/bin/inex-predeploy-dump (root:root 755) и в authorized_keys написать
#   command="/usr/local/bin/inex-predeploy-dump",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA… gha-predeploy
# Скрипт сам разбирает SSH_ORIGINAL_COMMAND (только «bash -s -- <тег> <сервис>»), workflow не меняется.
# После обновления скрипта в репозитории — обновить копию на сервере.
```

Группа `docker` фактически равна root на хосте — поэтому ключ ограничивается `command=` и используется только из environment `production` с required reviewers.

Опциональная копия pre-deploy дампов в S3 — файл `/home/deploy/.inex-predeploy.env` (права 600): `S3_RCLONE_REMOTE=yandex:<бакет>/inex-glass/predeploy` (после `rclone config` под `deploy`) или `S3_AWS_URI=s3://<бакет>/inex-glass/predeploy` + `S3_ENDPOINT_URL=https://storage.yandexcloud.net` (ключи — в `~/.aws/credentials`). Без клиента/настроек дамп остаётся только на VDS (предупреждение в логе, деплой не падает).

Пока `DOKPLOY_STAGING_API_KEY` / `DOKPLOY_PROD_API_KEY` пусты, workflow только собирает и публикует образ; шаги соответствующего деплоя пропускаются с notice. Исключение — тег `v*`: `staging-gate` не видит секретов и без записи «staging проверен» падает всегда (fail closed), даже если prod ещё не настроен. Публикация в GHCR использует встроенный `GITHUB_TOKEN` (`packages: write` только у job `build`), отдельный токен не нужен.

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
11. GitHub → Settings → Environments: `staging` (без ограничений), `production` (required reviewers; deployment branches and tags: только тег `v*`) — задача 41, чек-лист `docs/runbooks/prod-launch-checklist.md`.

## 11. Базовый образ и контекст сборки

- Базовый образ закреплён по версии **и** digest индекса (multi-arch): `ARG NODE_IMAGE=node:24.22.0-slim@sha256:…` в `Dockerfile`. Обновление — осознанно (патчи безопасности Node/Debian): `docker buildx imagetools inspect node:24.X.Y-slim` → поле `Digest` → обновить `NODE_IMAGE` → staging. Пересобрать с другим образом разово: `--build-arg NODE_IMAGE=…`.
- `.dockerignore` исключает секреты, `.git`, `node_modules`, `.next`, артефакты тестов (`test-results`, `playwright-report`), документацию и `scripts/.cache` (локальный кэш генерации картинок, ≈ 57 МБ PNG) — в контекст сборки они не попадают. Каталог `e2e/` намеренно остаётся в контексте: `next build` проверяет типы во всех `**/*.ts` (tsconfig `include`), а `playwright.config.ts`, `scripts/test-db.ts` и `*.int.test.ts` импортируют `e2e/helpers` — без него стадия сборки падает с TS2307. Исключать каталоги с `.ts`/`.tsx`, которые входят в tsconfig, нельзя.
- Контракт `/api/health/` (200 `{"status":"ok","release":…}` без basic auth, `/api/health` → 308) закреплён e2e-тестом `e2e/health.spec.ts`.

## 12. Бэкапы (задача 41)

| Что                       | Как                                                 | Когда                  | Где                                 | Хранение                   |
| ------------------------- | --------------------------------------------------- | ---------------------- | ----------------------------------- | -------------------------- |
| БД prod                   | Dokploy → Postgres → Backups                        | ежедневно `0 3 * * *`  | S3 РФ, prefix `inex-glass/db/`      | 30 дней (lifecycle бакета) |
| БД перед деплоем          | `scripts/ops/predeploy-dump.sh` (job `deploy-prod`) | каждый prod-деплой     | VDS `/var/backups/inex` (+ S3 опц.) | последние 10 (`KEEP`)      |
| `/data/lead-files` (ПДн)  | Dokploy → Application → Volume Backups              | ежедневно `30 3 * * *` | S3 РФ, prefix `inex-glass/volumes/` | 30 дней (lifecycle бакета) |
| `/data/media`             | Dokploy → Application → Volume Backups              | ежедневно `0 4 * * *`  | S3 РФ, prefix `inex-glass/volumes/` | 30 дней (lifecycle бакета) |
| `/app/.next/cache/images` | не бэкапится (пересобирается сам)                   | —                      | —                                   | —                          |

Настройка (человек):

1. **Бакет** в Yandex Object Storage (endpoint `https://storage.yandexcloud.net`, регион `ru-central1`) или Selectel (endpoint и регион — из личного кабинета, сверить актуальные): приватный, шифрование на стороне сервера (SSE, KMS-ключ), **lifecycle-правило: удалять объекты старше 30 дней** для префикса `inex-glass/` — retention в Dokploy не настраивается. Сервисный аккаунт с правом записи/чтения только в этот бакет (Yandex: роль `storage.uploader` + `storage.viewer` на бакет), статический ключ доступа.
2. Dokploy → Settings → **Destinations** → Add (S3): Access Key, Secret Key, Bucket, Region, Endpoint → **Test connection**.
3. Dokploy → `inex-glass-prod-db` → **Backups** → Create: Destination, Database = имя БД, Schedule `0 3 * * *` (время VDS — проверить `timedatectl`), Prefix `inex-glass/db/`, Enabled → **Test/Run manually** → убедиться, что объект появился в бакете.
4. Dokploy → `inex-glass-prod` → **Volume Backups** (только для named volumes — поэтому bind mount запрещён): `inex-glass-prod-lead-files` (`30 3 * * *`) и `inex-glass-prod-media` (`0 4 * * *`), Destination тот же, Prefix `inex-glass/volumes/`. Опция **Turn off container**: включить для обоих (консистентность файлов; приложение недоступно на время архивации — секунды–минуты в ночное окно 03:30–04:30). Если простой недопустим — выключить и принять риск неконсистентности файлов, записанных в момент бэкапа; решение отметить в чек-листе. Запустить вручную, проверить объекты в бакете.
5. Заявки содержат ПДн (152-ФЗ): бакет и VDS — в РФ, бакет приватный, ключи только у сервисного аккаунта и в Dokploy.

### Restore-drill (проверка восстановления)

- `scripts/ops/restore-check.sh <файл>` поднимает временный `postgres:18` (`docker run --rm`, tmpfs, без порта, случайный пароль), восстанавливает дамп (`pg_dump -Fc`, он же в gzip — формат бэкапов Dokploy, или plain SQL), печатает число строк `pages`, `leads`, `payload_migrations`, последнюю миграцию и число таблиц, удаляет контейнер. Ненулевой код — бэкап не восстанавливается.
- Когда: после первого S3-бэкапа (до запуска), **ежемесячно** и перед релизом с contract-миграцией. Результат (дата, файл, числа) — в `docs/runbooks/prod-launch-checklist.md`.
- Порядок: скачать последний `inex-glass/db/…` из бакета (консоль облака или `aws --endpoint-url https://storage.yandexcloud.net s3 cp s3://<бакет>/inex-glass/db/<файл> .`) → `scripts/ops/restore-check.sh <файл>` → сверить `pages`/`leads` с админкой. Для томов: скачать архив, `tar -tzf <архив> | head` (список файлов, есть ли свежие загрузки).
- Проверено локально 21.10.2026: дамп `-Fc` (3,2 МБ, копия dev-БД, 620 таблиц) — восстановлен за 7 с; тот же в gzip — OK; plain SQL в gzip — OK; обрезанный файл — код 1 (`pg_restore … end of file`). Pre-deploy скрипт: дамп + полное чтение архива `pg_restore -f /dev/null` (`--list` читает только оглавление и пропускал дамп, обрезанный наполовину; повторная проверка 21.10.2026 на Postgres 18: целый дамп — OK, обрезанный наполовину — код 1) + ротация `KEEP`, отказ при пустой БД (< 10 КБ), отсутствии сервиса (код 2), недопустимом теге, небезопасных правах конфига; копия в S3 через `aws` и `rclone` проверена на MinIO.

## 13. Мониторинг и алерты (задача 41)

Настраивает человек; минимальный набор:

| Что                                | Чем                                                                              | Порог / интервал                         | Куда                |
| ---------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- | ------------------- |
| `https://inexglass.ru/api/health/` | внешний uptime-монитор (UptimeRobot / Uptime Kuma в Dokploy / Yandex Monitoring) | 1 мин, ожидание 200 и `"status":"ok"`    | Telegram + e-mail   |
| `https://inexglass.ru/`            | тот же монитор, keyword «Inex Glass»                                             | 1–5 мин                                  | Telegram + e-mail   |
| Срок сертификата                   | монитор SSL (UptimeRobot/Kuma)                                                   | < 14 дней                                | e-mail              |
| Диск VDS                           | Dokploy → Monitoring (или node-exporter)                                         | > 80 %                                   | Telegram            |
| Логи                               | Dokploy → Logs приложения и БД                                                   | ошибки `[health]`, `[sitemap]`, `[mail]` | вручную / по алерту |

- Uptime Kuma внутри Dokploy на том же VDS не видит падения самого VDS — внешний монитор обязателен.
- Ротация логов Docker (иначе `json-file` растёт без предела): `/etc/docker/daemon.json` → `{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}` → `systemctl restart docker` (применяется к новым контейнерам; Dokploy после этого Redeploy приложений и БД). Перезапуск docker = кратковременный простой всех сервисов — делать ночью.
- `smoke:prod` можно запускать вручную в любой момент: `SMOKE_BASE_URL=https://inexglass.ru pnpm smoke:prod`.

## 14. Обслуживание и ротация секретов

- **`PAYLOAD_SECRET`**: смена разлогинивает всех пользователей админки; ссылки `/zakaz/…` не затрагивает. Порядок: новое значение в env Dokploy и в `/root/inex-glass-prod.env` (tools) → Redeploy.
- **`FORM_HMAC_SECRET`**: смена инвалидирует только выданные формам токены (форма перезапросит токен) — можно ротировать в любое время.
- **`ORDER_TOKEN_SECRET`** — только в крайнем случае (утечка): все ссылки `/zakaz/…` перестают работать; менеджеры перевыпускают ссылки активных заказов («Перевыпустить» в заказе) и повторно отправляют клиентам.
- **Пароль Postgres**: сменить в Dokploy (сервис БД) → обновить `DATABASE_URL` приложения и env-файла tools → Redeploy приложения.
- **SMTP-пароль, ключи S3, `DOKPLOY_STAGING_API_KEY`, `DOKPLOY_PROD_API_KEY`, `GHCR_PULL_TOKEN`, `PROD_SSH_KEY`**: выпустить новый → заменить в Dokploy/GitHub → отозвать старый. PAT GHCR с истекающим сроком — напоминание в календаре.
- **Postgres**: минорные обновления (`18.x`) — Dokploy → БД → образ `postgres:18` → Redeploy (после ручного дампа). Мажорное обновление (19) — только через дамп/восстановление в новый сервис, отдельной задачей.
- **Базовый образ Node** — раздел 11. **Сертификаты** — автоматически (раздел 5).

## 15. Аварийные сценарии

| Симптом                                         | Действия                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Деплой: health не зеленеет, Swarm откатил       | Dokploy → Logs нового контейнера (ошибка env — например, `INDEXNOW_KEY`, миграция). Исправить env/код → новый тег. Если миграция применилась частично — восстановить pre-deploy дамп (раздел 8).                                                                       |
| БД не поднялась после миграции / приложение 503 | `docker service logs <pg-service>`; место на диске (`df -h`); при порче данных — раздел 8 «Восстановление БД» из pre-deploy дампа или S3.                                                                                                                              |
| Диск заполнен                                   | `df -h`, `docker system df`; почистить старые образы `docker image prune -a --filter "until=168h"` (не трогает используемые), логи (ротация, раздел 13), `/var/backups/inex` (уменьшить `KEEP`), ISR-кэш (раздел 4 — перезапуск сервиса).                              |
| Сертификат не выпустился / истекает             | DNS (`dig`), порт 80 открыт, CAA, логи Traefik (`grep -i acme`); после исправления — Dokploy → Domains → пересохранить домен.                                                                                                                                          |
| Срочный откат                                   | Dokploy → Deployments → Rollback на предыдущий образ (раздел 8). GitHub Actions не нужен.                                                                                                                                                                              |
| Восстановление из S3                            | Скачать дамп из `inex-glass/db/`, `restore-check.sh`, затем раздел 8 «Восстановление БД». Тома: скачать архив Volume Backup, Dokploy → Volume Backups → Restore (или `docker run --rm -v inex-glass-prod-media:/data -v $PWD:/b alpine tar -xzf /b/<архив> -C /data`). |
| Почта клиентам не уходит                        | Проверить отсутствие `MAIL_INTERCEPT_TO`, `SMTP_*`, журнал «Система → Payload Jobs», SPF/DKIM.                                                                                                                                                                         |

## 16. Smoke-проверки (`scripts/ops/smoke-prod.ts`)

`pnpm smoke:prod` (= `tsx scripts/ops/smoke-prod.ts`; в CI запускается `node scripts/ops/smoke-prod.ts` без установки зависимостей). Только чтение. Проверки (`--list`): `http-redirect`, `www-redirect`, `tls` (apex и www — каждый по своему TLS-соединению с SNI, т. к. Dokploy выпускает отдельный сертификат на домен: доверенная цепочка, > 14 дней, SAN покрывает имя), `headers` (HSTS: нет заголовка или `max-age=0` — FAIL, `max-age` < 1 года — WARN (шаги раскатки 300 с → 1 год), ≥ 1 года — PASS; `SMOKE_HSTS_MIN_AGE=<секунды>` делает порог обязательным (FAIL ниже него); `preload` — WARN; `X-Frame-Options: SAMEORIGIN`, `nosniff`), `health` (+ `/admin/` без стек-трейсов, `SMOKE_EXPECT_RELEASE`), `robots-sitemap` (не `Disallow: /`, `Sitemap:`, `Clean-param`, ≥ 30 `<loc>` на основном домене), `key-pages` (8 URL: 200, один h1, без noindex), `noindex-pages` (5 мм, `/poisk/`, случайный `/zakaz/…/` → 404 + noindex), `no-staging` (нет basic auth, «staging», чужих canonical/ссылок), `private-api` (REST `leads`, `orders`, `lead-files`, `order-files`, `consent-log`, `rate-limits`, `search`, `users` → 401/403; `/ui-kit/`, `/wp-login.php` → 404), `upload` (`OPTIONS /api/upload/`), `lead` (`--with-lead`: только `POST /api/form-token/`; тестовая заявка — вручную), `consent` (нет `mc.yandex.ru` в серверном HTML; `--browser` — баннер и Метрика только после «Принять» в Chromium), `ttfb` (медиана < 800 мс — warn).

- Staging: `SMOKE_BASE_URL=https://dev.inexglass.ru SMOKE_EXPECT_ENV=staging SMOKE_BASIC_AUTH=user:pass pnpm smoke:prod` — проверки индексации инвертированы (ожидаются `noindex`, `Disallow: /`, пустой sitemap, 401 без авторизации).
- Локально/по http:// TLS, редиректы и HSTS пропускаются автоматически.
- Проверено 21.10.2026 на образе `runner` (HEAD + изменения задачи 41) с копией dev-БД: production — 8 PASS / 3 WARN / 0 FAIL; staging (basic auth) с `SMOKE_EXPECT_ENV=staging` — 0 FAIL; тот же staging с ожиданием production — 4 FAIL (robots, noindex, basic auth, `/ui-kit/`) — как и должно быть; TLS/редиректы/HSTS — на реальных HTTPS-сайтах (в т. ч. просроченный сертификат → FAIL).

## Результаты спайка (задача 03)

Проверено локально 20.10.2026 (Docker 29.4, контейнер против Postgres 18 из `docker-compose.yml`):

- Образ `runner` — 439 МБ (node:24-slim + curl; сейчас закреплён `node:24.22.0-slim@sha256:…`, раздел 11; standalone `node_modules` ≈ 45 МБ, из них libvips ≈ 18 МБ). Образ `tools` ≈ 2,8 ГБ (полный `node_modules`).
- Сборка идёт без БД и без секретов.
- Контейнер работает от `node` (uid 1000). Первый `GET /api/health/` применил baseline-миграцию (≈ 70 мс на пустой БД) и вернул `200 {"status":"ok"}`; Docker HEALTHCHECK → `healthy`. Перезапуск миграции повторно не запускает.
- Недоступная БД → `503 {"status":"error"}`, причина только в логе. Неудачная инициализация Payload не кэшируется: после восстановления БД healthcheck снова зелёный без рестарта.
- Payload сам создаёт базу из `DATABASE_URL`, если её нет (`autoDatabaseCreate`), — в Dokploy базу всё равно лучше создавать вместе с сервисом Postgres.
- `/api/health` без слеша → 308; `/admin/` → 200 (статика `/_next/static` отдаётся); на staging `/` без basic auth → 401, с ним → 200. Первый администратор создаётся через `/admin/`.
- sharp 0.35 (`@img/sharp-linux-x64`) работает внутри `output: "standalone"` (ресайз/кодирование проверены) без `serverExternalPackages`/`outputFileTracingIncludes`.
- Запись в `/data/media`, `/data/lead-files`, `/app/.next/cache` от `node` проходит (volume теперь монтируется только на `/app/.next/cache/images`, см. «Тома»). `scripts/docker-entrypoint.sh` не нужен: named volumes наследуют владельца из образа.
- `tools`: `pnpm` (corepack) запускается от `node` без повторной загрузки, `pnpm migrate:status` работает.
