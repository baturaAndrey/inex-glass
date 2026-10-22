# Task 13: Приёмка редизайна админки, документация, Docker CA

## Status

pending

## Wave

4

## Description

Финальная задача спеки: независимая проверка всей работы волн 1–3 (полный прогон lint / typecheck / unit / build / e2e во всех проектах), сквозные e2e-смоуки новой админки (меню, дашборд, канбан, карточка заявки, webhook MAX), скриншоты 4 экранов против макета на 375 / 1366 / 1920 в `docs/reports/admin-redesign/`, поддержка корневого сертификата Минцифры (`NODE_EXTRA_CA_CERTS`) в Docker-образе, документация (раздел «Админка» в `DESIGN.md`, заметка в `AGENTS.md`, `docs/deploy.md`, `action-required.md`), код-ревью и отчёт `docs/reports/admin-redesign.md`. Функциональность не добавляется; найденные дефекты чинятся точечно или передаются координатору.

## Dependencies

**Depends on:** task-08-lead-card-processing.md, task-09-lead-history-comments.md, task-10-max-notifications.md, task-11-draft-preview.md, task-12-admin-screens-theme.md (а значит — все задачи спеки)
**Blocks:** None

**Context from dependencies:**
- **Волна 1.** task-01: миграция `admin_redesign` (expand-only): `leads.refuseReasonCode`/`kpAmount`/`updatedBy`, `pages.updatedBy`, поля MAX у `users` (`maxUserId`, `maxLinkedAt`, `maxBotStopped` — systemOnly; `maxLinkTokenHash`, `maxLinkTokenExpiresAt` — neverReadable), группа `site-settings.notifications.max` (тумблеры `newLead|statusChange|assigned|orderEvents|unassignedReminder`, `groupChatId|Title|LinkedAt`, хэш одноразового кода группы), скрытая коллекция `notification-log`, задания `max-notify` и `max-unassigned-reminder` (cron `*/15`, очередь `maintenance`), заглушки компонентов/хуков. task-02: тема (`admin.theme: 'light'`, Rubik, логотип), `src/styles/ig-vars.css`, `custom.scss` + партиалы `src/app/(payload)/styles/_*.scss` (по одному на задачу), базовые классы `.iga-*` в `_base.scss`, зависимости (`sass`, `@dnd-kit/*`), удалён `afterNavLinks`.
- **Волна 2.** task-03: своё меню `src/payload/admin/nav/*` (группы «Работа» / «Сайт» / «Каталог и цены» / «Система», счётчики новых заявок и заказов в работе, бургер ≤ 1100 px, пункт «Отчёты» с `id="nav-leads-report"`). task-04: дашборд `src/payload/admin/views/dashboard.tsx` + `src/lib/admin-dashboard/*`. task-05: канбан `/admin/collections/leads/kanban/` (`src/payload/admin/leads/kanban/*`; колонки из `lead-statuses`, dnd мышью/тачем/клавиатурой, диалог отказа с кодом причины, подтверждение «Договора», «Взять себе», мобильные вкладки + «Перенести в…», переключатель «Канбан / Таблица»). task-06: MAX — `src/lib/max/{client,target,html,link-token}.ts`, webhook `POST /api/max/webhook/` (секрет `X-Max-Bot-Api-Secret` через `timingSafeEqual`, rate-limit, сразу 200), кнопка «Подключить MAX» в профиле (deep link `https://max.ru/<MAX_BOT_NAME>?start=<token>`), привязка группы по одноразовому коду, env `MAX_BOT_TOKEN`, `MAX_WEBHOOK_SECRET`, `MAX_ENABLED`, `MAX_BOT_NAME`, `MAX_INTERCEPT_CHAT_ID` в `src/lib/env.ts` и `env.example` (точные имена эндпоинтов выдачи токена/кода — смотреть в `src/app/api/max/**` и `src/payload/admin/max/*`). task-07: форма страницы (SEO-счётчики 70/170, превью сниппета, «Изменена / Кем»).
- **Волна 3.** task-08: карточка заявки `/admin/collections/leads/<id>/summary/` по `Lead.dc.html` (регионы «Контакты», «Что нужно клиенту», «Файлы», «Комментарии и история», «Откуда пришёл клиент», «Обработка» с «Флаги», «Повторные обращения», «Согласие на обработку ПДн»; панель обработки PATCH-ит `/api/leads/:id/`). task-09: регионы «Комментарии» и «История», обновлённые `e2e/admin-leads.spec.ts` и `e2e/acceptance/lead-flow.spec.ts`. task-10: уведомления MAX (идемпотентность через `notification-log`, напоминание, удаление сообщений при стирании ПДн). task-11: превью черновика страниц (`/api/preview/`, баннер, `e2e/preview.spec.ts`, 11c). task-12: остальные экраны в теме (`_screens.scss`).
- Окружение e2e: `playwright.config.ts` (проекты `mobile-375`, `desktop-1366`, `desktop-1920`; локально `next start -p 3100` на БД `inex_glass_test`, env из `e2eServerEnv()` в `e2e/helpers/env.ts`, `JOBS_ENABLED=false`, `SITE_ENV=development`); админ — только через `adminApi`/`signInBrowser`/`staffApi` (`e2e/helpers/admin-api.ts`) и `loginAdmin` (`e2e/helpers/admin.ts`); мутирующие тесты — сериально в `desktop-1366`.
- Docker: `Dockerfile` (стадии `base` → `deps` → `build` → `tools` / `runner`, runner — `node:24-slim`, пользователь `node`), `.dockerignore` исключает `docker/`, `*.pem`, `*.md`, `docs`, `specs`, `res`. `docker-compose.yml` — только dev-сервисы (Postgres, Mailpit), сервиса приложения нет — его не менять.

## Files to Create

- `e2e/admin-redesign.spec.ts` — сквозные смоуки новой админки и webhook MAX
- `e2e/admin-redesign-screens.spec.ts` — скриншоты 4 экранов приложения и макета (запуск по флагу)
- `docs/reports/admin-redesign.md` — отчёт приёмки
- `docs/reports/admin-redesign/*.png` — скриншоты (`<screen>-<width>-app.png`, `<screen>-<width>-mockup.png`)
- `docker/certs/.gitkeep` — каталог для корневого сертификата

## Files to Modify

- `Dockerfile` — копирование `docker/certs/` в runner (`/app/certs/`), комментарий про `NODE_EXTRA_CA_CERTS`
- `.dockerignore` — исключение для `docker/certs/` (сейчас весь `docker/` и `*.pem` исключены)
- `e2e/helpers/env.ts` — в `e2eServerEnv()` тестовый `MAX_WEBHOOK_SECRET` (и прочие MAX-переменные, если task-06 их не добавила), `MAX_ENABLED: 'false'`
- `.env.test.example` — те же переменные с пояснением
- `DESIGN.md` — новый раздел «14. Админка»
- `AGENTS.md` — заметка в «PROJECT FACTS» про админку
- `docs/deploy.md` — переменные MAX, подписка webhook, `NODE_EXTRA_CA_CERTS`
- `specs/admin-redesign/action-required.md` — уточнить тексты пунктов по факту реализации (имена кнопок, команды, путь сертификата); галочки не ставить
- Точечные исправления дефектов, найденных приёмкой, — в файлах любой задачи спеки, с записью в отчёте (крупное — координатору)

**Не трогать:** схему (коллекции/глобалы/миграции), `package.json`/`pnpm-lock.yaml`, `docker-compose.yml`.

## Technical Details

### 1. Проверки качества

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e                       # все три проекта
pnpm generate:types && pnpm generate:importmap && git diff --exit-code src/payload-types.ts "src/app/(payload)/admin/importMap.js"
pnpm migrate:status                 # admin_redesign применена
```

- Откат миграции на чистой тестовой БД: `pnpm payload migrate:down` до `admin_redesign` и обратно `pnpm migrate` (Postgres с `max_locks_per_transaction=256`, см. `docker-compose.yml`) — результат в отчёт.
- `e2e/acceptance/visual.spec.ts` — baseline публичного сайта не изменился (вынос `ig-vars.css`, баннер превью).
- Существующие e2e, затронутые спекой, обязаны проходить: `admin-leads.spec.ts`, `acceptance/admin.spec.ts`, `acceptance/lead-flow.spec.ts`, `acceptance/roles.spec.ts`, `orders.spec.ts`, `placeholder-media.spec.ts`, `preview.spec.ts`.

### 2. `e2e/admin-redesign.spec.ts`

Проект `desktop-1366` для мутирующих тестов (`test.describe.configure({ mode: 'serial' })`), просмотровые — во всех трёх (мобильный — проверка бургера и мобильного канбана). Фикстуры — через REST под e2e-админом, с маркером запуска в `company`, удаление в `afterAll` (как в `admin-leads.spec.ts`). Менеджер — `staffApi(admin, 'manager')`.

1. **Меню**: на `/admin/` видны группы «Работа», «Сайт», «Каталог и цены», «Система»; пункт «Заявки» со счётчиком (число совпадает с REST `count` новых заявок, допуская параллельные спеки — проверка «между до и после», как в `admin-leads.spec.ts`); `#nav-leads-report` ведёт на `/admin/leads-report/`; у менеджера нет группы «Система» (или нет «Пользователи»), «Сайт» виден. На `mobile-375` меню открывается бургером и закрывается.
2. **Дашборд**: на `/admin/` есть блоки «Требует внимания», «Пульс», воронка, источники, заказы, «Последние заявки»; созданная фикстура видна в «Последних заявках» со ссылкой на `/admin/collections/leads/<id>/summary/`.
3. **Канбан**: `/admin/collections/leads/kanban/` — колонки по статусам; перенос карточки фикстуры клавиатурой (фокус → пробел → стрелка → пробел, как в `@dnd-kit`) в «В работе» → REST показывает новый статус; перенос в «Отказ» открывает диалог причины, «Дорого» → сохраняется; на `mobile-375` — вкладки колонок и «Перенести в…».
4. **Карточка**: из канбана клик по карточке → `/summary/`; панель «Обработка»: «Назначить себя» → в «Истории» строка «Ответственный: …»; добавление комментария; «Позвонить» — `href` начинается с `tel:`.
5. **Права**: менеджер не может `DELETE /api/leads/:id/` (403), не может `PATCH /api/users/<другой>/` с `maxUserId` (403 или поле проигнорировано), не видит `notification-log` по REST (403), не может `PATCH /api/pages/:id/` (403), но читает страницы в админке.
6. **Webhook MAX** (`POST /api/max/webhook/`):
   - без заголовка `X-Max-Bot-Api-Secret` и с неверным секретом → отказ (401/403 по реализации task-06), тело ответа без деталей;
   - с верным секретом (`MAX_WEBHOOK_SECRET` из `e2eServerEnv`) и неизвестным `update_type` → 200;
   - привязка лички: менеджер получает токен через эндпоинт кнопки «Подключить MAX» (task-06; извлечь `start=` из deep link), затем webhook `{ update_type: 'bot_started', timestamp, chat_id: 'e2e-chat', user: { user_id: <уникальный>, name: 'E2E' }, payload: <token> }` → `GET /api/users/me/` (менеджер) показывает `maxUserId`; повтор того же токена — не перепривязывает (одноразовый); `bot_stopped` → `maxBotStopped: true`;
   - не превышать rate-limit webhook (не более 10 запросов в тесте).
   Если эндпоинт выдачи токена не доступен по REST (только server action) — шаг привязки выполнить через UI профиля (кнопка «Подключить MAX» → ссылка с `start=`).
7. **Доставка MAX** в e2e не проверяется: `JOBS_ENABLED=false`, `MAX_ENABLED=false`; покрыта unit-тестами task-10 (`src/lib/max/notify.test.ts`) и ручной проверкой на staging (пункт `[ЧЕЛОВЕК]` в отчёте). Если task-06 добавила переопределение базового URL API MAX (например, `MAX_API_BASE_URL`) — допускается дополнительный тест с локальным HTTP-моком (порт `E2E_PORT + 99`) и запуском задания через Local API в `payload run`-скрипте; иначе — аннотация в отчёте.

### 3. Скриншоты (`e2e/admin-redesign-screens.spec.ts`)

- Запуск только при `ADMIN_REDESIGN_SCREENSHOTS=1` (иначе `test.skip`), во всех трёх проектах: `ADMIN_REDESIGN_SCREENSHOTS=1 pnpm test:e2e -- e2e/admin-redesign-screens.spec.ts`.
- Экраны приложения: дашборд (`/admin/`), канбан (`/admin/collections/leads/kanban/`), карточка заявки (фикстура с файлом, флагами, оценкой, комментарием), форма страницы (главная или «О компании»). Полностраничные (`fullPage: true`), анимации выключены. Сохранять в `docs/reports/admin-redesign/<screen>-<375|1366|1920>-app.png` (`screen` = `dashboard|kanban|lead|page-edit`).
- Макет: `res/admin-mockup/{Main,Leads,Lead,PageEdit}.dc.html` открыть через `file://` (абсолютный путь от корня репозитория; `support.js` в каталоге нет — разметка рендерится как есть, шрифт Rubik грузится с Google Fonts только в этом тесте-документации, не в приложении) → `<screen>-<width>-mockup.png`.
- Сравнение — визуальное (человеком/ревьюером), расхождения — таблицей в отчёте (экран, ширина, что отличается, критично/нет, кто чинит).
- PNG сжать (Playwright по умолчанию PNG; при объёме > 1 МБ на файл — `scale: 'css'`), суммарно ≤ 20 МБ.

### 4. Docker и корневой сертификат

- Каталог `docker/certs/` (в git — `.gitkeep`; сам сертификат `russian_trusted_root_ca.pem` — публичный, его кладёт человек, см. `action-required.md`, либо агент скачивает с https://www.gosuslugi.ru/crt, если доступно, и коммитит).
- `.dockerignore`: после строки `docker` добавить `!docker/certs` и `!docker/certs/**`, после `*.pem` — `!docker/certs/*.pem` (порядок важен: последнее правило побеждает). Комментарий — зачем.
- `Dockerfile`, стадия `runner`, после копирования `.next/static`:
  ```dockerfile
  # Optional extra root CAs (e.g. Russian Trusted Root CA for platform-api2.max.ru).
  # Enable at runtime: NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_root_ca.pem (Dokploy env).
  COPY --chown=node:node docker/certs/ ./certs/
  ```
  `ENV NODE_EXTRA_CA_CERTS` в образе **не** задавать (если файла нет, Node пишет предупреждение при старте); переменная задаётся в Dokploy. Проверить: `docker build --target runner .` проходит с пустым каталогом и с сертификатом; в контейнере `node -e "fetch('https://platform-api2.max.ru/me',{headers:{Authorization:'x'}}).then(r=>console.log(r.status))"` даёт HTTP-статус (401), а не ошибку TLS — результат в отчёт (или `[ЧЕЛОВЕК]`, если сети нет).
- `docker-compose.yml` не меняется (в нём нет сервиса приложения).

### 5. Документация

**`DESIGN.md` → раздел «14. Админка»** (после «13. Что нельзя»; кратко, по-русски):
- админка — Payload 3.91 со своей темой, **без Tailwind** (preflight конфликтует); только светлая (`admin.theme: 'light'`);
- токены — общие с сайтом: `src/styles/ig-vars.css` (вынесенный `:root`), импортируются и в `ig-tokens.css` сайта, и в `custom.scss` админки;
- стили — SCSS: `src/app/(payload)/custom.scss` содержит только `@use` партиалов `src/app/(payload)/styles/_*.scss`; таблица «партиал → назначение» (`_base` — переменные Payload и базовые `.iga-*`; `_nav`; `_dashboard`; `_kanban`; `_max`; `_edit-form`; `_lead-card`; `_lead-history`; `_screens`);
- классы `.iga-*` из `_base.scss` с вариантами (`.iga-card`, `.iga-btn--primary|secondary|ghost|danger|sm`, `.iga-badge--new|work|kp|ok|no` + `--iga-badge-color`, `.iga-tag`, `.iga-chip[aria-pressed]`, `.iga-seg`, `.iga-input`, `.iga-select`, `.iga-field`, `.iga-dl`, `.iga-bar`, `.iga-page-head`, `.iga-section-head`, `.iga-avatar`);
- правила: новые компоненты админки используют `.iga-*`, свои классы — с префиксом экрана в своём партиале; никаких inline-цветов и `var(--theme-*)` в `style`; ссылки — `<a>`; server components по умолчанию; изменения заявок из UI — `PATCH /api/leads/:id/` + `router.refresh()`; адаптив 375 / 1366 / 1920; меню navy `#324B64`, основная кнопка `#267D70`; цвета логотипа — только в логотипе;
- макет-эталон — `res/admin-mockup/*.dc.html`.

**`AGENTS.md` → «PROJECT FACTS»** — 3–4 пункта: админка = Payload + тема (`DESIGN.md` §14), Tailwind в админку не подключать; стили админки — по партиалу на фичу в `src/app/(payload)/styles/`; уведомления MAX — `src/lib/max/*`, задания `max-notify`/`max-unassigned-reminder`, идемпотентность через `notification-log`, на не-prod — только `MAX_INTERCEPT_CHAT_ID`; превью черновиков — `/api/preview/` (Draft Mode), загрузчик `getPageByPath`.

**`docs/deploy.md`** — подраздел «MAX»: переменные (`MAX_ENABLED`, `MAX_BOT_TOKEN`, `MAX_BOT_NAME`, `MAX_WEBHOOK_SECRET` ≥ 32 символов, `MAX_INTERCEPT_CHAT_ID` на staging), подписка webhook (команда/скрипт task-06 или `curl` на `POST https://platform-api2.max.ru/subscriptions`), привязка группы и личек, `NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_root_ca.pem`, поведение на staging; задания выполняет только контейнер с `JOBS_ENABLED=true`.

**`specs/admin-redesign/action-required.md`** — сверить каждый пункт с реализацией: точные подписи кнопок («Подключить MAX», «Привязать чат» — как в UI), путь сертификата `docker/certs/russian_trusted_root_ca.pem` + переменная, команда подписки webhook (если скрипта `max:subscribe` нет в `package.json` — заменить на `curl`-команду); добавить пункт проверки уведомлений на staging (5 событий + стирание ПДн удаляет сообщение).

### 6. Код-ревью

- Запустить агента код-ревью (или `/code-review high`) по diff спеки (`git diff 6ee63b1...HEAD`), отдельно — security-проход по: webhook MAX (секрет, rate-limit, отсутствие логирования тела), роуты превью (open redirect, доступ), `notification-log` (доступ, отсутствие ПДн в логах), field access полей MAX, стирание ПДн.
- Проверить ручным grep: нет `var(--theme` и `#xxxxxx` цветов в inline `style` в `src/payload/admin/**` (кроме `--iga-badge-*`); нет `next/link` в админке; нет `console.log`; нет Tailwind-классов в компонентах админки; `custom.scss` содержит только `@use`.
- Найденное: блокирующее — исправить в этой задаче (точечно) или вернуть координатору; остальное — таблица в отчёте.

### 7. Отчёт `docs/reports/admin-redesign.md`

Разделы: версия/коммит и окружение; вердикт (готово к staging / условия); таблица автоматических проверок (команда → результат, число тестов); миграция (применение/откат); e2e по проектам; скриншоты (ссылки на PNG, таблица расхождений с макетом); MAX (что проверено автоматически, что — `[ЧЕЛОВЕК]` на staging); Docker CA; код-ревью и security (находки, статус); открытые вопросы и решения для координатора; пункты `[ЧЕЛОВЕК]` (из `action-required.md`).

## Acceptance Criteria

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` (все 3 проекта) зелёные; результаты с числами — в отчёте.
- [ ] После `pnpm generate:types && pnpm generate:importmap` diff пуст; миграция `admin_redesign` применяется и откатывается на чистой БД.
- [ ] `e2e/admin-redesign.spec.ts` покрывает меню, дашборд, канбан (клавиатурный перенос и диалог отказа), карточку, права менеджера и webhook MAX (секрет, привязка, одноразовость токена, `bot_stopped`) и проходит.
- [ ] В `docs/reports/admin-redesign/` по 3 ширины × 4 экрана для приложения и макета; расхождения перечислены в отчёте с оценкой критичности.
- [ ] Образ собирается с пустым `docker/certs/` и с сертификатом; `NODE_EXTRA_CA_CERTS` описан в `docs/deploy.md`; `.dockerignore` пропускает только `docker/certs/`.
- [ ] `DESIGN.md` содержит раздел «14. Админка»; `AGENTS.md` — заметку; `action-required.md` и `docs/deploy.md` соответствуют реализации.
- [ ] Код-ревью и security-проход выполнены, блокирующих находок нет (или они исправлены/переданы с записью в отчёте).
- [ ] `docs/reports/admin-redesign.md` создан по структуре раздела 7.

## Notes

- Staging может ещё не существовать (как в приёмке прошлой спеки) — тогда приёмка локальная production-подобная (`pnpm build && next start`, `SITE_ENV=staging` для проверки перехвата MAX), а проверки с реальным ботом помечаются `[ЧЕЛОВЕК]`.
- Не запускать e2e против общей dev-БД; только `inex_glass_test` или staging.
- `payload-types.ts` в волне 4 меняться не должен; если генератор даёт diff — это дефект волн 1–3, сообщить координатору.

## Поправки координатора (приоритет над текстом выше)

- task-06 добавляет необязательную env `MAX_API_BASE_URL` (по умолчанию `https://platform-api2.max.ru`): e2e доставки MAX мокать через неё (локальный mock-сервер).
- Эндпоинт выдачи токена привязки — `POST /api/max/link-token/` (task-06); проверять привязку через него + имитацию `bot_started`.
- Подписка webhook: `pnpm payload run scripts/max-subscribe.ts` (скрипт task-06), URL со слешем: `https://<домен>/api/max/webhook/`.
- Бот GRATEC общий с другим сайтом; тестовый чат — их рабочий канал с подписчиками. Реальные отправки при приёмке — минимум, только с пометкой «[ТЕСТ] Inex Glass» (проверить на скриншоте/логе). Webhook на общий бот не ставить без согласования с пользователем (`max-subscribe` без `--force` не перезапишет чужую подписку).
