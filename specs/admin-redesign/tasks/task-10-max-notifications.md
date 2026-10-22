# Task 10: Уведомления MAX и напоминание «без ответственного»

## Status

pending

## Wave

3

## Description

Наполнить заглушки уведомлений в мессенджер MAX: шаблоны сообщений, идемпотентная доставка с журналом `notification-log`, постановка заданий из хуков заявок и заказов, обработчики заданий `max-notify` и `max-unassigned-reminder`, удаление сообщений MAX при стирании персональных данных заявки. События: новая заявка → групповой чат; назначение → личка ответственного; смена статуса → личка ответственного (+ группа, если включено); события заказа (создан, смена статуса) → группа + личка менеджера заказа; заявка «Новая» без ответственного дольше 2 ч → одно напоминание в группу. На стейджинге всё уходит только в тестовый чат или не уходит (`resolveMaxTarget` из task-06). Повторы заданий не дублируют сообщения.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-06-max-core.md
**Blocks:** task-13-acceptance.md

**Context from dependencies:**
- **task-01** (схема, миграция `admin_redesign`):
  - коллекция `notification-log` (скрытая, read — admin, запись только Local API, без версий): `key` (text, **unique**, index), `channel` (`group`/`user`), `event` (`new_lead`/`status_change`/`assigned`/`order_event`/`unassigned_reminder`), `lead` (rel → `leads`), `order` (rel → `orders`), `recipient` (rel → `users`, необязательное), `chatId` (text), `messageId` (text), `status` (`sent`/`failed`/`skipped`), `error` (text), `sentAt` (date);
  - `users`: `maxUserId` (text), `maxLinkedAt` (date), `maxBotStopped` (checkbox) — запись `systemOnly` (Local API с `overrideAccess: true` пишет);
  - `site-settings.notifications.max`: `newLead`, `statusChange`, `assigned`, `orderEvents`, `unassignedReminder` (checkbox, default `true`), `groupChatId`, `groupChatTitle`, `groupLinkedAt`;
  - `leads`: `refuseReasonCode` (опции — константа в `src/payload/collections/crm/constants.ts`, `LEAD_REFUSE_REASON_CODES`), `kpAmount`, `updatedBy` (rel → users, `null` = «Система»);
  - задания (slug-и и `inputSchema` заданы task-01, **не менять**): `max-notify` — input `{ event: 'new_lead'|'status_change'|'assigned'|'order_event', leadId?: string, orderId?: string, assigneeId?: string, statusChangedAt?: string, orderStatus?: string }`, `retries: MAIL_RETRIES`; `max-unassigned-reminder` — без input, `schedule: [{ cron: '*/15 * * * *', queue: MAINTENANCE_QUEUE }]`. Хендлеры-заглушки `src/jobs/max-notify.ts`, `src/jobs/max-unassigned-reminder.ts` возвращают `{ output: {} }`; экспортированные имена констант/TaskConfig в них оставить как есть (их импортирует `src/jobs/index.ts`, который эта задача не трогает);
  - хуки-заглушки, уже подключённые: `src/payload/hooks/lead-max-notify.ts` → `export const leadMaxNotify: CollectionAfterChangeHook` в `leads.hooks.afterChange`; `src/payload/hooks/order-max-notify.ts` → `export const orderMaxNotify` в `orders.hooks.afterChange`.
- **task-06** (ядро MAX, `src/lib/max/*`):
  - `client.ts`: `maxSendMessage({ chatId?, userId?, text, buttons?: { text: string; url: string }[][], notify?: boolean }): Promise<{ messageId: string }>` (HTML, `format: 'html'`, кнопки — `inline_keyboard` с `type: 'link'`); `maxDeleteMessage(messageId: string): Promise<void>`; `class MaxApiError extends Error { status: number; code?: string; permanent: boolean }` (401/403/404 → `permanent: true`; 429/5xx/сеть → `permanent: false`);
  - `target.ts`: `resolveMaxTarget({ chatId?, userId? })` → адресат или `null` (не слать): при `MAX_ENABLED` выключенном → `null`; при `SITE_ENV !== 'production'` → `{ chatId: MAX_INTERCEPT_CHAT_ID }` или `null`;
  - `html.ts`: `escapeHtml`, `truncateMaxText` (≤ 4000 символов);
  - переменные окружения (`src/lib/env.ts`, читать через `getEnv()`): `MAX_ENABLED`, `MAX_BOT_TOKEN`, `MAX_INTERCEPT_CHAT_ID` и др. — тип/имена посмотреть в `env.ts`, не добавлять новых.
- Существующее: `src/jobs/shared.ts` (`MAIL_RETRIES`, `JOB_WRITE_CONTEXT`, `relationId`, `populated`, `loadSiteSettings`, `describeError` — логировать только имя/код ошибки, без ПДн), `src/payload/hooks/lead-assignee-notify.ts` (образец хука: постановка задания в той же транзакции через `req`, ошибка постановки логируется и не валит сохранение), `src/payload/hooks/order-lifecycle.ts` (`context.skipOrderHooks`), `src/lib/leads-admin/erase.ts` (стирание ПДн в транзакции + best effort после коммита), `src/payload/admin/leads/data.ts` (`loadLeadStatuses`), `src/payload/admin/leads/constants.ts` (`formTypeLabel`), `src/lib/orders/status.ts` (`statusLabel`, `isOrderStatus`), `src/lib/domain/format.ts` (`formatRub`, `formatNumber`, `formatDateRu`), `src/lib/leads-admin/export-rows.ts` (`formatDateTime` в часовом поясе компании). `next.config.ts` — `trailingSlash: true`.

## Files to Create

- `src/lib/max/messages.ts` — чистые шаблоны сообщений (HTML) по событиям
- `src/lib/max/messages.test.ts` — unit-тесты шаблонов
- `src/lib/max/notify.ts` — идемпотентная доставка: журнал, адресат, троттлинг, классификация ошибок
- `src/lib/max/notify.test.ts` — unit-тесты доставки (клиент MAX и payload замоканы)
- `src/payload/hooks/max-notify-hooks.test.ts` — unit-тесты хуков постановки заданий

## Files to Modify

- `src/payload/hooks/lead-max-notify.ts` — постановка `max-notify` при создании, смене ответственного, смене статуса
- `src/payload/hooks/order-max-notify.ts` — постановка `max-notify` (`order_event`) при создании заказа и смене `currentStatus`
- `src/jobs/max-notify.ts` — обработчик (тело `handler`; slug, `inputSchema`, `retries` не менять)
- `src/jobs/max-unassigned-reminder.ts` — обработчик напоминания (тело `handler`; slug и `schedule` не менять)
- `src/jobs/shared.ts` — **только** добавить `skipMaxNotify: true` в `JOB_WRITE_CONTEXT` (служебные записи заданий не должны порождать уведомления)
- `src/lib/leads-admin/erase.ts` — удаление строк `notification-log` заявки в транзакции и сообщений MAX после коммита; `skipMaxNotify: true` в `ERASE_CONTEXT`
- `src/lib/leads-admin/erase.test.ts` — тест чистого хелпера `collectMaxMessageIds`

**Не трогать:** `src/lib/max/{client,target,html,link-token}.ts` и webhook (task-06), `src/jobs/index.ts`, коллекции и глобалы, `src/lib/env.ts`, `src/payload-types.ts`, `importMap.js`.

## Technical Details

### Ключи идемпотентности (`notification-log.key`)

Один ключ = одно сообщение одному адресату. Формат (уточняет контракт README суффиксом канала):

| Событие | Ключ |
|---|---|
| новая заявка → группа | `max:new-lead:<leadId>` |
| назначение → личка | `max:assigned:<leadId>:<assigneeId>:<jobId>` (`jobId` — id задания Payload: ретраи того же задания дают тот же ключ, повторное назначение того же человека позже — новый) |
| смена статуса → личка | `max:status:<leadId>:<statusChangedAt ISO>:user:<userId>` |
| смена статуса → группа | `max:status:<leadId>:<statusChangedAt ISO>:group` |
| заказ → группа | `max:order:<orderId>:<status>:group` |
| заказ → личка менеджера | `max:order:<orderId>:<status>:user:<managerId>` |
| напоминание → группа | `max:unassigned:<leadId>` |

### `src/lib/max/notify.ts`

```ts
export type MaxDelivery = {
  key: string;
  event: "new_lead" | "status_change" | "assigned" | "order_event" | "unassigned_reminder";
  channel: "group" | "user";
  leadId?: string;
  orderId?: string;
  recipientId?: string;               // users.id для channel = user
  target: { chatId?: string; userId?: string };
  message: MaxMessage;                 // из messages.ts
};
export type DeliveryResult = "sent" | "duplicate" | "skipped" | "failed" | "disabled";

export async function deliverMaxNotification(payload: Payload, d: MaxDelivery): Promise<DeliveryResult>;
export async function recordSkipped(payload: Payload, d: Omit<MaxDelivery, "target" | "message">, reason: string): Promise<void>;
export class MaxTransientError extends Error {} // для ретрая задания
```

Алгоритм `deliverMaxNotification`:
1. `const target = resolveMaxTarget(d.target)`; `null` → вернуть `'disabled'` **без записи в журнал** (MAX выключен или стейджинг без тестового чата).
2. `find` в `notification-log` по `key` (`limit: 1`, `overrideAccess: true`). Есть и `status === 'sent'` → `'duplicate'`. Есть со статусом `failed`/`skipped` → использовать эту строку (повтор). Нет → `create` строки-резерва `{ key, event, channel, lead, order, recipient, chatId: target.chatId ?? null, status: 'failed', error: 'pending' }`. Если `create` упал на уникальности (параллельный дубль) → `'duplicate'`.
   - Резерв делается как `failed` + `error: 'pending'`, потому что в enum статусов нет `pending` (схема заморожена task-01); история task-09 показывает такие строки как «Отправка в MAX…».
   - **Все записи журнала — без `req` задания** (`payload.create/update` без `req`, `overrideAccess: true`): отметка `sent` должна сохраниться, даже если задание потом упадёт и его транзакция откатится, иначе ретрай отправит дубль.
3. Троттлинг: модульная `Map<chatKey, lastSentAt>`; перед отправкой ждать, чтобы между сообщениями в один чат/пользователю было ≥ 550 мс (лимит MAX — 2 сообщения/с в чат). Задания и так идут небольшими пачками; это страховка при параллельном выполнении.
4. `maxSendMessage({ ...target, text: message.text, buttons: message.buttons, notify: true })`.
5. Успех → `update` строки `{ status: 'sent', messageId, chatId: target.chatId ?? target.userId ?? null, sentAt: now, error: null }` → `'sent'`.
6. `MaxApiError` с `permanent: true` → `update` `{ status: 'failed', error: \`${status}${code ? ' ' + code : ''}\` }`; если `channel === 'user'` и `status === 403` (бот заблокирован/остановлен пользователем) → `payload.update({ collection: 'users', id: recipientId, data: { maxBotStopped: true }, overrideAccess: true, context: JOB_WRITE_CONTEXT })`; вернуть `'failed'` (без ретрая). 404 группы → `payload.logger.error({ msg: 'max: group chat not found' })` (без ПДн).
7. Прочие ошибки (429, 5xx, сеть, `MaxApiError.permanent === false`) → `update` `{ status: 'failed', error: \`retry: ${status ?? name}\` }` и `throw new MaxTransientError(...)`.

`recordSkipped` — создаёт (если ключа ещё нет) строку `status: 'skipped'`, `error: reason` — для случаев «получатель не подключил MAX» / «бот остановлен» (видно в истории карточки).

Обработчик задания отправляет всем адресатам события по очереди, ловит `MaxTransientError` у каждого и после цикла, если хоть один был, бросает одну ошибку → Payload повторит задание (`MAIL_RETRIES`); уже отправленные адресаты при ретрае дадут `'duplicate'`.

### `src/lib/max/messages.ts`

```ts
export type MaxMessage = { text: string; buttons?: { text: string; url: string }[][] };
export interface MessageContext { siteUrl: string } // SITE_URL из getEnv()

export function leadAdminUrl(siteUrl: string, leadId: string): string; // `${origin}/admin/collections/leads/${id}/summary/`
export function orderAdminUrl(siteUrl: string, orderId: string): string; // `${origin}/admin/collections/orders/${id}/`

export function newLeadMessage(lead: LeadForMessage, ctx: MessageContext): MaxMessage;
export function assignedMessage(lead: LeadForMessage, p: { assignedBy: string }, ctx: MessageContext): MaxMessage;
export function statusChangeMessage(
  lead: LeadForMessage,
  p: { from: string | null; to: string; reason: string | null; changedBy: string; isContract: boolean },
  ctx: MessageContext
): MaxMessage;
export function unassignedReminderMessage(lead: LeadForMessage, p: { hours: number }, ctx: MessageContext): MaxMessage;
export function orderEventMessage(
  order: OrderForMessage,
  p: { isNew: boolean; statusLabel: string },
  ctx: MessageContext
): MaxMessage;
```

`LeadForMessage` — плоские поля: `id, formType, company, name, phone, city, productType, area, estimateFrom, estimatePriceDate, flags, isDuplicate, comment, kpAmount, createdAt`; `OrderForMessage` — `id, number, company, leadCompany`. Подписи (форма, изделие, флаги) — из констант проекта (`formTypeLabel`, `LEAD_PRODUCT_TYPES`, `LEAD_FLAGS`).

Тексты (HTML MAX: только `<b>`, `<i>`, `<a>`, `<code>`, `<blockquote>` и т. п.; **каждое значение — через `escapeHtml`**, итог — через `truncateMaxText`; строки разделять `\n`; пустые строки пропускать):
- новая заявка: `<b>Новая заявка · {форма}</b>`, `{компания} · {имя}`, `Телефон: {phone}`, `Город: {city}`, `Изделие: {тип}, {площадь} м²`, `Ориентир: от {formatRub} на {formatDateRu(priceDate)}`, `Флаги: {через запятую}`, `Повторное обращение` (если дубль), `Комментарий: {первые 300 символов}`;
- назначение: `<b>Вам назначена заявка</b>`, компания · имя, телефон, изделие/площадь, `Назначил: {assignedBy}`;
- смена статуса: `<b>Статус заявки: «{from}» → «{to}»</b>` (без `from` — `<b>Статус заявки: «{to}»</b>`), компания · имя, телефон, `Причина: {reason}` (для отказа), `Сумма КП: {formatRub(kpAmount)}` (если `isContract` и есть сумма), `Изменил: {changedBy}`;
- напоминание: `<b>Заявка без ответственного больше {hours} ч</b>`, компания · имя, телефон, `Создана: {formatDateTime(createdAt)}`;
- заказ: `isNew` → `<b>Создан заказ № {number}</b>`, иначе `<b>Заказ № {number}: {statusLabel}</b>`; `Компания: {company ?? leadCompany}`; телефон клиента не включать.
- Кнопка: `[[{ text: 'Открыть заявку', url: leadAdminUrl(...) }]]` (для заказа — «Открыть заказ», `orderAdminUrl`). **Только если `siteUrl` начинается с `https://`** (MAX принимает только https-ссылки); иначе ссылку добавить последней строкой текста.
- Телефон в сообщениях — по решению после ревью (менеджерам нужно позвонить из мессенджера); поэтому `messageId` каждого сообщения хранится в журнале и удаляется при стирании ПДн.

### Хуки

`src/payload/hooks/lead-max-notify.ts` (`leads.afterChange`):
- выйти, если `context.skipMaxNotify === true` или MAX выключен (`getEnv()` → флаг `MAX_ENABLED` из task-06): не плодить задания там, где слать некуда;
- `operation === 'create'` → `{ event: 'new_lead', leadId }`; если у новой заявки уже есть `assignee` — дополнительно `{ event: 'assigned', leadId, assigneeId }`;
- `update`: `relationId(doc.assignee)` изменился на непустой и `context.skipAssigneeNotify !== true` → `assigned`; `relationId(doc.status)` изменился → `{ event: 'status_change', leadId, statusChangedAt: doc.statusChangedAt }` (если `statusChangedAt` пуст — не ставить);
- `await req.payload.jobs.queue({ task: 'max-notify', input, req })` — в той же транзакции; ошибка логируется (`leadId`, имя ошибки) и не прерывает сохранение; вернуть `doc`.

`src/payload/hooks/order-max-notify.ts` (`orders.afterChange`):
- выйти при `context.skipOrderHooks === true` / `skipMaxNotify === true` / MAX выключен;
- `create` с валидным `currentStatus` → `{ event: 'order_event', orderId, orderStatus: currentStatus }`; `update`, где `currentStatus` изменился и валиден (`isOrderStatus`) → то же.
- Событий «клиент открыл ссылку / подтвердил получение» в схеме нет (нет полей), поэтому `received` приходит только как смена статуса менеджером. Новые поля не добавлять.

### Обработчик `max-notify` (`src/jobs/max-notify.ts`)

Общие шаги: `const settings = await loadSiteSettings(req)`; `const max = settings?.notifications?.max`; `SITE_URL` из `getEnv()`. Данные читать `overrideAccess: true`, `depth: 0`/`1`, `req`.
- **`new_lead`**: тумблер `max.newLead !== false`; нет `max.groupChatId` → вернуть `{ output: { skipped: 'no-group-chat' } }`; заявка не найдена → `skipped: 'lead-not-found'`; доставка в группу с ключом `max:new-lead:<leadId>`.
- **`assigned`**: тумблер `max.assigned !== false`; `relationId(lead.assignee) !== input.assigneeId` → `skipped: 'assignee-changed'` (как `notify-assigned`); получатель `users` (`maxUserId`, `maxBotStopped`, `name`): нет `maxUserId` → `recordSkipped(…, 'не подключил MAX')`; `maxBotStopped` → `recordSkipped(…, 'бот остановлен')`; иначе `target: { userId: maxUserId }`. Если назначил себя сам (`relationId(lead.updatedBy) === assigneeId`) — не слать (`skipped: 'self-assigned'`). `assignedBy` — имя `updatedBy` или «Система». Ключ — с `job.id` (аргумент `job` хендлера Payload).
- **`status_change`**: если `lead.statusChangedAt !== input.statusChangedAt` → `skipped: 'superseded'` (позже была ещё смена, её отправит своё задание). `to` — текущий статус; `from` — статус из последней версии с другим статусом (`payload.findVersions({ collection: 'leads', where: { parent: { equals: id } }, sort: '-createdAt', limit: 10, depth: 0 })`), иначе `null`; `reason` — подпись `refuseReasonCode` + `refuseReason`, если у `to` `requiresReason`; `changedBy` — имя `updatedBy` или «Система». Адресаты: (а) ответственный в личку — **всегда** (если привязан MAX и он не сам автор изменения; иначе `recordSkipped`/пропуск); (б) группа — только если `max.statusChange !== false` и есть `groupChatId`.
- **`order_event`**: тумблер `max.orderEvents !== false`; заказ (`number`, `company`, `manager`, `lead` → `company`); `isNew` — в `statusHistory` ровно одна запись и это `input.orderStatus` (заказ только что создан); `statusLabel` — `statusLabel(orderStatus)`. Адресаты: группа (если есть `groupChatId`) + менеджер заказа в личку (если привязан и не `maxBotStopped`).
- Вернуть `{ output: { sent: n, skipped?: string } }` (в `outputSchema` заглушки task-01 — если там нет полей, вернуть `{ output: {} }` и логировать счётчики).

### Обработчик `max-unassigned-reminder`

- Тумблер `max.unassignedReminder !== false` и `groupChatId`, иначе выход.
- Статус по умолчанию — `loadLeadStatuses(payload)` → `isDefault`.
- Кандидаты: `payload.find({ collection: 'leads', where: { and: [{ status: { equals: defaultId } }, { assignee: { exists: false } }, { createdAt: { less_than: now - 2 ч } }, { createdAt: { greater_than: now - 72 ч } }] }, sort: 'createdAt', limit: 10, depth: 0, overrideAccess: true })` — окно 72 ч, чтобы первый запуск после релиза не завалил чат старыми заявками; лимит 10 за прогон (остальные — через 15 мин).
- Уже напомненные отсечь одним запросом `notification-log` `where: { key: { in: ids.map(id => \`max:unassigned:${id}\`) } }`.
- Для каждой — `deliverMaxNotification` с ключом `max:unassigned:<leadId>`, `hours = floor((now - createdAt) / 1 ч)`. Ошибки — как в `max-notify`.

### Стирание ПДн (`src/lib/leads-admin/erase.ts`)

- `ERASE_CONTEXT` += `skipMaxNotify: true`.
- В `eraseInTransaction` **до** `payload.delete` заявки: `payload.find({ collection: 'notification-log', where: { lead: { equals: leadId } }, pagination: false, depth: 0, overrideAccess: true, select: { messageId: true }, req })` → `stored.maxMessageIds = collectMaxMessageIds(docs)`; затем `payload.delete({ collection: 'notification-log', where: { lead: { equals: leadId } }, overrideAccess: true, context: ERASE_CONTEXT, req })`.
- После коммита (рядом с `removePendingJobs`, best effort, вне транзакции): `deleteMaxMessages(payload, ids)` — по очереди `maxDeleteMessage(id)` в `try/catch`; если MAX выключен — не вызывать, `logger.warn({ event: 'lead-erase-max-skipped', leadId, count })`; итог — `logger.info`/`warn` только с `leadId` и счётчиками (`deleted`, `failed`). Ошибки (в т. ч. отказ MAX удалить старое сообщение) **не** меняют результат стирания.
- `export function collectMaxMessageIds(rows: readonly { messageId?: unknown }[]): string[]` — уникальные непустые строки (тест в `erase.test.ts`).
- В `EraseResult.deleted` добавить `notifications: number` (число удалённых строк журнала) — новое поле, существующие `versions/files/consentAnonymized` не менять (на них опирается e2e).
- Отложенные задания `max-notify` заявки уже удаляет `removePendingJobs` (фильтр `input.leadId`).

### Unit-тесты (Vitest, проект `unit`)

- `messages.test.ts`: экранирование `<`, `&`, `"` в компании/комментарии; `truncateMaxText` на длинном комментарии; цена с NBSP «от 168 000 ₽»; кнопка только для `https://`; `leadAdminUrl` со слешем на конце; статус без `from`.
- `notify.test.ts` (`vi.mock('@/lib/max/client')`, `vi.mock('@/lib/max/target')`, фейковый `payload` с `find/create/update`): `disabled` без записи; первая отправка → резерв + `sent` с `messageId`; повтор с `sent` → `duplicate` без вызова клиента; повтор после `failed` → отправка; 403 в личку → `failed` + `maxBotStopped: true`; 429 → строка `retry: 429` и `MaxTransientError`; троттлинг (фейковые таймеры: два сообщения в один чат разделены ≥ 550 мс).
- `max-notify-hooks.test.ts`: create → `new_lead`; create с ответственным → ещё `assigned`; смена ответственного → `assigned`; тот же ответственный → ничего; смена статуса → `status_change` со `statusChangedAt`; `skipMaxNotify` → ничего; ошибка `jobs.queue` не пробрасывается; заказ: create → `order_event`, смена `currentStatus` → `order_event`, `skipOrderHooks` → ничего.

### Команды

```bash
pnpm lint && pnpm typecheck && pnpm test
git checkout -- src/payload-types.ts src/app/(payload)/admin/importMap.js   # не владелец
```

## Acceptance Criteria

- [ ] Новая заявка ставит `max-notify` (`new_lead`); задание отправляет одно сообщение в групповой чат с телефоном, изделием, площадью, ориентиром и кнопкой «Открыть заявку» → `https://<домен>/admin/collections/leads/<id>/summary/`.
- [ ] Назначение → личка ответственного; смена статуса → личка ответственного (кроме автора изменения) и группа при включённом «Смена статуса»; заказ создан/сменил статус → группа + личка менеджера заказа; заявка «Новая» без ответственного > 2 ч → одно напоминание в группу (повторно — никогда).
- [ ] Выключенный тумблер события в «Настройки сайта → Уведомления» отключает соответствующие сообщения; MAX выключен (`MAX_ENABLED`) — задания не ставятся, ничего не отправляется.
- [ ] Ретрай задания и повторная постановка не дают дублей (ключи `notification-log`); у каждой отправленной строки есть `messageId`, `chatId`, `sentAt`.
- [ ] 401/403/404 не ретраятся, строка `failed` с кодом; 403 в личку ставит `users.maxBotStopped = true`; 429/5xx ретраятся через `MAIL_RETRIES`.
- [ ] Получатель без `maxUserId` или с `maxBotStopped` → строка `skipped` с причиной (видна в истории карточки task-09).
- [ ] На `SITE_ENV !== 'production'` все сообщения уходят только в `MAX_INTERCEPT_CHAT_ID` или не уходят (через `resolveMaxTarget`).
- [ ] Стирание ПДн удаляет строки `notification-log` заявки в транзакции и после коммита вызывает `DELETE /messages` по каждому `messageId`; сбой MAX не ломает стирание; e2e стирания (`e2e/admin-leads.spec.ts`, `e2e/acceptance/admin.spec.ts` 11e) проходят без изменений.
- [ ] В логах нет ПДн (телефонов, имён, текстов сообщений) — только id, коды и счётчики.
- [ ] Unit-тесты из раздела выше зелёные; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` зелёные; `payload-types.ts` не изменён.

## Notes

- Схема `notification-log.status` не содержит `pending`; резерв как `failed` + `error: 'pending'` — осознанный компромисс (добавление значения в enum — отдельная схемная задача через координатора).
- `inputSchema` задания `max-notify` не содержит прежнего статуса, поэтому `from` вычисляется по версиям (best effort).
- Сообщения MAX можно удалить не всегда (ограничения платформы по давности/правам бота) — это логируется счётчиком `failed`, данные в нашей БД удаляются в любом случае.
- Ответ сервера MAX может содержать текст сообщения — не логировать тела ответов.

## Поправки координатора (приоритет над текстом выше)

- В `notification-log.status` есть `pending`: резервировать запись со `status: 'pending'`, после отправки → `sent` (+ `messageId`, `sentAt`) или `failed` (+ `error`).
- В input `max-notify` есть необязательный `previousStatus` (id статуса до смены). Хук `lead-max-notify` передаёт его из `previousDoc.status`; «из → в» строится по нему, без разбора версий.
- Формат ключей журнала с каналом: `max:<event>:<id>[:<суффикс>]:group` или `…:user:<userId>`; для назначения добавлять `:<jobId>` — как описано выше, это и есть контракт.
- Тумблеры: `statusChange` управляет сообщением в группу; ответственный получает смену статуса в личку всегда (кроме случая, когда менял он сам); `assigned` — личка о назначении.
- Ссылки на карточку — со слешем на конце: `/admin/collections/leads/<id>/summary/` (`trailingSlash: true`).
- Каждый текст перед отправкой пропускать через `decorateMaxText` из `src/lib/max/target.ts` (task-06): вне production первая строка `[ТЕСТ] Inex Glass`, в production — `Inex Glass`. Бот GRATEC общий с другим сайтом, тестовый чат — их рабочий канал заявок: без пометки ничего не слать.
