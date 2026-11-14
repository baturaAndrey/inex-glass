# Task 04: Дашборд админки

## Status

complete

## Wave

2

## Description

Заменить заглушку дашборда (`/admin/`) экраном по макету `res/admin-mockup/Main.dc.html`: шапка страницы с поиском и «На сайт», «Требует внимания» (5 карточек), «Пульс» с переключателем периода и сравнением с предыдущим периодом (4 KPI со спарклайнами), «Воронка заявок» (с разбивкой отказов по причинам), «Источники», «Заказы в работе» (+ ближайшая отгрузка), «Последние заявки». Все вычисления — чистые функции в `src/lib/admin-dashboard/*` с unit-тестами; чтение данных — Local API с правами пользователя (`overrideAccess: false`). Переиспользуется существующий модуль отчётов `src/lib/leads-admin/{period,report}.ts`.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-02-admin-theme-foundation.md
**Blocks:** task-12-admin-screens-theme.md, task-13-acceptance.md

**Context from dependencies:**
- **task-02** (каркас): `src/payload.config.ts` → `admin.components.views.dashboard.Component` указывает на `src/payload/admin/views/dashboard.tsx` (заглушка). **Путь и имя экспорта, под которым компонент зарегистрирован в конфиге, не менять** — посмотреть строку `views.dashboard` в `payload.config.ts` и оставить то же имя. Базовые классы `_base.scss`: `.iga-card`, `.iga-btn` (`--primary|--secondary|--ghost|--danger`, `--sm`), `.iga-badge` (`--new|--work|--kp|--ok|--no` + свой цвет через `--iga-badge-color`), `.iga-tag`, `.iga-chip`, `.iga-seg`, `.iga-input`, `.iga-bar`, `.iga-page-head`, `.iga-section-head`, `.iga-avatar`. Партиал задачи `src/app/(payload)/styles/_dashboard.scss` создан пустым и подключён в `custom.scss`. Токены `--ig-*` (DESIGN.md §3) доступны в админке. Tailwind в админке нет.
- **task-01** (схема): у `leads` есть `refuseReasonCode` (select: `expensive` «Дорого», `other_supplier` «Выбрали другого поставщика», `needs_installation` «Нужен монтаж», `no_contact` «Не дозвонились», `other` «Другое»; опции — константа `LEAD_REFUSE_REASON_CODES` в `src/payload/collections/crm/constants.ts`), `kpAmount` (number). Правило отчётов: `refuseReasonCode = null` при непустом `refuseReason` считается «Другое» — его реализует эта задача.
- **Как Payload рендерит дашборд** (`node_modules/@payloadcms/next/dist/views/Dashboard/index.js`): компонент получает `serverProps = { ...AdminViewServerProps (initPageResult, params, searchParams), globalData, i18n, locale, navGroups, payload, permissions, user, visibleEntities }` и уже обёрнут шаблоном `DefaultTemplate` (меню, шапка) — свой `DefaultTemplate` **не** оборачивать.
- **Существующие модули** (не менять, только импортировать):
  - `src/lib/leads-admin/period.ts`: `PeriodPreset`, `presetRange(preset, now)`, `createdAtWhere(range)`, `periodBounds(range)`, `formatDateKeyRu`, `PERIOD_PRESET_LABELS`; даты — в `SITE_TZ` (Asia/Yekaterinburg).
  - `src/lib/leads-admin/report.ts`: `defaultStatus(statuses)`, `percent(part, total)`, `formatPercent`, `ReportStatus`, `FUNNEL_KP_SLUG`.
  - `src/payload/admin/leads/data.ts`: `loadLeadStatuses(payload)`, `loadStaffNames(payload)` (React `cache`); `src/payload/admin/leads/constants.ts`: `FORM_TYPE_LABELS`, `formTypeLabel`, `statusBadgeColors(color)`, `LEADS_REPORT_PATH`, `SITE_TZ`.
  - `src/lib/domain/format.ts`: `formatNumber`, `formatRub`; `src/lib/domain/dates.ts`: `todayKey`, `daysBetween`, `addDays`, `tryDateKey`.
  - `src/lib/orders/status.ts`: `ORDER_STATUS_IDS`, `ORDER_STATUS_META` (подписи), `formatOrderDayMonth`; `src/payload/collections/crm/constants.ts`: `LEAD_PRODUCT_TYPES`, `LEAD_FORM_TYPES`.
  - Глобал `prices`: `priceDate` (date), `staleAfterDays` (number, по умолчанию 45), `staleLabel` («Цена по расчёту»). Правило свежести — как `priceState()` в `src/lib/domain/prices.ts`: цена свежая, пока `daysBetween(priceDate, today) <= staleAfterDays`.
  - Заказы: `currentStatus`, `statusHistory[] { status, date, plannedDate }` (`plannedDate` строки текущего этапа = плановая дата **следующего** этапа), `packPhotos[]`, `expiresAt`, `revoked`, `number`.

## Files to Create

- `src/lib/admin-dashboard/period.ts` — пресеты дашборда, предыдущий период, корзины спарклайна
- `src/lib/admin-dashboard/pulse.ts` — KPI «Пульс» и дельты
- `src/lib/admin-dashboard/funnel.ts` — воронка по `lead-statuses` + разбивка отказов
- `src/lib/admin-dashboard/sources.ts` — источники по `formType`
- `src/lib/admin-dashboard/attention.ts` — карточки «Требует внимания»
- `src/lib/admin-dashboard/orders.ts` — заказы по статусам, ближайшая отгрузка
- `src/lib/admin-dashboard/sparkline.ts` — точки SVG-спарклайна
- `src/lib/admin-dashboard/format.ts` — «Когда», короткое имя, формат дельты
- `src/lib/admin-dashboard/*.test.ts` — unit-тесты на каждый модуль выше (`period`, `pulse`, `funnel`, `sources`, `attention`, `orders`, `sparkline`, `format`)
- `src/lib/admin-dashboard/load.ts` — серверная загрузка данных (Local API), без тестов
- `src/payload/admin/dashboard/attention-cards.tsx`, `pulse-section.tsx`, `funnel-card.tsx`, `sources-card.tsx`, `orders-card.tsx`, `latest-leads.tsx`, `sparkline.tsx`, `page-head.tsx` — серверные презентационные компоненты
- `e2e/admin-dashboard.spec.ts` — e2e дашборда

## Files to Modify

- `src/payload/admin/views/dashboard.tsx` — заменить заглушку: проверка доступа, загрузка, сборка секций
- `src/app/(payload)/styles/_dashboard.scss` — все стили дашборда

**Не трогать:** `src/payload.config.ts`, `src/lib/leads-admin/**`, `src/payload/admin/leads/**`, `src/payload/admin/nav/**`, коллекции/глобалы, чужие партиалы, `importMap.js` и `payload-types.ts` (генераторы запускать локально и откатывать), `package.json`. Клиентских компонентов не требуется: переключатель периода — ссылки.

## Technical Details

### Доступ и параметры

- `user = props.user ?? initPageResult.req.user`; `getRole(user) === null` → вместо секций карточка «Недостаточно прав для просмотра дашборда» (без запросов к данным).
- Период — `?period=today|7d|30d|quarter` (по умолчанию `30d`; неизвестное значение → `30d`). Ид-шники совпадают с пресетами `PeriodPreset` отчёта, поэтому ссылки «подробнее →» ведут на `/admin/leads-report/?period=<тот же>`.
- Все запросы — `overrideAccess: false, user`, `depth: 0`, с `select` только нужных полей. Чтение глобала `prices` — `payload.findGlobal({ slug: 'prices', depth: 0 })` (без кэша сайта).

### Шапка страницы (`page-head.tsx`)

Макет `.top`: слева eyebrow «Работа» и `<h1>` «Дашборд»; справа поиск и кнопка.
- Поиск — `<form method="get" action="/admin/collections/leads/">` с `<input type="search" name="search" placeholder="Компания, телефон, ИНН, № заказа" aria-label="Поиск по заявкам">` (поиск списка Payload по `listSearchableFields`). Иконка Lucide `Search` 16 px.
- «На сайт» — `<a class="iga-btn iga-btn--ghost" href={getEnv().SITE_URL} target="_blank" rel="noopener">` с иконкой `ExternalLink`.
- Разметка — `.iga-page-head` из `_base.scss`; недостающее — в `_dashboard.scss` под `.iga-dash`.

### 1. «Требует внимания» (`attention.ts`, `attention-cards.tsx`)

Заголовок секции «Требует внимания», подпись «то, что ждёт действия прямо сейчас». Сетка `repeat(auto-fit, minmax(200px, 1fr))`, gap 12. Карточка (`.att` макета): иконка 20 px и число 28 px/700 справа сверху, подпись 14/500, подстрока 12 px `--ig-text-2`; тон рамки и цвета: `danger` (`--ig-danger` рамка, `--ig-danger-text`), `warning`, `info`; при значении 0 — нейтральная карточка (`--ig-hairline`, число `--ig-text-2`, подстрока «всё в порядке»). Карточка целиком — ссылка; hover `translateY(-2px)` + тень `--ig-shadow-card-hover`, отключить при `prefers-reduced-motion`.

| # | Подпись | Тон | Данные | Подстрока | Ссылка |
|---|---|---|---|---|---|
| 1 | «Новые без ответственного» (`UserRound`) | danger | `count leads: status = default AND assignee exists false` + самая старая (`find limit 1 sort createdAt`) | «самая давняя — 2 ч 15 мин» (`formatAge`) | `/admin/collections/leads/?where[and][0][status][equals]=<id>&where[and][1][assignee][exists]=false` |
| 2 | «Новые дольше 2 часов» (`Clock`) | warning | `count leads: status = default AND createdAt < now − 2 ч` | «клиент ждёт ответа» | `…?where[and][0][status][equals]=<id>&where[and][1][createdAt][less_than]=<ISO>` |
| 3 | «Упаковано, нет фото» (`Image`) | warning | `find orders: currentStatus in [packed, shipped]`, `select { number, packPhotos }`, `limit 100`; в JS — у кого `packPhotos` пуст (то же правило, что `no-photos` в `src/payload/admin/orders/order-warnings.ts`) | 1 заказ → «заказ 2026-0141», больше → «заказы 2026-0141, 2026-0142…» (до 2 номеров) | 1 заказ → `/admin/collections/orders/<id>/manage/`, иначе `/admin/collections/orders/?where[currentStatus][in]=packed,shipped` |
| 4 | «Ссылки клиентов истекают» (`Link`) | info | `count orders: revoked not_equals true AND expiresAt > now AND expiresAt ≤ now + 3 дня` | «в ближайшие 3 дня» | `/admin/collections/orders/?where[and][0][expiresAt][greater_than]=<ISO>&where[and][1][expiresAt][less_than_equal]=<ISO>` |
| 5 | «Цены не обновлялись, дней» (`TriangleAlert`) | danger, если цена устарела; warning, если до устаревания ≤ 7 дней; иначе нейтральная | `age = daysBetween(priceDate, today)` (глобал `prices`) | устарела → «на сайте — «<staleLabel>»»; скоро → «устареют через N дн.»; иначе «порог — <staleAfterDays> дн.» | `/admin/globals/prices/` |

- Для `revoked` учитывать `null` на старых строках: `or: [{ revoked: { equals: false } }, { revoked: { exists: false } }]` (как `expiredLinksWhere` в `src/jobs/expire-order-links.ts`).
- Нет статусов заявок → карточки 1–2 нейтральные с «—». Нет `priceDate` → карточка 5 danger с числом «—» и подстрокой «дата цен не задана».
- Карточки, на которые у пользователя нет прав (например, `orders` не читается), не рендерятся.
- Чистая функция: `buildAttention(input, now) → AttentionCard[]` (`{ key, label, value: number | null, tone, sub, href }`); загрузчик отдаёт ей сырые числа/списки.

### 2. «Пульс» (`period.ts`, `pulse.ts`, `sparkline.ts`, `pulse-section.tsx`)

Заголовок «Пульс», подпись сравнения, справа сегмент-переключатель `.iga-seg` из четырёх ссылок: «Сегодня» (`today`), «7 дней» (`7d`), «30 дней» (`30d`), «Квартал» (`quarter`); `href="/admin/?period=…"`, активной — `aria-current="page"` и стиль `.on` макета.

Подпись: `today` — «сравнение со вчера», `7d` / `30d` — «сравнение с предыдущими 7 / 30 днями», `quarter` — «сравнение с предыдущим периодом той же длины».

`period.ts`:

```ts
export const DASHBOARD_PERIODS = ["today", "7d", "30d", "quarter"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];
export function parseDashboardPeriod(value: unknown): DashboardPeriod; // по умолчанию "30d"
/** Текущий диапазон — presetRange(period, now) из leads-admin/period. */
export function currentRange(period: DashboardPeriod, now: Date): DateRange;
/** Тот же размер в днях, вплотную перед текущим: [from − n, from − 1]. */
export function previousRange(range: DateRange): DateRange;
/** Корзины спарклайна: today — по часам 0…текущий час; 7d/30d — по дням; quarter — по неделям (7 дней от начала). */
export function sparkBuckets(period: DashboardPeriod, range: DateRange, now: Date): { key: string; from: Date; to: Date }[];
```

Данные — два постраничных `find` по заявкам (текущий и предыдущий диапазоны), как `collectCounts` в `src/payload/admin/views/leads-report.tsx`: `where: createdAtWhere(range)`, `select { createdAt, status, area, formType, refuseReasonCode, refuseReason }`, `limit 2000`, страницы последовательно, предел 100 000 строк (выше — предупреждение «числа неполные, сузьте период»).

KPI (`pulse.ts`, когорта — заявки, **созданные** в периоде; статусы — текущие):

| KPI | Значение | Дельта к пред. периоду | Спарклайн по корзинам |
|---|---|---|---|
| «Заявки» | число заявок | `↑ 18%` — процент изменения; пред. = 0 и тек. > 0 → «новые»; оба 0 → «= 0%» | число заявок в корзине |
| «Договоры» | заявки периода в статусе с `isContract` | абсолютная: `↑ 2` / `↓ 1` / `= 0` | число договоров в корзине |
| «Конверсия в договор» | `percent(договоры, заявки)`, 1 знак, «14,3 %» | разница в п. п.: `↓ 1,2 п. п.` | конверсия корзины (0, если в корзине нет заявок) |
| «Площадь в заявках» | сумма `area` (м², целое), «1 540 м²» | процент, как у «Заявок» | сумма площади в корзине |

- Рост — класс `.up` (`--ig-success-text`), падение — `.down` (`--ig-danger-text`), без изменений — `--ig-text-2`. После дельты — «к пред. периоду». Для скринридера дельта дублируется текстом (`<span class="iga-sr-only">рост на 18 % к предыдущему периоду</span>`, класс скрытия — в `_dashboard.scss`, если его нет в `_base.scss`).
- Числа — `formatNumber`, `tabular-nums`; единицы («%», «м²») — 15/500 `--ig-text-2`.
- Спарклайн (`sparkline.ts` → `sparklinePoints(values, { width: 130, height: 34, pad: 4 })` → строки для `<polyline points>` и `<polygon points>` с замыканием к низу): `<svg viewBox="0 0 130 34" preserveAspectRatio="none" aria-hidden="true">`, высота 40 px, линия 2 px. Цвет — `--ig-primary`, у KPI с падением — `--ig-danger-text`; заливка — тот же цвет с прозрачностью (`fill-opacity: .1`). Все значения равны / одна точка → горизонтальная линия по центру. Без библиотек.

### 3. «Воронка заявок» (`funnel.ts`, `funnel-card.tsx`)

Карточка: заголовок «Воронка заявок», справа ссылка «подробнее →» на отчёт с тем же периодом. Когорта и период — как у «Пульса».

```ts
export interface FunnelStage { id: string; name: string; color: string; count: number; share: number }
export interface FunnelResult {
  stages: FunnelStage[];          // все «продвигающие» статусы по order
  refused: { count: number; reasons: { code: string; label: string; count: number }[]; topLabel: string | null };
}
export function buildFunnel(statuses: ReportStatus[], leads: { status: unknown; refuseReasonCode?: string | null; refuseReason?: string | null }[]): FunnelResult;
```

- «Продвигающие» статусы: все, кроме тупиковых (`requiresReason === true` или `isFinal && !isContract`) — то же правило `isDeadEnd`, что в `src/lib/leads-admin/report.ts`.
- Первый этап (статус по умолчанию) = все заявки периода (100 %); каждый следующий не-договорный этап = заявки, чей текущий продвигающий статус имеет `order` ≥ этапа; этап с `isContract` = только заявки в статусе договора. Доля — `percent(count, total)`, строка «31 · 74%» (у первого — только число).
- Полоса `.iga-bar` 8 px, ширина = доля, цвет — `statusBadgeColors(status.color).color` (inline `style={{ "--iga-bar-color": color }}` через CSS-переменную, не цвет напрямую в `background`, — правило «без inline-цветов» соблюдается переменной; цвет приходит из справочника и уже проверен `statusBadgeColors` на HEX).
- Строка отказа под разделителем (`border-top` `--ig-hairline`): «Отказ» и «9 · основная причина — «дорого»». Разбивка: по `refuseReasonCode` с подписями `LEAD_REFUSE_REASON_CODES`; `null` при непустом `refuseReason` → «Другое» (`other`); `null` и пустой текст → «Не указана». `topLabel` — самая частая причина (подпись в нижнем регистре в кавычках-ёлочках); нет отказов → строка «Отказов нет». Полная разбивка — в `title`/раскрывающемся `<details>` под строкой: «Дорого: 4 · Выбрали другого поставщика: 2 …».
- Нет статусов → «Статусы не настроены».

### 4. «Источники» (`sources.ts`, `sources-card.tsx`)

`buildSources(leads) → { formType, label, count, width }[]`: группировка по `formType` (подписи `FORM_TYPE_LABELS`), только ненулевые, по убыванию, `width = count / max * 100`. Полоса цвета `--ig-primary`. Строка «Квиз … 18». Пусто → «Заявок за период нет». Ссылка «подробнее →» — отчёт с тем же периодом.

### 5. «Заказы в работе» (`orders.ts`, `orders-card.tsx`)

- Четыре плитки 2×2 (`--ig-bg`, радиус 10, padding 12): число 24/700 и подпись 12 px — по статусам `spec_agreed`, `in_production`, `packed`, `shipped` (подписи из `ORDER_STATUS_META`). Числа — 4 `payload.count` по `currentStatus` (не зависят от периода).
- «Ближайшая отгрузка»: `find orders where currentStatus = packed`, `select { number, statusHistory }`, `limit 200`; у строки истории со статусом `packed` взять `plannedDate`; из дат ≥ сегодня (в `SITE_TZ`) — минимальная. Вывод «2026-0138 · 24.10» (`formatOrderDayMonth`); нет — «не запланирована». Ссылка на заказ — `/admin/collections/orders/<id>/manage/`.
- Ссылка «все заказы →» — `/admin/collections/orders/`. Нет прав на `orders` → карточка не рендерится.

### 6. «Последние заявки» (`latest-leads.tsx`)

- `find leads sort -createdAt limit 5`, `select { company, name, productType, area, formType, status, assignee, createdAt }`.
- Таблица (`overflow-x: auto`): «Когда», «Компания», «Изделие», «Площадь», «Источник», «Статус», «Ответственный».
  - «Когда» (`format.ts → formatWhen(createdAt, now)`): сегодня — «10:48», вчера — «вчера», иначе «20.10» (всё в `SITE_TZ`); `title` — полная дата `DD.MM.YYYY HH:mm`.
  - «Компания»: `company || name`, ссылка `<a href="/admin/collections/leads/<id>/summary/">` (500).
  - «Изделие»: подпись `LEAD_PRODUCT_TYPES`; «Площадь»: «120 м²» или «—».
  - «Статус»: `.iga-badge` с цветом из справочника (`--iga-badge-color` = `statusBadgeColors(color).color`).
  - «Ответственный»: короткое имя (`shortName('Сергей Морозов') === 'Сергей М.'`) из `loadStaffNames`, иначе «не назначен» (`--ig-text-2`).
- Строки hover `--ig-bg`. Ссылка «все заявки →» — `/admin/collections/leads/kanban/`. Пусто — «Заявок пока нет».
- ≤ 599 px: таблица прокручивается горизонтально внутри карточки (без горизонтального скролла страницы).

### Компоновка и стили (`_dashboard.scss`)

Корень `.iga-dash`: `padding: 28px 32px 56px; display:flex; flex-direction:column; gap:32px` (≤ 1100: 24px 24px 48px; ≤ 599: 16px 16px 40px). Секции: «Требует внимания», «Пульс», ряд из трёх карточек (`repeat(auto-fit, minmax(300px, 1fr))`, gap 16: воронка, источники, заказы), «Последние заявки» (карточка без внутреннего padding, шапка `18px 20px 6px`).

Значения из макета: карточка — `--ig-surface`, рамка `--ig-hairline`, радиус 16, padding 20, тень `0 1px 2px rgba(28,31,34,.05)` (`--ig-shadow-card`); KPI — `min-height: 168px`, значение 34/700; заголовки секций 18/600, заголовки карточек 16/600; ссылки — `--ig-primary-pressed`. Цвета — только токены; стили статусов — через `.iga-badge`/CSS-переменные. Без бесконечных анимаций; `prefers-reduced-motion` отключает подъём карточек.

### Загрузка (`load.ts`)

`loadDashboard(payload, user, period, now)` возвращает сериализуемый объект для компонентов. Запросы последовательны (как в отчёте — не занимать пул соединений). Ориентир: 2 скана заявок + ~10 `count`/`find` с `limit` ≤ 200. Любой упавший блок → этот блок показывает «Не удалось загрузить данные», остальные рендерятся (try/catch на блок, в лог — имя ошибки без ПДн).

### Тесты

**Vitest** (проект `unit`, `now` всегда передаётся явно, даты в `Asia/Yekaterinburg`):
- `period.test.ts`: `previousRange` для 7d/30d/today/quarter (стык месяцев и года); `parseDashboardPeriod('foo') === '30d'`; число корзин: today в 10:30 → 11, 7d → 7, 30d → 30, quarter → ⌈дни/7⌉.
- `pulse.test.ts`: дельты (рост/падение/ноль/пред. = 0 → «новые»), конверсия в п. п. с одним знаком, площадь суммирует только числа (null пропускается), пустой период без деления на ноль.
- `funnel.test.ts`: этапы по `order`, договор — только свой статус, отказ исключён из этапов; разбивка причин: код, `null` + текст → «Другое», `null` без текста → «Не указана»; `topLabel`.
- `sources.test.ts`: сортировка, нули выброшены, ширина относительно максимума.
- `attention.test.ts`: тоны цены (устарела / ≤ 7 дней / свежая / нет даты), подстроки заказов без фото (1 и 3 заказа), нулевые карточки нейтральные, ссылки с корректными `where`.
- `orders.test.ts`: ближайшая отгрузка — берёт `plannedDate` строки `packed`, пропускает прошедшие и пустые.
- `sparkline.test.ts`: точки в пределах viewBox, константный ряд — горизонталь, одна точка.
- `format.test.ts`: `formatWhen` (сегодня/вчера/дата, полночь в Екатеринбурге), `formatAge` («12 мин», «1 ч», «2 ч 15 мин», «3 дня»), `shortName`.

**Playwright `e2e/admin-dashboard.spec.ts`** (`desktop-1366`, `test.describe.configure({ mode: 'serial' })`, фикстуры через `adminApi`/`createLead`/`findStatusId`/`deleteDocs` из `e2e/helpers/admin-api.ts`, компании с меткой прогона `e2e-dash-<ts>`, удаление в `afterAll`; `skipOnMissingAdmin`):
1. Создать 2 новые заявки без ответственного (одна с `area: 120`, `formType: 'quiz'`). `/admin/` → видны секции «Требует внимания», «Пульс», «Воронка заявок», «Источники», «Заказы в работе», «Последние заявки»; карточка «Новые без ответственного» показывает число ≥ 2; её ссылка открывает список с этими заявками (компания прогона видна в таблице).
2. «Последние заявки»: строка с компанией прогона, ссылка ведёт на `/admin/collections/leads/<id>/summary/`.
3. Переключатель: клик «7 дней» → URL `?period=7d`, у ссылки `aria-current="page"`; «подробнее →» воронки ведёт на `/admin/leads-report/?period=7d`.
4. Менеджер (`staffApi(admin, 'manager')`, удалить в `afterAll`) открывает `/admin/` без ошибок, секции на месте.
5. `mobile-375` (только чтение): `/admin/` без горизонтального скролла страницы (`document.documentElement.scrollWidth <= innerWidth`), карточки в одну колонку.

### Проверки

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm test:e2e e2e/admin-dashboard.spec.ts
```

Скриншоты `/admin/` на 375 / 1366 / 1920 — сравнить с `res/admin-mockup/Main.dc.html` (порядок секций, сетки, карточки, сегмент-переключатель, таблица).

## Acceptance Criteria

- [ ] `/admin/` показывает шапку (eyebrow «Работа», «Дашборд», поиск по заявкам, «На сайт») и все секции макета в его порядке.
- [ ] «Требует внимания»: 5 карточек с данными из БД и глобала `prices` (по правилу `staleAfterDays`), тона и подстроки по таблице, каждая карточка ведёт на отфильтрованный список/глобал/заказ.
- [ ] «Пульс»: период переключается ссылками `?period=today|7d|30d|quarter`; 4 KPI с дельтами к предыдущему периоду той же длины и SVG-спарклайнами без библиотек.
- [ ] Воронка строится по `lead-statuses` (порядок, цвета), отказ — отдельной строкой с основной причиной по `refuseReasonCode` («Другое» для текста без кода); источники — по `formType`; заказы — 4 статуса и ближайшая отгрузка; последние 5 заявок ссылаются на `/summary/`.
- [ ] Все запросы с правами пользователя; не-сотрудник видит сообщение о недостатке прав; падение одного блока не роняет дашборд.
- [ ] Логика в `src/lib/admin-dashboard/*` покрыта unit-тестами; стили только в `_dashboard.scss`, цвета только из токенов.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/admin-dashboard.spec.ts` зелёные; скриншоты 375 / 1366 / 1920 соответствуют макету.

## Notes

- Модель: премиум (агрегации, server components Payload).
- Воронка дашборда считает все продвигающие статусы (в отличие от отчёта, где только «Новая → КП → Договор») — это сознательно, по макету; отчёт не меняется.
- Ссылки на карточку заявки строятся локально (`/admin/collections/leads/<id>/summary/`), без импорта из `src/payload/admin/leads/constants.ts`: хелперы путей туда добавляют задачи 05/08.
- Поиск в шапке ищет только заявки (`listSearchableFields` коллекции); поиск по номеру заказа — в списке заказов. Placeholder взят из макета; если заказчик попросит единый поиск — отдельная задача.
- Счётчики меню (task-03) и карточки дашборда считаются независимо; расхождение до 60 с из-за кэша меню допустимо.

## Поправки координатора (приоритет над текстом выше)

- Имя экспорта дашборда — `InexDashboard` (задаёт task-02).
