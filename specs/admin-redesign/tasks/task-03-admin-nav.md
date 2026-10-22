# Task 03: Боковое меню админки с группами и счётчиками

## Status

pending

## Wave

2

## Description

Заменить стандартное боковое меню Payload своим серверным компонентом по макету `res/admin-mockup/Main.dc.html` (блок `<aside class="sb">`, он одинаковый во всех четырёх экранах макета): navy-фон, логотип, четыре группы («Работа», «Сайт», «Каталог и цены», «Система»), иконки Lucide, счётчики новых заявок и заказов в работе, подсветка активного пункта, блок пользователя внизу с выходом, мобильное меню-оверлей. Видимость пунктов — по правам Payload (`visibleEntities` + `permissions.read`): менеджер видит «Сайт» и «Каталог и цены» (открывает их на чтение), админ видит всё. Ни одна видимая пользователю коллекция или глобал не должны пропасть из меню: всё, что не сопоставлено с пунктами макета, попадает в «Система → Служебное».

Задача — владелец `src/app/(payload)/admin/importMap.js` в волне 2.

## Dependencies

**Depends on:** task-01-schema-and-stubs.md, task-02-admin-theme-foundation.md
**Blocks:** task-12-admin-screens-theme.md, task-13-acceptance.md

**Context from dependencies:**
- **task-02** (тема и каркас):
  - `src/payload.config.ts`: `admin.components.Nav` → `src/payload/admin/nav/inex-nav.tsx` (экспорт `InexNav`, именованный и `default`; заглушка рендерит стандартное меню). Путь и имя экспорта — контракт, их **не менять** (иначе понадобится правка `payload.config.ts`, которой у этой задачи нет). `afterNavLinks` (`ReportsNavLink`) из конфига удалён; ссылка на `/admin/leads-report/` теперь живёт только в этом меню (пункт «Отчёты», `id="nav-leads-report"`).
  - Тема `admin.theme: 'light'`, шрифт Rubik на `<html>` (`rubik.variable`), токены сайта `--ig-*` доступны в админке из `src/styles/ig-vars.css` (например `--ig-navy #324B64`, `--ig-on-navy #FFFFFF`, `--ig-on-navy-2 #C9D3DD`, `--ig-btn-primary-bg #267D70`, `--ig-primary-light #EAF3F1`, `--ig-primary-dark #16403D`, `--ig-primary #2B8C7E`, `--ig-focus-ring`).
  - `src/app/(payload)/custom.scss` подключает партиалы через `@use`; партиал этой задачи `src/app/(payload)/styles/_nav.scss` создан пустым. Базовые классы в `_base.scss`: `.iga-avatar` (`--sm`), `.iga-btn`, `.iga-badge` и др. Tailwind в админке нет — только SCSS и классы `.iga-*`.
  - Зависимости спеки (`sass`, `@dnd-kit/*`) поставлены; `lucide-react` уже есть в `package.json`.
- **task-01** (схема): новых полей для меню нет. Добавлена скрытая коллекция `notification-log` (`admin.hidden: true`) — она не должна попадать в меню (Payload сам исключает скрытые из `visibleEntities`).
- Существующее (не задачи спеки): статусы заявок — коллекция `lead-statuses` (`isDefault` — статус новых заявок, `order`); хелпер `defaultStatus(statuses)` в `src/lib/leads-admin/report.ts` (флаг `isDefault`, иначе первый по `order`); загрузчик `loadLeadStatuses(payload)` (React `cache`) в `src/payload/admin/leads/data.ts`. Статусы заказов — `orders.currentStatus` (`spec_agreed`, `in_production`, `packed`, `shipped`, `received`; `ORDER_STATUS_IDS` из `src/lib/orders/status.ts`). Роли — `getRole(user)` из `src/payload/access/index.ts` (`'admin' | 'manager' | null`).

## Files to Create

- `src/payload/admin/nav/nav-config.ts` — статическое описание групп и пунктов меню (чистый модуль)
- `src/payload/admin/nav/build-nav.ts` — сборка меню под пользователя: фильтр по `visibleEntities`/`permissions`, хвост «Служебное» для несопоставленных сущностей (чистая функция)
- `src/payload/admin/nav/build-nav.test.ts` — unit-тесты сборки
- `src/payload/admin/nav/nav-counters.ts` — серверные счётчики (`payload.count` + `unstable_cache` 60 с + React `cache`)
- `src/payload/admin/nav/nav-client.tsx` — клиентская часть: активный пункт (`usePathname`), раскрытие подпунктов, кнопка закрытия на мобильном
- `src/payload/admin/nav/nav-icons.tsx` — карта ключ → иконка Lucide (клиентский модуль)
- `e2e/admin-nav.spec.ts` — e2e меню

## Files to Modify

- `src/payload/admin/nav/inex-nav.tsx` — заменить заглушку task-02 серверным меню (имя/путь экспорта не менять)
- `src/app/(payload)/styles/_nav.scss` — все стили меню (единственный файл стилей задачи)
- `src/payload/admin/nav/reports-nav-link.tsx` — **удалить**, если task-02 его оставила (после удаления `afterNavLinks` он не используется; ссылку отчёта рисует новое меню)
- `src/app/(payload)/admin/importMap.js` — `pnpm generate:importmap` и коммит результата (задача — владелец файла в волне 2)

**Не трогать:** `src/payload.config.ts`, `src/app/(payload)/custom.scss`, `_base.scss` и чужие партиалы, коллекции/глобалы (`src/payload/collections/**`, `src/payload/globals/**`), `src/payload/admin/leads/**`, `src/payload/admin/views/**`, `src/payload-types.ts` (генератор запускать локально и откатывать), `package.json`.

## Technical Details

### Как Payload рендерит Nav (3.91)

- `DefaultTemplate` (`node_modules/@payloadcms/next/dist/templates/Default/index.js`) рендерит `admin.components.Nav` через `RenderServerComponent` с `serverProps = { payload, permissions, req, user, i18n, locale, params, searchParams, … }` и `clientProps = { visibleEntities, viewType, documentSubViewType }` — серверный компонент получает и то, и другое одним объектом.
- Стандартное меню (`node_modules/@payloadcms/next/dist/elements/Nav/index.js`) построено так: `<NavWrapper baseClass="nav">` → `<nav className="nav__wrap">…</nav>` → `<div className="nav__header"><div className="nav__header-content"><NavHamburger baseClass="nav" /></div></div>`. `NavWrapper` и `NavHamburger` экспортируются из `@payloadcms/next/client`; `NavWrapper` вешает классы `nav--nav-open`, `nav--nav-animate`, `nav--nav-hydrated` и `inert`, когда меню закрыто (через `useNav()`), `NavHamburger` — кнопка закрытия оверлея на мобильном. Кнопку открытия (гамбургер в шапке) рисует сам шаблон (`NavToggler`), её не трогаем.
- Повторить ту же оболочку (`NavWrapper` + `nav__wrap` + `nav__header` с `NavHamburger`), чтобы работали открытие/закрытие, анимация и мобильный оверлей Payload; содержимое — своё.

### Структура меню (`nav-config.ts`)

Ссылки — `/admin/collections/<slug>/` и `/admin/globals/<slug>/` (со слешем: `trailingSlash: true`). Порядок и подписи — как в макете; подпункты (`children`) показываются раскрывающимся списком под пунктом (см. «Подпункты»).

| Группа | Пункт (иконка Lucide) | Ссылка пункта | Сущности пункта (`children`, по порядку) | Счётчик |
|---|---|---|---|---|
| Работа | Дашборд (`LayoutDashboard`) | `/admin/` | — (всегда виден сотруднику) | — |
| | Заявки (`Inbox`) | `/admin/collections/leads/kanban/` | `leads` (сам пункт), «Статусы заявок» `lead-statuses`, «Файлы заявок» `lead-files`, «Журнал согласий» `consent-log` | новые заявки, белая плашка `.iga-nav__count`, `aria-label="новых: N"` |
| | Заказы (`Package`) | `/admin/collections/orders/` | `orders`, «Файлы заказов» `order-files` | заказы в работе, приглушённая плашка `--soft`, `aria-label="в работе: N"` |
| | Отчёты (`ChartColumn`) | `/admin/leads-report/` | — ; `id="nav-leads-report"` | — |
| Сайт | Страницы (`FileText`) | `pages` | — | — |
| | Статьи (`BookOpen`) | `articles` | — | — |
| | Объекты (`Building2`) | `objects` | — | — |
| | Медиатека (`Image`) | `media` | — | — |
| | Сотрудники (`IdCard`) | `team` | — (нет в макете, но коллекция контента должна быть доступна) | — |
| Каталог и цены | Каталог (`Layers`) | первая видимая из детей | `glass-types` «Виды стекла», `thicknesses` «Толщины», `thickness-groups` «Группы толщин», `processing-services` «Обработка», `constructions` «Конструкции», `shower-configs` «Конфигурации душевых», `products` «Изделия», `object-types` «Типы объектов», `cities` «Города» | — |
| | Цены и акция (`Tag`) | первая видимая из детей | глобалы `prices` «Цены от», `promo` «Акция» | — |
| | Условия и контакты (`Phone`) | первая видимая из детей | глобалы `conditions` «Условия», `contacts` «Контакты», `requisites` «Реквизиты», `tech-params` «Технические параметры» | — |
| Система | Пользователи (`Users`) | `users` | — | — |
| | Настройки (`SlidersHorizontal`) | первая видимая из детей | глобалы `site-settings` «Настройки сайта», `navigation` «Навигация», `snippets` «Сниппеты» | — |
| | Служебное (`Wrench`) | первая видимая из детей | `redirects` «Редиректы», `search` «Поисковый индекс», `payload-jobs` «Задания» + **все видимые сущности, которых нет в таблице** (подпись — `labels.plural`/`label` из конфига) | — |

Подписи детей брать из конфига Payload (`collection.labels.plural`, `global.label`), строки в таблице — для справки (сверено с кодом). Slug-и сверены с `src/payload/collections/**`, `src/payload/globals/**`, `src/payload/plugins/search.ts` (`SEARCH_SLUG = "search"`); `payload-jobs` — коллекция очереди (видна только админу). Скрытые (`rate-limits`, `notification-log`, `payload-preferences`, `payload-migrations`, `payload-locked-documents`) в `visibleEntities` не входят и в меню не попадают.

Описание — данные, без JSX (иконки — строковые ключи, компонент выбирает `nav-icons.tsx`):

```ts
export type NavEntityRef = { kind: "collection" | "global"; slug: string };

export interface NavItemConfig {
  id: string;                     // стабильный ключ, data-nav-item
  label: string;
  icon: NavIconKey;               // "dashboard" | "leads" | "orders" | "reports" | ...
  /** Явная ссылка (дашборд, канбан, отчёт); иначе — ссылка первой видимой сущности. */
  href?: string;
  /** Сущность самого пункта (видимость и активность). */
  entity?: NavEntityRef;
  children?: NavEntityRef[];
  counter?: "newLeads" | "activeOrders";
  domId?: string;                 // "nav-leads-report"
  /** Пункт для «всех остальных» сущностей. */
  catchAll?: boolean;
}

export interface NavGroupConfig { id: string; label: string; items: NavItemConfig[] }
export const NAV_GROUPS: readonly NavGroupConfig[] = [/* таблица выше */];
```

### Сборка меню (`build-nav.ts`, чистая функция)

```ts
export interface NavInput {
  groups: readonly NavGroupConfig[];
  visibleEntities: { collections: string[]; globals: string[] };
  /** Только флаги чтения: permissions.collections[slug]?.read, permissions.globals[slug]?.read. */
  canRead: (ref: NavEntityRef) => boolean;
  /** Подписи из конфига (slug → label) для детей и хвоста «Служебное». */
  labels: { collections: Record<string, string>; globals: Record<string, string> };
  isStaff: boolean;
}

export interface NavLink { href: string; label: string; activePrefixes: string[] }
export interface NavItem extends NavLink { id: string; icon: NavIconKey; counter?: NavItemConfig["counter"]; domId?: string; children: NavLink[] }
export interface NavGroup { id: string; label: string; items: NavItem[] }

export function buildNav(input: NavInput): NavGroup[];
```

Правила:
1. Сущность видна, если она есть в `visibleEntities` **и** `canRead(ref)` истинно (то же правило, что у стандартного меню Payload: `groupNavItems` фильтрует по `permissions.read`).
2. Пункт с `entity` скрыт, если сущность не видна. Пункт с `children` показывается, если видна хотя бы одна сущность (своя или дочерняя); его `href` — явный `href` либо ссылка первой видимой сущности; невидимые дети выбрасываются.
3. «Дашборд» и «Отчёты» видны при `isStaff` (`getRole(user) !== null`). «Заявки» виден, если видна `leads`.
4. `catchAll`: все сущности из `visibleEntities`, не упомянутые ни в одном пункте, добавляются детьми «Служебное» (сортировка по подписи, `localeCompare(..., 'ru')`). Так ни одна доступная пользователю коллекция/глобал не теряется.
5. Пустая группа не рендерится.
6. `activePrefixes` — префиксы путей для подсветки: для коллекции `/admin/collections/<slug>/`, для глобала `/admin/globals/<slug>/`, для «Заявок» дополнительно `/admin/collections/leads/` (покрывает канбан, список и карточку), для «Отчётов» `/admin/leads-report/`; «Дашборд» активен только на `/admin/` (точное совпадение).

### Счётчики (`nav-counters.ts`, server-only)

- `newLeads` = `payload.count({ collection: 'leads', where: { status: { equals: <id статуса по умолчанию> } }, overrideAccess: false, user })`. Статус по умолчанию — `defaultStatus(await loadLeadStatuses(payload))` (`src/lib/leads-admin/report.ts`, `src/payload/admin/leads/data.ts`). Нет статусов → счётчик не показывается.
- `activeOrders` = `payload.count({ collection: 'orders', where: { currentStatus: { in: ['spec_agreed', 'in_production', 'packed'] } }, overrideAccess: false, user })` (не «Отгружено» и не «Получено»).
- Не больше трёх запросов на рендер (`lead-statuses` + 2 `count`).
- Кэш: `unstable_cache(fn, ['admin-nav-counters', userId], { revalidate: 60, tags: ['admin-nav-counters'] })`; поверх — React `cache` (дедупликация в пределах рендера). Внутри `unstable_cache` нельзя читать `headers()/cookies()`: экземпляр Payload брать через `getPayload({ config })` (`config` из `@payload-config`), пользователя передавать минимальным объектом `{ id, role, collection: 'users' }` (access-функции коллекций используют только `getRole(user)`). Перед вызовом прочитать доку `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md` (в проекте `cacheComponents` выключен).
- Счётчик считается только для видимого пункта (менеджер без прав на `orders` не платит запросом).
- Любая ошибка → счётчик не показывается (`null`), меню рендерится; в лог — одна строка без ПДн. Значение `0` не показывается (плашка скрыта).

```ts
import { cache } from "react";
import { unstable_cache } from "next/cache";

export type NavCounters = { newLeads: number | null; activeOrders: number | null };

export const getNavCounters = cache(
  (userId: string, role: Role, need: { newLeads: boolean; activeOrders: boolean }) =>
    unstable_cache(() => countAll(userId, role, need), ["admin-nav-counters", userId, String(need.newLeads), String(need.activeOrders)], {
      revalidate: 60,
      tags: ["admin-nav-counters"],
    })()
);
```

### Серверный компонент (`inex-nav.tsx`)

```tsx
import { NavHamburger, NavWrapper } from "@payloadcms/next/client";
import type { ServerProps } from "payload";

export async function InexNav(props: ServerProps & { visibleEntities?: VisibleEntities }) {
  const { payload, permissions, user, visibleEntities } = props;
  // 1. buildNav(...) с canRead по permissions, labels из payload.config
  // 2. getNavCounters(...) для видимых пунктов со счётчиком
  // 3. <NavWrapper baseClass="nav"> … <NavClient groups=… counters=… user=… /> … <div className="nav__header"><div className="nav__header-content"><NavHamburger baseClass="nav" /></div></div></NavWrapper>
}
export default InexNav;
```

Типы пропсов сверить с `node_modules/payload/dist/admin/types.d.ts` (`ServerProps`) и тем, что передаёт `DefaultTemplate`. В клиентский компонент передавать только сериализуемые данные (строки, числа, массивы).

### Клиентская часть (`nav-client.tsx`, `'use client'`)

Разметка (классы — префикс `.iga-nav`, стили только в `_nav.scss`):

```html
<nav class="nav__wrap iga-nav" aria-label="Главное меню">
  <a class="iga-nav__brand" href="/admin/">
    <img src="/brand/inex-glass-logo-light.svg" alt="Inex Glass" height="36" />
    <span class="iga-nav__brand-sub">панель<br/>управления</span>
  </a>
  <div class="iga-nav__group" role="group" aria-labelledby="nav-g-work">
    <div class="iga-nav__group-label" id="nav-g-work">Работа</div>
    <a class="iga-nav__link" href="/admin/" aria-current="page" data-nav-item="dashboard">[icon] Дашборд</a>
    <a class="iga-nav__link" href="/admin/collections/leads/kanban/">[icon] Заявки <span class="iga-nav__count" aria-label="новых: 5">5</span></a>
    ...
  </div>
  ...
  <div class="iga-nav__user">
    <a href="/admin/account/" class="iga-nav__user-link"><span class="iga-avatar">СМ</span><span>Сергей Морозов<small>Менеджер</small></span></a>
    <a href="/admin/logout/" class="iga-nav__logout" aria-label="Выйти">[LogOut icon]</a>
  </div>
</nav>
```

- Логотип: `public/brand/inex-glass-logo-light.svg` (светлый на navy, высота 36 px, не меньше 30 px на мобильном — DESIGN.md §10). Обычный `<img>` (в админке без `next/image`; если линтер требует — `// eslint-disable-next-line @next/next/no-img-element` с пояснением).
- Ссылки — обычные `<a>` (правило проекта для `/admin`), не `next/link`.
- Активный пункт: `usePathname()`; нормализовать к виду со слешем на конце; пункт активен, если путь начинается с любого из `activePrefixes` (дашборд — точное `/admin/`). Активному — `aria-current="page"` и класс `is-active`. Активный подпункт — так же.
- Подпункты: у пункта с `children.length > 1` справа кнопка-шеврон `<button aria-expanded aria-controls>` с `aria-label="Показать разделы «Каталог»"`; список подпунктов (`<ul>`) раскрыт, если активен пункт или любой подпункт, иначе свёрнут (состояние в `useState`, без сохранения). Пункт-ссылка ведёт на свой `href`; у «Заявок» и «Заказов» первый ребёнок — сама коллекция (подпись «Все заявки» / «Все заказы» → `/admin/collections/leads/` и `/admin/collections/orders/`).
- Счётчики: число `tabular-nums`; «Заявки» — белая плашка `#FFFFFF`/текст `--ig-navy`, «Заказы» — `rgba(255,255,255,.16)`/белый текст (`.iga-nav__count--soft`), как `.cnt`/`.cnt.soft` макета.
- Блок пользователя: инициалы (первые буквы имени и фамилии из `user.name`, верхний регистр; нет имени — первая буква e-mail), имя, роль «Администратор»/«Менеджер»; ссылка на `/admin/account/`; кнопка выхода — ссылка `/admin/logout/` (маршрут выхода Payload) с иконкой `LogOut`, `aria-label="Выйти"`.
- После перехода по ссылке на мобильном меню закрывается само (Payload закрывает nav при смене маршрута на мобильных — проверить; если нет — `setNavOpen(false)` из `useNav()` в `onClick` при ширине ≤ 1100 px).
- Иконки: `nav-icons.tsx` экспортирует `NAV_ICONS: Record<NavIconKey, LucideIcon>`; размер 18 px, `aria-hidden`, `strokeWidth={2}`.

### Стили (`_nav.scss`)

По макету (`Main.dc.html`, CSS-классы `.sb*`, `.nav a`, `.cnt`, `.sb-user`, `.av`). Цвета — только токены `--ig-*` (без новых HEX, кроме прозрачностей белого из макета: `rgba(255,255,255,.08|.12|.16)`).

- Фон меню и всей колонки — `--ig-navy`; текст `--ig-on-navy`. Переопределить у Payload: фон `.nav`, бордеры, ширину через `--nav-width: 248px` (в `:root` админки, если task-02 не задала иное — согласовать: не менять переменные, заданные в `_base.scss`, а только использовать).
- Бренд: `padding: 4px 8px 18px; border-bottom: 1px solid rgba(255,255,255,.12)`; подпись 12 px `--ig-on-navy-2`, line-height 1.3.
- Метка группы: 11 px, 500, `letter-spacing: .12em`, uppercase, `--ig-on-navy-2`, `padding: 14px 10px 6px`.
- Пункт: `display:flex; gap:10px; padding:9px 10px; border-radius:8px; min-height:40px; font-size:14px`; hover — `rgba(255,255,255,.08)`; активный — фон `--ig-btn-primary-bg` (#267D70), `font-weight:500`. Иконка 18 px, `opacity:.9`. Подпункты — отступ слева 38 px, 13 px, `min-height:36px`.
- Фокус: `outline: 2px solid var(--ig-on-navy); outline-offset: 2px` (на navy кольцо брендового цвета нечитаемо); не убирать.
- Блок пользователя прижат к низу (`margin-top:auto`), `border-top: 1px solid rgba(255,255,255,.12)`, `padding:14px 8px 4px`; аватар `.iga-avatar` 34 px (`--ig-primary-light` / `--ig-primary-dark`).
- Скрыть стандартные элементы Payload, которых больше нет (`.nav__controls`, `.nav-group`), если они где-то остаются.
- Мобильный оверлей (≤ 1100 px): меню на всю высоту поверх контента, тот же navy-фон, кнопка закрытия `NavHamburger` видна в `.nav__header` (белая иконка), размеры касаний ≥ 44 px.
- `prefers-reduced-motion: reduce` — без анимации открытия/hover-переходов. Бесконечных анимаций нет.

### Тесты

**Vitest `build-nav.test.ts`** (проект `unit`):
- админ (все сущности видны, все `read`) → 4 группы в порядке макета, пункты и дети как в таблице; «Отчёты» имеет `domId: 'nav-leads-report'` и `href: '/admin/leads-report/'`;
- менеджер (как в проекте: `users` видна, `payload-jobs` и `search` не видны, `pages`/каталог/глобалы `read: true`) → группы «Сайт» и «Каталог и цены» присутствуют; «Служебное» содержит только `redirects`;
- `canRead` ложно для `orders` → пункт «Заказы» скрыт, `order-files` тоже;
- у «Каталога» не видна `glass-types` → `href` пункта = ссылка следующего видимого ребёнка;
- неизвестная видимая коллекция `foo` → попадает детьми в «Служебное»; каждая видимая сущность встречается в результате ровно один раз (свойство: объединение всех ссылок ⊇ `visibleEntities`);
- `activePrefixes`: «Заявки» содержит `/admin/collections/leads/`, «Дашборд» — точное совпадение.

**Playwright `e2e/admin-nav.spec.ts`** (вход — `signInBrowser`/`adminApi`/`staffApi`/`deleteStaffApi` из `e2e/helpers/admin-api.ts`, никаких прямых `/api/users/login/`; `skipOnMissingAdmin` из `e2e/helpers/admin.ts`):
1. 1366, админ: `/admin/` → в `nav[aria-label="Главное меню"]` видны метки «Работа», «Сайт», «Каталог и цены», «Система»; ссылки «Дашборд» (`aria-current="page"`), «Заявки» (`href` `/admin/collections/leads/kanban/`), «Заказы», `#nav-leads-report` (`href` `/admin/leads-report/`); переход на `/admin/collections/pages/` → `aria-current` у «Страницы».
2. Счётчик: если плашка «Заявки» есть, её `aria-label` вида `новых: N` и `N` ≥ 1; сверка с REST (`GET /api/leads/?where[status][equals]=<default>&limit=0` → `totalDocs`) с допуском: другие спеки создают заявки параллельно, а кэш живёт 60 с, поэтому проверять `N ≤ totalDocs(после)` и `N ≥ 1`, когда `totalDocs(до) ≥ 1`.
3. 1366, менеджер (временный пользователь `staffApi(admin, 'manager')`, удаляется в `afterAll`): группы «Сайт» и «Каталог и цены» есть; «Задания»/«Поисковый индекс» отсутствуют; открытие `/admin/collections/pages/` по ссылке меню не даёт 403.
4. 1366: каждая видимая коллекция стандартного списка Payload достижима: собрать `href` всех ссылок меню (включая свёрнутые подпункты — раскрыть все шевроны) и проверить наличие `/admin/collections/{leads,orders,pages,articles,objects,media,team,users,glass-types,thicknesses,lead-statuses}/` и `/admin/globals/{prices,promo,site-settings}/`.
5. 375 (только чтение): меню скрыто; кнопка-гамбургер шаблона открывает оверлей, ссылки видны и кликабельны (размер ≥ 44 px по высоте), кнопка закрытия возвращает контент.

Проекты: тесты 1–4 — только `desktop-1366` (`test.skip(testInfo.project.name !== VIEWPORTS.laptop.name)`), тест 5 — только `mobile-375`. Данные не мутируются (кроме временного менеджера в 1366, создаётся и удаляется в этом же файле).

### Проверки

```bash
pnpm generate:importmap   # закоммитить importMap.js (владелец волны 2)
pnpm lint && pnpm typecheck && pnpm test
pnpm build
pnpm test:e2e e2e/admin-nav.spec.ts
```

Скриншоты 375 / 1366 / 1920 (`/admin/`, `/admin/collections/pages/`) — сравнить сайдбар с `res/admin-mockup/Main.dc.html`.

## Acceptance Criteria

- [ ] Меню выглядит как `<aside class="sb">` макета: navy-фон, логотип со строкой «панель управления», группы «Работа» / «Сайт» / «Каталог и цены» / «Система», иконки, активный пункт с фоном `#267D70`, блок пользователя внизу с выходом.
- [ ] «Заявки» ведёт на `/admin/collections/leads/kanban/` и показывает число новых заявок (статус по умолчанию); «Заказы» — число заказов в статусах до «Отгружено»; нулевые счётчики скрыты; счётчики кэшируются 60 с по пользователю, на рендер не больше 3 запросов к БД.
- [ ] «Отчёты» — ссылка `id="nav-leads-report"` на `/admin/leads-report/`; `ReportsNavLink` в коде не используется (файл удалён).
- [ ] Видимость по правам: менеджер видит «Сайт» и «Каталог и цены», не видит недоступное (задания, поисковый индекс); любая видимая пользователю коллекция/глобал достижима из меню (несопоставленные — в «Служебное»).
- [ ] Подсветка активного пункта и раскрытие подпунктов работают на списках, карточках, глобалах, канбане и отчёте.
- [ ] Мобильный оверлей (375) открывается и закрывается механизмом Payload (`NavWrapper`/`NavHamburger`), касания ≥ 44 px; фокус виден; `prefers-reduced-motion` уважается.
- [ ] Стили только в `_nav.scss`, цвета только из токенов; `importMap.js` перегенерирован и закоммичен.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/admin-nav.spec.ts` зелёные.

## Notes

- Модель: премиум (server/client-граница Payload, кэш).
- Сворачивание меню на десктопе не требуется: оставить стандартный `NavToggler` Payload как есть.
- Счётчики не инвалидируются хуками заявок/заказов (их файлы задаче не принадлежат) — только TTL 60 с; тег `admin-nav-counters` оставлен на будущее.
- Цены и акция (`prices`, `promo`) менеджер по текущим правам может **редактировать** (`update: isAdminOrManager`); остальное в «Каталог и цены» — только читать. Меню права не меняет.
- Если в будущем появится новая коллекция, она автоматически окажется в «Служебное» — это сознательная страховка, а не ошибка.
