# Task 08: Схема — заявки, заказы, согласия, редиректы, rate-limits

## Status

complete

## Wave

2

## Description

Описываем в Payload модуль заявок (CRM внутри сайта, ТЗ §6.1) и страницу заказа по ссылке (ТЗ §6.2): коллекции `lead-files`, `lead-statuses`, `leads`, `orders`, `order-files`, `consent-log`, `redirects`, `rate-limits` и расширяем `users` полями менеджера. Вся бизнес-логика (приём заявки, письма, создание заказа, админ-вьюхи) — в следующих задачах; здесь только схема, права, индексы и чисто вычисляемые поля (номер заказа, дубли, статус, срок жизни ссылки). Схема после задачи 10 заморожена — состав полей исчерпывающий.

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** task-10-schema-freeze.md, task-17-lead-intake-uploads.md, task-18-email-jobs.md, task-32-admin-leads.md, task-33-orders.md

**Context from dependencies:** Задача 01 создала Payload 3.91 + Next 16.4 (Postgres, `idType: "uuid"`), `payload.config.ts` со spread-реестром `crmCollections` (файл `src/payload/collections/crm/index.ts`, сейчас пустой массив — его заполняет эта задача), коллекцию `users` (`src/payload/collections/users.ts`: поля `name`, `role` = `admin|manager`; `read` для любого залогиненного, `update` — admin или сам, `create/delete` — admin) и контракты:
- `@/payload/access`: `isAdmin`, `isAdminOrManager`, `isLoggedIn`, `isAnyone`, `isAdminOrSelf`, `adminFieldAccess`, `adminOrManagerFieldAccess`;
- `@/payload/slugs`: `rel("leads")` — приведение слага к `CollectionSlug` для `relationTo`/`join.collection` (использовать везде в этой задаче);
- `@/lib/env`: `getEnv()` → `UPLOADS_DIR` (в prod `/data/lead-files`), `MEDIA_DIR`.
Параллельно: задача 06 (globals; `site-settings` содержит `orderLinkTtlDays` = 90, `consent.consentVersion/policyVersion`, `orderStatuses`; хелпер `@/payload/hooks/revalidate` → `revalidateCollection(slug)` с `afterChange/afterDelete`) и задача 07 (коллекция `media`, к которой ссылается `users.photo`). Конкретная бизнес-логика: приём заявок/файлов — задача 17; письма и Jobs — 18; админ-вьюхи заявок — 32; создание заказа/токены/страница заказа — 33. Эта задача **не** содержит бизнес-логики, кроме вычисляемых полей, перечисленных ниже.

## Files to Create

- `src/payload/collections/crm/lead-files.ts`, `lead-statuses.ts`, `leads.ts`, `orders.ts`, `order-files.ts`, `consent-log.ts`, `redirects.ts`, `rate-limits.ts`.
- `src/payload/hooks/order-from-lead.ts` — экспорт `orderFromLead: CollectionAfterChangeHook` — **no-op** (возвращает `doc`); реализует задача 33.
- `src/payload/hooks/lead-hooks.ts` — `assignDefaultStatus`, `normalizeContacts`, `detectDuplicate`, `touchStatusChangedAt` (вычисляемые поля; реализовать здесь).
- `src/payload/hooks/order-hooks.ts` — `assignOrderNumber`, `computeOrderState` (номер, текущий статус, `expiresAt`).
- `src/payload/utils/normalize.ts` — `normalizePhone(raw): string | null` (→ `+7XXXXXXXXXX`; 8… и 7… приводятся к +7; иначе null), `normalizeEmail(raw)`.
- `src/payload/utils/normalize.test.ts`, `src/payload/hooks/order-hooks.test.ts` — unit-тесты (Vitest от задачи 02).

## Files to Modify

- `src/payload/collections/crm/index.ts` — `crmCollections = [LeadFiles, LeadStatuses, Leads, Orders, OrderFiles, ConsentLog, Redirects, RateLimits]`.
- `src/payload/collections/users.ts` — **единственная задача волны 2, которая трогает этот файл**: добавить поля `phone` (text), `position` (text — «Менеджер по заказам»), `messengerUrl` (text), `messengerType` (select `telegram|whatsapp|max|viber|other`), `photo` (upload → `rel("media")`), `notifyNewLeads` (checkbox, default false — личные письма о новых заявках). Роль, доступ и хуки оставить без изменений.

Не трогать: `payload.config.ts`, `src/payload/globals/**`, `src/payload/collections/{content,catalog}/**`, `package.json`.

## Technical Details

### Общие правила

- Слаги kebab-case: `lead-files`, `lead-statuses`, `leads`, `orders`, `order-files`, `consent-log`, `redirects`, `rate-limits`. Поля — английский camelCase, подписи — по-русски. ID — UUID (обеспечивает адаптер).
- `admin.group`: «Заявки» (leads, lead-statuses, lead-files, consent-log), «Заказы» (orders, order-files), «Служебное» (redirects, rate-limits — последний `admin.hidden: true`).
- Права по умолчанию: admin — всё; manager — чтение/изменение `leads` и `orders`, чтение `lead-statuses`, **без удаления**; остальные — по таблицам ниже. Анонимный доступ ко всем коллекциям этого модуля закрыт (запись из публичных форм идёт через Local API с `overrideAccess`, задача 17).
- Персональные данные: поддерживается удаление по запросу субъекта (задача 32) — поэтому на `leads` включены версии, а `consent-log` связан с заявкой `relationTo` (при удалении заявки ссылка обнуляется, запись журнала сохраняется и анонимизируется). Файлы заявок — на диске в `UPLOADS_DIR`.
- Хуки: `revalidateCollection` в CRM-коллекциях **не нужен** (кроме `redirects`).
- Индексы: `index: true` на `formType`, `phone`, `email`, `status`, `assignee`, `isDuplicate`, `createdAt` (по умолчанию) в `leads`; `unique` на `slug` в `lead-statuses`, на `number` и `tokenHash` в `orders`.

### 1. `lead-statuses` — «Статусы заявок» (редактирует только admin)

| Поле | Тип | Обяз. | Заметки |
|---|---|---|---|
| `name` | text | да | useAsTitle: «Новая», «В работе», «КП отправлено», «Договор», «Отказ» |
| `slug` | text | да | unique, `^[a-z0-9-]+$`: `new`, `in-progress`, `kp-sent`, `contract`, `refused` |
| `order` | number | да | порядок в воронке |
| `color` | text | нет | HEX/токен для бейджа |
| `isDefault` | checkbox | нет | статус для новых заявок (ровно один; хук снимает флаг с остальных) |
| `isFinal` | checkbox | нет | финальные: «Договор», «Отказ» |
| `requiresReason` | checkbox | нет | `true` для «Отказ» — требует `refuseReason` в заявке |
| `isContract` | checkbox | нет | `true` для «Договор» — по нему задача 33 создаёт заказ |

Права: `read` — admin/manager; `create/update/delete` — admin. Стартовые записи создаёт seed (задача 16).

### 2. `lead-files` — файлы заявок (upload, **приватный**)

- `upload`: `staticDir = path.join(getEnv().UPLOADS_DIR, "leads")` (абсолютный путь; временные загрузки лежат в `${UPLOADS_DIR}/tmp` — их ведёт задача 17); `filesRequiredOnCreate: true`; **`mimeTypes` не задавать** (сигнатуры DWG/DXF проверяет задача 17; Payload-проверка по MIME для DWG/DXF ненадёжна); `disableLocalStorage: false`. Лимит размера — общий `upload.limits.fileSize` из `payload.config.ts` (52 MiB).
- Поля: `lead` (rel `leads`, index), `originalName` (text — исходное имя файла), `kind` (select `dwg|dxf|pdf|png|jpeg`), `source` (select `quiz|form`), `sha256` (text), `sizeBytes` (number) — все, кроме `lead`, `adminOrManagerFieldAccess` на чтение.
- Права: `read` — admin/manager (публичного URL нет; скачивание через защищённый роут задачи 17); `create` — admin/manager; `update`, `delete` — admin.

### 3. `leads` — «Заявки»

Версии включены (`versions: { maxPerDoc: 50 }`, без черновиков) — история изменений. `admin.useAsTitle: "name"`; `defaultColumns`: createdAt, formType, company, name, phone, area, productType, status, assignee; `listSearchableFields`: `name`, `company`, `phone`, `email`, `inn`, `comment`.

| Поле | Тип | Обяз. | Валидация / default / заметки |
|---|---|---|---|
| `formType` | select | да | `quiz|drawing|callback|sample|load|contacts|full`, index |
| `sourceLabel` | text | нет | человекочитаемый источник: «Квиз», «Форма: Отправить чертёж», «Форма: Заказать звонок» … |
| `entryPage` | text | нет | страница входа (`src` квиза / страница отправки формы), путь |
| `pageUrl` | text | нет | страница, где отправлена форма |
| `referrer` | text | нет | |
| `utm` | group | нет | `source`, `medium`, `campaign`, `term`, `content`, `yclid`, `gclid`, `openstat` (все text) |
| `metrikaClientId` | text | нет | может быть пустым без согласия на аналитику |
| `company` | text | нет | обязателен только по zod-схеме формы (задача 17) |
| `inn` | text | нет | 10 или 12 цифр, если заполнено |
| `name` | text | да | useAsTitle |
| `phone` | text | да | нормализуется хуком в `+7XXXXXXXXXX`, index |
| `phoneRaw` | text | нет | как ввёл пользователь |
| `email` | email | нет | нижний регистр, index |
| `role` | select | нет | `contractor|manufacturer|developer|designer|other` (= `QUIZ_ROLES` домена task-11; подписи: подрядчик, производитель мебели или изделий, застройщик или генподрядчик, дизайнер или архитектор, другое) |
| `city` | text | нет | город доставки |
| `area` | number | нет | м², ≥ 0 |
| `productType` | select | нет | `tempered|triplex|partitions|railings|shower|canopies|facade|shopfronts|verandas|mirrors|other` (= `QUIZ_TYPES` домена task-11; задача 17 пишет `answers.type` без преобразования) |
| `comment` | textarea | нет | |
| `answers` | json | нет | все ответы квиза/формы как есть (структура квиза — задача 20) |
| `answersSummary` | textarea | нет | читаемая сводка (формирует задача 17) |
| `estimate` | group | нет | `from` (number — показанный клиенту ориентир ₽), `priceDate` (date), `shown` (checkbox) |
| `flags` | select hasMany | нет | `small_volume` (малый объём), `nonstandard_size` (нестандартный размер), `urgent` (срочно), `no_file` (без файла), `needs_docs` (нужны документы) |
| `files` | relationship hasMany | нет | → `lead-files` |
| `status` | relationship | да | → `lead-statuses`, index; по умолчанию присваивается хуком `assignDefaultStatus` |
| `statusChangedAt` | date | авто | обновляется хуком при смене статуса |
| `refuseReason` | textarea | если статус `requiresReason` | `validate`: при выбранном статусе с `requiresReason` пусто → «Укажите причину отказа» |
| `assignee` | relationship | нет | → `users`, index; `filterOptions`: пользователи с ролью admin/manager |
| `internalComments` | array | нет | `{ author (rel users, default текущий пользователь), text (textarea, required), date (date, default now; имя `date` — контракт с task-32) }` — виден только в админке |
| `isDuplicate` | checkbox | авто | readOnly, index |
| `duplicateOf` | relationship | авто | → `leads` (самая ранняя заявка с тем же телефоном/e-mail), readOnly |
| `duplicateReason` | select | авто | `phone|email|both` |
| `consent` | relationship | нет | → `consent-log` |
| `orders` | join | — | `{ type: "join", collection: rel("orders"), on: "lead" }` — заказы по заявке |
| `newLeadNotifiedAt` | date | авто | ставит задача 18 (идемпотентность писем) |
| `assigneeNotifiedAt` | date | авто | то же |

Хуки (реализовать здесь):
- `beforeValidate`/`beforeChange` `normalizeContacts`: `phone` → `normalizePhone` (+ сохранить исходное в `phoneRaw`, если пусто), `email` → нижний регистр/trim, `inn` → только цифры.
- `assignDefaultStatus` (`beforeChange`, `operation: "create"`): если `status` пуст — найти `lead-statuses` с `isDefault = true` (или минимальный `order`); если статусов ещё нет — оставить пустым без ошибки (seed создаст).
- `touchStatusChangedAt` (`beforeChange`, update): при изменении `status` выставить `statusChangedAt = now`.
- `detectDuplicate` (`beforeChange`, create): искать более ранние заявки с тем же нормализованным `phone` или `email` (Local API, `overrideAccess: true`, `limit: 1`, сортировка по `createdAt asc`); найдено → `isDuplicate = true`, `duplicateOf = id`, `duplicateReason`.
- `afterChange`: `orderFromLead` (no-op; задача 33).
Права: `read/create/update` — admin/manager; `delete` — только admin; `create` из публичных форм — через Local API (не REST).

### 4. `consent-log` — «Журнал согласий» (иммутабельный)

Поля: `lead` (rel `leads`, index; допускает пустое после удаления заявки), `formType` (text), `consentVersion` (text), `policyVersion` (text), `consentText` (textarea — снимок текста чекбокса), `ip` (text), `userAgent` (text), `pageUrl` (text), `givenAt` (date, default now), `phoneHash`, `emailHash` (text, index — по отдельному HMAC-SHA256 (`FORM_HMAC_SECRET`, хелперы в `src/payload/utils/normalize.ts`) на нормализованный телефон и e-mail, чтобы находить записи после удаления заявки), `anonymizedAt` (date). Права: `read` — admin/manager; `create` — admin (фактически Local API); `update` — запрещено всем (`() => false`), кроме полей анонимизации через Local API; `delete` — admin.

### 5. `orders` — «Заказы»

`admin.useAsTitle: "number"`; `defaultColumns`: number, company, currentStatus, manager, expiresAt. Права: `read/create/update` — admin/manager; `delete` — admin.

| Поле | Тип | Обяз. | Заметки |
|---|---|---|---|
| `number` | text | авто | формат `ГГГГ-NNNN` (например `2026-0147`), `unique`, index, readOnly; генерирует `assignOrderNumber` |
| `lead` | relationship | нет | → `leads`, index |
| `company` | text | нет | обязательность не задаётся: заказ создаётся автоматически из заявки (task-33), а у заявки компания может быть пустой (форма «Заказать звонок»); пустое поле — предупреждение в админке task-33 |
| `composition` | textarea | нет | «Закалённое стекло 10 мм, 86 м², 42 позиции»; при автосоздании может быть пустым — менеджер дополнит |
| `clientName` | text | нет | внутреннее, на странице не показывается |
| `clientEmail` | email | нет | куда уходят письма; **на странице не показывается**; без адреса письма клиенту не отправляются (предупреждение в админке task-33) |
| `clientPhone` | text | нет | внутреннее |
| `notifyClient` | checkbox | нет | default true |
| `manager` | relationship | да | → `users` (роль manager/admin); данные для карточки «Ваш менеджер» |
| `statusHistory` | array | да | `{ status (select spec_agreed|in_production|packed|shipped|received, required), date (date, required), plannedDate (date), note (text) }`; статус в истории не повторяется (validate); записи упорядочены по этапам |
| `currentStatus` | select | авто | вычисляется: статус с наибольшим этапом среди `statusHistory` |
| `clientComment` | group | нет | `text` (textarea — «Комментарий менеджера»), `updatedAt` (date) |
| `packPhotos` | array | нет | `{ photo (upload → order-files, required), caption (text) }` |
| `shipment` | group | нет | `carrier` (text — транспортная компания), `waybill` (text — номер накладной), `trackingUrl` (text, url) |
| `documents` | array | нет | `{ title (text, required), kind (select spec|passport|certificate|other), file (upload → order-files, required) }` |
| `tokenHash` | text | авто | SHA-256 токена (hex), `unique`, index, скрыт в админке (`admin.hidden`), `adminFieldAccess` на чтение |
| `tokenCreatedAt` | date | авто | |
| `tokenReissueCount` | number | авто | default 0 |
| `revoked` | checkbox | нет | ссылка отозвана; default false |
| `receivedAt` | date | авто | дата записи `received` из `statusHistory` |
| `expiresAt` | date | авто | `receivedAt + site-settings.orderLinkTtlDays` суток (если `received` ещё нет — пусто, ссылка не истекает); пересчитывается при изменении |
| `lastNotifiedStatus` | text | авто | ставит задача 18/33 (идемпотентность писем) |
| `lastNotifiedAt` | date | авто | |

Хуки (реализовать здесь):
- `assignOrderNumber` (`beforeChange`, create): номер вида `${year}-${NNNN}` — максимальный номер текущего года +1, дополнение нулями до 4 знаков (запрос `find` по `number like "${year}-"` с сортировкой `-number`, `limit 1`); при гонке уникальный индекс не даст дубль — вызывающий код (задача 33) повторяет создание до 5 раз.
- `computeOrderState` (`beforeChange`): `currentStatus`, `receivedAt`, `expiresAt` (TTL читается из глобала `site-settings` через `req.payload.findGlobal({ slug: relGlobal("site-settings") })`, fallback 90).
- Unit-тесты: нумерация (первый номер года → `ГГГГ-0001`, следующий +1, переход года), `currentStatus` по истории, `expiresAt = receivedAt + 90 суток`.

### 6. `order-files` — приватные файлы заказа (upload)

`upload.staticDir = path.join(getEnv().UPLOADS_DIR, "orders")`; `mimeTypes`: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`; `imageSizes`: `thumbnail` (400 w), `preview` (1600 w); `adminThumbnail: "thumbnail"`. Поля: `kind` (select `photo|document`), `caption` (text), `uploadedBy` (rel users, авто из `req.user` в `beforeChange`). Права: `read` — admin/manager (клиент получает файлы только через роут `/zakaz/<токен>/docs/<id>/` задачи 33), `create/update` — admin/manager, `delete` — admin.

### 7. `redirects` — «Редиректы»

Поля: `from` (text, required, unique, index; путь `/…/` в нижнем регистре со слешем на конце), `to` (text, required; путь или абсолютный URL), `code` (select `301|308`, default `301`), `active` (checkbox, default true), `note` (text). Права: `read` — `isAnyone` (читает рендер-слой), запись — admin; `afterChange/afterDelete` — `revalidateCollection("redirects")`. Потребитель редиректов — задача 15: catch-all `[...slug]` перед `notFound()` вызывает `getRedirect(path)` (кэш с тегом `collection:redirects`, только `active`) и делает `permanentRedirect(to)` (HTTP 308 независимо от `code`; поле `code` — справочное). **В схеме потребитель не реализуется**.

### 8. `rate-limits` — служебная (скрытая)

`admin.hidden: true`; все права `() => false` (доступ только через `payload.db.drizzle` и Local API с `overrideAccess`). Поля: `key` (text, required, **unique**, index — например `lead:ip:1.2.3.4`), `count` (number, required, default 0), `windowStart` (date, required). Таблица в БД называется `rate_limits` (колонки `key`, `count`, `window_start`) — задача 17 делает `INSERT … ON CONFLICT (key) DO UPDATE`; эти имена фиксируются как контракт.

## Acceptance Criteria

- [ ] Созданы 8 коллекций CRM и расширен `users`; `crmCollections` экспортирован; все слаги kebab-case, подписи по-русски.
- [ ] Все перечисленные поля присутствуют с типами, обязательностью, индексами (`formType`, `phone`, `email`, `status`, `assignee`, `isDuplicate`; unique: `lead-statuses.slug`, `orders.number`, `orders.tokenHash`, `rate-limits.key`).
- [ ] Права: manager читает/правит заявки и заказы, **не** удаляет; `lead-statuses` меняет только admin; `lead-files`, `order-files`, `consent-log` недоступны анониму (в REST — 403); `rate-limits` скрыта в админке и закрыта для REST.
- [ ] `lead-files` и `order-files` используют абсолютные `staticDir` внутри `UPLOADS_DIR` (подкаталоги `leads` и `orders`), без публичного URL для чтения.
- [ ] Хуки `normalizeContacts`, `assignDefaultStatus`, `touchStatusChangedAt`, `detectDuplicate`, `assignOrderNumber`, `computeOrderState` реализованы; unit-тесты нормализации телефона (`8 (951) 489-04-09` → `+79514890409`; `+7 951 489-04-09` → то же; мусор → null), номера заказа и `expiresAt` зелёные (после появления Vitest из задачи 02).
- [ ] Валидатор `refuseReason` работает при статусе с `requiresReason`.
- [ ] `src/payload/hooks/order-from-lead.ts` — no-op с типом `CollectionAfterChangeHook`, подключён в `leads.hooks.afterChange`.
- [ ] Все `relationTo`/`join` через `rel()`; `pnpm lint` и `pnpm typecheck` проходят; длина идентификаторов Postgres проверена (`pnpm payload generate:db-schema`; сгенерированный файл не коммитить); **миграции не создавать**.
- [ ] Расширение `users` не ломает вход и права (`role`, first-user flow из задачи 01).

## Notes

- Модель: премиальная (кодинг). Актуальный API Payload 3.91 (upload, join, versions, `hooks`) — через context7 `/payloadcms/payload` и Exa.
- Нормализованный телефон — основа поиска дублей: хранится только в формате `+7XXXXXXXXXX`.
- Клиентские данные заказа (e-mail, телефон) на публичной странице не выводятся — это забота задачи 33; здесь они лишь хранятся.
- Поля `newLeadNotifiedAt`, `assigneeNotifiedAt`, `lastNotifiedStatus`, `lastNotifiedAt`, `answersSummary`, `estimate`, `referrer`, `pageUrl`, `tokenReissueCount` — расширения относительно исходного брифа, нужны для идемпотентности писем, читабельности заявки и истории перевыпуска ссылок.
- Таблицу `redirects` применяет задача 15 (catch-all, `getRedirect`). Хук `orderFromLead` подключается здесь, чтобы задача 33 меняла только файл хука, а не `leads.ts`.
