# Чек-лист запуска prod: inexglass.ru

Операционный чек-лист задачи 41. Подробности каждого шага — в `docs/deploy.md` (номера разделов указаны в скобках).

- `[AGENT]` — изменение в репозитории, делает агент. Отметка `[x]` означает, что изменение сделано и проверено локально. На боевом стенде оно не проверялось.
- `[ЧЕЛОВЕК]` — действие в панели Dokploy, у регистратора, в DNS, GitHub или внешнем сервисе. Агент к ним доступа не имеет. Отмечает человек: дата, кто, результат.

Связанные отчёты: `docs/reports/acceptance.md` (задача 42, сюда же — вывод `pnpm smoke:prod`) и `docs/reports/seo-audit.md` (задача 40).

## Особо опасные ошибки запуска

- **`MAIL_INTERCEPT_TO` в prod-env.** Все письма клиентов и менеджеров уходят на тестовый ящик.
- **`SITE_ENV=staging` (или не `production`) на prod.** Сайт закрыт `noindex` и `Disallow: /`. Smoke это ловит.
- **`STAGING_BASIC_AUTH` в prod-env.** Сайт закрыт паролем.
- **Bind mount вместо named volume** для `/data/media` и `/data/lead-files`. Volume Backups Dokploy не работают, а у bind mount ещё и права `EACCES`.
- **Публичный порт Postgres** (заполнен External Port). База открыта в интернет.
- **Пересборка образа для prod.** На prod попадают другие бинарники, чем прошли staging. Prod получает только тот же digest `sha-<commit>` → `:vX.Y.Z`.
- **HSTS с `includeSubDomains`** до проверки всех поддоменов по HTTPS. Также не включать `preload`.
- **`JOBS_ENABLED=true` больше чем на одном контейнере** (реплики > 1, или задан в `tools`). Задания и письма будут выполняться дважды.
- **Ротация `ORDER_TOKEN_SECRET` без необходимости.** Все ссылки `/zakaz/…` перестают работать.

## До запуска

### Репозиторий

- [x] `[AGENT]` `scripts/ops/predeploy-dump.sh`: pg_dump перед деплоем, полное чтение архива `pg_restore -f /dev/null` (обрезанный дамп отклоняется), ротация `KEEP`, опциональная копия в S3, режим forced command (§12). Проверен на локальном Postgres 18 и на MinIO.
- [x] `[AGENT]` `scripts/ops/restore-check.sh`: restore-drill во временный `postgres:18` (§12). Проверены форматы `-Fc`, `-Fc`+gzip и plain+gzip, а также отказ на обрезанном файле.
- [x] `[AGENT]` `scripts/ops/smoke-prod.ts`: проверки A3 и C (§16). Прогнан против контейнера `runner` в режимах production и staging, против dev-сервера и против реальных HTTPS-сайтов (TLS, редиректы).
- [x] `[AGENT]` `.github/workflows/docker.yml`, job `deploy-prod` (§1):
  - тег `v*`, тот же образ, без пересборки;
  - environment `production`;
  - гейт «коммит проверен на staging» — отдельный job `staging-gate` до подтверждения `production`; принимает только запись `smoke-ok` от `github-actions[bot]`, которую staging пишет после health и полного smoke;
  - отдельные API-ключи Dokploy: `DOKPLOY_STAGING_API_KEY` (environment `staging`) и `DOKPLOY_PROD_API_KEY` (только environment `production`);
  - `PROD_PG_SERVICE` проверяется (`[a-zA-Z0-9_.-]`) и передаётся по SSH в кавычках; `application.deploy` вызывается без `--retry`;
  - pre-deploy дамп, при неудаче деплой останавливается;
  - деплой, ожидание health до 10 минут, smoke, инструкция отката, уведомление в Telegram.
    `actionlint` и `shellcheck` проходят без замечаний.
- [x] `[AGENT]` Предохранители скриптов и кода (§4, §9):
  - `proxy.ts` отвечает 404 на пути сканеров;
  - `sitemap.xml` отдаёт 5xx при недоступной БД;
  - формат `INDEXNOW_KEY` проверяется при старте;
  - `attach-generated-media` не перезаписывает черновики;
  - имена файлов фото при импорте защищены от path traversal;
  - CI запускает attach-скрипт, поэтому e2e временных изображений больше не пропускается.
- [x] `[AGENT]` Контроль безопасности по образу и коду (раздел C задачи 41):
  - в `runner` нет `.env`, `scripts/` и dev-ключей; `docker run --rm <image> env` содержит только `NODE_ENV`, `PORT`, `HOSTNAME`, `MEDIA_DIR`, `UPLOADS_DIR`, `RELEASE_SHA`, `NEXT_TELEMETRY_DISABLED` и служебные переменные Node; `docker history` без секретов;
  - в `users` заданы `maxLoginAttempts` и `lockTime`;
  - REST `leads`, `orders`, `lead-files`, `order-files`, `consent-log`, `rate-limits`, `search`, `users` анонимно отвечают 403;
  - `/admin/` закрыт в `robots.txt` (`Disallow: /admin/`) и отдаёт `X-Frame-Options: SAMEORIGIN`;
  - `/data/lead-files` не отдаётся статикой: том лежит вне `public/`; файлы выдаются только маршрутами с проверкой доступа — `/api/lead-files/<id>/download/` (админка), Payload REST коллекции (анонимно 403); файлы заказов (`order-files`) — `/zakaz/<token>/docs/<id>/` только с валидным токеном. Проверено чтением кода и smoke `private-api`; скачивание файла анонимно на стенде не проверялось.
- [x] `[AGENT]` `docs/deploy.md` (§1–§16) и этот чек-лист.

### DNS и домены

- [ ] `[ЧЕЛОВЕК]` DNS `inexglass.ru` (§5):
  - `@ A <IP VDS>`;
  - `www CNAME inexglass.ru.` (или A на тот же IP);
  - опционально `@ CAA 0 issue "letsencrypt.org"`;
  - TTL 300.
    Проверка: `dig +short inexglass.ru` и `dig +short www.inexglass.ru` возвращают IP VDS. _(21.10.2026 домен ещё на парковке reg.ru.)_
- [ ] `[ЧЕЛОВЕК]` Подтвердить, что VDS находится в РФ (152-ФЗ: БД и файлы заявок хранятся в РФ).

### Dokploy: Postgres prod

- [ ] `[ЧЕЛОВЕК]` Создать сервис `inex-glass-prod-db` (§2): Postgres **18** (не pgvector), сильный пароль, **External Port пустой**.
- [ ] `[ЧЕЛОВЕК]` Задать `max_locks_per_transaction=256` (Advanced → Command: `postgres -c max_locks_per_transaction=256`). Проверка: `show max_locks_per_transaction` возвращает 256. Тот же параметр — на staging-БД.
- [ ] `[ЧЕЛОВЕК]` Записать имя Swarm-сервиса БД (`docker service ls`) в GitHub variable `PROD_PG_SERVICE`.

### Dokploy: приложение prod

- [ ] `[ЧЕЛОВЕК]` Создать Application `inex-glass-prod`: Provider **Docker**, образ `ghcr.io/<owner>/inex-glass:<vX.Y.Z или sha-…>`, Registry GHCR (PAT `read:packages`).
- [ ] `[ЧЕЛОВЕК]` Env — блок «Prod env целиком» (§3):
  - секреты сгенерировать заново;
  - `SITE_ENV=production`, `SITE_URL=https://inexglass.ru`, `JOBS_ENABLED=true`;
  - **нет** `MAIL_INTERCEPT_TO`, `STAGING_BASIC_AUTH` и dev-ключей.
- [ ] `[ЧЕЛОВЕК]` Mounts → **Volume Mount** (именованные тома): `inex-glass-prod-media` → `/data/media`, `inex-glass-prod-lead-files` → `/data/lead-files`, `inex-glass-prod-next-images` → `/app/.next/cache/images` (§4). Не монтировать весь `/app/.next/cache`.
- [ ] `[ЧЕЛОВЕК]` Swarm Settings — JSON из §6: Health Check (`StartPeriod` 90 с), Update Config (`stop-first`, `FailureAction: rollback`), Rollback Config, Mode `Replicas: 1`, Restart Policy.

### Домены, SSL, редирект, HSTS

- [ ] `[ЧЕЛОВЕК]` Domains: `inexglass.ru` и `www.inexglass.ru` — порт 3000, HTTPS, `letsencrypt` (§5).
- [ ] `[ЧЕЛОВЕК]` Advanced → Redirects → пресет **www → non-www**. Проверка: `curl -sI https://www.inexglass.ru/kontakty/` возвращает `301` и `Location: https://inexglass.ru/kontakty/`.
- [ ] `[ЧЕЛОВЕК]` HSTS через Traefik-middleware `inex-hsts` (§5):
  - сначала `stsSeconds: 300`;
  - через сутки без проблем — `31536000`;
  - `preload` выключен.
    Проверка: `curl -sI https://inexglass.ru/ | grep -i strict`. Если подключить middleware не удалось — согласовать запасной вариант в `proxy.ts`. Это отдельная задача агента, сейчас не реализовано.

### GitHub

- [ ] `[ЧЕЛОВЕК]` Environment `production`: required reviewers, deployment tags только `v*`.
- [ ] `[ЧЕЛОВЕК]` Secrets (§10):
  - `DOKPLOY_URL`, `DOKPLOY_PROD_APP_ID`, `GHCR_PULL_USERNAME`, `GHCR_PULL_TOKEN`;
  - `DOKPLOY_PROD_API_KEY` — секрет **только environment `production`** (не репозиторный);
  - environment `staging`: `DOKPLOY_STAGING_API_KEY` (ключ участника Dokploy с доступом только к `inex-glass-staging`) и `STAGING_SMOKE_BASIC_AUTH` (`user:pass`);
  - старый репозиторный `DOKPLOY_API_KEY`, если был, удалить и отозвать в Dokploy. Проверка: ключом staging запрос `application.one` для prod-приложения отвечает 401/403;
  - `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`, `PROD_SSH_KNOWN_HOSTS`;
  - опционально `NOTIFY_TELEGRAM_TOKEN` и `NOTIFY_TELEGRAM_CHAT`.
- [ ] `[ЧЕЛОВЕК]` Variables: `PROD_URL=https://inexglass.ru`, `PROD_PG_SERVICE`, `PROD_SSH_PORT` (если не 22).
- [ ] `[ЧЕЛОВЕК]` Сверить в Swagger Dokploy (`<DOKPLOY_URL>/swagger`) три вызова: `application.saveDockerProvider`, `application.deploy` и `application.one` (поле `dockerImage`). При расхождении сообщить агенту.

### VDS: пользователь для pre-deploy дампа

- [ ] `[ЧЕЛОВЕК]` Пользователь `deploy` (§10):
  - состоит в группе `docker`, без sudo;
  - каталог `/var/backups/inex` с владельцем `deploy`;
  - публичный ключ Actions в `authorized_keys`, ограниченный `command="/usr/local/bin/inex-predeploy-dump"` (рекомендуется; копия `scripts/ops/predeploy-dump.sh`).
- [ ] `[ЧЕЛОВЕК]` `known_hosts` для секрета: `ssh-keyscan -p <PROD_SSH_PORT> -t ed25519 <VDS>` (`-p` — если порт не 22), отпечаток сверить на сервере.
- [ ] `[ЧЕЛОВЕК]` Ручной прогон дампа с рабочей машины: `ssh deploy@<VDS> 'bash -s -- manual-test <PROD_PG_SERVICE>' < scripts/ops/predeploy-dump.sh`. Ожидается `OK` и `DUMP_PATH=…`. Прогонять после первого ручного Deploy приложения: до применения миграций база пустая, дамп меньше 10 КБ, и скрипт откажет — это ожидаемо.
- [ ] `[ЧЕЛОВЕК]` Опционально: копия дампов в S3 (`/home/deploy/.inex-predeploy.env`, rclone или aws).

### Бэкапы в S3 (РФ)

- [ ] `[ЧЕЛОВЕК]` Бакет в Yandex Object Storage или Selectel (§12):
  - приватный;
  - SSE;
  - lifecycle 30 дней для `inex-glass/`;
  - сервисный аккаунт с доступом только к этому бакету.
    Для Selectel endpoint и регион сверить в личном кабинете.
- [ ] `[ЧЕЛОВЕК]` Dokploy → Settings → Destinations → S3 → Test connection.
- [ ] `[ЧЕЛОВЕК]` Postgres → Backups: `0 3 * * *`, prefix `inex-glass/db/`, Enabled. Запустить вручную — **файл появился в бакете**.
- [ ] `[ЧЕЛОВЕК]` Volume Backups:
  - lead-files — `30 3 * * *`;
  - media — `0 4 * * *`;
  - prefix `inex-glass/volumes/`;
  - решение по **Turn off container**: ☐ включено (простой ночью) / ☐ выключено (риск неконсистентности). Отметить выбранное.
    Запустить вручную — **архивы в бакете**.

### Мониторинг

- [ ] `[ЧЕЛОВЕК]` Внешний uptime-монитор (§13):
  - `https://inexglass.ru/api/health/` — 1 мин, ожидается 200;
  - `https://inexglass.ru/` — keyword «Inex Glass»;
  - алерты в Telegram и на e-mail.
- [ ] `[ЧЕЛОВЕК]` Монитор срока сертификата (меньше 14 дней) и алерт на диск VDS больше 80 %.
- [ ] `[ЧЕЛОВЕК]` Ротация логов Docker: `max-size=10m`, `max-file=3` (§13).

### Почта

- [ ] `[ЧЕЛОВЕК]` SPF, DKIM и DMARC домена-отправителя для SMTP-провайдера (Яндекс 360 или Mail.ru). Ящик-отправитель, пароль приложения → `SMTP_*` в prod-env.
- [ ] `[ЧЕЛОВЕК]` **Проверить, что `MAIL_INTERCEPT_TO` в prod-env отсутствует.**

### Юридическое (152-ФЗ)

- [ ] `[ЧЕЛОВЕК]` Тексты политики ПДн и согласия утверждены юристом и внесены в CMS.
- [ ] `[ЧЕЛОВЕК]` Уведомление Роскомнадзора об обработке ПДн (pd.rkn.gov.ru) подано до начала сбора заявок.

## Запуск

- [ ] `[ЧЕЛОВЕК]` Коммит релиза прошёл CI и staging: в Actions есть deployment `staging` / `smoke-ok` (создан `github-actions[bot]` после health и smoke в job `deploy-staging`), а `pnpm smoke:prod` против staging (`SMOKE_EXPECT_ENV=staging`) зелёный.
- [ ] `[ЧЕЛОВЕК]` `git tag vX.Y.Z <commit> && git push origin vX.Y.Z` → Approve в environment `production`.
- [ ] `[ЧЕЛОВЕК]` Первый запуск: приложение `inex-glass-prod`, созданное с образом `sha-…` и задеплоенное вручную (Deploy в Dokploy), применяет миграции при первом health. После этого дамп схемы весит ≈ 2 МБ, и pre-deploy шаг workflow проходит. Совсем пустая база (приложение ещё ни разу не стартовало) даёт дамп меньше 10 КБ, и скрипт откажет — это защита, а не сбой: сначала ручной Deploy, потом тег.
- [ ] `[ЧЕЛОВЕК]` Job `deploy-prod` зелёный: дамп создан, health показывает новый `release`, smoke без FAIL. Вывод smoke приложить к `docs/reports/acceptance.md`.
- [ ] `[ЧЕЛОВЕК]` `https://inexglass.ru/admin/`: создать первого администратора (пароль в менеджере паролей; 2FA в Payload нет) и пользователей-менеджеров.
- [ ] `[ЧЕЛОВЕК]` Наполнение из образа `tools` (§9, «Скрипты на prod»): ручной дамп, затем `pnpm seed --full`, затем `attach-generated-media` (сначала `--dry-run`).
- [ ] `[ЧЕЛОВЕК]` Импорт inex.su, если заказчик решил импортировать (§9):
  - в `tools` с примонтированными кэшем Firecrawl, `.import-tmp`, `docs/reports` и `/data/media`;
  - `IMPORT_PROD_GUARD_HOSTS` задан;
  - запуск с `--i-know-this-is-prod`;
  - затем `fix-csv --check-db`.
- [ ] `[ЧЕЛОВЕК]` После импорта — `reindex-search.ts` ночью (не атомарен, сбрасывает кэш), затем smoke.
- [ ] `[ЧЕЛОВЕК]` Админка → «Настройки сайта»:
  - ID Метрики, верификации Вебмастера и Search Console;
  - e-mail уведомлений, праздники, «21 год»;
  - `contacts` и `requisites` — данные Inex.
- [ ] `[ЧЕЛОВЕК]` Тестовая заявка через форму сайта с пометкой «SMOKE»:
  - письмо пришло на реальный ящик;
  - файл загрузился (проверка записи в том `/data/lead-files`);
  - IP в `consent-log` — внешний, не `10.x`/`172.x`/`unknown` (§4, «Реальный IP клиента»).
    После проверки удалить заявку.
- [ ] `[ЧЕЛОВЕК]` Тестовое письмо о статусе заказа на реальный ящик, затем удалить тестовые данные.
- [ ] `[ЧЕЛОВЕК]` Smoke с браузерной проверкой: `SMOKE_BASE_URL=https://inexglass.ru pnpm smoke:prod -- --browser`. Ожидается: баннер есть, Метрика загружается только после «Принять».
- [ ] `[ЧЕЛОВЕК]` Restore-drill (§12):
  - скачать первый S3-бэкап БД;
  - `scripts/ops/restore-check.sh <файл>`;
  - результат записать сюда в формате: `дата / файл / pages / leads / payload_migrations / последняя миграция`.

## После запуска: первые 24 часа

- [ ] `[ЧЕЛОВЕК]` HSTS поднят с 300 до `31536000` (§5), smoke-проверка `headers` проходит (PASS, а не WARN); для строгой проверки — `SMOKE_HSTS_MIN_AGE=31536000 pnpm smoke:prod --only=headers`.
- [ ] `[ЧЕЛОВЕК]` Яндекс.Вебмастер и Google Search Console:
  - права подтверждены;
  - sitemap `https://inexglass.ru/sitemap.xml` отправлен;
  - регион «Челябинск».
- [ ] `[ЧЕЛОВЕК]` Метрика: счётчик с Вебвизором получает визиты после согласия.
- [ ] `[ЧЕЛОВЕК]` Включить `indexNowEnabled` в «Настройках сайта», затем `indexnow-all.ts` из `tools` (сначала `--dry-run`).
- [ ] `[ЧЕЛОВЕК]` Первые ночные бэкапы (БД и тома) есть в бакете; uptime-монитор не алертил.
- [ ] `[ЧЕЛОВЕК]` Логи приложения (Dokploy → Logs): нет повторяющихся ошибок `[health]`, `[sitemap]`, `[mail]`, `[form-token]`.

## После запуска: 14 дней

- [ ] `[ЧЕЛОВЕК]` Индексация новых страниц в Вебмастере и Search Console. Только после неё — передать команде inex.su исправленный CSV (`docs/inex/12-migration-inex-su.fixed.csv`) для 301 inex.su → inexglass.ru (порядок — `docs/inex/12-migration-inex-su.md`).
- [ ] `[ЧЕЛОВЕК]` Размер ISR-кэша и диска (§4, «Рост ISR-кэша»): `docker exec <app> du -sh /app/.next/server/route-cache`. Если больше 1 ГБ — перезапуск и заявка на LRU `cacheHandler`.
- [ ] `[ЧЕЛОВЕК]` Ротация `/var/backups/inex` работает (не больше `KEEP` файлов); в бакете lifecycle удаляет объекты старше 30 дней.
- [ ] `[ЧЕЛОВЕК]` Повторный restore-drill — далее ежемесячно (напоминание в календаре).
- [ ] `[ЧЕЛОВЕК]` Сертификат продлевается автоматически: монитор показывает больше 60 дней после первого продления.

## Журнал restore-drill

| Дата       | Файл                                      | pages | leads | payload_migrations | Последняя миграция         | Кто             |
| ---------- | ----------------------------------------- | ----- | ----- | ------------------ | -------------------------- | --------------- |
| 21.10.2026 | локальная копия dev-БД (проверка скрипта) | 26    | 21    | 4                  | 20261021_065527_add_search | агент (не prod) |
