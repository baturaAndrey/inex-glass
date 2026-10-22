# Task 05: Канбан заявок

## Status

complete

## Wave

2

## Description

Добавить в коллекцию `leads` пользовательский вид «Канбан» (`/admin/collections/leads/kanban/`) по макету `res/admin-mockup/Leads.dc.html`: шапка с поиском и экспортом, ряд из 4 карточек-сводок, переключатель «Канбан / Таблица», быстрые фильтры (чипсы и селекты), колонки из справочника `lead-statuses`, карточки заявок с перетаскиванием (мышь, тач, клавиатура), полоса «Отказ» внизу как зона сброса с диалогом причины, подтверждение перевода в «Договор» (создаёт заказ), «Взять себе», мобильный режим (вкладки колонок + «Перенести в…»). Все изменения статуса идут через REST `PATCH /api/leads/:id`, поэтому работают существующие хуки (валидация причины отказа, `statusChangedAt`, создание заказа, уведомления, версии).

Задача делает **все** правки блока `admin` в `src/payload/collections/crm/leads.ts` в волнах 2–4: после неё файл не меняется.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-02-admin-theme-foundation.md
**Blocks:** task-08-lead-card-processing.md, task-09-lead-history-comments.md, task-13-acceptance.md

**Context from dependencies:**
- **task-01** (схема, миграция `admin_redesign`): у `leads` есть `refuseReasonCode` (select, необязательный; опции — `LEAD_REFUSE_REASON_CODES` в `src/payload/collections/crm/constants.ts`: `expensive` «Дорого», `other_supplier` «Выбрали другого поставщика», `needs_installation` «Нужен монтаж», `no_contact` «Не дозвонились», `other` «Другое»), `kpAmount` (number ≥ 0, «Сумма КП, ₽»), `updatedBy`. Валидация `validateLeadStatusReason`: для статуса с `requiresReason` нужен `refuseReasonCode` **или** непустой `refuseReason`; при коде `other` текст обязателен; ошибка — 400, `errors[0].data.errors = [{ path: 'refuseReason', message: 'Укажите причину отказа' }]` (`REFUSE_REASON_REQUIRED_MESSAGE` из `src/payload/hooks/lead-messages.ts`). Блок `admin` в `leads.ts` task-01 не трогала.
- **task-02** (каркас): установлены `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; базовые классы `_base.scss`: `.iga-card`, `.iga-btn` (`--primary|--secondary|--ghost|--danger`, `--sm`), `.iga-badge` (`--new|--work|--kp|--ok|--no`, свой цвет — `--iga-badge-color`), `.iga-tag`, `.iga-chip` (`[aria-pressed=true]`), `.iga-seg`, `.iga-input`, `.iga-select`, `.iga-field`, `.iga-page-head`, `.iga-avatar` (`--sm`). Партиал задачи `src/app/(payload)/styles/_kanban.scss` создан пустым и подключён. Токены `--ig-*` доступны. Tailwind в админке нет.
- **Существующий модуль заявок** (task-32 прошлой спеки; не менять, кроме оговорённого в «Files to Modify»):
  - `src/payload/collections/crm/leads.ts`: `admin.components.beforeListTable` = быстрые фильтры `LeadListQuickFilters` (их e2e — `e2e/admin-leads.spec.ts`, селекторы `[data-quick-filter=…]`; **оставить как есть**), `edit.editMenuItems` = `EraseMenuItem`, `views.edit.summary` = вкладка «Сводка» (`/summary`). Константа `ADMIN_LEADS = "/payload/admin/leads"`.
  - `src/payload/admin/leads/data.ts`: `loadLeadStatuses(payload)` (`StatusOption`: `id, name, slug, order, color, isDefault, isFinal, isContract, requiresReason`), `loadStaffNames(payload)`.
  - `src/payload/admin/leads/constants.ts`: `FORM_TYPE_LABELS`, `formTypeLabel`, `statusBadgeColors(color)` (`{ color, background }`, защищён от не-HEX), `LEADS_LIST_PATH`, `LEADS_EXPORT_API_PATH`, `SITE_TZ`.
  - `src/lib/leads-admin/period.ts`: `presetRange`, `createdAtWhere`, `periodBounds`; `src/lib/leads-admin/report.ts`: `defaultStatus`, `FUNNEL_KP_SLUG = 'kp-sent'`.
  - Сид статусов (`src/seed/minimal.ts`): `new` «Новая» (10, default), `in-progress` «В работе» (20), `kp-sent` «КП отправлено» (30), `contract` «Договор» (40, `isFinal`, `isContract`), `refused` «Отказ» (50, `isFinal`, `requiresReason`); `color` — цвет текста бейджа.
  - Хуки заявок: `touchStatusChangedAt` (ставит `statusChangedAt` при смене статуса), `orderFromLead` (создаёт заказ при статусе `isContract`), `notifyAssigneeChange` (письмо при смене ответственного). Доступ: admin и manager читают/меняют заявки, удаляет только admin.
  - Образец клиентского изменения данных: `src/payload/admin/orders/status-panel.tsx` (`fetch` + `credentials: 'same-origin'` + `toast` из `@payloadcms/ui` + `router.refresh()`).
  - e2e-хелперы: `e2e/helpers/admin-api.ts` (`adminApi`, `staffApi`, `deleteStaffApi`, `signInBrowser`, `createLead`, `findStatusId`, `deleteDocs`, `uniquePhone`), `e2e/helpers/admin.ts` (`skipOnMissingAdmin`), `e2e/helpers/viewports.ts` (`VIEWPORTS`).

## Files to Create

Все — в `src/payload/admin/leads/kanban/` (папка принадлежит задаче):
- `kanban-view.tsx` — серверный вид (регистрация `views.kanban`): доступ, загрузка, разметка страницы
- `data.ts` — серверная загрузка колонок, карточек, счётчиков, сводок
- `query.ts` — разбор URL-параметров и сборка `where` (чистый)
- `query.test.ts`
- `format.ts` — возраст карточки, телефон, суммы, склонения (чистый)
- `format.test.ts`
- `api.ts` — `patchLead()` и разбор ошибок Payload (клиентский модуль без JSX)
- `api.test.ts`
- `types.ts` — сериализуемые типы `KanbanColumn`, `KanbanCard`, `KanbanBoardProps`
- `page-head.tsx` — шапка (server)
- `stats.tsx` — ряд сводок (server)
- `filters.tsx` — чипсы и селекты (server, ссылки/GET-форма)
- `view-toggle.tsx` — переключатель «Канбан / Таблица» (server); экспорт `LeadsViewToggle` для списка
- `kanban-board.tsx` — `'use client'`: `DndContext`, колонки, полосы отказа, оптимистичные переносы, вкладки на мобильном
- `kanban-column.tsx`, `kanban-card.tsx`, `refuse-strip.tsx` — `'use client'`
- `move-dialogs.tsx` — `'use client'`: диалог причины отказа, подтверждение «Договора»
- `move-menu.tsx` — `'use client'`: меню «Перенести в…»
- `e2e/admin-kanban.spec.ts` — e2e (в корне `e2e/`)

## Files to Modify

- `src/payload/collections/crm/leads.ts` — **только блок `admin.components`**: добавить `beforeList` и `views.kanban` (см. ниже). Поля, хуки, access, versions, остальные ключи `admin` и существующие компоненты (`beforeListTable`, `editMenuItems`, `views.edit.summary`) не менять.
- `src/payload/admin/leads/constants.ts` — **только добавить** `LEADS_KANBAN_PATH = "/admin/collections/leads/kanban/"` и `leadSummaryPath(id) => "/admin/collections/leads/<id>/summary/"` (task-08 в волне 3 использует их, не дублируя).
- `src/app/(payload)/styles/_kanban.scss` — все стили канбана.

**Не трогать:** поля/хуки любых коллекций, `src/payload/admin/leads/{lead-list-quick-filters,lead-summary-view,export-panel,erase-menu-item,data,ui}.tsx|ts`, `cells/*`, `src/lib/leads-admin/**`, `src/payload.config.ts`, чужие партиалы, `package.json`. `importMap.js` и `payload-types.ts` — генераторы запускать локально (нужно для проверки нового вида), результат **не коммитить** (владелец `importMap.js` в волне 2 — task-03; после слияния волны координатор перегенерирует). `e2e/admin-leads.spec.ts` не менять (его в волне 3 обновляет task-09).

## Technical Details

### Регистрация (`leads.ts`)

```ts
components: {
  // «Канбан / Таблица» над списком (task 05 admin-redesign).
  beforeList: [`${ADMIN_LEADS}/kanban/view-toggle#LeadsViewToggle`],
  beforeListTable: [`${ADMIN_LEADS}/lead-list-quick-filters#LeadListQuickFilters`],
  edit: {
    editMenuItems: [`${ADMIN_LEADS}/erase-menu-item#EraseMenuItem`],
  },
  views: {
    // /admin/collections/leads/kanban/ — custom collection view (rendered inside DefaultTemplate).
    kanban: {
      Component: `${ADMIN_LEADS}/kanban/kanban-view#LeadsKanbanView`,
      path: "/kanban",
      exact: true,
    },
    edit: { summary: { /* без изменений */ } },
  },
},
```

Payload 3.91 сначала ищет пользовательский вид коллекции по маршруту (`getCustomCollectionViewByRoute` в `node_modules/@payloadcms/next/dist/views/Root/getRouteData.js`) и только потом считает сегмент id документа; шаблон — `default` (меню и шапка уже есть), поэтому `LeadsKanbanView` **не** оборачивает себя в `DefaultTemplate`. Пропсы — `AdminViewServerProps` (`initPageResult`, `searchParams`, `params`). После правки — `pnpm generate:importmap` локально.

### URL-параметры (`query.ts`)

Канбан полностью описывается URL (перезагрузка/закладка сохраняют вид):

| Параметр | Значения | По умолчанию | Смысл |
|---|---|---|---|
| `filter` | `all`, `mine`, `unassigned`, `repeat`, `flagged` | `all` | чипсы: «Все», «Мои» (`assignee = me`), «Без ответственного» (`assignee exists false`), «Повторные» (`isDuplicate = true`), «С флагами» (`flags in [все 5 флагов]`) |
| `source` | значения `LEAD_FORM_TYPES` | — | `formType = source` |
| `period` | `all`, `today`, `7d`, `30d`, `quarter` | `all` | по `createdAt` (`createdAtWhere(presetRange(...))`) |
| `search` | строка ≤ 100 симв. | — | `or` по `company`, `name`, `email`, `inn` (`like`), плюс `phone like <цифры>`, если в строке ≥ 3 цифр (телефон хранится `+7XXXXXXXXXX`) |
| `expand` | id статуса | — | у этой колонки лимит карточек 200 вместо 20 |

```ts
export interface KanbanQuery { filter: KanbanFilter; source: LeadFormType | null; period: KanbanPeriod; search: string; expand: string | null }
export function parseKanbanQuery(searchParams: Record<string, string | string[] | undefined> | undefined): KanbanQuery; // мусор → значения по умолчанию
export function kanbanWhere(query: KanbanQuery, ctx: { userId: string; now: Date }): Where[]; // условия без статуса
export function kanbanHref(query: KanbanQuery, patch: Partial<KanbanQuery>): string;          // ссылки чипсов/селектов, без параметров по умолчанию
```

Период по умолчанию — «За всё время» (а не 30 дней, как подписано в макете): иначе открытые заявки старше месяца молча пропадали бы из колонок «В работе»/«КП отправлено». Варианты селекта: «За всё время», «Сегодня», «7 дней», «30 дней», «Квартал».

### Колонки и данные (`data.ts`)

Статусы — `loadLeadStatuses(payload)` (порядок `order`). Разбиение:
- **открытые** (`!isFinal && !requiresReason`) — колонки по порядку;
- **договорные** (`isContract`) — колонки после открытых, только заявки с `statusChangedAt ≥ now − 30 дней`; в шапке колонки «N за 30 дней»;
- **тупиковые** (`requiresReason || (isFinal && !isContract)`, в сиде — «Отказ») — не колонки, а полосы под доской (`refuse-strip.tsx`), тоже за 30 дней по `statusChangedAt`.

Для каждой колонки/полосы: `payload.find({ collection: 'leads', where: { and: [{ status: { equals: id } }, ...kanbanWhere(...), ...(финальная ? [statusChangedAt ≥ …] : [])] }, sort: '-createdAt', limit: expand === id ? 200 : 20, depth: 0, overrideAccess: false, user, select: {...} })`; `totalDocs` — для числа в шапке и кнопки «Ещё N». `select`: `company, name, phone, productType, area, formType, flags, isDuplicate, estimate, kpAmount, assignee, files, internalComments, createdAt, statusChangedAt, status, refuseReasonCode, refuseReason`. Для договорных карточек номера заказов — один запрос `find orders where lead in [ids]`, `select { number, lead }`. Имена ответственных — `loadStaffNames`. Запросы последовательны (не занимать пул соединений, как `LeadListQuickFilters`).

Сериализуемая карточка (`types.ts`):

```ts
export interface KanbanCard {
  id: string;
  title: string;                // company || name
  name: string;
  phone: string | null;         // +79123456789
  productLabel: string | null;  // подпись LEAD_PRODUCT_TYPES
  area: number | null;
  sourceShort: string;          // «Квиз», «Чертёж», «Звонок», «Образец», «Под нагрузку», «Контакты», «Полная форма»
  filesCount: number;
  flags: { value: string; label: string; tone: "no" | "work" }[]; // urgent → "no", остальные → "work"
  isDuplicate: boolean;
  estimateFrom: number | null;
  kpAmount: number | null;
  commentsCount: number;
  assignee: { id: string; name: string; initials: string } | null;
  orderNumber: string | null;   // договорные
  orderId: string | null;
  createdAt: string;
  statusChangedAt: string | null;
  statusId: string;
}
export interface KanbanColumn { id: string; name: string; slug: string; color: string; kind: "open" | "contract" | "refuse"; isDefault: boolean; requiresReason: boolean; isContract: boolean; total: number; cards: KanbanCard[]; reasons?: { label: string; count: number }[] }
export interface KanbanBoardProps { columns: KanbanColumn[]; currentUserId: string; reasonOptions: { value: string; label: string }[]; expandHrefs: Record<string, string>; now: string }
```

### Страница (`kanban-view.tsx`)

1. `user = initPageResult.req.user`; `getRole(user) === null` → «Недостаточно прав». Не-сотрудники в админку не попадают, но проверка обязательна (как в `src/payload/admin/views/leads-report.tsx`).
2. Разметка сверху вниз (макет `Leads.dc.html`):
   - **Шапка** (`page-head.tsx`, `.iga-page-head`): eyebrow «Работа», `<h1>` «Заявки»; поиск `<form method="get" action={LEADS_KANBAN_PATH}>` с `input[type=search][name=search]` (placeholder «Компания, имя, телефон, ИНН», `aria-label="Поиск по заявкам"`), текущие `filter/source/period` — скрытыми полями; кнопка «Экспорт» (`.iga-btn--ghost`, иконка `Download`) — ссылка на `LEADS_EXPORT_API_PATH?format=xlsx&from=…&to=…` (период фильтра; при «За всё время» — без дат, роут сам берёт последние 30 дней).
   - **Сводки** (`stats.tsx`, сетка `repeat(auto-fit, minmax(200px, 1fr))`, `.iga-card` padding 16/18, значение 28/700, `tabular-nums`; фильтры канбана на сводки **не** влияют):
     - «Новые сегодня» (значение цветом `--ig-info-text`): `count createdAt ≥ начало сегодняшнего дня (SITE_TZ)`; подстрока «N без ответственного» — `count status = default AND assignee exists false`.
     - «В работе»: `count status.slug = 'in-progress'`; подстрока «у вас — N» (`AND assignee = me`).
     - «Ждут ответа на КП»: `count status.slug = FUNNEL_KP_SLUG`; подстрока «дольше 5 дней — N» (`AND statusChangedAt < now − 5 дней`).
     - «Договоры за месяц» (значение `--ig-success-text`): `count status.isContract AND statusChangedAt ≥ 1-е число месяца`; подстрока «N м² в заказах» — сумма `area` этих заявок (`find select { area }`, `limit 500`).
     - Статуса со слагом нет в справочнике → значение «—», без подстроки.
   - **Фильтры** (`filters.tsx`, строка с переносом): `ViewToggle active="kanban"`; вертикальный разделитель 1×24 px `--ig-line`; чипсы `.iga-chip` (ссылки, `aria-pressed` у активной): «Все», «Мои N», «Без ответственного N», «Повторные N», «С флагами N» (`N` — число **открытых** заявок с этим фильтром и текущими `source/period/search`, `<b>` 600 `--ig-text-2`); справа `<form method="get" action={LEADS_KANBAN_PATH}>` (текущие `filter`/`search` — скрытыми полями) с двумя `.iga-select`: «Все источники» + `LEAD_FORM_TYPES` (`name="source"`, `aria-label="Источник"`) и период (`name="period"`, `aria-label="Период"`). Автоотправка — маленький `'use client'`-компонент `AutoSubmitSelect` (`onChange → event.currentTarget.form?.requestSubmit()`); кнопка «Применить» (`.iga-btn--sm`) — только в `<noscript>`.
   - **Доска** (`kanban-board.tsx`).
3. Данные в клиент — только `KanbanBoardProps`.

### Доска (`kanban-board.tsx`, `'use client'`)

- Обёртка с `overflow-x: auto`; `.iga-kanban__board` — `display:grid; grid-template-columns: repeat(<число колонок>, minmax(270px, 1fr)); gap:14px; align-items:start`.
- **Колонка** (`.col`): фон `--ig-well`, радиус 16, padding 10, gap 10; шапка — точка 8 px цвета статуса, название 14/600, справа число `--ig-text-2` 13/400 (договорные — «6 за 30 дней»). Колонка — `useDroppable({ id: 'status:<id>' })`; при наведении перетаскиваемой карточки — рамка `--ig-primary` 2 px dashed. Внизу «Ещё N» (`.more`: dashed `--ig-gray-2`, радиус 10, высота 36) — ссылка `expandHrefs[id]` (тот же URL + `expand=<id>`); раскрытая колонка — ссылка «Свернуть».
- **Карточка** (`kanban-card.tsx`, `<article class="iga-kcard">`): фон `--ig-surface`, рамка `--ig-hairline`, радиус 12, padding 14, gap 9; hover — рамка `--ig-primary`, тень. Содержимое по макету:
  1. Заголовок — ссылка `<a href={leadSummaryPath(id)}>` (15/600, `--ig-text`, hover `--ig-primary-pressed` + подчёркивание) и справа возраст (12 px `--ig-text-2`, `tabular-nums`, `title` = полная дата `DD.MM.YYYY HH:mm`). Возраст (`format.ts → cardAge`):
     - колонка статуса по умолчанию — от `createdAt`; старше 2 ч → класс `is-late` (`--ig-danger-text`);
     - колонка `kp-sent` — от `statusChangedAt`; старше 5 дней → `is-waiting` (`--ig-warning-text`);
     - прочие открытые — от `statusChangedAt ?? createdAt`;
     - договорные — дата `DD.MM` по `statusChangedAt`.
     - Формат: < 1 мин «только что», < 60 мин «N мин», < 3 ч «N ч M мин» (без «0 мин»), < 24 ч «N ч», вчера (календарно, `SITE_TZ`) «вчера», иначе «N дн.» со склонением («2 дня», «5 дней»).
  2. «Имя · телефон» (13 px `--ig-text-2`): телефон ссылкой `tel:+79123456789`, текст `+7 912 345-67-89` (`formatPhoneDisplay`); нет телефона — только имя.
  3. Теги (`.iga-tag`): изделие, площадь «120 м²», короткий источник, «Файлы: N» (если `filesCount > 0`); бейджи флагов (`.iga-badge--no` для «Срочно», `--work` для остальных, подписи `LEAD_FLAGS`) и «Повтор» (`--work`), если `isDuplicate`.
  4. Подвал (`border-top` `--ig-hairline`, padding-top 10): слева — договорные: ссылка «Заказ 2026-0142 →» на `/admin/collections/orders/<orderId>/manage/`; иначе `kpAmount` → «КП 412 000 ₽» (600); иначе `estimateFrom` → «от 168 000 ₽» (600); иначе `commentsCount > 0` → «2 комментария» (`--ig-text-2`); иначе «—». Справа — аватар ответственного `.iga-avatar--sm` (инициалы, `title` — полное имя) или кнопка «Взять себе» (`.mini`: высота 28, pill, рамка `--ig-primary`, текст `--ig-primary-pressed`, 12/500).
  5. Кнопка «Перенести в…» (`move-menu.tsx`, иконка `Ellipsis`, `aria-label="Перенести заявку «<title>» в другой статус"`) в правом верхнем углу карточки (видна при hover/focus-within на десктопе, всегда — на тач-устройствах и ≤ 599).
  6. Ручка перетаскивания — кнопка с иконкой `GripVertical` (`aria-label="Перетащить заявку «<title>»"`), видна при hover/focus; к ней — `setActivatorNodeRef`, `attributes`, `listeners` (клавиатура). `listeners` также на `<article>` для мыши/тача; `PointerSensor` с `activationConstraint: { distance: 6 }` пропускает обычные клики по ссылкам и кнопкам.
- **Полоса отказа** (`refuse-strip.tsx`, по одной на тупиковый статус): `<details class="iga-card">` padding 14/18; `<summary>`: точка цвета статуса, «Отказ», `--ig-text-2` «9 за 30 дней · перетащите карточку сюда, чтобы закрыть заявку с причиной»; раскрытая — строка разбивки «Дорого: 4 · Выбрали другого поставщика: 2 · …» (по `refuseReasonCode`, `null` + текст → «Другое», `null` без текста → «Не указана») и карточки (лимит 20, «Ещё N»). Вся полоса — `useDroppable({ id: 'status:<id>' })`, подсветка при наведении.
- **DnD** (`@dnd-kit/core`):
  - Сенсоры: `PointerSensor` (`distance: 6`), `TouchSensor` (`delay: 250, tolerance: 5`), `KeyboardSensor` со своим `coordinateGetter`: `ArrowRight`/`ArrowLeft` — к центру следующей/предыдущей колонки (по `droppableRects`, отсортированным по `left`), `ArrowDown` — к полосе отказа, `ArrowUp` — обратно к колонкам.
  - `DragOverlay` — копия карточки (`.iga-kcard.is-dragging`, тень `--ig-shadow-dropdown`); исходная карточка `opacity: .4`.
  - Объявления на русском (`accessibility.announcements` и `screenReaderInstructions.draggable`): «Чтобы перенести заявку, нажмите пробел, выберите колонку стрелками влево/вправо (вниз — «Отказ») и снова нажмите пробел. Escape — отмена.»; «Взята заявка «X»»; «Над колонкой «Y»»; «Заявка «X» перенесена в «Y»»; «Перенос отменён».
  - На ширине ≤ 599 px перетаскивание выключено (`useDraggable({ disabled })` по `matchMedia('(max-width: 599px)')`) — только «Перенести в…».
- **Перенос** (общий для DnD и меню, `moveLead(card, target)`):
  1. Тот же статус → ничего.
  2. `target.requiresReason` → диалог причины (`move-dialogs.tsx`); карточка остаётся на месте до подтверждения.
  3. `target.isContract` → подтверждение.
  4. Оптимистично: карточка переносится в начало целевой колонки (полосы: счётчик +1), исходная колонка −1; `patchLead(id, body)`; успех → `toast.success('Статус: «<name>»')` и `router.refresh()`; ошибка → откат состояния и `toast.error(<сообщение сервера>)`. Параллельные переносы одной карточки блокируются (карточка в состоянии `aria-busy`).
- **Диалог причины отказа**: нативный `<dialog>` (`showModal()`, фокус на первом поле, `Escape` закрывает, фокус возвращается на карточку), `aria-labelledby`; заголовок «Закрыть заявку «X»»; `.iga-field` «Причина» — `.iga-select` (обязательный, пустой вариант «Выберите причину» + `reasonOptions` из `LEAD_REFUSE_REASON_CODES`); «Комментарий» — `textarea.iga-input` (`maxLength 2000`; обязателен при «Другое», подсказка «Обязательно для «Другое»»); кнопки «Закрыть заявку» (`.iga-btn--danger`) и «Отмена» (`--ghost`). Тело PATCH: `{ status, refuseReasonCode, refuseReason }` (`refuseReason` — `trim()`, пустой → не отправлять). 400 → сообщение под полем «Комментарий» (`role="alert"`), диалог не закрывается, карточка не переносится.
- **Подтверждение «Договора»**: `<dialog>` «Перевести «X» в «Договор»?», текст «Будет создан заказ и ссылка для клиента. Отменить это из канбана нельзя.», кнопки «Перевести» (`--primary`) и «Отмена». PATCH `{ status }`.
- **«Взять себе»**: PATCH `{ assignee: currentUserId }`; оптимистично показать аватар; успех → `toast.success('Заявка назначена на вас')` + `router.refresh()`; ошибка → откат.
- **Меню «Перенести в…»**: кнопка `aria-haspopup="menu" aria-expanded`; список `role="menu"` с `role="menuitem"` — все статусы, кроме текущего (открытые, договорные, тупиковые — с точкой цвета); стрелки вверх/вниз, `Enter`, `Escape`, закрытие по клику вне; выбор → `moveLead`.
- **Мобильный режим (≤ 599 px)**: над доской `role="tablist"` (горизонтальная прокрутка, каждая вкладка ≥ 44 px): по вкладке на колонку и на каждую полосу отказа, подпись «Новая 5»; видна одна колонка (`role="tabpanel"`), полосы — тоже как вкладки; выбор вкладки — локальное состояние (по умолчанию первая колонка), стрелки влево/вправо переключают вкладки. Сетка доски на мобильном не показывается.

### Клиентский API (`api.ts`)

```ts
export type PatchResult = { ok: true } | { ok: false; message: string; fieldErrors: { path: string; message: string }[] };

/** PATCH /api/leads/<id>/?depth=0 with the admin session cookie (same as orders/status-panel.tsx). */
export async function patchLead(id: string, body: Record<string, unknown>): Promise<PatchResult> {
  const response = await fetch(`/api/leads/${encodeURIComponent(id)}/?depth=0`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return { ok: true };
  return { ok: false, ...extractPayloadError(await response.json().catch(() => null)) };
}

/** `errors[0].data.errors[]` (ValidationError) → field errors; else `errors[0].message`; else «Не удалось сохранить». */
export function extractPayloadError(body: unknown): { message: string; fieldErrors: { path: string; message: string }[] };
```

Слеш на конце URL обязателен (`trailingSlash: true`); полей схемы, кроме `status`, `assignee`, `refuseReasonCode`, `refuseReason`, канбан не отправляет.

### Переключатель (`view-toggle.tsx`)

`ViewToggle({ active: 'kanban' | 'list' })` — `.iga-seg` (`role="group" aria-label="Вид"`) с двумя ссылками: «Канбан» → `LEADS_KANBAN_PATH`, «Таблица» → `LEADS_LIST_PATH`; активной — `aria-current="page"` и стиль `.on`. `LeadsViewToggle()` (для `beforeList` списка) = `<ViewToggle active="list" />` в обёртке с отступом снизу 12 px. Быстрые фильтры списка (`beforeListTable`) остаются под ним без изменений.

### Стили (`_kanban.scss`)

Только классы `.iga-kanban*`, `.iga-kcard*`, `.iga-kstrip*`, `.iga-kdialog*`, `.iga-kmenu*`, `.iga-ktabs*`. Значения из макета (`Leads.dc.html`: `.page`, `.stat`, `.chip`, `.sel`, `.board`, `.col`, `.lc`, `.mini`, `.more`, `<details class="card">`): `.page` padding `24px 32px 56px`, gap 20 (≤ 1100: 24/24/48; ≤ 599: 16/16/40). Цвета — только токены `--ig-*` и цвет статуса через CSS-переменную (`style={{ "--iga-status-color": statusBadgeColors(color).color }}`). Фокус — кольцо `--ig-focus-ring`. `prefers-reduced-motion` — без переходов. Касания ≥ 44 px на мобильном (кнопки меню, «Взять себе» увеличивают зону касания псевдоэлементом).

### Тесты

**Vitest:**
- `query.test.ts`: разбор параметров (мусор → умолчания), `kanbanWhere` для каждого фильтра (`mine` → `assignee equals userId`, `unassigned` → `exists false`, `repeat`, `flagged` — все 5 флагов), `source`, `period` (границы в `SITE_TZ` через `createdAtWhere`), `search` (цифры → условие по `phone`, < 3 цифр — без него), `kanbanHref` не пишет умолчания.
- `format.test.ts`: `cardAge` на всех порогах (59 мин, 2 ч 15 мин, 3 ч, вчера через полночь Екатеринбурга, 2/5/21 день), `formatPhoneDisplay('+79123456789') === '+7 912 345-67-89'` (не-российский номер — как есть), суммы с NBSP («от 168 000 ₽», «КП 412 000 ₽»), склонение «комментарий/комментария/комментариев», инициалы.
- `api.test.ts`: `extractPayloadError` для ValidationError (`errors[0].data.errors`), обычной ошибки (`errors[0].message`), `null`/HTML-ответа; `patchLead` с замоканным `fetch` (URL со слешем и `depth=0`, метод, `credentials`).

**Playwright `e2e/admin-kanban.spec.ts`** — `test.describe.configure({ mode: 'serial' })`; мутирующие тесты только в `desktop-1366` (`test.skip(testInfo.project.name !== VIEWPORTS.laptop.name)`), фикстуры — через REST под e2e-админом (`adminApi`, `createLead`, `findStatusId`), метка прогона `e2e-kanban-<ts>` в `company`, страница открывается с `?search=<метка>` (изоляция от параллельных спек), в `afterAll` — удаление созданных заказов (`orders where lead in ids`) и заявок (`deleteDocs`):
1. 3 заявки в «Новая» → `/admin/collections/leads/kanban/?search=<метка>`: колонки по справочнику («Новая», «В работе», «КП отправлено», «Договор»), полоса «Отказ»; 3 карточки в «Новая» с компанией, телефоном `tel:`, тегами; ссылка карточки ведёт на `/admin/collections/leads/<id>/summary/`.
2. Перетаскивание мышью (`page.mouse.down/move(steps: 15)/up` с карточки A на колонку «В работе») → тост, карточка в «В работе» после обновления; `GET /api/leads/<A>` → статус `in-progress`, `statusChangedAt` обновлён.
3. Клавиатура: фокус на ручке карточки B, `Space`, `ArrowRight`, `Space` → B в «В работе».
4. Перетаскивание C на полосу «Отказ» → диалог; «Закрыть заявку» без причины — нативная валидация не даёт отправить; «Другое» без комментария — ошибка «Укажите причину отказа» (с сервера или клиента) и C остаётся в «Новая»; «Дорого» → сохранено, `GET` → `refuseReasonCode: 'expensive'`, статус «Отказ».
5. «Взять себе» у A → аватар e2e-админа, `GET` → `assignee` = id админа.
6. Перенос A через «Перенести в…» → «Договор» → подтверждение «Отмена» → статус не изменился; повтор с «Перевести» → карточка в «Договор» со ссылкой «Заказ <номер> →», у заявки создан заказ.
7. Фильтры: чипс «Без ответственного» → `?filter=unassigned`, A (с ответственным) скрыта; селект источника меняет URL; переключатель «Таблица» → `/admin/collections/leads/`, там видны и переключатель, и быстрые фильтры `[data-quick-filter="all"]`.
8. `mobile-375` (только чтение, своих фикстур не создаёт — мутации разрешены только в `desktop-1366`): `/admin/collections/leads/kanban/` → вкладки `role="tab"` видны, клик по второй вкладке показывает другую колонку (`role="tabpanel"`); если на доске есть карточки, у них есть кнопка «Перенести в…»; горизонтального скролла страницы нет (`scrollWidth <= innerWidth`).

### Проверки

```bash
pnpm generate:importmap          # локально; importMap.js НЕ коммитить
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm test:e2e e2e/admin-kanban.spec.ts e2e/admin-leads.spec.ts   # список и быстрые фильтры не сломаны
git checkout src/app/\(payload\)/admin/importMap.js src/payload-types.ts
```

Скриншоты 375 / 1366 / 1920 — сравнить с `res/admin-mockup/Leads.dc.html`.

## Acceptance Criteria

- [ ] `/admin/collections/leads/kanban/` открывается внутри шаблона админки; шапка, сводки, переключатель, чипсы и селекты, колонки и полоса «Отказ» — как в макете.
- [ ] Колонки строятся из `lead-statuses` по `order`; «Договор» — за последние 30 дней, тупиковые статусы — полосами-зонами сброса с разбивкой по причинам.
- [ ] Карточка: компания-ссылка на `/summary/`, возраст с подсветкой просрочки, имя и `tel:`, изделие, площадь, источник, файлы, флаги, «Повтор», «КП …» / «от …» / заказ, аватар или «Взять себе».
- [ ] Перенос мышью, тачем и клавиатурой (с объявлениями для скринридера) и через «Перенести в…»; оптимистичное обновление с откатом и тостом при ошибке; изменения идут `PATCH /api/leads/:id/`, хуки срабатывают (заказ создаётся, `statusChangedAt` обновляется, версии пишутся).
- [ ] Отказ требует причину (код из `LEAD_REFUSE_REASON_CODES`, для «Другое» — текст); «Договор» требует подтверждения.
- [ ] Фильтры в URL (`filter`, `source`, `period`, `search`, `expand`); переключатель «Канбан / Таблица» есть на обеих страницах; быстрые фильтры списка и `e2e/admin-leads.spec.ts` не сломаны.
- [ ] ≤ 599 px: вкладки колонок, «Перенести в…», без горизонтального скролла страницы; касания ≥ 44 px.
- [ ] В `leads.ts` изменён только `admin.components` (`beforeList`, `views.kanban`); в `constants.ts` только добавлены `LEADS_KANBAN_PATH` и `leadSummaryPath`; стили — только `_kanban.scss`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/admin-kanban.spec.ts e2e/admin-leads.spec.ts` зелёные.

## Notes

- Модель: премиум (DnD, оптимистичные обновления, доступность).
- Сортировку карточек внутри колонки не храним (полей порядка в схеме нет): карточки всегда по `-createdAt`; `@dnd-kit/sortable` не нужен, достаточно `core` (+ `utilities` для `CSS.Translate`).
- `refuseReason` при уходе из «Отказа» не очищается (так задумано хуком — история).
- Если менеджеру в будущем запретят менять чужие заявки, канбан покажет серверную ошибку тостом — отдельной логики прав в UI нет.
- Подписи коротких источников и порог «2 ч» / «5 дней» — константы в `format.ts`; дублирование `formatAge` с дашбордом (task-04) осознанное: задачи параллельны, общий модуль можно вынести после волны.
