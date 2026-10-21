# Action Required: сайт Inex Glass

Шаги, которые выполняет человек. Агенты их не автоматизируют.

## Before Implementation

- [ ] **Убедиться, что Docker Desktop запущен.** Нужен для `docker-compose` (Postgres 18 + Mailpit) при локальной разработке и тестах.
- [ ] **Создать GitHub-репозиторий и добавить remote.** От этого зависят CI, GHCR и деплой.
- [ ] **Проверить ключи в `.env`:** `KIE_AI_API_KEY`, `WORDKEEPER_API_KEY`, `EXA_API_KEY`, `FIRECRAWL_API_KEY`. Проверено 20.10: все заданы.
- [ ] **Пополнить баланс kie.ai и Firecrawl, если нужно.** Генерация примерно 60 изображений и обход inex.su (около 450 URL) расходуют кредиты.
- [ ] **kie.ai: баланс исчерпан (осталось 3 кредита после задачи 09).** Пополнить ~56 кредитов и перегенерировать: `pnpm tsx --env-file=.env scripts/gen-images.ts --only-redo` (лишний текст на картинках / не по ТЗ; записи помечены `needsRedo` в `public/generated/manifest.json`). Итого ~56 кредитов.

## During Implementation

- [ ] **Dokploy: создать проект и подключить GHCR registry** (pull-секрет). Нужно для задачи 03: деплой staging.
- [ ] **Dokploy: создать сервис Postgres для staging** и передать `DATABASE_URL` в env приложения. Задача 03.
- [ ] **DNS: добавить A-запись поддомена staging** (например, `dev.inexglass.ru`) на IP VDS. Задача 03.
- [ ] **GitHub: добавить секреты Actions** (задача 03, см. `docs/deploy.md`): `DOKPLOY_URL`, `DOKPLOY_STAGING_API_KEY` (секрет environment `staging`), `DOKPLOY_PROD_API_KEY` (секрет environment `production`; отдельные ключи — см. раздел task-41), `DOKPLOY_STAGING_APP_ID`, `DOKPLOY_PROD_APP_ID`, `GHCR_PULL_USERNAME`, `GHCR_PULL_TOKEN` (classic PAT с `read:packages` — Dokploy `saveDockerProvider` требует креды registry при каждом вызове); variables `STAGING_URL`, `PROD_URL`; environments `staging` и `production`. Задачи 03 и 41.
- [ ] **Выдать агенту env staging:** `PAYLOAD_SECRET`, `FORM_HMAC_SECRET`, `ORDER_TOKEN_SECRET` (каждый — случайная строка ≥ 32 символов, например `openssl rand -base64 48`), логин и пароль basic auth, `MAIL_INTERCEPT_TO`. Задача 03. Секреты staging и prod разные. `ORDER_TOKEN_SECRET` после запуска не менять: при смене секрета все ссылки `/zakaz/…` перестанут работать.
- [ ] **Dokploy: сверить API деплоя в Swagger своей инсталляции** (`<DOKPLOY_URL>/swagger`): процедуры обновления образа и redeploy. Либо выдать webhook приложения. Задачи 03 и 41.
- [ ] **Создать первого администратора в `/admin/`** после первого деплоя или передать учётные данные для seed. Задачи 01 и 03.
- [ ] **SMTP: создать ящик на домене** (Яндекс 360 или Mail.ru), выдать пароль приложения, настроить SPF, DKIM и DMARC. Задачи 18 и 41.
- [ ] **Яндекс.Метрика: создать счётчик с Вебвизором** и внести его ID в «Настройки сайта». Задача 19.
- [ ] **Утвердить список спорных URL миграции** (`docs/reports/migration-disputed.md`). Задача 37.
- [ ] **Wordkeeper: проверить, что тариф даёт доступ к API, и передать документацию API** (base URL, авторизация) или CSV-выгрузку Wordstat. Без этого отчёт по частотности будет только офлайн. Задача 40.
- [ ] **Задать вопросы Inex** (ответы нужны до приёмки, задачи 40 и 42):
  - В description `/obekty/` и `/o-kompanii/` в 17-meta стоит «1500+ проектов за 21 год» / «21 год, 1500+ проектов», а ТЗ §11 разрешает только формулировку «За 21 год специалисты Inex выполнили более 1500 проектов». Оставить мету как есть или переписать? Пока аудит отмечает это в мете как warn, а в тексте страниц — как error.
  - «М1» в списке стоп-слов (заводов-партнёров). Статья `/blog/markirovka-zakalennogo-stekla/` использует «М1» как марку стекла, поэтому для неё сделано исключение в allowlist аудита. Подтвердить; прислать полный список названий заводов-партнёров.
  - Дата окончания акции «−5% от 100 м²» (в сиде стоит заглушка 31.12.2026).
  - Тексты, которых нет в teksty: «Продолжаем ваш расчёт», подписи конструктора триплекса, «Место клейма», «Комментарий», ошибка загрузки файла. Задача 20.
- [ ] **GitHub Environment `production` с required reviewers и секреты prod-деплоя** (`PROD_SSH_*`, `DOKPLOY_*`, variables `PROD_PG_SERVICE`, `PROD_URL`). Задача 41.

## After Implementation

- [ ] **DNS прода: A-записи `inexglass.ru` и `www`** на VDS. Задача 41.
- [ ] **Dokploy prod:** приложение, Postgres, volumes, домены и SSL, бэкапы в S3 в РФ (Yandex Object Storage или Selectel: бакет и ключи). Задача 41.
- [ ] **Подтвердить сайт в Яндекс.Вебмастере и Google Search Console.** Коды верификации внести в «Настройки сайта», указать регион «Челябинск», отправить sitemap. Задача 36.
- [ ] **IndexNow:** сгенерировать `INDEXNOW_KEY` (`openssl rand -hex 16`) и записать его в env prod в Dokploy. После запуска включить `indexNowEnabled` в «Настройках сайта» и один раз выполнить `scripts/indexnow-all.ts` из образа `tools`. Задачи 36 и 41.
- [ ] **HSTS на prod:** подключить middleware Traefik `headers` (`stsSeconds: 31536000`) через Dokploy. Задача 41.
- [ ] **Мониторинг:** внешний uptime-монитор `/api/health/` и главной, алерт по сроку сертификата и по заполнению диска. Задача 41.
- [ ] **Уведомить Роскомнадзор об обработке ПДн** (pd.rkn.gov.ru). До начала сбора заявок.
- [ ] **Получить от Inex и внести в CMS:**
  - финальный SVG логотипа;
  - реквизиты и PDF карточки предприятия;
  - текст политики ПДн, утверждённый юристом;
  - фото объектов;
  - данные сотрудников;
  - актуальные цены и дату;
  - собственные телефон и e-mail.
- [ ] **Заменить временные изображения** (фильтр «временные изображения» в медиатеке) реальными фото.
- [ ] **Дозаполнить и опубликовать черновики объектов** после импорта. Заполнить: город, тип, изделие, спецификацию, год.
- [ ] **Передать администратору inex.su исправленный CSV** (`docs/inex/12-migration-inex-su.fixed.csv`) для настройки 301. Делать после индексации новых страниц (ТЗ §9).
- [ ] **Проверить резервное восстановление БД** из бэкапа: один раз, до запуска.

## task-41: продакшен (добавлено задачей 41)

Полный порядок, команды и проверки — в `docs/runbooks/prod-launch-checklist.md` (пункты `[ЧЕЛОВЕК]`) и `docs/deploy.md`. Ниже — то, чего нет в пунктах выше.

- [ ] **Postgres staging и prod: `max_locks_per_transaction=256`** (Dokploy → БД → Advanced → Command: `postgres -c max_locks_per_transaction=256`). Без него падает откат миграции `content_schema` и `pg_restore --single-transaction`. Prod-БД — без публичного порта. Задача 41.
- [ ] **VDS: пользователь `deploy` для pre-deploy дампа.** Группа `docker`, без sudo, каталог `/var/backups/inex`. Ключ GitHub Actions ограничить `command="/usr/local/bin/inex-predeploy-dump"` (копия `scripts/ops/predeploy-dump.sh`). Задача 41.
- [ ] **GitHub (дополнительно к пунктам выше):**
  - **два разных API-ключа Dokploy вместо одного `DOKPLOY_API_KEY`** (иначе job staging может передеплоить prod в обход подтверждения `production`):
    - `DOKPLOY_STAGING_API_KEY` — секрет environment `staging`, ключ отдельного участника Dokploy с доступом только к `inex-glass-staging`;
    - `DOKPLOY_PROD_API_KEY` — секрет **только** environment `production`;
    - репозиторный секрет `DOKPLOY_API_KEY` удалить, ключ отозвать в Dokploy;
  - `STAGING_SMOKE_BASIC_AUTH` (`user:pass` basic auth staging) — секрет environment `staging`: job staging прогоняет smoke перед записью «staging проверен»;
  - secrets `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`, `PROD_SSH_KNOWN_HOSTS` (вывод `ssh-keyscan -p <порт> -t ed25519 <VDS>`, отпечаток сверить на сервере);
  - опционально `NOTIFY_TELEGRAM_TOKEN` и `NOTIFY_TELEGRAM_CHAT`;
  - variable `PROD_SSH_PORT`, если порт не 22;
  - environment `production`: deployment tags только `v*`.
    Задача 41.
- [ ] **Dokploy Swagger:** дополнительно сверить `application.one` (поле `dockerImage`): по нему workflow показывает образ для отката. Задача 41.
- [ ] **Dokploy prod: www → apex** через Advanced → Redirects (пресет www → non-www), проверка `curl -sI https://www.inexglass.ru/kontakty/` → 301. **HSTS** начинать со `stsSeconds: 300`, через сутки поднять до `31536000`, без `preload`. Если Traefik-middleware подключить не удаётся — согласовать с агентом запасной вариант в `proxy.ts`. Задача 41.
- [ ] **S3-бэкапы:**
  - lifecycle-правило бакета на 30 дней (retention Dokploy не задаёт);
  - Volume Backups для `lead-files` и `media`;
  - решение по «Turn off container» записать в чек-лист;
  - проверить тестовым запуском, что объекты появились в бакете.
    Задача 41.
- [ ] **Restore-drill:**
  - `scripts/ops/restore-check.sh <дамп из S3>` до запуска, затем ежемесячно (напоминание в календаре);
  - результат записать в журнал чек-листа.
    Задача 41.
- [ ] **Проверить реальный IP клиента за Traefik.** IP тестовой заявки в `consent-log` должен быть внешним, а не `10.x`/`172.x`/`unknown`. Иначе rate-limit сработает на всех посетителей разом. Задача 41.
- [ ] **Ротация логов Docker** на VDS (`max-size=10m`, `max-file=3`) и алерт на диск больше 80 %. Задача 41.
- [ ] **Импорт inex.su на prod — только из `tools`:**
  - примонтировать кэш Firecrawl, `scripts/.import-tmp` и `docs/reports`, перенесённые с машины, где делался обход;
  - задать `IMPORT_PROD_GUARD_HOSTS`;
  - запускать с `--i-know-this-is-prod`;
  - затем `fix-csv --check-db` и ночью `reindex-search.ts`.
    Задачи 37 и 41.
- [ ] **После первого прод-деплоя:**
  - `pnpm smoke:prod -- --browser` против `https://inexglass.ru`;
  - вывод smoke приложить в `docs/reports/acceptance.md` (задача 42).
    Задача 41.

---

> Эти шаги указаны и в соответствующих файлах задач.
