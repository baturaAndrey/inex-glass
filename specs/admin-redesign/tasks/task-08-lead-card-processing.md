# Task 08: Карточка заявки и панель «Обработка»

## Status

pending

## Wave

3

## Description

Переделать вкладку «Сводка» заявки (`/admin/collections/leads/<id>/summary/`, `src/payload/admin/leads/lead-summary-view.tsx`) по согласованному макету `res/admin-mockup/Lead.dc.html`: шапка с действиями «Позвонить» / «Написать», основная колонка (Контакты, «Что нужно клиенту», Файлы, «Комментарии и история», свёрнутый блок «Откуда пришёл клиент») и боковая колонка (панель «Обработка» со сменой статуса, ответственного, флагов, причины отказа и суммы КП; «Повторные обращения»; «Согласие на обработку ПДн» с кнопкой удаления ПДн для админа). Сейчас вкладка только показывает данные; после задачи менеджер обрабатывает заявку прямо в карточке, а все хуки заявки (валидация причины отказа, `statusChangedAt`, создание заказа при «Договоре», письмо и MAX-уведомление ответственному, версии) продолжают работать, потому что изменения идут через REST `PATCH /api/leads/:id/`. Комментарии и история — компоненты task-09 (контракт той же волны), эта задача только вставляет их. Задача — владелец `importMap.js` в волне 3.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-02-admin-theme-foundation.md, task-05-leads-kanban.md; task-09-lead-history-comments.md — **контракт той же волны**
**Blocks:** task-13-acceptance.md

**Context from dependencies:**
- **task-01** (схема, миграция `admin_redesign`): у `leads` появились `refuseReasonCode` (select, необязательный: `expensive` «Дорого», `other_supplier` «Выбрали другого поставщика», `needs_installation` «Нужен монтаж», `no_contact` «Не дозвонились», `other` «Другое»; список опций экспортирован из `src/payload/collections/crm/constants.ts` — взять оттуда, константа `LEAD_REFUSE_REASON_CODES`), `kpAmount` (number ≥ 0, «Сумма КП, ₽»), `updatedBy` (relationship → `users`, read-only, заполняет хук `src/payload/hooks/set-updated-by.ts`, `null` = «Система»). `validateLeadStatusReason` (`src/payload/hooks/lead-status-validation.ts`): для статуса с `requiresReason` нужен `refuseReasonCode` **или** непустой `refuseReason`; при `refuseReasonCode = 'other'` текст обязателен; ошибка всегда приходит по пути `refuseReason` с сообщением `REFUSE_REASON_REQUIRED_MESSAGE` из `src/payload/hooks/lead-messages.ts`. Хук `leadMaxNotify` уже подключён в `leads.hooks.afterChange` (наполняет task-10).
- **task-02** (тема): `admin.theme: 'light'`, Rubik, токены сайта в `src/styles/ig-vars.css` (переменные `--ig-*`), SCSS-каркас `src/app/(payload)/custom.scss` → партиалы `src/app/(payload)/styles/*`. Партиал этой задачи `src/app/(payload)/styles/_lead-card.scss` создан пустым и уже подключён через `@use`. Базовые классы `_base.scss` (использовать, не дублировать): `.iga-card`, `.iga-btn` (`--primary|--secondary|--ghost|--danger`, `--sm`), `.iga-badge` (`--new|--work|--kp|--ok|--no` + произвольный цвет через CSS-переменную `--iga-badge-color`), `.iga-tag`, `.iga-chip` (`[aria-pressed=true]`), `.iga-seg`, `.iga-input`, `.iga-select`, `.iga-field`, `.iga-dl`, `.iga-bar`, `.iga-page-head`, `.iga-section-head`, `.iga-avatar` (`--sm`). Tailwind в админке не подключён.
- **task-05** (канбан): view `kanban` зарегистрирован в `leads.ts` → страница `/admin/collections/leads/kanban/`; все правки `admin` в `leads.ts` сделаны в волне 2, вкладка «Сводка» (`views.edit.summary`, `path: '/summary'`) осталась зарегистрированной как была. **`leads.ts` в волне 3 не трогать.** Ссылка на карточку из канбана, дашборда и MAX — `/admin/collections/leads/<id>/summary/`.
- **task-09** (та же волна) экспортирует:
  - `LeadHistory` — server component, `src/payload/admin/leads/history/lead-history.tsx`, props `{ leadId: string }`; сам грузит данные и рендерит корневой `role="region" aria-label="История"`;
  - `LeadComments` — client component, `src/payload/admin/leads/history/lead-comments.tsx`, props `{ leadId: string; comments: { id: string; author: string | null; text: string; date: string }[]; currentUserId: string }`; рендерит форму «Добавить» и список, корневой `role="region" aria-label="Комментарии"`.
  Пока task-09 не слита, typecheck по этим импортам может не сходиться — это нормально для контракта той же волны.
- Существующее (не меняется): `GET /api/lead-files/<id>/download/` (сессия admin/manager, `leadFileDownloadPath` из `src/payload/admin/leads/constants.ts`); `POST /api/admin/leads/<id>/erase/` (только admin, заголовок `Origin` = `SITE_URL`, тело `{ "confirm": "УДАЛИТЬ" }`, 409 если есть заказ); загрузчики `loadLeadStatuses` (`StatusOption`: `id, name, slug, order, color, isDefault, isFinal, isContract, requiresReason`) и `loadStaffNames` (`Map<id, name>`) из `src/payload/admin/leads/data.ts`; `statusBadgeColors`, `formTypeLabel`, `DUPLICATE_BADGE_COLORS` из `constants.ts`; `summarizeAnswers`, `telHref`, `formatFileSize` из `src/emails/format-answers.ts`; `formatNumber`, `formatRub`, `formatDateRu` из `src/lib/domain/format.ts`; `formatDateTime`, `relationIdOf` из `src/lib/leads-admin/export-rows.ts`; `QUIZ_FLAG_LABELS` из `src/lib/domain/quiz-flags.ts`; `LEAD_FLAGS`, `LEAD_ROLES`, `LEAD_PRODUCT_TYPES` из `src/payload/collections/crm/constants.ts`; `getRole` из `src/payload/access`.

## Files to Create

- `src/payload/admin/leads/card/processing-panel.tsx` — client: панель «Обработка» (форма, PATCH, ошибки полей, подтверждение «Договора»)
- `src/payload/admin/leads/card/processing.ts` — чистые функции панели: diff формы → тело PATCH, разбор ошибок Payload, видимость полей отказа
- `src/payload/admin/leads/card/processing.test.ts` — unit-тесты `processing.ts` (Vitest, проект `unit`)
- `src/payload/admin/leads/card/erase-dialog.tsx` — client: общий диалог подтверждения удаления ПДн (вынесен из `erase-menu-item.tsx`)
- `src/payload/admin/leads/card/erase-button.tsx` — client: кнопка «Удалить персональные данные» в блоке согласия (только admin), открывает `EraseDialog`
- `src/payload/admin/leads/card/answers.ts` — серверные/чистые хелперы карточки, перенесённые из `lead-summary-view.tsx` (`answerRows`, `answerValue`, `HIDDEN_ANSWER_KEYS`, `text`) — чтобы view оставался читаемым

## Files to Modify

- `src/payload/admin/leads/lead-summary-view.tsx` — полная переделка разметки по макету (см. ниже); загрузка данных сохраняется (`overrideAccess: false`, `user`)
- `src/payload/admin/leads/erase-menu-item.tsx` — использовать `EraseDialog` из `card/erase-dialog.tsx` (поведение, тексты, `id="action-erase-personal-data"` и роль dialog «Удалить персональные данные» не меняются — на них опирается e2e)
- `src/payload/admin/leads/constants.ts` — **только добавить** `leadSummaryPath(id)` → `/admin/collections/leads/<id>/summary/` и `LEADS_KANBAN_PATH = '/admin/collections/leads/kanban/'` (если task-05 уже добавила одноимённые — использовать их, не дублировать)
- `src/app/(payload)/styles/_lead-card.scss` — все стили карточки (классы `.iga-lead-*`)
- `src/app/(payload)/admin/importMap.js` — **владелец волны 3**: после слияния волны выполнить `pnpm generate:importmap` и закоммитить результат (ожидается без изменений: новые компоненты импортируются напрямую из view, а не регистрируются в конфиге)

**Не трогать:** `src/payload/collections/**` (включая `leads.ts`), хуки `src/payload/hooks/**`, `src/payload/admin/leads/history/*` (task-09), `src/payload/admin/leads/ui.tsx`, `cells/*`, `lead-list-quick-filters.tsx`, `export-panel.tsx` (task-12), `src/payload-types.ts` (генераторы запускать локально и откатывать), `e2e/**` (e2e карточки обновляет task-09), `package.json`.

## Technical Details

### Общие правила

- Payload 3.91, Next 16.4. View остаётся server component (`DocumentViewServerProps`), интерактив — только в client-компонентах `card/*` (`'use client'`), пропсы сериализуемые (строки, числа, массивы простых объектов).
- Стили — только классы `.iga-*` из `_base.scss` и свои `.iga-lead-*` в `_lead-card.scss`; **никаких inline-стилей с цветами** и `var(--theme-*)` в inline (единственное допустимое inline — `style={{ "--iga-badge-color": color } as CSSProperties}` для цвета статуса из справочника, по контракту `.iga-badge`). Цвета в SCSS — только переменные `--ig-*` из `ig-vars.css` (DESIGN.md §3).
- Ссылки — обычный `<a>`, не `next/link`. Все `fetch` на `/api/…/` — со слешем на конце (`trailingSlash: true`), `credentials: 'same-origin'`.
- Тексты интерфейса — русские, дословно как ниже; без эмодзи; иконки — `lucide-react` (уже в зависимостях сайта) 16–18 px, `aria-hidden`.
- Доступ: данные читаются с правами зрителя (`overrideAccess: false, user`), как сейчас. IP и User-Agent согласия — только admin. Кнопка удаления ПДн — только admin (серверная проверка остаётся в роуте).

### Разметка (по `Lead.dc.html`)

Корень: `<Gutter>` → `<div className="iga-lead">`. Сетка: `.iga-lead__head` сверху, ниже `.iga-lead__cols` = `.iga-lead__main` (flex `999 1 520px`) + `.iga-lead__side` (flex `1 1 320px`), `flex-wrap: wrap`, gap 20 px; на ≤ 1100 px колонки встают друг под друга (side после main), на 375 px карточки на всю ширину, поля 16 px.

**1. Шапка** `.iga-lead__head` (`<header>`):
- ссылка назад `<a href={LEADS_KANBAN_PATH}>` с иконкой `arrow-left` и текстом «Заявки»;
- строка: `<h1>` — `company` или, если пусто, `name`; бейдж статуса (`.iga-badge` + `--iga-badge-color` из `statusBadgeColors(status.color).color`, текст `status.name`); `.iga-tag` с `formTypeLabel(formType)`; бейджи флагов (`.iga-badge--no` для `urgent`, остальные `.iga-tag`); бейдж «Повтор» (`.iga-badge--work`), если `isDuplicate`;
- подпись `.iga-lead__meta`: «Заявка от {formatDateTime(createdAt)}» + (если `entryPage`) « · со страницы » + `<a href={entryPage} target="_blank" rel="noopener">{entryPage}</a>` (только если путь начинается с `/`; иначе просто текст);
- действия: `<a className="iga-btn iga-btn--primary" href={telHref(phone)}>` с иконкой `phone` и текстом «Позвонить» (если есть телефон); `<a className="iga-btn iga-btn--secondary" href={"mailto:" + email}>` с иконкой `mail` и текстом «Написать» (если есть e-mail). На 375 px кнопки на всю ширину, в одну строку по 50 %.

**2. Основная колонка** — каждая карточка `<section className="iga-card" aria-labelledby={id}>` с `<h2 id={id}>` (имя региона = текст заголовка):
- **«Контакты»** — `.iga-dl`: Компания, ИНН (`tabular-nums`), Контактное лицо (`name`), Роль (подпись из `LEAD_ROLES`), Телефон (`<a href="tel:…">`, отображение как сохранено, `+7XXXXXXXXXX`), «Телефон (как ввёл)» (только если отличается), E-mail (`<a href="mailto:…">`), Город. Пустые строки не выводить. Атрибут `href` ссылки телефона — **ровно** `tel:${phone}` для нормализованного номера (на это опирается e2e: `a[href="tel:+7…"]`); `telHref` уже даёт такую строку.
- **«Что нужно клиенту»** — заголовок слева, справа ориентир: если `estimate.from` число — `от {formatRub(estimate.from)}` (крупно, 20 px, 700, `tabular-nums`) и под/рядом `.iga-lead__note` «ориентировочная цена на {formatDateRu(estimate.priceDate)}» (если даты нет — без подписи; если `estimate.shown === false` — добавить «(клиенту не показан)»). Ниже `.iga-tag`-и: тип изделия (подпись из `LEAD_PRODUCT_TYPES`), площадь `{formatNumber(area)} м²`. Затем ответы `<dl className="iga-lead__qa">` (две колонки `minmax(140px,220px) 1fr`, на 375 px — одна) из `answerRows(lead.answers)`; если строк нет и есть `answersSummary` — абзац со сводкой. Затем блок `.iga-lead__comment` (фон `--ig-bg`, радиус 10) «Комментарий клиента» + `comment` (`white-space: pre-wrap`). Если `kpAmount` задан — строка «Сумма КП: {formatRub(kpAmount)}».
- **«Файлы»** — сетка плиток `repeat(auto-fit, minmax(240px, 1fr))`; плитка — `<a className="iga-lead-file" href={leadFileDownloadPath(file.id)} download aria-label={"Скачать " + имя}>`: квадрат с расширением (`DWG`, `PDF` — из имени файла, верхний регистр, ≤ 4 символа), имя (`originalName ?? filename`), под ним «{formatFileSize(sizeBytes ?? filesize)}». Пусто — «Файлов нет» (`.iga-lead__empty`). Имя ссылки **должно начинаться со слова «Скачать»** (e2e ищет `getByRole('link', { name: 'Скачать' })`).
- **«Комментарии и история»** — карточка-обёртка `<section className="iga-card" aria-labelledby>` с `<h2>` «Комментарии и история», внутри по порядку:
  ```tsx
  <LeadComments leadId={lead.id} comments={commentRows} currentUserId={String(user.id)} />
  <LeadHistory leadId={lead.id} />
  ```
  `commentRows` — из `lead.internalComments` (их чтение уже закрыто field access для не-staff): `{ id: row.id ?? String(index), author: nameOf(staff, row.author), text: row.text, date: row.date ?? lead.createdAt }`, порядок — новые сверху. Регионы «Комментарии» и «История» рендерит task-09.
- **«Откуда пришёл клиент»** — `<section className="iga-card iga-lead__source" aria-label="Откуда пришёл клиент">` с `<details>` (по умолчанию свёрнут), `<summary>` «Откуда пришёл клиент» (600, 16 px, видимый фокус). Внутри `.iga-dl`: «Источник» (`sourceLabel`), «Страница входа» (`entryPage`), «Страница отправки» (`pageUrl`), «Реферер» (`referrer`), строки UTM с подписью `utm_<key>` для `source|medium|campaign|term|content` и сырым ключом для `yclid|gclid|openstat`, «ClientID Метрики» (`metrikaClientId`). Этот регион **заменяет** прежний «Атрибуция»: подписи `utm_source` и значения остаются текстом (e2e раскроет `<summary>` и проверит их).

**3. Боковая колонка:**
- **«Обработка»** — `<section className="iga-card" aria-labelledby>` + `<h2>` «Обработка», внутри `<ProcessingPanel … />` (ниже).
- **«Повторные обращения»** — как сейчас по данным (`loadRepeats`, лимит 20): если `isDuplicate` — бейдж «Повтор» + ссылка «Исходная заявка» на `leadSummaryPath(duplicateOf)` (или текст «Исходная заявка удалена»); если есть другие — строка ровно «Есть повторы: {N}» и список: дата-ссылка на `leadSummaryPath(id)`, форма, бейдж статуса; иначе «Других заявок с этим телефоном или e-mail нет».
- **«Согласие на обработку ПДн»** — для каждой записи: бейдж `.iga-badge--ok` «Получено» + «{formatDateTime(givenAt)} · версия {consentVersion}», «Версия политики» и (только admin) IP, User-Agent; если записей нет — «Запись о согласии не найдена». Для admin ниже — `<EraseButton leadId={lead.id} />`.

### Панель «Обработка» (`card/processing-panel.tsx`)

Props (все сериализуемые, собирает view):

```ts
export interface ProcessingPanelProps {
  leadId: string;
  currentUserId: string;
  statuses: { id: string; name: string; isContract: boolean; requiresReason: boolean }[];
  staff: { id: string; name: string }[]; // из loadStaffNames, по имени
  reasons: { value: string; label: string }[]; // опции refuseReasonCode из constants.ts
  flags: { value: string; label: string }[]; // LEAD_FLAGS
  initial: {
    status: string | null;
    assignee: string | null;
    flags: string[];
    refuseReasonCode: string | null;
    refuseReason: string;
    kpAmount: number | null;
  };
}
```

Поля (каждое — `.iga-field` с `<label htmlFor>`; ошибки — `<p id=… className="iga-lead__error" role="alert">`, у контрола `aria-invalid="true"`, `aria-describedby`, класс `is-error`):
1. «Статус» — `<select className="iga-select">` из `statuses` (порядок воронки).
2. «Ответственный» — `<select>`: «Не назначен» (`""`) + `staff`. Под ним кнопка-ссылка «Назначить себя» (`button type="button"`, вид текстовой ссылки `--ig-primary-pressed`, подчёркнута), скрыта, если ответственный уже текущий пользователь. Нажатие **сразу** сохраняет только `{ assignee: currentUserId }` (PATCH), тост «Заявка назначена на вас», `router.refresh()`.
3. «Флаги» — `<div role="region" aria-label="Флаги">` с чипами: `<button type="button" className="iga-chip" aria-pressed={selected}>` по каждому из `LEAD_FLAGS` (подпись из `QUIZ_FLAG_LABELS`/`LEAD_FLAGS`). Клик переключает в форме (сохраняется кнопкой «Сохранить»).
4. Блок отказа — виден, если выбранный статус `requiresReason`: «Причина отказа» `<select>` (пусто + `reasons`) и «Комментарий к отказу» `<textarea className="iga-input">` (`refuseReason`). Подсказка: при «Другое» текст обязателен. Клиентская проверка повторяет серверное правило (`processing.ts` → `reasonError()`), но источник истины — ответ сервера.
5. «Сумма КП, ₽» — `<input type="number" min="0" step="1" inputMode="numeric" className="iga-input">`; пусто = `null`.
6. Кнопка `.iga-btn--primary` на всю ширину «Сохранить» (`loading` — `aria-busy`, disabled), неактивна, если форма не изменена.
7. Подсказка `.iga-lead__hint`: «При статусе «Договор» автоматически создаётся заказ и ссылка для клиента.»

Сохранение:
- `buildLeadPatch(initial, form)` (`processing.ts`) отдаёт только изменённые ключи (`status`, `assignee` — `null` для «Не назначен», `flags`, `refuseReasonCode`, `refuseReason`, `kpAmount`). Поля отказа отправляются, только если выбран статус с `requiresReason` или они изменились.
- Если новый статус `isContract` и прежний — нет: перед запросом `ConfirmationModal` из `@payloadcms/ui` (или собственный диалог на `Modal` с `role="dialog"`, `aria-modal`, фокус в диалоге, Esc закрывает) — заголовок «Перевести в «Договор»?», текст «Будет создан заказ и ссылка для клиента. Отменить это из карточки нельзя.», кнопки «Перевести» / «Отмена».
- Запрос: `fetch(\`/api/leads/${leadId}/?depth=0\`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body })`.
- 200 → тост `toast.success('Сохранено')` (`toast` из `@payloadcms/ui`), `router.refresh()` (`next/navigation`).
- 400 → `parsePayloadErrors(body)` (`processing.ts`): `body.errors[0].data.errors[] { path, message }` → ошибки по полям (`refuseReason` → под «Комментарий к отказу» и подсветка «Причина отказа»; `status`, `assignee`, `kpAmount`, `flags` → под своим полем); общее сообщение `body.errors[0].message` → `toast.error`. Без `data` (например, 403) — `toast.error('Не удалось сохранить')`.
- Сеть/5xx → `toast.error('Не удалось сохранить, попробуйте ещё раз')`, форма не сбрасывается.

```ts
// processing.ts — сигнатуры (чистые, без React)
export type ProcessingForm = ProcessingPanelProps["initial"];
export function buildLeadPatch(
  initial: ProcessingForm,
  form: ProcessingForm,
  statuses: ProcessingPanelProps["statuses"]
): Partial<Record<keyof ProcessingForm, unknown>>;
export function needsContractConfirm(
  initialStatus: string | null,
  nextStatus: string | null,
  statuses: ProcessingPanelProps["statuses"]
): boolean;
export function reasonError(
  form: ProcessingForm,
  statuses: ProcessingPanelProps["statuses"]
): string | null; // REFUSE_REASON_REQUIRED_MESSAGE или null
export function parsePayloadErrors(body: unknown): {
  fields: Record<string, string>;
  message: string | null;
};
```

### Удаление ПДн

- `card/erase-dialog.tsx`: `export function EraseDialog({ leadId, open, onClose }: …)` — содержимое текущего модального окна из `erase-menu-item.tsx` без изменений текстов: заголовок «Удалить персональные данные» (`role="dialog"`, `aria-labelledby`), абзац-предупреждение, поле «Для подтверждения введите «УДАЛИТЬ»», ошибка `role="alert"`, кнопки «Отмена» и «Удалить данные» (disabled, пока не введено `ERASE_CONFIRM_WORD`). POST на `leadEraseApiPath(id)` с `credentials: 'include'`; успех → `window.location.assign(LEADS_LIST_PATH)`; 409 → текст ошибки сервера в диалоге. Стили — `.iga-card`, `.iga-input`, `.iga-btn--danger` вместо inline `--theme-*`.
- `erase-menu-item.tsx` оставляет `PopupList.Button id="action-erase-personal-data"` «Удалить персональные данные…» и проверку роли, а модалку берёт из `EraseDialog`.
- `card/erase-button.tsx`: `.iga-btn iga-btn--danger iga-btn--sm` «Удалить персональные данные», открывает тот же `EraseDialog`. Рендерится только для admin (решение принимает server view по `getRole(user) === 'admin'`).

### Стили (`_lead-card.scss`)

- Префикс `.iga-lead`, BEM: `__head`, `__meta`, `__actions`, `__cols`, `__main`, `__side`, `__qa`, `__comment`, `__note`, `__empty`, `__error`, `__hint`, `__source`; `.iga-lead-file`, `.iga-lead-file__ext`; `.iga-lead-processing`.
- Размеры из макета: карточки — радиус 16 (`.iga-card`), заголовки карточек 16/600, `dl` подписи 13 px `--ig-text-2`, значения 14 px; шапка: `h1` 22/700; кнопки 40 px; поля 42 px, радиус 10.
- Фокус: рамка `--ig-primary` + `box-shadow: 0 0 0 3px rgba(43,140,126,.2)` (DESIGN.md «Фокус»); у `<summary>` — `outline: 2px solid var(--ig-primary)` на `:focus-visible`.
- Плитка файла: hover — рамка `--ig-primary`; без подъёма; `prefers-reduced-motion` — без переходов.
- Адаптив: ≤ 1100 px — одна колонка; ≤ 599 px — `padding-inline: 16px`, кнопки шапки по 50 %, `.iga-lead__qa` в одну колонку, сенсорные цели ≥ 44 px (чипы, «Назначить себя», `summary`).

### Команды

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm generate:importmap   # после слияния волны 3; коммит importMap.js — эта задача
git checkout -- src/payload-types.ts   # если dev/генератор его тронул
```

## Acceptance Criteria

- [ ] `/admin/collections/leads/<id>/summary/` выглядит как `res/admin-mockup/Lead.dc.html` на 1366 и 1920; на 375 — одна колонка без горизонтальной прокрутки (скриншоты 375 / 1366 / 1920 приложены к PR).
- [ ] Шапка: ссылка «Заявки» ведёт на `/admin/collections/leads/kanban/`; заголовок — компания (или имя); бейдж статуса цветом из справочника; форма, флаги, дата и страница входа; «Позвонить» (`tel:`) и «Написать» (`mailto:`) есть только при наличии телефона / e-mail.
- [ ] Регионы с доступными именами: «Контакты», «Что нужно клиенту», «Файлы», «Комментарии и история», «Откуда пришёл клиент», «Обработка», «Флаги» (внутри «Обработки»), «Повторные обращения», «Согласие на обработку ПДн». «Атрибуция», «Флаги» как отдельная карточка и «Внутренние комментарии» больше не рендерятся.
- [ ] В «Контактах» есть `a[href="tel:<phone>"]` и `a[href="mailto:<email>"]`; в «Файлах» ссылка с именем «Скачать …» и `href="/api/lead-files/<id>/download/"`; в «Повторных обращениях» текст «Есть повторы: N», ссылки ведут на `/admin/collections/leads/<id>/summary/`.
- [ ] Ориентир показан как «от 168 000 ₽» (NBSP) с подписью «ориентировочная цена на ДД.ММ.ГГГГ»; при отсутствии `estimate.from` блок цены не выводится.
- [ ] Смена статуса на «Отказ» без причины даёт ошибку под полем (сообщение сервера `REFUSE_REASON_REQUIRED_MESSAGE`); с кодом причины (не «Другое») — сохраняется; с «Другое» без текста — ошибка.
- [ ] Перевод в «Договор» требует подтверждения; после сохранения у заявки появляется заказ (хук `orderFromLead`), карточка обновлена (`router.refresh()`).
- [ ] «Назначить себя» сразу назначает текущего пользователя; ставится одно задание `notify-assigned` (существующий хук), сохранение без изменения ответственного новых заданий не ставит.
- [ ] Менеджер может сохранить статус, ответственного, флаги, причину и `kpAmount`; кнопки удаления ПДн у менеджера нет; у админа есть, диалог работает как пункт меню (409 для заявки с заказом показывает текст сервера).
- [ ] Unit-тесты `processing.test.ts`: diff только изменённых полей, `assignee: null` для «Не назначен», `needsContractConfirm`, `reasonError` (код без текста — ок; `other` без текста — ошибка; не-`requiresReason` — ок), `parsePayloadErrors` (ValidationError, ответ без `data`, мусор).
- [ ] В `src/payload/admin/leads/lead-summary-view.tsx` и `card/*` нет inline-цветов и `var(--theme-*)` в `style` (кроме `--iga-badge-color`).
- [ ] `pnpm lint`, `pnpm typecheck` (после слияния task-09), `pnpm test`, `pnpm build` зелёные; `importMap.js` перегенерирован и закоммичен этой задачей; `payload-types.ts` не изменён.

## Notes

- E2E карточки (`e2e/admin-leads.spec.ts`, а также `e2e/acceptance/lead-flow.spec.ts`, где проверяются регионы «Флаги» и «Атрибуция») обновляет **task-09** по списку регионов из критериев выше — не менять имена регионов без согласования.
- Флаги в регионе «Флаги» теперь — все 5 чипов с `aria-pressed`; e2e проверяет выбранные через `getByRole('button', { name: 'Срочно', pressed: true })`.
- Прямой `PATCH /api/leads/:id/` проходит все хуки коллекции и создаёт версию — это требование (история task-09 строится из версий). Не писать в БД через Local API из server action.
- Одновременное редактирование: панель отправляет только изменённые поля, поэтому чужие изменения других полей не затираются.
- Сумма КП видна и менеджеру, и админу; менеджер может её менять (решение после ревью плана).
