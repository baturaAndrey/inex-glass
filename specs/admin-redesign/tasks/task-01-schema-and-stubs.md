# Task 01: Схема `admin_redesign`, журнал уведомлений, задания MAX и все заглушки

## Status

complete

## Wave

1

## Description

Единственная задача спеки, которая меняет схему Payload. Добавляет поля для редизайна админки и уведомлений MAX: код причины отказа, сумму КП и `updatedBy` у заявок, `updatedBy` у страниц, поля привязки MAX у пользователей, группу `notifications.max` в настройках сайта, скрытую коллекцию `notification-log`, два slug-а заданий очереди (`max-notify`, `max-unassigned-reminder`). Всё оформляется одной миграцией `admin_redesign` (только добавление).

Кроме того, задача заранее подключает **все точки расширения**, чтобы задачам волн 2–3 не пришлось править файлы схемы: ui-поля и `admin.components` с путями на компоненты-заглушки (MAX, SEO), `pages.admin.preview` на заглушку, no-op хуки `leadMaxNotify` / `orderMaxNotify` и no-op обработчики заданий. Поведение сайта и админки после задачи не меняется: заглушки ничего не делают.

## Dependencies

**Depends on:** None (Wave 1)
**Blocks:** task-03-admin-nav.md, task-04-admin-dashboard.md, task-05-leads-kanban.md, task-06-max-core.md, task-07-page-edit-form.md (и через них все задачи волн 3–4)

**Context from dependencies:** зависимостей нет. Параллельно идёт task-02 (тема и каркас админки). Общих файлов нет: task-02 правит `src/payload.config.ts`, `src/app/(payload)/**`, `src/styles/**`, `package.json`, `pnpm-lock.yaml`, `src/payload/admin/{nav,views,graphics}/**` и коммитит `importMap.js`. Эта задача `importMap.js` **не коммитит**: после слияния волны координатор перегенерирует его вместе с заглушками отсюда.

Текущее состояние кода, на которое опирается задача:
- Payload 3.91.0, Postgres, `idType: 'uuid'`. Миграции в `src/migrations/` (последняя — `20261021_065527_add_search`), реестр `src/migrations/index.ts`, `prodMigrations` в конфиге.
- Коллекции CRM регистрируются в `src/payload/collections/crm/index.ts` (`crmCollections`), конфиг подключает реестр целиком, поэтому `payload.config.ts` трогать не нужно.
- Задания: реестр `src/jobs/index.ts` (`JOB_SLUGS`, `jobTasks`), общие константы `src/jobs/shared.ts` (`DEFAULT_QUEUE`, `MAINTENANCE_QUEUE`, `MAIL_RETRIES`, `MAINTENANCE_RETRIES`, `JOB_WRITE_CONTEXT`). Пример задания с расписанием — `src/jobs/expire-order-links.ts`.
- Доступ к полям: `src/payload/collections/crm/field-access.ts` (`systemOnly` — запрет create/update через API, `neverReadable` — ещё и чтение), роли — `src/payload/access/index.ts` (`getRole`, `adminFieldAccess`, …).
- Валидация отказа: хук `validateLeadStatusReason` (`src/payload/hooks/lead-status-validation.ts`, `leads.beforeValidate`) и валидатор поля `validateRefuseReason` (`src/payload/hooks/lead-hooks.ts`). Сообщение `REFUSE_REASON_REQUIRED_MESSAGE` = «Укажите причину отказа» (`src/payload/hooks/lead-messages.ts`). На них опираются `e2e/admin-leads.spec.ts:192–208` (ровно одна ошибка `{ path: "refuseReason", message }`) и `src/payload/hooks/lead-admin-hooks.test.ts`.

## Files to Create

- `src/payload/collections/crm/notification-log.ts` — коллекция `notification-log`
- `src/payload/hooks/set-updated-by.ts` — `setUpdatedBy` (`beforeChange`)
- `src/payload/hooks/set-updated-by.test.ts` — unit-тесты хука
- `src/payload/hooks/lead-max-notify.ts` — no-op `leadMaxNotify` (наполняет task-10)
- `src/payload/hooks/order-max-notify.ts` — no-op `orderMaxNotify` (наполняет task-10)
- `src/jobs/max-notify.ts` — задание `max-notify`, обработчик-заглушка (наполняет task-10)
- `src/jobs/max-unassigned-reminder.ts` — задание `max-unassigned-reminder` с расписанием, обработчик-заглушка (наполняет task-10)
- `src/payload/admin/max/connect-button.tsx` — заглушка `MaxConnectButton` (наполняет task-06)
- `src/payload/admin/max/group-link-panel.tsx` — заглушка `MaxGroupLinkPanel` (наполняет task-06)
- `src/payload/admin/seo/seo-title-counter.tsx` — заглушка `SeoTitleCounter` (наполняет task-07)
- `src/payload/admin/seo/seo-description-counter.tsx` — заглушка `SeoDescriptionCounter` (наполняет task-07)
- `src/payload/admin/seo/seo-snippet-preview.tsx` — заглушка `SeoSnippetPreview` (наполняет task-07)
- `src/lib/preview/preview-url.ts` — заглушка `buildPreviewUrl` (наполняет task-11)
- `src/payload/admin/pages/updated-by-field.tsx` — заглушка `UpdatedByField` (client; рендерит `null`, наполняет task-07: «Изменена ДД.ММ.ГГГГ, ЧЧ:ММ · Кем», `null` → «Система»). Подключается как `admin.components.Field` у `pages.updatedBy` (поле в сайдбаре, `admin.position: 'sidebar'`).
- `src/migrations/<timestamp>_admin_redesign.ts` и `.json` — генерирует CLI

## Files to Modify

Разрешено менять **только** перечисленное:

- `src/payload/collections/crm/leads.ts` — поля `refuseReasonCode`, `kpAmount`, `updatedBy`; хуки `setUpdatedBy` (последним в `beforeChange`) и `leadMaxNotify` (последним в `afterChange`). Блок `admin` не трогать (его в волне 2 меняет task-05).
- `src/payload/collections/crm/orders.ts` — только `orderMaxNotify` последним в `hooks.afterChange`.
- `src/payload/collections/crm/index.ts` — регистрация `NotificationLog` в `crmCollections`.
- `src/payload/collections/crm/constants.ts` — новые наборы опций (см. ниже).
- `src/payload/collections/content/pages.ts` — поле `updatedBy` (сайдбар, `admin.components.Field` → `src/payload/admin/pages/updated-by-field.tsx#UpdatedByField`), `setUpdatedBy` в `beforeChange`, `admin.preview: buildPreviewUrl`.
- `src/payload/collections/users.ts` — поля MAX и ui-поле `maxConnect`.
- `src/payload/access/index.ts` — новый хелпер `adminOrSelfFieldAccess`.
- `src/payload/globals/site-settings.ts` — группа `max` внутри группы `notifications` (вкладка «Уведомления и заказы»).
- `src/payload/fields/seo.ts` — `admin.components.afterInput` у `title` и `description`, ui-поле `seoSnippet`. Колонки БД не меняются.
- `src/payload/hooks/lead-status-validation.ts` — учёт `refuseReasonCode`.
- `src/payload/hooks/lead-hooks.ts` — **только** функция `validateRefuseReason` (учёт `refuseReasonCode`, иначе валидатор поля отклонит заявку с кодом без текста).
- `src/payload/hooks/lead-admin-hooks.test.ts` — новые кейсы валидации (старые не менять).
- `src/jobs/index.ts` — регистрация двух заданий в `JOB_SLUGS` и `jobTasks`, комментарий-контракт.
- `src/jobs/shared.ts` — только добавить `keepUpdatedBy: true` в `JOB_WRITE_CONTEXT`.
- `src/jobs/jobs.test.ts` — тесты реестра.
- `src/migrations/index.ts` — обновляет CLI.
- `src/payload-types.ts` — `pnpm generate:types` (задача — владелец этого файла в волне 1).

**Не трогать:** `src/payload.config.ts`, `src/app/(payload)/**` (в т. ч. `importMap.js` — запускать `pnpm generate:importmap` можно, но результат откатить), `src/styles/**`, `package.json`, `pnpm-lock.yaml`, `src/payload/admin/{nav,views,graphics,leads,orders}/**`, `src/lib/leads-admin/**` (CSV-экспорт и отчёт не меняются), e2e-спеки.

## Technical Details

### 1. Опции (`src/payload/collections/crm/constants.ts`)

Формат как у соседних констант (`as const satisfies readonly Option<string>[]`, в схему через `toOptions`). Значения попадают в enum-ы Postgres — менять нельзя.

```ts
export const LEAD_REFUSE_REASON_CODES = [
  { label: "Дорого", value: "expensive" },
  { label: "Выбрали другого поставщика", value: "other_supplier" },
  { label: "Нужен монтаж", value: "needs_installation" },
  { label: "Не дозвонились", value: "no_contact" },
  { label: "Другое", value: "other" },
] as const satisfies readonly Option<string>[];

export const NOTIFICATION_CHANNELS = [
  { label: "Групповой чат", value: "group" },
  { label: "Личные сообщения", value: "user" },
] as const satisfies readonly Option<string>[];

export const NOTIFICATION_EVENTS = [
  { label: "Новая заявка", value: "new_lead" },
  { label: "Смена статуса", value: "status_change" },
  { label: "Назначение ответственного", value: "assigned" },
  { label: "Событие заказа", value: "order_event" },
  { label: "Напоминание: без ответственного", value: "unassigned_reminder" },
] as const satisfies readonly Option<string>[];

export const NOTIFICATION_STATUSES = [
  { label: "Отправляется", value: "pending" },
  { label: "Отправлено", value: "sent" },
  { label: "Ошибка", value: "failed" },
  { label: "Пропущено", value: "skipped" },
] as const satisfies readonly Option<string>[];
```

### 2. `updatedBy` и хук `set-updated-by.ts`

```ts
import type { CollectionBeforeChangeHook } from "payload";

/**
 * `beforeChange` (leads, pages): who saved the document last. `null` = «Система» (public forms,
 * jobs, scripts). Bookkeeping writes pass `context.keepUpdatedBy` (see `JOB_WRITE_CONTEXT`) and
 * keep the stored value, so a job stamping `newLeadNotifiedAt` does not overwrite the manager.
 */
export const setUpdatedBy: CollectionBeforeChangeHook = ({ data, req, context }) => {
  if (context?.keepUpdatedBy === true) return data;
  return { ...data, updatedBy: req.user?.id ?? null };
};
```

Поле (одинаковое для `leads` и `pages`, можно вынести фабрику в `set-updated-by.ts` как `updatedByField(label)`):

```ts
{
  name: "updatedBy",
  type: "relationship",
  label: "Кем изменена",            // в leads — «Кем изменена» тоже
  relationTo: rel("users"),
  maxDepth: 0,                      // не тянуть документ сотрудника (e-mail) в публичные загрузчики страниц
  access: systemOnly,               // из src/payload/collections/crm/field-access.ts
  admin: { readOnly: true, position: "sidebar" },
}
```

- `leads.hooks.beforeChange`: `[assignDefaultStatus, touchStatusChangedAt, detectDuplicate, stampInternalComments, setUpdatedBy]`.
- `pages.hooks.beforeChange`: `[capturePublishedPath(SLUG), setUpdatedBy]`. Поле в `pages` — после `publishedAt` (сайдбар).
- `src/jobs/shared.ts`: `JOB_WRITE_CONTEXT = { disableRevalidate: true, skipAssigneeNotify: true, skipOrderHooks: true, skipStatusEmail: true, keepUpdatedBy: true }`.
- `systemOnly` отрезает значение из REST/админки на проходе field access; collection-хук `beforeChange` выполняется позже и ставит значение. Local API (`overrideAccess: true`) access пропускает, хук всё равно перезаписывает.

### 3. Поля заявки (`leads.ts`)

Сразу перед `refuseReason`:

```ts
{
  name: "refuseReasonCode",
  type: "select",
  label: "Причина отказа (код)",
  options: toOptions(LEAD_REFUSE_REASON_CODES),
},
```

Сразу после `refuseReason`:

```ts
{ name: "kpAmount", type: "number", label: "Сумма КП, ₽", min: 0 },
```

Менеджер может менять оба поля (доступ коллекции, без field access). `updatedBy` — после `assigneeNotifiedAt` (в конце списка), см. п. 2.

### 4. Валидация отказа (обратная совместимость)

Правило: для статуса с `requiresReason` нужен `refuseReasonCode` **или** непустой `refuseReason`; при `refuseReasonCode = 'other'` текст обязателен. Ошибка — прежняя: один `ValidationError` с `{ path: "refuseReason", message: REFUSE_REASON_REQUIRED_MESSAGE }`.

`validateLeadStatusReason`:

```ts
const stored = (originalDoc ?? {}) as { status?: unknown; refuseReason?: unknown; refuseReasonCode?: unknown };
// status — как сейчас; если нет statusId → return data
const code = "refuseReasonCode" in data ? data.refuseReasonCode : stored.refuseReasonCode;
if (!isBlank(code) && code !== "other") return data;          // код без текста — достаточно, без запроса
const reason = "refuseReason" in data ? data.refuseReason : stored.refuseReason;
if (!isBlank(reason)) return data;                             // текст есть (код пуст или «other»)
// дальше — как сейчас: findByID статуса; requiresReason !== true → return data; иначе throw
```

`validateRefuseReason` (валидатор поля в `lead-hooks.ts`): в самом начале, после `if (!isBlank(value)) return true;`, добавить:

```ts
const code = (siblingData as { refuseReasonCode?: unknown }).refuseReasonCode;
if (typeof code === "string" && code !== "" && code !== "other") return true;
```

Остальная логика и текст «Укажите причину отказа» не меняются. Комментарии к обоим функциям обновить.

Новые кейсы в `lead-admin-hooks.test.ts` (`describe("validateLeadStatusReason")`):
- код `expensive` без текста → проходит, `findByID` не вызывается;
- код `other` без текста при `requiresReason` → `REFUSE_REASON_REQUIRED_MESSAGE`;
- код `other` + текст → проходит;
- частичное обновление: `data: { refuseReason: "" }`, `originalDoc: { status, refuseReasonCode: "no_contact" }` → проходит (код из сохранённого документа).

### 5. Пользователи (`users.ts`, `access/index.ts`)

```ts
// src/payload/access/index.ts
/** Field read: admin sees everyone's value, a manager only their own document. */
export const adminOrSelfFieldAccess: FieldAccess = ({ req: { user }, id, doc }) => {
  const role = getRole(user);
  if (role === "admin") return true;
  if (!role || !user) return false;
  const docId = (doc as { id?: unknown } | undefined)?.id ?? id;
  return docId !== undefined && docId !== null && String(docId) === String(user.id);
};
```

Поля в конце `Users.fields` (импорт `neverReadable`, `systemOnly` из `./crm/field-access`):

```ts
{
  name: "maxConnect",
  type: "ui",
  label: "MAX",
  admin: { components: { Field: "/payload/admin/max/connect-button#MaxConnectButton" } },
},
{
  name: "maxUserId",
  type: "text",
  label: "MAX: ID пользователя",
  index: true,                     // webhook ищет пользователя по ID (bot_stopped)
  access: { read: adminOrSelfFieldAccess, ...systemOnly },
  admin: { readOnly: true, hidden: true },
},
{ name: "maxLinkedAt", type: "date", label: "MAX: подключён", access: { read: adminOrSelfFieldAccess, ...systemOnly }, admin: { readOnly: true, hidden: true } },
{ name: "maxBotStopped", type: "checkbox", label: "MAX: бот остановлен", defaultValue: false, access: { read: adminOrSelfFieldAccess, ...systemOnly }, admin: { readOnly: true, hidden: true } },
{ name: "maxLinkTokenHash", type: "text", label: "MAX: хеш токена привязки", access: neverReadable, admin: { hidden: true } },
{ name: "maxLinkTokenExpiresAt", type: "date", label: "MAX: токен действует до", access: neverReadable, admin: { hidden: true } },
```

`admin.hidden` скрывает поля только в форме; статус привязки показывает ui-компонент task-06 (server component получает `data` / читает Local API). ID MAX хранятся как `text`.

### 6. Настройки сайта (`site-settings.ts`)

Внутри группы `notifications` (вкладка «Уведомления и заказы»), последним полем после `ccAssignee`:

```ts
{
  name: "max",
  type: "group",
  label: "Мессенджер MAX",
  fields: [
    { name: "maxGroupLink", type: "ui", admin: { components: { Field: "/payload/admin/max/group-link-panel#MaxGroupLinkPanel" } } },
    { name: "newLead", type: "checkbox", label: "Новая заявка — в групповой чат", defaultValue: true },
    { name: "statusChange", type: "checkbox", label: "Смена статуса заявки", defaultValue: true },
    { name: "assigned", type: "checkbox", label: "Назначение ответственного — в личку", defaultValue: true },
    { name: "orderEvents", type: "checkbox", label: "События заказов", defaultValue: true },
    { name: "unassignedReminder", type: "checkbox", label: "Напоминание: новая заявка без ответственного > 2 ч", defaultValue: true },
    { name: "groupChatId", type: "text", label: "ID группового чата", access: systemOnly, admin: { readOnly: true } },
    { name: "groupChatTitle", type: "text", label: "Название группового чата", access: systemOnly, admin: { readOnly: true } },
    { name: "groupLinkedAt", type: "date", label: "Чат подключён", access: systemOnly, admin: { readOnly: true } },
    { name: "groupLinkTokenHash", type: "text", access: neverReadable, admin: { hidden: true } },
    { name: "groupLinkTokenExpiresAt", type: "date", access: neverReadable, admin: { hidden: true } },
  ],
},
```

Импорт `systemOnly`, `neverReadable` — из `../collections/crm/field-access`. Чтение группы ограничено уже существующим `access.read: adminOrManagerFieldAccess` на `notifications`.

### 7. Коллекция `notification-log`

```ts
const denyAll = () => false;

/**
 * Journal of messenger notifications (MAX): idempotency of jobs (unique `key`) and the source of
 * the lead timeline (task 08). Written only via Local API by jobs (task 10); erased together with
 * the lead (task 10, `src/lib/leads-admin/erase.ts`).
 * Key format: `max:<event>:<leadId|orderId>[:<suffix>]`, e.g. `max:new-lead:<leadId>`,
 * `max:status:<leadId>:<statusChangedAt ISO>`, `max:assigned:<leadId>:<assigneeId>`,
 * `max:unassigned:<leadId>`, `max:order:<orderId>:<status>`.
 */
export const NotificationLog: CollectionConfig = {
  slug: "notification-log",
  labels: { singular: "Уведомление", plural: "Журнал уведомлений" },
  admin: { group: "Служебное", hidden: true, useAsTitle: "key", defaultColumns: ["sentAt", "event", "channel", "status"] },
  defaultSort: "-createdAt",
  access: { read: isAdmin, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "key", type: "text", label: "Ключ", required: true, unique: true, index: true },
    { name: "channel", type: "select", label: "Канал", required: true, options: toOptions(NOTIFICATION_CHANNELS) },
    { name: "event", type: "select", label: "Событие", required: true, options: toOptions(NOTIFICATION_EVENTS) },
    { name: "lead", type: "relationship", label: "Заявка", relationTo: rel("leads"), index: true },
    { name: "order", type: "relationship", label: "Заказ", relationTo: rel("orders"), index: true },
    { name: "recipient", type: "relationship", label: "Получатель", relationTo: rel("users") },
    { name: "chatId", type: "text", label: "ID чата" },
    { name: "messageId", type: "text", label: "ID сообщения" },
    { name: "status", type: "select", label: "Статус", required: true, defaultValue: "sent", options: toOptions(NOTIFICATION_STATUSES) },
    { name: "error", type: "text", label: "Ошибка" },
    { name: "sentAt", type: "date", label: "Отправлено", admin: { date: { pickerAppearance: "dayAndTime" } } },
  ],
};
```

Без `versions`. Зарегистрировать в `crmCollections` после `RateLimits`.

### 8. Хуки-заглушки

```ts
// src/payload/hooks/lead-max-notify.ts
import type { CollectionAfterChangeHook } from "payload";
/** `leads.afterChange`: queues `max-notify` jobs (task 10). No-op until then. */
export const leadMaxNotify: CollectionAfterChangeHook = ({ doc }) => doc;

// src/payload/hooks/order-max-notify.ts — то же, `export const orderMaxNotify`, для `orders.afterChange`.
```

`leads.hooks.afterChange: [notifyAssigneeChange, orderFromLead, leadMaxNotify]`; `orders.hooks.afterChange: [orderLifecycleAfterChange, orderMaxNotify]`.

### 9. Задания очереди

`src/jobs/max-notify.ts`:

```ts
import { MAIL_RETRIES } from "./shared";
import type { TaskConfig } from "payload";

export const MAX_NOTIFY = "max-notify";
export const MAX_NOTIFY_EVENTS = ["new_lead", "status_change", "assigned", "order_event"] as const;
export type MaxNotifyEvent = (typeof MAX_NOTIFY_EVENTS)[number];
export type MaxNotifyInput = {
  event: MaxNotifyEvent;
  leadId?: string;
  orderId?: string;
  assigneeId?: string;
  statusChangedAt?: string;
  previousStatus?: string; // id статуса до смены — для «из → в» в task-10
  orderStatus?: string;
};

export const maxNotifyTask: TaskConfig<{ input: MaxNotifyInput; output: object }> = {
  slug: MAX_NOTIFY,
  label: "Уведомление в MAX",
  inputSchema: [
    { name: "event", type: "select", required: true, options: MAX_NOTIFY_EVENTS.map((v) => ({ label: v, value: v })) },
    { name: "leadId", type: "text" },
    { name: "orderId", type: "text" },
    { name: "assigneeId", type: "text" },
    { name: "statusChangedAt", type: "text" },
    { name: "previousStatus", type: "text" },
    { name: "orderStatus", type: "text" },
  ],
  retries: MAIL_RETRIES,
  // Stub (task 01): task 10 implements sending. Must stay a no-op until then.
  handler: async () => ({ output: {} }),
};
```

`src/jobs/max-unassigned-reminder.ts`:

```ts
export const MAX_UNASSIGNED_REMINDER = "max-unassigned-reminder";
export const maxUnassignedReminderTask: TaskConfig<{ input: object; output: object }> = {
  slug: MAX_UNASSIGNED_REMINDER,
  label: "Напоминание в MAX: заявки без ответственного",
  retries: MAINTENANCE_RETRIES,
  schedule: [{ cron: "*/15 * * * *", queue: MAINTENANCE_QUEUE }],
  handler: async () => ({ output: {} }),
};
```

`src/jobs/index.ts`: добавить `maxNotify: MAX_NOTIFY`, `maxUnassignedReminder: MAX_UNASSIGNED_REMINDER` в `JOB_SLUGS`, задачи — в конец `jobTasks`, дополнить комментарий-контракт (`max-notify` с формой входа — task-10; scheduled `max-unassigned-reminder`). Slug, вход и расписание — контракт: task-10 меняет только тела обработчиков.

`src/jobs/jobs.test.ts` — новый `describe("job registry")` (env стабить как в существующем тесте `isJobsRunnerEnabled`: `DATABASE_URL`, `PAYLOAD_SECRET`, затем `await import("./index")`):
- `JOB_SLUGS.maxNotify === "max-notify"`, `JOB_SLUGS.maxUnassignedReminder === "max-unassigned-reminder"`; все slug-и в `jobTasks` уникальны и совпадают со значениями `JOB_SLUGS`;
- у `max-unassigned-reminder` `schedule` = `[{ cron: "*/15 * * * *", queue: MAINTENANCE_QUEUE }]`; у `max-notify` `retries` = `MAIL_RETRIES`;
- оба обработчика-заглушки возвращают `{ output: {} }`.

### 10. Компоненты-заглушки и превью

Все — server components (без `"use client"`), рендерят `null`, экспорт именованный (имя входит в путь importMap):

```ts
// src/payload/admin/max/connect-button.tsx
/** ui-field `users.maxConnect` — «Подключить MAX» (task 06). Stub. */
export function MaxConnectButton() {
  return null;
}
```

Аналогично `MaxGroupLinkPanel` (`group-link-panel.tsx`), `SeoTitleCounter`, `SeoDescriptionCounter`, `SeoSnippetPreview` (`src/payload/admin/seo/*`).

`src/payload/fields/seo.ts`:
- у поля `title`: `admin: { description: …как есть, components: { afterInput: ["/payload/admin/seo/seo-title-counter#SeoTitleCounter"] } }`;
- у `description`: `afterInput: ["/payload/admin/seo/seo-description-counter#SeoDescriptionCounter"]`;
- сразу после `description` (до `row` с noindex/canonical): `{ name: "seoSnippet", type: "ui", admin: { components: { Field: "/payload/admin/seo/seo-snippet-preview#SeoSnippetPreview" } } }`.

`seoField()` используется несколькими коллекциями — так и задумано; ui-поля и `admin.components` колонок не создают (миграция не должна содержать изменений таблиц SEO).

`src/lib/preview/preview-url.ts`:

```ts
import type { GeneratePreviewURL } from "payload";
/**
 * `pages.admin.preview` (task 11 implements the draft preview route). Returning `null` hides
 * Payload's preview button, so the stub changes nothing in the admin.
 */
export const buildPreviewUrl: GeneratePreviewURL = () => null;
```

`pages.ts`: `admin: { …, preview: buildPreviewUrl }`.

### 11. Миграция `admin_redesign`

Работать на **своей одноразовой** БД (не на общей `inex_glass`; push запрещён):

```bash
docker compose up -d postgres
docker compose exec postgres createdb -U dev_user inex_glass_t01_test
export DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/inex_glass_t01_test
pnpm migrate                       # 4 существующие миграции
pnpm migrate:create admin_redesign # diff против снимка последней миграции (.json)
```

Проверить SQL `up`:
- только `CREATE TABLE notification_log`, `CREATE TYPE enum_notification_log_*`, `ALTER TABLE … ADD COLUMN` (`leads`, `_leads_v` — `version_refuse_reason_code`, `version_kp_amount`, `version_updated_by_id`; `pages`, `_pages_v` — `updated_by_id`/`version_updated_by_id`; `users` — `max_*`; `site_settings` — `notifications_max_*`; `payload_locked_documents_rels.notification_log_id`), FK и индексы (`notification_log_key_idx` unique, `users_max_user_id_idx`);
- enum-ы заданий: `ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'max-notify'` и т. п. для `enum_payload_jobs_task_slug` и `enum_payload_jobs_log_task_slug` (если CLI сгенерировал пересоздание типа через `text` — это тоже допустимо, главное без потери данных);
- нет `DROP` существующих таблиц/колонок/типов (expand-only). Таблиц и колонок для SEO-ui-полей нет.

Проверить `down`: CLI пересоздаёт enum-ы заданий без новых значений (`SET DATA TYPE text` → `DROP TYPE` → `CREATE TYPE` → обратно `USING …::enum`). Каст упадёт, если в `payload_jobs` есть строки с новыми slug-ами, поэтому **в начало `down` вручную** добавить:

```sql
DELETE FROM "payload_jobs" WHERE "task_slug" IN ('max-notify', 'max-unassigned-reminder');
DELETE FROM "payload_jobs_log" WHERE "task_slug" IN ('max-notify', 'max-unassigned-reminder');
```

Затем:

```bash
pnpm migrate                 # применяется admin_redesign
pnpm migrate:status          # всё Ran
pnpm payload migrate:down    # откат последней партии без ошибок
pnpm migrate                 # повторное применение
pnpm generate:types          # src/payload-types.ts (коммитит эта задача)
pnpm generate:importmap      # проверить, что заглушки находятся; importMap.js затем откатить (git checkout)
pnpm payload migrate:create check_no_diff --skip-empty   # без diff выходит с кодом 0 и файла не создаёт; если файл создался — удалить и исправить схему
```

Без `--skip-empty` CLI при пустом diff задаёт интерактивный вопрос («create a blank migration file?») и в неинтерактивной оболочке зависает.

Убедиться, что новая миграция попала в `src/migrations/index.ts`. После работы удалить БД: `docker compose exec postgres dropdb -U dev_user inex_glass_t01_test`.

### 12. Проверки

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build
```

E2E (авторитетно — на prod-сборке и одноразовой `*_test` БД, `scripts/acceptance/local-stand.sh`): `pnpm test:e2e e2e/admin-leads.spec.ts e2e/orders.spec.ts` — существующие тесты проходят без изменений (в т. ч. «status «Отказ» requires a reason»). Вручную в `/admin/`: формы заявки, страницы, пользователя, настроек сайта открываются; заглушки ничего не рисуют; кнопки превью у страниц нет.

## Acceptance Criteria

- [ ] Поля и коллекция соответствуют разделам 2–7 (имена, типы, опции, access); `notification-log` скрыта и закрыта для REST на запись; менеджер не может изменить `maxUserId` (свой и чужой), не видит чужой `maxUserId`, никто не читает `*TokenHash` через API.
- [ ] `updatedBy` ставится хуком: сохранение из админки/REST → id пользователя, Local API без пользователя → `null`, запись с `context.keepUpdatedBy` (в т. ч. `JOB_WRITE_CONTEXT`) сохраняет прежнее значение; прислать `updatedBy` через REST нельзя.
- [ ] Валидация отказа: код без текста проходит (кроме `other`); без кода и текста и при `other` без текста — ровно одна ошибка `{ path: "refuseReason", message: "Укажите причину отказа" }`; существующие тесты `lead-admin-hooks.test.ts` и `e2e/admin-leads.spec.ts` проходят без изменений.
- [ ] Задания `max-notify` и `max-unassigned-reminder` зарегистрированы (вход, ретраи `MAIL_RETRIES`, расписание `*/15 * * * *` в `MAINTENANCE_QUEUE`), обработчики — no-op; `jobs.test.ts` покрывает реестр.
- [ ] Хуки `leadMaxNotify` / `orderMaxNotify` подключены последними в `afterChange` и ничего не делают.
- [ ] ui-поля `maxConnect`, `maxGroupLink`, `seoSnippet` и `afterInput` у `seo.title` / `seo.description` указывают на заглушки по путям из этой задачи; `pages.admin.preview = buildPreviewUrl` (возвращает `null`).
- [ ] Миграция `<timestamp>_admin_redesign` только добавляет объекты; `up` → `down` → `up` на одноразовой БД проходят; повторный `migrate:create` не видит diff; `src/migrations/index.ts` и `src/payload-types.ts` обновлены и закоммичены задачей, `importMap.js` не изменён.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` зелёные.

## Notes

- Модель: премиум (схема, миграция, обратная совместимость хуков).
- После этой задачи схема спеки заморожена: если задаче волн 2–3 не хватает поля, она останавливается и сообщает координатору.
- Имена экспортов заглушек (`MaxConnectButton`, `MaxGroupLinkPanel`, `SeoTitleCounter`, `SeoDescriptionCounter`, `SeoSnippetPreview`, `buildPreviewUrl`, `leadMaxNotify`, `orderMaxNotify`, `maxNotifyTask`, `maxUnassignedReminderTask`) — контракт: задачи 06, 07, 10, 11 заменяют тела, но не имена и пути (иначе придётся менять файлы схемы).
- `notification-log.read` — только admin; задачи 08/10 читают журнал через Local API с `overrideAccess: true` в своих server components / заданиях.
- Отчёты и CSV-экспорт не меняются: «`refuseReasonCode = null` при наличии текста = „Другое“» реализует дашборд (task-04).
- `maxDepth: 0` у `updatedBy`: имя автора задачи 07/08 получают отдельным запросом к `users` (или через relationship-поле админки, которое само подгружает подпись).
- Запуск `pnpm dev` / `payload run` перегенерирует `payload-types.ts` — для этой задачи это нормально (владелец), но итоговый файл должен совпадать с `pnpm generate:types`.
