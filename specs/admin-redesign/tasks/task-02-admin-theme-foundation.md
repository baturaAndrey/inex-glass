# Task 02: Тема и каркас админки (конфиг, шрифт, токены, SCSS, зависимости)

## Status

pending

## Wave

1

## Description

Готовит основу для всех UI-задач редизайна админки Payload 3.91: светлая тема без переключателя, заголовок и иконка вкладки, логотип Inex Glass, шрифт Rubik, токены сайта (`--ig-*`) в админке, перекраска переменных Payload под палитру DESIGN.md, SCSS-каркас с партиалом на каждую задачу и базовые классы `.iga-*`, которыми пользуются меню, дашборд, канбан, карточка заявки и форма страницы. Регистрирует в конфиге своё меню (`components.Nav`) и дашборд (`views.dashboard`) — пока заглушками, которые рендерят стандартные компоненты Payload. Ставит все npm-зависимости спеки (`sass`, `@dnd-kit/*`), чтобы следующие волны не трогали `package.json`.

После задачи админка работает как прежде, но в цветах и шрифте Inex Glass; ссылка «Отчёт по заявкам» временно пропадает из меню (вернётся в меню task-03, страница `/admin/leads-report/` доступна).

## Dependencies

**Depends on:** None (Wave 1)
**Blocks:** task-03-admin-nav.md, task-04-admin-dashboard.md, task-05-leads-kanban.md, task-06-max-core.md, task-07-page-edit-form.md

**Context from dependencies:** зависимостей нет. Параллельно идёт task-01 (схема, миграция `admin_redesign`, компоненты-заглушки MAX/SEO). Общих файлов нет: task-01 правит коллекции, globals, `src/payload/fields/seo.ts`, `src/jobs/**`, `src/migrations/**`, коммитит `src/payload-types.ts`. Эта задача — владелец `src/app/(payload)/admin/importMap.js` в волне 1: коммитит его со своими регистрациями; после слияния волны координатор перегенерирует его ещё раз вместе с заглушками task-01.

Текущее состояние кода:
- `src/payload.config.ts`: `admin.components.afterNavLinks: ["/payload/admin/nav/reports-nav-link#ReportsNavLink"]`, `views.leadsReport` (`/leads-report`), `importMap.baseDir = src`. Пути компонентов задаются относительно `src` (`/payload/admin/...#Export`).
- `src/app/(payload)/layout.tsx` — шаблон Payload: `RootLayout` из `@payloadcms/next/layouts`, импорт `@payloadcms/next/css` и пустого `./custom.scss`. `RootLayout` принимает `htmlProps` (кладутся на `<html>` после `data-theme`).
- Шрифт: `src/app/(site)/fonts.ts` экспортирует `rubik` (`next/font/local`, переменная `--font-rubik`, веса 400–700).
- Токены: `src/styles/ig-tokens.css` — строки 9–196 это `:root { … }` и три `@media (max-width: 1365px|1100px|599px) { :root { … } }`; ниже — базовые стили (`body`, `a`, `.ig-h1`…, `.ig-container`). Файл импортируется в `src/app/(site)/globals.css` как `@import "../../styles/ig-tokens.css" layer(base);`.
- Логотипы: `public/brand/inex-glass-logo-dark.svg` (для светлого фона) и `inex-glass-logo-light.svg` (для navy), 69 × 41. Favicon: `src/app/favicon.ico` (отдаётся как `/favicon.ico`).
- Payload 3.91: стили в `@layer payload-default`; незаслойный CSS из `custom.scss` их перекрывает **всегда**, независимо от специфичности. Переменные темы — в `node_modules/@payloadcms/ui/dist/scss/app.scss` и `colors.scss`.
- `DefaultNav` экспортируется из `@payloadcms/next/rsc`; `DefaultDashboard` и тип `DashboardViewServerProps` — из `@payloadcms/next/views`. Ни один e2e не ссылается на `#nav-leads-report`.
- `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2`, `sass@1.77.4` уже лежат в `node_modules/.pnpm` как транзитивные зависимости Payload, но в `package.json` их нет.

## Files to Create

- `src/styles/ig-vars.css` — вынесенные из `ig-tokens.css` блоки `:root` (без изменений значений)
- `src/payload/admin/graphics/logo.tsx` — `AdminLogo` (логотип на экране входа)
- `src/payload/admin/graphics/icon.tsx` — `AdminIcon` (знак в шапке/хлебных крошках)
- `src/payload/admin/nav/inex-nav.tsx` — заглушка `InexNav` (рендерит `DefaultNav`; заменяет task-03)
- `src/payload/admin/views/dashboard.tsx` — заглушка `InexDashboard` (рендерит `DefaultDashboard`; заменяет task-04)
- `src/app/(payload)/styles/_base.scss` — переменные Payload, переменные `--iga-*`, базовые классы `.iga-*`
- `src/app/(payload)/styles/_screens.scss` (владелец task-12), `_nav.scss` (03), `_dashboard.scss` (04), `_kanban.scss` (05), `_max.scss` (06), `_edit-form.scss` (07), `_lead-card.scss` (08), `_lead-history.scss` (09) — пустые, с одной строкой-комментарием о владельце

## Files to Modify

Разрешено менять **только** перечисленное:

- `src/payload.config.ts` — только блок `admin`: `theme`, `meta`, `components.graphics`, `components.Nav`, `components.views.dashboard`, удаление `components.afterNavLinks`. Остальное (`collections`, `db`, `jobs`, `views.leadsReport`, …) не трогать.
- `src/app/(payload)/layout.tsx` — `htmlProps` с классом шрифта, импорт `ig-vars.css`.
- `src/app/(payload)/custom.scss` — только строки `@use` партиалов.
- `src/styles/ig-tokens.css` — только замена строк 9–196 на `@import "./ig-vars.css";`.
- `package.json`, `pnpm-lock.yaml` — только зависимости из шага 1.
- `src/app/(payload)/admin/importMap.js` — `pnpm generate:importmap` (владелец в волне 1).

**Не трогать:** коллекции, globals, поля, хуки, `src/jobs/**`, `src/migrations/**`, `src/payload-types.ts` (если dev-сервер его перегенерировал — откатить), `src/app/(site)/**` (в т. ч. `globals.css`, `fonts.ts`), `src/styles/ig-components.css`, `src/payload/admin/nav/reports-nav-link.tsx` (файл остаётся; удалит task-03, когда пункт «Отчёты» появится в новом меню), все компоненты `src/payload/admin/{leads,orders,media,views/leads-report.tsx}`.

## Technical Details

### Шаг 1. Зависимости

Версии `@dnd-kit/*` — те же, что уже использует Payload (одна копия в бандле):

```bash
pnpm add -E @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2
pnpm add -D -E sass
```

`sass` — последняя стабильная 1.x (записать версию в отчёт). Сборка Docker ставит devDependencies (`pnpm install --frozen-lockfile`, затем `pnpm build`), поэтому `sass` в devDependencies достаточно. Проверить `pnpm install --frozen-lockfile`. Кому нужны: `@dnd-kit/*` — task-05 (канбан); `sass` — все SCSS-партиалы.

### Шаг 2. `ig-vars.css` без изменения CSS сайта

1. До правок: `pnpm build`, сохранить CSS сайта для сравнения: файлы `.next/static/chunks/**/*.css`, содержащие `--ig-primary` (скопировать в scratchpad).
2. Перенести строки 9–196 `ig-tokens.css` (весь `:root` и три медиа-блока с `:root`) **дословно** в `src/styles/ig-vars.css`, с заголовком-комментарием: файл подключают сайт (через `ig-tokens.css`, слой `base`) и админка (`src/app/(payload)/layout.tsx`, без слоя).
3. В `ig-tokens.css` на место перенесённого — `@import "./ig-vars.css";` сразу после верхнего комментария (до `body {`; `@import` должен идти раньше любых правил). Комментарий файла дополнить ссылкой на `ig-vars.css`.
4. Снова `pnpm build` и сравнить CSS сайта (имена файлов-хешей могут отличаться, содержимое — нет: те же объявления в том же порядке внутри `@layer base`). Если Tailwind v4 не встроил вложенный `@import` в слой `base` — остановиться и сообщить координатору (запасной вариант — импорт `ig-vars.css` прямо в `globals.css`, это чужой файл).
5. Прогнать `pnpm test:e2e e2e/acceptance/visual.spec.ts` (проверки переполнения/картинок/CTA проходят как раньше).

### Шаг 3. Шрифт и токены в layout админки

```tsx
import React from "react";
import "@payloadcms/next/css";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import config from "@payload-config";
import { rubik } from "@/app/(site)/fonts";
import { importMap } from "./admin/importMap.js";
import "@/styles/ig-vars.css";
import "./custom.scss";
// …serverFunction без изменений
const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={serverFunction}
    htmlProps={{ className: rubik.variable }}
  >
    {children}
  </RootLayout>
);
```

`--ig-font` в `ig-vars.css` = `var(--font-rubik), system-ui, …`, а `rubik.variable` задаёт `--font-rubik` на `<html>`.

### Шаг 4. Конфиг (`src/payload.config.ts`, блок `admin`)

```ts
admin: {
  user: Users.slug,
  dateFormat: "dd.MM.yyyy HH:mm",
  importMap: { baseDir: path.resolve(dirname) },
  // Light only (DESIGN.md): no theme switcher in the account view.
  theme: "light",
  meta: {
    titleSuffix: " — Inex Glass",
    icons: [{ rel: "icon", type: "image/x-icon", url: "/favicon.ico" }],
  },
  components: {
    graphics: {
      Logo: "/payload/admin/graphics/logo#AdminLogo",
      Icon: "/payload/admin/graphics/icon#AdminIcon",
    },
    // Admin redesign: own sidebar (task 03) and dashboard (task 04); stubs render Payload's defaults.
    Nav: "/payload/admin/nav/inex-nav#InexNav",
    views: {
      dashboard: { Component: "/payload/admin/views/dashboard#InexDashboard" },
      leadsReport: {
        Component: "/payload/admin/views/leads-report#LeadsReportView",
        path: "/leads-report",
      },
    },
  },
},
```

`afterNavLinks` удалить вместе с комментарием о нём.

### Шаг 5. Компоненты

Ссылки в админке — обычный `<a>`, не `next/link`. Изображения — `next/image` с `unoptimized` (как `src/components/layout/logo.tsx`: SVG не оптимизируется).

```tsx
// src/payload/admin/graphics/logo.tsx — login screen, dark logo on light background
import Image from "next/image";

export function AdminLogo() {
  return (
    <Image
      src="/brand/inex-glass-logo-dark.svg"
      alt="Inex Glass"
      width={69}
      height={41}
      unoptimized
      className="iga-logo"
    />
  );
}
```

`AdminIcon` — тот же тёмный логотип, класс `iga-icon`. Размеры задать в `_base.scss`: `.iga-logo { height: 44px; width: auto; }` (минимум для шапки по DESIGN.md), `.iga-icon { height: 22px; width: auto; }`.

```tsx
// src/payload/admin/nav/inex-nav.tsx — stub, task 03 replaces the body (keeps the export name)
import { DefaultNav } from "@payloadcms/next/rsc";
import type { ComponentProps } from "react";

export function InexNav(props: ComponentProps<typeof DefaultNav>) {
  return <DefaultNav {...props} />;
}
```

```tsx
// src/payload/admin/views/dashboard.tsx — stub, task 04 replaces the body (keeps the export name)
import { DefaultDashboard } from "@payloadcms/next/views";
import type { DashboardViewServerProps } from "@payloadcms/next/views";

export function InexDashboard(props: DashboardViewServerProps) {
  return <DefaultDashboard {...props} />;
}
```

Оба — server components (без `"use client"`).

### Шаг 6. `custom.scss`

```scss
// Inex Glass admin theme. Unlayered on purpose: beats Payload's `@layer payload-default`.
// One partial per task (specs/admin-redesign/README.md, «Владение общими файлами»).
// Tailwind is never loaded in the admin (its preflight breaks Payload).
@use "./styles/base";
@use "./styles/screens";
@use "./styles/nav";
@use "./styles/dashboard";
@use "./styles/kanban";
@use "./styles/edit-form";
@use "./styles/lead-card";
@use "./styles/lead-history";
@use "./styles/max";
```

Порядок: общее (`base`, `screens`) раньше специфичного, чтобы правила экранов задач перекрывали общие. Пустые партиалы: `// Владелец: task-03 (волна 2). Стили бокового меню.` и т. п.

### Шаг 7. `_base.scss`: переменные Payload

Только токены `--ig-*` из `ig-vars.css`, новых цветов не придумывать. Значения шкалы — на `:root` (Payload задаёт их в `:root` слоя `payload-default`; незаслойный `:root` выигрывает).

| Переменная Payload | Значение |
|---|---|
| `--theme-elevation-0` | `var(--ig-surface)` |
| `--theme-elevation-50` | `var(--ig-bg)` |
| `--theme-elevation-100` | `var(--ig-well)` |
| `--theme-elevation-150` | `var(--ig-hairline)` |
| `--theme-elevation-200` | `var(--ig-line)` |
| `--theme-elevation-250` | `var(--ig-gray-2)` |
| `--theme-elevation-300` | `var(--ig-gray-1)` |
| `--theme-elevation-350` … `-450` | `var(--ig-text-muted)` |
| `--theme-elevation-500` … `-600` | `var(--ig-text-2)` |
| `--theme-elevation-650`, `-700` | `var(--ig-ink-2)` |
| `--theme-elevation-750` | `var(--ig-ink-3)` |
| `--theme-elevation-800` … `-1000` | `var(--ig-text)` |
| `--theme-bg` | `var(--ig-bg)` |
| `--theme-input-bg` | `var(--ig-surface)` |
| `--theme-text` | `var(--ig-text)` |
| `--theme-success-50`, `-100` | `var(--ig-primary-light)` |
| `--theme-success-150` … `-250` | `var(--ig-line-teal)` |
| `--theme-success-300` … `-450` | `var(--ig-primary)` |
| `--theme-success-500` … `-600` | `var(--ig-btn-primary-bg)` |
| `--theme-success-650` … `-750` | `var(--ig-primary-pressed)` |
| `--theme-success-800` … `-950` | `var(--ig-primary-dark)` |
| `--theme-error-50`, `-100` / `-150` … `-300` / `-350` … `-950` | `var(--ig-danger-bg)` / `var(--ig-danger)` / `var(--ig-danger-text)` |
| `--theme-warning-50`, `-100` / `-150` … `-300` / `-350` … `-950` | `var(--ig-warning-bg)` / `var(--ig-warning)` / `var(--ig-warning-text)` |
| `--font-body` | `var(--ig-font)` |
| `--style-radius-s` / `-m` / `-l` | `var(--ig-r-sm)` / `var(--ig-r-md)` / `var(--ig-r-lg)` |
| `--accessibility-outline` | `2px solid var(--ig-primary)` |

Плюс `color-scheme: light;`, `::selection { background: var(--ig-primary-light); color: var(--ig-text); }`.

Кнопки Payload (основная по умолчанию чёрная — `--theme-elevation-800`): переопределить через их же переменные. Незаслойное правило перебивает и вложенное `.btn--disabled` Payload, поэтому disabled повторить явно:

```scss
.btn--style-primary {
  --color: var(--ig-on-navy);
  --bg-color: var(--ig-btn-primary-bg);
  --hover-bg: var(--ig-btn-primary-bg-hover);
  --hover-color: var(--ig-on-navy);
  &.btn--disabled { --bg-color: var(--ig-well); --color: var(--ig-text-muted); --hover-bg: var(--ig-well); --hover-color: var(--ig-text-muted); }
}
.btn--style-secondary {
  --color: var(--ig-primary-pressed);
  --btn-border: 1px solid var(--ig-primary);
  --hover-color: var(--ig-primary-pressed);
  --hover-btn-border: 1px solid var(--ig-primary-pressed);
  &.btn--disabled { --color: var(--ig-text-muted); --btn-border: 1px solid var(--ig-line); --hover-btn-border: 1px solid var(--ig-line); --hover-color: var(--ig-text-muted); }
}
```

Переменные для задач (стили меню пишет task-03 в `_nav.scss`, здесь только значения):

```scss
:root {
  --iga-nav-bg: var(--ig-navy);
  --iga-nav-text: var(--ig-on-navy);
  --iga-nav-text-2: var(--ig-on-navy-2);
  --iga-nav-active-bg: var(--ig-btn-primary-bg);
  --iga-nav-hover-bg: rgb(255 255 255 / 0.08);
  --iga-nav-divider: rgb(255 255 255 / 0.12);
  --iga-shadow-xs: 0 1px 2px rgb(28 31 34 / 0.05); // карточки макета (rgb из --ig-text)
  --iga-ease: var(--ig-ease);
}
```

### Шаг 8. `_base.scss`: классы `.iga-*`

Имена — контракт README («Каркас (task-02)»); задачи добавляют своё только в свои партиалы. Значения — из макета (`res/admin-mockup/*.dc.html`, блок `<helmet><style>`), цвета — токенами. Допустимы BEM-элементы (`__title`) и перечисленные модификаторы.

| Класс | Стили (макет) |
|---|---|
| `.iga-card` | фон `--ig-surface`, рамка 1px `--ig-hairline`, радиус `--ig-r-lg`, padding 20px 22px, тень `--iga-shadow-xs`, flex-column gap 14px; `> h2` 16px/600, margin 0 |
| `.iga-btn` | inline-flex, center, gap 8, высота 40, padding 0 18, радиус `--ig-r-pill`, шрифт 14/500 inherit, рамка 1px transparent, nowrap, без подчёркивания, svg 16×16; transition `background, border-color, color, transform` `--ig-dur-fast`; `:active { transform: scale(.98) }`; `:disabled, [aria-disabled=true]` — фон `--ig-well`, цвет `--ig-text-muted`, `cursor: not-allowed` |
| `--primary` | фон `--ig-btn-primary-bg`, текст `--ig-on-navy`; hover фон `--ig-btn-primary-bg-hover` |
| `--secondary` | фон `--ig-surface`, текст `--ig-primary-pressed`, рамка `--ig-primary`; hover фон `--ig-primary-light` |
| `--ghost` | фон `--ig-surface`, текст `--ig-text`, рамка `--ig-line`; hover фон `--ig-bg` |
| `--danger` | фон transparent, текст `--ig-danger-text`, без рамки, высота 32, padding 0 4px |
| `--sm` | высота 32, padding 0 12, шрифт 13 |
| `.iga-badge` | inline-flex, gap 6, padding 3px 8px, радиус `--ig-r-sm`, 12px/500, nowrap; по умолчанию `--iga-badge-color: var(--ig-text-2)`, `color: var(--iga-badge-color)`, `background: color-mix(in srgb, var(--iga-badge-color) 12%, var(--ig-surface))` (произвольный цвет статуса задаётся inline-переменной `--iga-badge-color`) |
| `--new` / `--work` / `--kp` / `--ok` / `--no` | `--ig-info-bg`/`--ig-info-text`; `--ig-warning-bg`/`--ig-warning-text`; `--ig-primary-light`/`--ig-primary-dark`; `--ig-success-bg`/`--ig-success-text`; `--ig-danger-bg`/`--ig-danger-text` (явные `background` и `color`) |
| `.iga-tag` | inline-flex, padding 2px 8px, радиус `--ig-r-sm`, 12px, фон `--ig-well`, цвет `--ig-text-2`, nowrap |
| `.iga-chip` | inline-flex, gap 6, высота 36, padding 0 14, pill, рамка `--ig-line`, фон `--ig-surface`, 13px, `--ig-text`, pointer; hover рамка `--ig-primary`; `[aria-pressed=true]` — фон `--ig-primary-light`, рамка `--ig-primary`, цвет `--ig-primary-dark`, 500; вложенный `b` — 600, `--ig-text-2`, tabular-nums |
| `.iga-seg` | inline-flex, gap 4, padding 4, pill, фон `--ig-well`; дочерние `button`/`a`: без рамки, transparent, 13px, padding 6px 14px, pill, `--ig-text-2`; активный (`[aria-pressed=true]`, `[aria-current=page]`, `[aria-selected=true]`) — фон `--ig-surface`, `--ig-text`, 500, тень `--iga-shadow-xs` |
| `.iga-input` | высота 42, рамка `--ig-line`, радиус `--ig-r-md`, padding 0 12, шрифт inherit 14px, фон `--ig-surface`, `--ig-text`, ширина 100%; `:focus` — рамка `--ig-primary`, `box-shadow: var(--ig-focus-ring)`, outline none; `textarea.iga-input` — auto height, min 84, padding 10px 12px, resize vertical, lh 1.5; `[aria-invalid=true]` — рамка `--ig-danger-text`; `::placeholder` — `--ig-text-muted` |
| `.iga-select` | как `.iga-input` (высота 42) + `appearance: auto`, pointer |
| `.iga-field` | flex-column gap 6; `__label` 13px `--ig-text-2`, flex space-between gap 8; `__hint` 12px `--ig-text-2`; `__error` 12px `--ig-danger-text` |
| `.iga-dl` | grid `repeat(auto-fit, minmax(200px, 1fr))`, gap 14px 24px, margin 0; `dt` 13px `--ig-text-2` mb 3; `dd` margin 0, 14px |
| `.iga-bar` | высота 8, pill, фон `--ig-well`, overflow hidden; `> span` block, h 100%, pill, фон `--ig-primary` (ширина — inline `width: N%`) |
| `.iga-page-head` | фон `--ig-surface`, нижняя рамка `--ig-hairline`, padding 14px 32px, flex wrap, align center, gap 16; `__eyebrow` 11px caps, letter-spacing .12em, 500, `--ig-text-2`; `__title` 22px/700, lh 1.2, margin 0; `__actions` margin-left auto, flex gap 12 |
| `.iga-section-head` | flex, baseline, gap 10, wrap; `h2` 18px/600 margin 0; `__sub` 13px `--ig-text-2`; `__action` margin-left auto |
| `.iga-avatar` | 34 × 34, круг, фон `--ig-primary-light`, цвет `--ig-primary-dark`, 13px/600, flex center, flex none; `--sm` — 28 × 28, 11px |

Общие правила в `_base.scss`:
- `@media (max-width: 599px)`: `.iga-btn`, `.iga-chip`, `.iga-input`, `.iga-select` — `min-height: 44px` (касания ≥ 44 px); `.iga-page-head` — padding 12px 16px.
- Фокус: `:focus-visible` для `.iga-btn`, `.iga-chip`, `.iga-seg > *` — `outline: 2px solid var(--ig-primary); outline-offset: 2px`.
- `@media (prefers-reduced-motion: reduce)`: у `.iga-*` убрать `transition` и `transform`.
- Цифры (`.iga-badge`, `.iga-chip b`) — `font-variant-numeric: tabular-nums`. Бесконечных анимаций нет.

### Шаг 9. importMap и проверки

```bash
pnpm generate:importmap   # появятся AdminLogo, AdminIcon, InexNav, InexDashboard; исчезнет ReportsNavLink
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Если `generate:importmap` подхватил компоненты-заглушки task-01 (при работе в общем дереве) — это нормально; в коммит идёт результат генерации на ветке этой задачи.

Скриншоты (playwright-cli или разовый скрипт, файлы — в scratchpad, не коммитить) при 375 / 1366 / 1920: `/admin/login/`, `/admin/` (дашборд-заглушка), `/admin/collections/leads/`, `/admin/collections/pages/<id>/`. Сверить с `res/admin-mockup/*.dc.html` общие черты: шрифт Rubik, фон `#F4F5F3`, белые карточки/поля, бирюзовая основная кнопка, логотип на логине. Меню пока стандартное (светлое) — его делает task-03. Проверить: нет горизонтальной прокрутки на 375, в `/admin/account/` нет переключателя темы, `<title>` заканчивается на « — Inex Glass».

E2E без регрессий (prod-сборка, одноразовая `*_test` БД, `scripts/acceptance/local-stand.sh`): `pnpm test:e2e e2e/admin-leads.spec.ts e2e/acceptance/admin.spec.ts e2e/acceptance/visual.spec.ts`.

## Acceptance Criteria

- [ ] `package.json`: `@dnd-kit/core@6.3.1`, `@dnd-kit/sortable@10.0.0`, `@dnd-kit/utilities@3.2.2` (dependencies) и `sass` (devDependencies) с точными версиями; `pnpm install --frozen-lockfile` проходит.
- [ ] `src/styles/ig-vars.css` содержит все блоки `:root` из `ig-tokens.css` без изменений; CSS сайта после `pnpm build` идентичен прежнему по содержимому; `visual.spec.ts` проходит.
- [ ] Админка: `data-theme="light"` без переключателя, Rubik (`--font-rubik` на `<html>`), title с суффиксом « — Inex Glass», favicon сайта, логотип Inex Glass на экране входа.
- [ ] Переменные Payload переопределены по таблице шага 7; основная кнопка Payload — `#267D70` с hover `#1F6B60`, disabled читаемый; цвета только через `--ig-*`.
- [ ] `custom.scss` содержит только `@use` девяти партиалов; партиалы задач созданы пустыми с комментарием о владельце; `_base.scss` содержит все классы `.iga-*` из шага 8 и переменные `--iga-*`.
- [ ] `components.Nav` → `InexNav`, `views.dashboard` → `InexDashboard` (стандартное меню и дашборд Payload рендерятся как раньше); `afterNavLinks` удалён; `/admin/leads-report/` открывается.
- [ ] `importMap.js` перегенерирован и закоммичен; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` зелёные; e2e из шага 9 проходят.
- [ ] Скриншоты 375 / 1366 / 1920 сделаны и приложены к отчёту; нет горизонтальной прокрутки на 375.

## Notes

- Модель: премиум (тема Payload + проверка, что CSS сайта не изменился).
- Tailwind и классы сайта (`.ig-*` из `ig-components.css`) в админку не подключаются: только переменные `ig-vars.css` и свои `.iga-*`.
- `--iga-nav-*` и `--iga-shadow-xs` — `rgb(…)` от белого и `--ig-text` (полупрозрачные оттенки макета); новых цветов нет.
- Имена экспортов (`InexNav`, `InexDashboard`, `AdminLogo`, `AdminIcon`) и пути — контракт: task-03 и task-04 заменяют тела файлов, не трогая `payload.config.ts`.
- Если задаче волн 2–3 нужен новый общий класс, она пишет его в свой партиал под своим префиксом (`.iga-kanban-*` и т. п.), а не в `_base.scss`.
