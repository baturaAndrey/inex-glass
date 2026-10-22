# Task 09: Комментарии и история заявки, e2e карточки

## Status

pending

## Wave

3

## Description

Сделать два блока карточки заявки из макета `res/admin-mockup/Lead.dc.html` («Комментарии и история»): форму и список внутренних комментариев (`LeadComments`) и хронологию событий (`LeadHistory`): создание заявки, письма менеджерам и ответственному, смены статуса и ответственного (с автором из `updatedBy`), изменения суммы КП, созданные заказы и уведомления MAX (отправлено / не отправлено). Хронология собирается чистой функцией `buildLeadTimeline` с unit-тестами. Компоненты вставляет в вкладку «Сводка» task-08 (контракт той же волны). Эта же задача обновляет e2e карточки под новую разметку task-08 и добавляет e2e на добавление комментария и историю.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-02-admin-theme-foundation.md, task-05-leads-kanban.md; task-08-lead-card-processing.md — **контракт той же волны**
**Blocks:** task-13-acceptance.md

**Context from dependencies:**
- **task-01** (схема): `leads.updatedBy` и `pages.updatedBy` — relationship → `users`, заполняет `beforeChange`-хук `src/payload/hooks/set-updated-by.ts` (`req.user?.id ?? null`, `null` = «Система»), поэтому каждая версия заявки (`_leads_v`, `versions.maxPerDoc = 50`, без черновиков) хранит автора изменения. `leads.refuseReasonCode` (select `expensive|other_supplier|needs_installation|no_contact|other`, подписи — константа опций в `src/payload/collections/crm/constants.ts`, `LEAD_REFUSE_REASON_CODES`), `leads.kpAmount` (number). Скрытая коллекция **`notification-log`** (read — только admin, запись — только Local API): `key` (unique), `channel` (`group`/`user`), `event` (`new_lead`/`status_change`/`assigned`/`order_event`/`unassigned_reminder`), `lead` (rel → leads), `order` (rel → orders), `recipient` (rel → users), `chatId`, `messageId`, `status` (`sent`/`failed`/`skipped`), `error` (text), `sentAt` (date); стандартные `createdAt`. `site-settings.notifications.max.groupChatTitle` — название привязанного группового чата.
- **task-02**: тема админки; партиал этой задачи `src/app/(payload)/styles/_lead-history.scss` создан пустым и подключён. Базовые классы `.iga-card`, `.iga-btn` (`--primary|--secondary|--ghost|--danger`, `--sm`), `.iga-input`, `.iga-field`, `.iga-avatar` (`--sm`), `.iga-badge`, `.iga-tag` — использовать. Токены — `--ig-*` из `src/styles/ig-vars.css`.
- **task-05**: канбан `/admin/collections/leads/kanban/`; `leads.ts` в волне 3 не меняется.
- **task-08** (та же волна) переделывает `src/payload/admin/leads/lead-summary-view.tsx` и вставляет внутри карточки «Комментарии и история»:
  ```tsx
  <LeadComments leadId={lead.id} comments={commentRows} currentUserId={String(user.id)} />
  <LeadHistory leadId={lead.id} />
  ```
  `commentRows: { id: string; author: string | null; text: string; date: string }[]` — новые сверху, `author` — имя автора или `null`. Регионы карточки task-08 (имена = заголовки): «Контакты» (`a[href="tel:<phone>"]`, `a[href="mailto:<email>"]`), «Что нужно клиенту», «Файлы» (плитка-ссылка с именем «Скачать <файл>», `href=/api/lead-files/<id>/download/`), «Комментарии и история», «Откуда пришёл клиент» (вместо «Атрибуция»; внутри `<details>`, по умолчанию **свёрнут** — `<summary>` «Откуда пришёл клиент»; подписи `utm_source` и т. п. и «ClientID Метрики»), «Обработка» (select «Статус», select «Ответственный», кнопка «Назначить себя», кнопка «Сохранить»), «Флаги» внутри «Обработки» (все 5 флагов — `button` с `aria-pressed`; выбранные — `pressed: true`), «Повторные обращения» (текст «Есть повторы: N»; ссылка «Исходная заявка» теперь ведёт на `/admin/collections/leads/<id>/summary/`), «Согласие на обработку ПДн». Шапка: ссылка «Заявки», `h1` — компания.
- Существующее: хук `stampInternalComments` (`src/payload/hooks/lead-comments.ts`, `leads.beforeChange`) — строка без `id` или с неизвестным `id` получает `author = req.user`, `date = now`; существующие строки сохраняют свои `author`/`date`; менеджер не может менять/удалять чужие (ошибка `FOREIGN_COMMENT_MESSAGE` по пути `internalComments`); поле `internalComments` читается только staff. `newLeadNotifiedAt` (письмо о новой заявке, `src/jobs/notify-new-lead.ts`) и `assigneeNotifiedAt` (письмо ответственному, `src/jobs/notify-assigned.ts`) — даты отметок у заявки. `loadLeadStatuses`, `loadStaffNames` — `src/payload/admin/leads/data.ts`; `formTypeLabel` — `src/payload/admin/leads/constants.ts`; `formatDateTime`, `relationIdOf` — `src/lib/leads-admin/export-rows.ts`; `formatRub` — `src/lib/domain/format.ts`. Заказы заявки — join `leads.orders` (коллекция `orders`, поля `number`, `createdAt`).

## Files to Create

- `src/payload/admin/leads/history/build-timeline.ts` — чистая функция `buildLeadTimeline` и типы
- `src/payload/admin/leads/history/build-timeline.test.ts` — unit-тесты (Vitest, проект `unit`)
- `src/payload/admin/leads/history/load-timeline.ts` — серверный загрузчик данных хронологии (Local API)
- `src/payload/admin/leads/history/lead-history.tsx` — server component `LeadHistory`
- `src/payload/admin/leads/history/lead-comments.tsx` — client component `LeadComments`

## Files to Modify

- `src/app/(payload)/styles/_lead-history.scss` — стили комментариев и ленты (`.iga-lead-history*`, `.iga-lead-comments*`)
- `e2e/admin-leads.spec.ts` — обновить тест «summary tab» под разметку task-08, добавить тесты комментария и истории (см. ниже)
- `e2e/acceptance/lead-flow.spec.ts` — **только** блок «Admin UI: the card shows flags and attribution» (строки ~391–404): регион «Флаги» → чипы `pressed`, регион «Атрибуция» → «Откуда пришёл клиент» с раскрытием `<summary>`

**Не трогать:** `lead-summary-view.tsx` и `card/*` (task-08), хуки, коллекции, `src/payload-types.ts`, `importMap.js` (владелец волны — task-08; генераторы запускать локально и откатывать).

## Technical Details

### `build-timeline.ts`

```ts
export type TimelineKind =
  | "created" | "status" | "assignee" | "kp" | "email" | "max" | "order";

export interface TimelineItem {
  id: string;            // стабильный ключ: `${kind}:${source id}`
  date: string;          // ISO
  kind: TimelineKind;
  author: string;        // «Сайт», «Система» или имя сотрудника
  text: string;          // готовая русская строка
  tone: "default" | "danger"; // danger — ошибки отправки, отказ
  href?: string;         // ссылка (заказ)
}

export interface VersionSnapshot {
  id: string;
  createdAt: string;     // дата версии
  status: string | null; // id статуса
  assignee: string | null;
  refuseReasonCode: string | null;
  refuseReason: string | null;
  kpAmount: number | null;
  updatedBy: string | null;
}

export interface NotificationRow {
  id: string;
  event: "new_lead" | "status_change" | "assigned" | "order_event" | "unassigned_reminder";
  channel: "group" | "user";
  status: "sent" | "failed" | "skipped";
  recipient: string | null; // id
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface TimelineInput {
  lead: {
    createdAt: string;
    formType: string | null;
    newLeadNotifiedAt: string | null;
    assigneeNotifiedAt: string | null;
  };
  versions: VersionSnapshot[];          // любой порядок
  notifications: NotificationRow[];
  orders: { id: string; number: string | null; createdAt: string }[];
  statuses: ReadonlyMap<string, { name: string; requiresReason: boolean }>;
  staff: ReadonlyMap<string, string>;   // id → имя
  reasons: ReadonlyMap<string, string>; // refuseReasonCode → подпись
  groupChatTitle: string | null;
}

export function buildLeadTimeline(input: TimelineInput): TimelineItem[]; // новые сверху
```

Правила (каждое — отдельный тест):
1. **Создание** — `date = lead.createdAt`, `author`: имя `updatedBy` самой ранней версии, если эта версия создана в пределах 5 с от `createdAt` и `updatedBy` задан, иначе «Сайт»; текст «Заявка создана · {formTypeLabel(formType)}» + (если у самой ранней версии есть статус) « · статус «{name}»».
2. **Версии** — сортировать по `createdAt` по возрастанию, сравнивать каждую с предыдущей (первую — ни с чем: из-за `maxPerDoc = 50` старые версии обрезаны, событий для первой не генерировать):
   - статус изменился → «Статус: «A» → «B»» (`A` = «—», если не было); если у `B` `requiresReason` — добавить « · причина: {подпись кода}» и/или «: {текст}»; `tone: 'danger'` для `requiresReason`;
   - ответственный изменился → «Ответственный: {имя}» или «Ответственный снят»;
   - `kpAmount` изменилась → «Сумма КП: {formatRub(kpAmount)}» или «Сумма КП удалена»;
   - `author` — имя `updatedBy` или «Система» (`null`); неизвестный id → «Сотрудник».
   Одна версия может дать несколько событий (`id` с суффиксом поля).
3. **Письма** — `newLeadNotifiedAt` → «Письмо о заявке отправлено менеджерам»; `assigneeNotifiedAt` → «Письмо ответственному отправлено»; `author` «Система». Адреса не показывать.
4. **MAX** (`notification-log`), `date = sentAt ?? createdAt`, `author` «Система»:
   - `sent` + `group` → «Уведомление в MAX отправлено в чат «{groupChatTitle}»» (без названия — «в групповой чат»);
   - `sent` + `user` → «Уведомление в MAX отправлено: {имя получателя}»;
   - `failed` → «Не удалось отправить в MAX ({получатель или «групповой чат»}): {error, обрезать до 200 символов}», `tone: 'danger'`. Строки `failed` с `error === 'pending'` (резерв идемпотентности task-10, отправка ещё идёт) — показывать как «Отправка в MAX…»;
   - `skipped` → «Не отправлено в MAX: {имя} не подключил MAX» (или текст из `error`, если он есть);
   - префикс события в тексте: `new_lead` «Новая заявка», `status_change` «Смена статуса», `assigned` «Назначение», `unassigned_reminder` «Напоминание: нет ответственного», `order_event` «Заказ» — формат «{префикс}: {текст выше}».
5. **Заказы** — «Создан заказ № {number}» (или «Создан заказ»), `href = /admin/collections/orders/<id>/`.
6. Итог — сортировка по `date` по убыванию, при равенстве — порядок `created` последним (внизу), стабильно.

### `load-timeline.ts`

`export async function loadLeadTimeline(payload: Payload, user: TypedUser, leadId: string): Promise<TimelineItem[] | null>`:
- заявка — `payload.findByID({ collection: 'leads', id, depth: 0, overrideAccess: false, user, disableErrors: true, select: { createdAt, formType, newLeadNotifiedAt, assigneeNotifiedAt } })`; нет доступа → `null`;
- версии — `payload.findVersions({ collection: 'leads', where: { parent: { equals: leadId } }, sort: 'createdAt', limit: 50, depth: 0, overrideAccess: false, user })`; маппинг `doc.version.{status, assignee, refuseReasonCode, refuseReason, kpAmount, updatedBy}` через `relationIdOf`;
- уведомления — `payload.find({ collection: 'notification-log', where: { lead: { equals: leadId } }, sort: '-createdAt', limit: 100, depth: 0, overrideAccess: true })` — **`overrideAccess: true` осознанно**: менеджеру коллекция закрыта, но доступ к самой заявке уже проверен выше, а выбираются только строки этой заявки; в результат идут только поля из `NotificationRow` (без `chatId`/`messageId`);
- заказы — `payload.find({ collection: 'orders', where: { lead: { equals: leadId } }, depth: 0, limit: 20, overrideAccess: false, user, select: { number: true, createdAt: true } })`;
- `statuses` / `staff` — `loadLeadStatuses` / `loadStaffNames`; `groupChatTitle` — `payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true, select: { notifications: true } })` → `notifications?.max?.groupChatTitle ?? null` (ошибка чтения → `null`);
- `reasons` — из константы опций `refuseReasonCode`.

### `LeadHistory` (server)

- `export async function LeadHistory({ leadId }: { leadId: string })`. Получение `payload` и `user`: `const payload = await getPayload({ config })` (`@payload-config`) и `const { user } = await payload.auth({ headers: await headers() })` (`next/headers`) — так компонент самодостаточен при props `{ leadId }`.
- Разметка: `<div role="region" aria-label="История" className="iga-lead-history">` (имя региона даёт `aria-label`, отдельный заголовок не нужен — общий `h2` «Комментарии и история» рендерит task-08); список `<ol className="iga-lead-history__list">`, элемент `<li className="iga-lead-history__item" data-kind={kind} data-tone={tone}>`: строка-мета `.iga-lead-history__meta` «{formatDateTime(date)} · {author}» (12 px, `--ig-text-2`) и текст (ссылка, если `href`). Пусто — «Событий пока нет». `null` (нет доступа) — ничего не рендерить.
- Вид по макету: левая граница 2 px `--ig-line`, отступ 14 px, gap 14 px; `data-tone="danger"` — граница `--ig-danger` (tone `#EAADAD`) и текст `--ig-danger-text`.

### `LeadComments` (client)

```ts
export interface LeadCommentsProps {
  leadId: string;
  comments: { id: string; author: string | null; text: string; date: string }[];
  currentUserId: string;
}
```

- Разметка: `<div role="region" aria-label="Комментарии" className="iga-lead-comments">`. Форма: аватар `.iga-avatar--sm` (инициалы текущего пользователя через `useAuth()` из `@payloadcms/ui`, поле `name`), `<label htmlFor>` «Внутренний комментарий (клиент его не видит)», `<textarea className="iga-input" rows={3} maxLength={5000} placeholder="Например: перезвонить после 14:00, уточнить крепление">`, кнопка `.iga-btn--ghost` «Добавить» (disabled при пустом после `trim`, `aria-busy` во время запроса). Ctrl/Cmd+Enter — отправка.
- Список ниже формы: `<ul className="iga-lead-comments__list">`, элемент — мета «{formatDateTime(date)} · {author ?? 'Система'}» и текст (`white-space: pre-wrap`); левая граница `--ig-primary` (класс `.tl-i.c` макета). Пусто — ничего (история ниже).
- Отправка (защита от затирания параллельных комментариев):
  1. `GET /api/leads/${leadId}/?depth=0&select[internalComments]=true` (`credentials: 'same-origin'`) — свежий массив;
  2. `PATCH /api/leads/${leadId}/?depth=0` с телом `{ internalComments: [...fresh.map(r => ({ id: r.id, text: r.text })), { text }] }` — существующие строки только с `id` и `text` (хук сохраняет их автора и дату; чужой текст не меняется, поэтому `FOREIGN_COMMENT_MESSAGE` не возникает);
  3. 200 → очистить поле, `toast.success('Комментарий добавлен')`, `router.refresh()`; 400 → сообщение из `errors[0].data.errors[0].message` или `errors[0].message` в `role="alert"` под полем; иначе «Не удалось добавить комментарий».
  Окно гонки между шагами 1 и 2 остаётся (миллисекунды); это принято, в комментарии к коду описать. Порядок строк в БД не важен — список сортирует view.

### Стили (`_lead-history.scss`)

`.iga-lead-comments`, `__form`, `__list`, `__item`, `__meta`, `__error`; `.iga-lead-history`, `__list`, `__item`, `__meta`. Отступ между комментариями и историей 16 px. Без анимаций. На 375 px — аватар скрыт, кнопка «Добавить» на всю ширину, высота ≥ 44 px.

### E2E (`e2e/admin-leads.spec.ts`)

Файл работает только в проекте `desktop-1366` и сериально (как сейчас) — новые тесты добавить туда же, используя существующие фикстуры (`leadA`, `leadB`, `leadC`, `admin`, `manager`, `signInBrowser`).

1. Тест «summary tab…» обновить:
   - «Контакты» — без изменений (`tel:`/`mailto:`);
   - «Флаги»: `page.getByRole('region', { name: 'Флаги' })` → `getByRole('button', { name: 'Срочно', pressed: true })` и «Нужны документы» `pressed: true`, «Малый объём» `pressed: false`;
   - «Атрибуция» → `const source = page.getByRole('region', { name: 'Откуда пришёл клиент' }); await source.getByText('Откуда пришёл клиент').click();` (раскрыть `<summary>`), затем `utm_source`, `yandex`, `1234567890` видимы;
   - «Повторные обращения» содержит «Есть повторы: 1»;
   - «Файлы»: `getByRole('link', { name: 'Скачать' })` → `href` `/api/lead-files/<id>/download/`;
   - у дубля ссылка «Исходная заявка» → `href` `/admin/collections/leads/${leadA.id}/summary/`.
2. Новый тест «card: comment is added and shown with author»: менеджер (`signInBrowser(page.context(), manager, baseURL!)`) открывает карточку `leadA`, вводит текст `${RUN} комментарий`, «Добавить» → текст появляется в регионе «Комментарии» с именем менеджера; REST `GET /api/leads/<id>/` — строка есть, `author` = manager, прежние комментарии (из теста «comments…») на месте, их авторы не изменились.
3. Новый тест «card: processing panel saves status and history shows it»: админ на карточке `leadB` (статус «Новая»; `leadC` уже в «Отказе» после теста статусов): в «Обработке» выбрать статус «В работе», «Сохранить» → тост, после обновления в регионе «История» есть «Статус: «Новая» → «В работе»» и автор «E2E Админ» (имя e2e-админа берётся из `admin.user.name`); затем выбрать «Отказ» без причины → под полем сообщение `REFUSE_REASON_REQUIRED_MESSAGE`; выбрать причину «Дорого» → сохраняется. Нажать «Назначить себя» → в «Истории» «Ответственный: <имя>».
4. Новый тест «card: MAX notification rows appear in history» — **только если** в окружении e2e нет доступа к записи `notification-log` через REST (коллекция пишется только Local API), тест помечается `test.skip` с аннотацией «проверяется unit-тестом buildLeadTimeline»; не создавать обходных эндпоинтов.

`e2e/acceptance/lead-flow.spec.ts` — в блоке UI карточки те же замены для «Флаги» и «Атрибуция» (`test`, `cpc`, `CLIENT_ID` в «Откуда пришёл клиент» после раскрытия).

### Команды

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e -- e2e/admin-leads.spec.ts e2e/acceptance/lead-flow.spec.ts --project=desktop-1366
git checkout -- src/payload-types.ts src/app/(payload)/admin/importMap.js   # не владелец
```

## Acceptance Criteria

- [ ] `LeadHistory` и `LeadComments` экспортируются по путям и с props из контракта README; карточка task-08 собирается без правок с её стороны.
- [ ] Регионы «Комментарии» и «История» доступны по `getByRole('region', { name })`.
- [ ] История показывает создание, письма, смены статуса/ответственного/суммы КП с автором («Система» для `updatedBy = null`), заказы и строки `notification-log` (отправлено / не удалось / не отправлено); новые сверху.
- [ ] Менеджер видит историю с MAX-событиями, хотя `notification-log` ему закрыта по REST; `chatId`/`messageId` в props/HTML не попадают.
- [ ] Комментарий добавляется без потери параллельно добавленных строк (перечитывание перед PATCH), автор и дата ставятся сервером; ошибка показывается в `role="alert"`.
- [ ] `build-timeline.test.ts` покрывает правила 1–6 (включая обрезанные версии, `updatedBy = null`, неизвестный сотрудник, `pending`, равные даты).
- [ ] `e2e/admin-leads.spec.ts` и `e2e/acceptance/lead-flow.spec.ts` проходят на `desktop-1366` против разметки task-08; новые тесты комментария и панели обработки зелёные.
- [ ] Нет inline-цветов и `var(--theme-*)` в `style`; стили только в `_lead-history.scss`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` зелёные; `payload-types.ts` и `importMap.js` не закоммичены этой задачей.

## Notes

- Если поле `updatedBy` отсутствует в версиях, созданных до миграции `admin_redesign`, автор для них — «Система»; это ожидаемо.
- Хронология не хранится отдельно: всё выводится из версий, отметок заявки и `notification-log`. Если версии обрезаны (`maxPerDoc = 50`), старые смены статуса пропадают — это ограничение, а не ошибка.
- При стирании ПДн (task-10) строки `notification-log` заявки удаляются вместе с заявкой — история исчезает вместе с ней.

## Поправки координатора (приоритет над текстом выше)

- В `notification-log.status` есть значение `pending` («Отправляется») — показывать как «Отправка в MAX…» (вместо обходного `failed` + `error: 'pending'`).
- Константа подписей причин отказа — `LEAD_REFUSE_REASON_CODES` (`src/payload/collections/crm/constants.ts`).
- `e2e/acceptance/lead-flow.spec.ts` (регионы «Флаги», «Атрибуция») тоже обновляет эта задача.
