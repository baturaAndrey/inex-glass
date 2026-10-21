# Task 32: Админка заявок — модуль заявок по ТЗ §6.1

## Status

complete

## Wave

5

## Description

Довести Payload-админку коллекции `leads` до модуля заявок из ТЗ §6.1: список с колонками, фильтрами и поиском; карточка заявки со сводкой; редактируемые статусы с обязательной причиной отказа; ответственный с уведомлением по e-mail; внутренние комментарии; подсветка дублей; выгрузка CSV/XLSX за период; отчёт по источникам и статусам; удаление персональных данных по запросу субъекта (152-ФЗ). Задача **не меняет схему** (поля `leads` уже созданы и заморожены), только админ-конфиг, хуки, кастомные компоненты и API-роуты.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-17-lead-intake-uploads.md, task-18-email-jobs.md
**Blocks:** None (проверка модуля — task-42)

**Context from dependencies:**
- **task-10** заморозил схему CRM: `leads` (formType quiz/drawing/callback/sample/load/contacts/full; `sourceLabel`; `entryPage`; `utm{source,medium,campaign,term,content}`; `metrikaClientId`; `company`, `inn`, `name`, `phone`, `email`, `role`, `city`, `area`, `productType`, `comment`; `answers` JSON; `flags` (multi-select: small_volume, nonstandard_size, urgent, no_file, needs_docs); `files` → `lead-files`; `status` → `lead-statuses`; `refuseReason`; `assignee` → `users`; `internalComments[] {author, text, date}`; `isDuplicate`, `duplicateOf` (вычисляются в `beforeChange` по телефону/e-mail); versions включены), `lead-statuses` (name, order, color, isFinal, requiresReason, isContract), `lead-files` (приватная upload-коллекция, `access.read` — admin/manager), `consent-log` (lead, ip, userAgent, consentVersion, policyVersion, createdAt; создание только Local API), `orders` (lead rel), `users` (роли admin/manager; phone, messengerUrl, photo, position). Реальные имена и типы полей читайте в `src/payload/collections/crm/*.ts`, `src/payload/collections/users.ts`, `src/payload-types.ts`.
- **task-17:** создание заявок (`src/lib/leads/create-lead.ts`), защищённая выдача файлов `GET /api/lead-files/[id]/download/` (сессия admin/manager). Заявка создаётся со статусом «Новая» (первый по `order`).
- **task-18:** очередь заданий Payload; имена заданий: `notify-new-lead` `{ leadId }`, **`notify-assigned` `{ leadId: string, assigneeId: string }`** (письмо ответственному; нет e-mail → ошибка/ретрай) — его ставит эта задача. Постановка: `req.payload.jobs.queue({ task: 'notify-assigned', input: { leadId, assigneeId } })` (вне контекста Next — без `revalidate`).
- Роли: `admin` — всё, включая удаление; `manager` — читает/обновляет `leads`, не удаляет, не видит `users` кроме себя. Хелперы доступа — `src/payload/access/index.ts` (`isAdmin`, `isAdminOrManager`).

## Files to Create

- `src/payload/admin/leads/lead-list-quick-filters.tsx` — `beforeListTable`: быстрые фильтры (чипсы) и кнопка «Выгрузка»
- `src/payload/admin/leads/cells/status-cell.tsx` — бейдж статуса (цвет из `lead-statuses.color`)
- `src/payload/admin/leads/cells/contact-cell.tsx` — имя / телефон / e-mail в одну ячейку
- `src/payload/admin/leads/cells/source-cell.tsx` — источник (`formType` + `sourceLabel`) и страница входа
- `src/payload/admin/leads/cells/duplicate-cell.tsx` — бейдж «Повтор» со ссылкой на исходную заявку
- `src/payload/admin/leads/cells/flags-cell.tsx` — флаги (чипсы с подписями из `QUIZ_FLAG_LABELS`)
- `src/payload/admin/leads/lead-summary-view.tsx` — серверный вид-вкладка «Сводка» (ключевые данные, флаги, UTM, файлы со ссылками на скачивание, повторные обращения)
- `src/payload/admin/leads/erase-menu-item.tsx` — пункт меню «Удалить персональные данные…» (диалог подтверждения, только admin)
- `src/payload/admin/leads/export-panel.tsx` — панель выгрузки (период, формат, фильтры)
- `src/payload/admin/leads/constants.ts` — `SITE_TZ` (= `COMPANY_TZ` из домена), `LEAD_EXPORT_MAX_ROWS = 20000`, подписи formType
- `src/payload/admin/views/leads-report.tsx` — вид «Отчёт по заявкам»
- `src/payload/admin/nav/reports-nav-link.tsx` — ссылка «Отчёт по заявкам» в боковом меню (`afterNavLinks`)
- `src/payload/hooks/lead-status-validation.ts` — `beforeValidate`: причина отказа
- `src/payload/hooks/lead-assignee-notify.ts` — `afterChange`: смена ответственного → задание `notify-assigned`
- `src/payload/hooks/lead-comments.ts` — `beforeChange`: автор/дата комментариев, защита чужих
- `src/lib/leads-admin/csv.ts` (+ `csv.test.ts`) — сборка CSV (BOM, `;`, экранирование, защита от формул)
- `src/lib/leads-admin/export-rows.ts` (+ тест) — преобразование заявки в строку выгрузки, форматы дат
- `src/lib/leads-admin/period.ts` (+ тест) — границы периода в `SITE_TZ`, пресеты отчёта
- `src/lib/leads-admin/report.ts` (+ тест) — агрегация (по источникам, статусам, матрица, воронка, UTM, флаги) из набора счётчиков
- `src/lib/leads-admin/erase.ts` (+ тест на чистых частях) — логика удаления ПДн (`eraseLeadPersonalData(payload, id, actor)`)
- `src/lib/leads-admin/auth.ts` — `requireStaff(request)`/`requireAdmin(request)` через `payload.auth({ headers })`
- `src/app/api/admin/leads/export/route.ts` — `GET` выгрузка CSV/XLSX
- `src/app/api/admin/leads/[id]/erase/route.ts` — `POST` удаление ПДн
- `e2e/admin-leads.spec.ts`, `e2e/helpers/admin-api.ts` — e2e и REST-хелперы админа

## Files to Modify

- `src/payload/collections/crm/leads.ts` — **разрешено менять только** ключи `admin` (`components`, `listSearchableFields`, `defaultColumns`, `defaultSort`, `group`, `pagination`) и добавлять в `hooks` вызовы хуков из этой задачи. **Поля, access и версии не трогать** (отступление от «только admin» из брифа: хуки валидации/уведомления/комментариев нельзя прикрепить иначе; изменение не затрагивает схему БД и миграции).
- `src/payload.config.ts` — **разрешено добавить только** `admin.components.views.leadsReport` (`path: '/leads-report'`) и `admin.components.afterNavLinks` (ссылка отчёта). Остальное не менять. Правка согласована координатором (README, «Владение общими файлами»): в волне 5 `payload.config.ts` меняет только эта задача.

- `src/app/(payload)/admin/importMap.js`, `src/payload-types.ts` — **эта задача — владелец генерируемых файлов волны 5** (README): после правок выполнить `pnpm generate:importmap` и закоммитить результат. task-33 в той же волне генерирует их только локально; после слияния волны координатор перегенерирует.

**Не трогать:** поля/access любых коллекций, `src/lib/leads/*` (task-17), `src/jobs/*` и `src/emails/*` (task-18), `src/seed/**` (статусы сеет task-16), `package.json` (`exceljs` предустановлен task-10; если его нет — сообщить координатору).

## Technical Details

### Общие правила Payload-админки

- Пользовательские компоненты Payload 3 задаются путями-строками (`'/payload/admin/leads/cells/status-cell#StatusCell'` относительно `baseDir`/алиаса — сверьте формат с остальными компонентами проекта, см. `importMap.js`) и по умолчанию **серверные**; интерактивные помечайте `'use client'`. После добавления/переименования компонентов **запустить `pnpm generate:importmap`** (файл `src/app/(payload)/admin/importMap.js` генерируемый; при конфликте слияния с task-33 — не править вручную, а перегенерировать).
- `trailingSlash: true`: все клиентские `fetch` на `/api/…/` — со слешем; ссылки на `/admin` — обычные `<a>`.
- Использовать компоненты и хуки `@payloadcms/ui` (`Button`, `Pill`, `Banner`, `useAuth`, `useDocumentInfo`, `useListQuery`, `useTranslation` …); стили — CSS-переменные Payload (`--theme-*`), не токены публичного сайта. Админка — только русская локаль подписей в наших компонентах.
- Схему БД и `payload-types.ts` не менять; миграции не создавать.
- Для API Payload 3.91 (`beforeListTable`, `edit.beforeDocumentControls`/`editMenuItems`, `admin.components.views`, `afterNavLinks`, `ValidationError`, `payload.auth`, `payload.jobs.queue`) сверяться с документацией (context7).

### §6.1 — покрытие требований по строкам ТЗ

| Функция ТЗ | Реализация |
|---|---|
| **Список заявок** | `defaultColumns`: `createdAt` (дата, формат `DD.MM.YYYY HH:mm` в `SITE_TZ`), источник (`SourceCell`: подпись `formType` + `sourceLabel`, под ней `entryPage`), `company`, контакт (`ContactCell`), `area` (м²), `productType`, `status` (`StatusCell`), `assignee` (имя), дубль (`DuplicateCell`), флаги (`FlagsCell`, опционально скрыт). `defaultSort: '-createdAt'`, пагинация 25. **Фильтры:** встроенный конструктор Payload по всем полям + быстрые фильтры в `beforeListTable` (чипсы-ссылки с query `where[…]`): по статусу (по каждому `lead-status` со счётчиком), «Мои» (`assignee = текущий пользователь`), «Без ответственного», «Дубли» (`isDuplicate = true`), «С флагами», период (Сегодня / 7 дней / 30 дней / Месяц), источник (`formType`). **Поиск:** `listSearchableFields: ['company','name','phone','email','inn','sourceLabel','comment']` (+ нормализованный телефон, если в схеме есть поле `phoneNormalized` — проверить `leads.ts`). Массовые действия — встроенное в Payload «Edit» (смена статуса/ответственного у выделенных). |
| **Карточка заявки** | Стандартная форма редактирования (поля сгруппированы схемой task-08) + вкладка «Сводка» (`admin.components.views.edit.summary = { Component, path: '/summary', tab: { label: 'Сводка', href: '/summary' } }`): блоки «Контакты» (с `tel:`/`mailto:`), «Заявка» (formType, источник, площадь, изделие, город, комментарий, `answers` в виде читаемой таблицы ключ/значение — без «сырого» JSON), «Флаги» (чипсы с подписями), «Атрибуция» (entryPage, UTM, Client ID), «Файлы» (список из `files` с именем, размером и кнопкой «Скачать» → `/api/lead-files/<id>/download/`), «Повторные обращения» (живой запрос: другие `leads` с тем же нормализованным телефоном или e-mail, кроме текущей — дата, статус, ссылка), «Согласие» (из `consent-log`: дата, версия согласия/политики; IP не показывать менеджеру — только admin). **История изменений** — встроенная вкладка Versions (версии включены в схеме); в отчёте отметить: Payload не хранит автора версии (рекомендовано отдельным изменением схемы добавить `updatedBy`). |
| **Статусы** | Справочник `lead-statuses` редактирует только admin (access схемы). `seedLeadStatuses` task-16 создаёт 5 статусов (ниже). Валидация причины отказа — хук `lead-status-validation.ts`. Быстрая смена — поле `status` в форме и массовое редактирование. |
| **Ответственный** | Поле `assignee` (фильтр options по ролям — в схеме). Хук `lead-assignee-notify.ts` (`afterChange`): если `doc.assignee` изменился (сравнить `previousDoc.assignee` по id) и новый не пустой, не `context.skipAssigneeNotify` и это не создание от публичной формы без ответственного → `payload.jobs.queue({ task: 'notify-assigned', input: { leadId: doc.id, assigneeId } })`; ошибки очереди логируются (без ПДн) и не срывают сохранение. Уведомление о **новой** заявке на e-mail ответственного/общий ящик делает `notify-new-lead` (task-17/18) — здесь не дублировать. |
| **Комментарии** | Массив `internalComments`. Хук `lead-comments.ts` (`beforeChange`): для каждой новой строки (без `id`) проставляет `author = req.user.id`, `date = now`; строки, существовавшие в `originalDoc`, у не-admin должны остаться неизменными (иначе `ValidationError` «Чужие комментарии менять нельзя»). Комментарии не попадают в публичные API: проверка e2e — анонимный `GET /api/leads/` → 401/403. Поля author/date желательно сделать read-only в UI: если схема не позволяет, показать их в «Сводке». |
| **Дубли** | Поля `isDuplicate`/`duplicateOf` считает `beforeChange` task-08/17. Здесь: `DuplicateCell` (бейдж «Повтор» янтарный `#8A5A00` на `#FCF6EA`, ссылка на `duplicateOf`), быстрый фильтр «Дубли», блок «Повторные обращения» в сводке (в том числе у **первой** заявки: «Есть повторы: N»). |
| **Экспорт** | `GET /api/admin/leads/export/` — см. «Экспорт». UI: `ExportPanel` в `beforeListTable` (кнопка «Выгрузка» раскрывает панель: период с датами «с/по» и пресеты, формат CSV/XLSX, фильтр статуса/источника/ответственного; кнопка «Скачать» — переход по сформированной ссылке). |
| **Права** | Доступ определяется схемой task-08 (admin — всё, manager — read/update без delete). Задача **проверяет** их e2e (ниже) и скрывает админские действия (удаление ПДн, ссылка «IP согласия») от manager через `useAuth()`/серверный `req.user`. |
| **Хранение / удаление ПДн** | `POST /api/admin/leads/[id]/erase/` + пункт меню «Удалить персональные данные…» — см. «Удаление ПДн». Файлы и БД — в РФ (инфраструктурное требование task-03/41; здесь ничего не отправлять наружу). |
| **Отчёт** | Вид `leads-report` — см. «Отчёт». |

### Статусы (сид — task-16, `src/seed/minimal.ts`)

Статусы сеет **task-16** (`seedLeadStatuses` в `src/seed/minimal.ts`, выполняется и в `--minimal`, и в `--full`) ровно этим набором. Эта задача сид не создаёт и `src/seed/**` не меняет: только проверяет, что набор совпадает с таблицей ниже. Расхождение — сообщить координатору. Фикстуры e2e могут создавать недостающие статусы через REST.

| order | name | isFinal | requiresReason | isContract | цвет (фон / текст) |
|---|---|---|---|---|---|
| 10 | Новая | нет | нет | нет | `#EEF4FA` / `#2C5B86` |
| 20 | В работе | нет | нет | нет | `#FCF6EA` / `#8A5A00` |
| 30 | КП отправлено | нет | нет | нет | `#EAF3F1` / `#16403D` |
| 40 | Договор | да | нет | **да** | `#E6F4EA` / `#237A35` |
| 50 | Отказ | да | **да** | нет | `#FCEFEF` / `#B23B3B` |

Формат поля `color` — по схеме (посмотреть `lead-statuses.ts`; если там одно значение — хранить цвет текста, фон вычислять `color-mix`/альфа 12%).

### Хуки (`leads.ts` → `hooks`)

- **`lead-status-validation.ts`** (`beforeValidate`, на update и create): загрузить `lead-statuses` по `data.status` (id); если `requiresReason` и `refuseReason` пусто (после `trim`) → `throw new ValidationError({ collection: 'leads', errors: [{ message: 'Укажите причину отказа', path: 'refuseReason' }], req })`. Если статус сменился с «requiresReason» на другой — `refuseReason` оставлять (история).
- **`lead-assignee-notify.ts`** — выше. **`lead-comments.ts`** — выше.
- Хук `order-from-lead` (task-33) подключается самой task-33; конфликтов нет, оба добавляют элементы в `hooks.afterChange` (сохранять порядок: сначала уведомление, потом заказ).

### Экспорт `GET /api/admin/leads/export/`

- Параметры: `format=csv|xlsx` (по умолчанию csv), `from=YYYY-MM-DD`, `to=YYYY-MM-DD` (включительно; границы в `SITE_TZ`: `from` → 00:00:00, `to` → 23:59:59.999), `status`, `source` (`formType`), `assignee` (id или `me`), `duplicates=1`. Нет `from/to` → последние 30 дней. Некорректные значения → 400 `{ error }`.
- Авторизация: `requireStaff` — `payload.auth({ headers: request.headers })`, роль admin или manager, иначе 401/403. Данные читать Local API с `overrideAccess: false, user` (уважать access схемы), `depth: 1`, постранично по 500, `sort: createdAt`. Лимит `LEAD_EXPORT_MAX_ROWS` (20 000): при превышении 413 `{ error: 'Слишком много строк, сузьте период' }`.
- Колонки (порядок): Дата создания; Источник (подпись formType); Метка источника; Страница входа; Компания; ИНН; Имя; Телефон; E-mail; Роль; Город; Площадь, м²; Тип изделия; Комментарий; Статус; Причина отказа; Ответственный; Флаги (через «; », подписи `QUIZ_FLAG_LABELS`); Повтор (Да/Нет); utm_source; utm_medium; utm_campaign; utm_term; utm_content; Client ID; Файлов (число); Ответы (JSON одной строкой). Заголовки на русском.
- **CSV:** UTF-8 с BOM, разделитель `;`, перевод строки `\r\n`, значения в двойных кавычках с удвоением кавычек; защита от CSV-инъекций — значение, начинающееся с `=`, `+`, `-`, `@`, табуляции или `\r`, получает префикс `'`; **исключение:** значение целиком состоит из цифр, пробелов, скобок, дефисов и ведущего `+` (телефон, ИНН) — оно экранируется кавычками без префикса (иначе телефон станет `'+7…`). `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="leads_YYYY-MM-DD_YYYY-MM-DD.csv"`.
- **XLSX:** `exceljs` (предустановлен task-10), один лист «Заявки», закреплённая шапка, автофильтр, ширины колонок, даты как значения-даты с форматом `dd.mm.yyyy hh:mm`, телефон — текст. `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Заголовки ответа: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`. В лог сервера — одна строка: id пользователя, период, число строк (без ПДн). `export const dynamic = 'force-dynamic'`.
- Файлы заявок в выгрузку не включаются (только количество).

### Отчёт (`/admin/leads-report/`)

- Регистрация: `admin.components.views.leadsReport = { Component: '/payload/admin/views/leads-report#LeadsReportView', path: '/leads-report' }`, ссылка в боковом меню через `afterNavLinks`. Серверный вид (`AdminViewServerProps`), права: `admin`/`manager` (иначе редирект/сообщение).
- Период: query `?period=today|7d|30d|month|quarter|custom&from=&to=` (по умолчанию 30d), форма с пресетами и датами. Границы — `period.ts` в `SITE_TZ`.
- Данные считаются **count-запросами** Local API (`payload.count({ collection: 'leads', where })`) по сетке (formType × status), плюс `isDuplicate`, флаги (5), UTM-источники (`utm.source`, топ-10 через `payload.find` с `select`). Агрегация и проценты — `report.ts` (чистая, тестируется).
- Содержимое: плитки «Всего заявок», «Новые», «Договор», «Отказ», «Дубли»; таблица «По источникам» (строки formType, колонки — статусы + «Всего» + доля); таблица «По статусам»; воронка Новая → КП отправлено → Договор с конверсиями (% от всего); «Флаги» (малый объём, нестандартный размер, срочно, без файла, нужны документы) — счётчик и доля; «UTM source» топ-10. Числа форматировать `formatNumber`. Диаграммы — CSS-полосы (без библиотек). Кнопка «Выгрузить эти заявки» → ссылка на экспорт с тем же периодом.
- Назначение отчёта — сквозная аналитика ТЗ §10 («заявка → КП → договор»).

### Удаление ПДн (`POST /api/admin/leads/[id]/erase/`)

- Только `admin` (`requireAdmin`), только `POST`, заголовок `Content-Type: application/json`, проверка `Origin` = origin `SITE_URL` (иначе 403), тело `{ "confirm": "УДАЛИТЬ" }`. Ответ `{ ok: true, deleted: { versions, files, consentAnonymized } }` или 404/409.
- `eraseLeadPersonalData(payload, id, actor)` в одной транзакции там, где возможно:
  1. Если у заявки есть связанный заказ (`orders.lead = id`) → **409** «По заявке есть заказ: данные хранятся для исполнения договора (политика, п. 3)». Удаление таких данных — отдельная процедура, не автоматическая.
  2. Собрать `files` (id `lead-files`), удалить документы `lead-files` (Payload удаляет физические файлы из `UPLOADS_DIR`), затем проверить, что на диске их нет (лог предупреждения, если остались).
  3. `consent-log` с `lead = id`: анонимизировать — `ip`, `userAgent` → пусто, `lead` → null (запись остаётся как доказательство факта согласия: версии согласия/политики и время).
  4. Удалить версии: `payload.db.deleteVersions({ collection: 'leads', where: { parent: { equals: id } } })` (проверить сигнатуру 3.91 по context7) — иначе PII остаётся в `_leads_v`.
  5. Заявки с `duplicateOf = id` — обнулить ссылку; в очереди заданий удалить ещё не выполненные задания с `input.leadId = id` (best-effort; если запрос по JSON-пути не поддержан — пропустить и залогировать).
  6. Удалить саму заявку `payload.delete({ collection: 'leads', id, overrideAccess: true, context: { disableRevalidate: true } })`.
  7. Лог: `payload.logger.info({ event: 'lead-erased', actor: actor.id, leadId: id, versions, files })` — **без ПДн**.
- UI: пункт «Удалить персональные данные…» в `edit.editMenuItems` (только admin): диалог с предупреждением, полем подтверждения «УДАЛИТЬ», вызов `fetch('/api/admin/leads/<id>/erase/', { method:'POST', credentials:'include' })`, при успехе — переход в список `/admin/collections/leads/`, при 409 — показать сообщение сервера.

### Метрика / аналитика

Не применимо (внутренний интерфейс). Отчёт использует данные заявок, цели Метрики не дублируются.

### Тесты

- **Vitest:** `csv.test.ts` (BOM, `;`, кавычки/переносы в значениях, префикс `'` для `=SUM(A1)`, `@cmd`, `-1+1`, но не для телефона `+7 (351) 247-05-57`), `export-rows.test.ts` (форматы дат в `SITE_TZ`, флаги, пустые значения), `period.test.ts` (пресеты и границы, переход через месяц/год, полночь по Екатеринбургу), `report.test.ts` (проценты, пустые данные без деления на ноль), `lead-status-validation` (с моком `payload.findByID`), `lead-comments` (новые строки получают автора/дату, чужие неизменны для manager).
- **Playwright** (`admin-leads.spec.ts`, проект 1366; тест под админом и менеджером; хелперы `e2e/helpers/admin-api.ts`: логин `POST /api/users/login/`, при пустой БД — `POST /api/users/first-register/`, создание менеджера и заявок через REST под админом, очистка в `afterAll`; имена полей брать из `payload-types.ts`):
  1. Список `/admin/collections/leads/`: колонки (дата, источник, компания, контакт, площадь, изделие, статус-бейдж, ответственный); создать 3 заявки (две с одним телефоном) → у второй бейдж «Повтор», быстрый фильтр «Дубли» оставляет её; поиск по части телефона и по названию компании находит заявку; быстрый фильтр статуса меняет URL (`where`) и число строк.
  2. Смена статуса на «Отказ» без причины → ошибка валидации «Укажите причину отказа»; с причиной — сохранено, в Versions появилась новая версия.
  3. Назначение ответственного менеджера → в `payload-jobs` есть задание `notify-assigned` с `leadId`/`assigneeId` (запрос `GET /api/payload-jobs?where[taskSlug][equals]=notify-assigned` под админом); повторное сохранение без смены ответственного — второго задания нет.
  4. Комментарий: менеджер добавляет — автор/дата проставлены; попытка изменить чужой комментарий → ошибка.
  5. Вкладка «Сводка»: контакты, флаги, UTM, список файлов (при заявке с файлом — ссылка скачивания возвращает 200 админу и 401/403 анониму), блок «Повторные обращения».
  6. Экспорт: `GET /api/admin/leads/export/?format=csv&from=…&to=…` под админом → 200, `text/csv`, первые байты BOM, заголовки по порядку, число строк = число заявок периода; `format=xlsx` → 200 и корректный zip (`PK`); без авторизации → 401/403; период без заявок → только шапка; параметр `from` мусор → 400.
  7. Отчёт `/admin/leads-report/`: заведённые заявки отражены в счётчиках по источнику и статусу (сравнить с REST-count), смена периода меняет числа.
  8. Права: менеджер не видит кнопку/эндпоинт удаления (`DELETE /api/leads/<id>` → 403), `POST …/erase/` → 403; анонимный `GET /api/leads/` → 401/403.
  9. Удаление ПДн (админ): заявка с файлом и версиями → `erase` → 200; `GET /api/leads/<id>` → 404; `GET /api/leads/versions?where[parent][equals]=<id>` → 0; файл `lead-files` недоступен; запись `consent-log` осталась без ip/userAgent; заявка с заказом → 409.

## Acceptance Criteria

- [ ] Каждая строка таблицы §6.1 выше реализована и проверена (список, карточка/сводка, статусы, ответственный, комментарии, дубли, экспорт, права, удаление ПДн, отчёт).
- [ ] Схема БД не изменилась: `pnpm payload migrate:create` не предлагает diff; `payload-types.ts` без изменений; в `leads.ts` изменены только `admin` и `hooks`.
- [ ] Статус «Отказ» нельзя сохранить без причины; ответственному уходит задание `notify-assigned` (один раз на смену).
- [ ] Экспорт CSV открывается в Excel без «кракозябр» (BOM, `;`), защищён от формул; XLSX корректный; доступ только admin/manager.
- [ ] Отчёт даёт правильные числа по источникам/статусам/воронке для выбранного периода.
- [ ] Удаление ПДн убирает заявку, её версии и файлы, анонимизирует `consent-log`, блокируется при наличии заказа; в логах нет ПДн.
- [ ] `pnpm generate:importmap` выполнен, `/admin/` открывается без ошибок консоли; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/admin-leads.spec.ts` проходят.

## Notes

- **Модель:** premium для кодинга; архитектурные сомнения по API Payload 3.91 — через context7/Exa.
- Отступления от брифа (в отчёт координатору): правка `hooks` в `leads.ts`, правка `payload.config.ts` для вида отчёта.
- Рекомендация: добавить поле `updatedBy` в `leads` отдельной schema-change задачей — для аудита «кто менял статус».
- Если `payload.db.deleteVersions` или фильтрация job-ов по JSON недоступны в 3.91 — реализовать через Drizzle (`payload.db.drizzle`) с параметризованным SQL и покрыть тестом.
- Даты в UI/выгрузке — `SITE_TZ` (Asia/Yekaterinburg, как `COMPANY_TZ` в домене).
