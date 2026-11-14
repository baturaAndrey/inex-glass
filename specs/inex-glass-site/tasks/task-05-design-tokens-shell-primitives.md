# Task 05: Дизайн-токены, шрифт Rubik, каркас страницы и базовые примитивы

## Status

complete

## Wave

2

## Description

Подключаем дизайн-систему Inex Glass к проекту: токены `--ig-*` и классы `.ig-*` из handoff (с принятыми правками контраста), шрифт Rubik через `next/font/local` (woff2), мост токенов в Tailwind v4 (`@theme inline`), брейкпоинты 600 / 1101 / 1366 / 1536 / 1920, переменную сетки `--ig-gutter` (70 / 40 / 24 / 16 px) и перекраску shadcn-токенов. На этом фундаменте делаем каркасные компоненты `Container`, `Section` (+`SectionHead`), `PageHero`, `Button`, `TextLink` и служебную страницу-каталог `/ui-kit/` (не доступна в production). Все остальные UI-задачи (формы, контент, шапка, шаблоны) строятся на результатах этой задачи.

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** task-12-ui-form-primitives.md, task-13-ui-content-primitives.md (и через них шапка/шаблоны/квиз)

**Context from dependencies:** Задача 01 переносит сайт в группу `src/app/(site)/` со своим root layout (`<html lang="ru">`, временно без шрифтов), переносит `src/app/globals.css` в `src/app/(site)/globals.css` без изменений содержимого (в нём пока токены shadcn стартера: oklch, `.dark`, `chart-*`, `sidebar-*`, Geist), удаляет `next-themes`, делает `components.json → tailwind.css = "src/app/(site)/globals.css"`. Остаются shadcn-компоненты `src/components/ui/{badge,button,card,dialog,dropdown-menu,input,label,separator,skeleton,sonner,spinner,textarea}.tsx` (их нужно перекрасить токенами, не переписывая API). Доступны `cn()` в `src/lib/utils.ts`, `lucide-react`, `@radix-ui/react-slot`, `class-variance-authority`, `tw-animate-css`, Tailwind v4 (`@tailwindcss/postcss`). `src/lib/env.ts` экспортирует `getEnv()` (поле `SITE_ENV`: `development|staging|production`). Параллельно работают задачи 02 (владеет `package.json`/lockfile для тестов), 04 (документация), 06–09 — в `package.json` и `pnpm-lock.yaml` эта задача **ничего не меняет** (новые зависимости не добавлять).

## Files to Create

- `src/styles/ig-tokens.css` — копия `res/inex-glass-handoff/design-system/colors_and_type.css` с правками (см. ниже).
- `src/styles/ig-components.css` — копия `res/inex-glass-handoff/design-system/components.css` с правками.
- `Rubik-Regular.woff2`, `Rubik-Medium.woff2`, `Rubik-SemiBold.woff2`, `Rubik-Bold.woff2` — subset latin + cyrillic. (вес 300 не используется — удалён по ревью волны 2)
- `src/app/(site)/fonts.ts` — `next/font/local` (`export const rubik`).
- `scripts/fonts/build-fonts.mjs` — скрипт конвертации TTF → woff2 (запускается вручную, см. ниже).
- `src/components/ig/container.tsx` — `Container`.
- `src/components/ig/section.tsx` — `Section`, `SectionHead`.
- `src/components/ig/page-hero.tsx` — `PageHero`.
- `src/components/ig/button.tsx` — `Button` (+ экспорт `buttonVariants`).
- `src/components/ig/text-link.tsx` — `TextLink`.
- `src/app/(site)/ui-kit/page.tsx` — каталог компонентов (404 в production).
- `public/images/logo/inex-glass-logo-dark.svg`, `inex-glass-logo-light.svg`, `public/images/hero-glass-temp.jpg` — копии из `res/inex-glass-handoff/design-system/assets/` (временный логотип/hero; финальный SVG пришлёт Inex).

## Files to Modify

- `src/app/(site)/globals.css` — переписать целиком (см. ниже).
- `src/app/(site)/layout.tsx` — подключить шрифт (`rubik.variable` на `<html>`), `globals.css`, `lang="ru"`, `<body className="min-h-screen flex flex-col">`; метаданные по умолчанию (title-шаблон `%s | Inex Glass`, `metadataBase` из `SITE_URL`); `<main id="main-content" className="flex-1">`; `<Toaster />`. **Композицию шапки/подвала/cookie/sticky (SiteHeader, SiteFooter, CookieBanner…) не добавлять — это задача 14.**
- `src/components/ui/sonner.tsx`, `button.tsx`, `badge.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx` — минимальная перекраска токенами/радиусами системы (`rounded-lg` у карточек/диалогов = 16 px, `rounded-md` у полей = 10 px), без смены экспортов.
- `components.json` — `tailwind.css` оставить `src/app/(site)/globals.css`, `baseColor` не критичен.

Не трогать: `package.json`, `pnpm-lock.yaml`, `payload.config.ts`, `src/payload/**`, `AGENTS.md`/`DESIGN.md` (задача 04).

## Technical Details

### 1. Шрифт Rubik

Исходники: `res/inex-glass-handoff/fonts/Rubik-{Light,Regular,Medium,SemiBold,Bold}.ttf`. Black/ExtraBold/Italic не используются.

Конвертация без добавления зависимостей в проект: создать временную папку **вне репозитория**, `npm i subset-font`, затем запустить `scripts/fonts/build-fonts.mjs` (скрипт импортирует `subset-font`, читает TTF, оставляет символы: U+0020–007E, U+00A0–00FF, U+0400–04FF, U+0500–052F (на случай), U+2010–2027, U+2030–203A, U+20AC, U+20BD, U+2116, U+2122, U+2190–2193, U+2212, U+00D7, U+2026, `targetFormat: "woff2"`, сохраняет OpenType-фичи `kern`, `liga`). Комментарий в шапке скрипта должен описывать запуск. Результат — 5 файлов в `src/app/fonts/` (ожидаемо ~15–30 КБ каждый). Если `subset-font` недоступен — запасной вариант: `npx ttf2woff2` без сабсета (тогда явно отметить в отчёте — задача 39 доработает).

`src/app/(site)/fonts.ts`:

```ts
import localFont from "next/font/local";

export const rubik = localFont({
  variable: "--font-rubik",
  display: "swap",
  src: [
    { path: "../fonts/Rubik-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Rubik-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Rubik-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Rubik-Bold.woff2", weight: "700", style: "normal" },
  ],
});
```

`--ig-font: var(--font-rubik), system-ui, -apple-system, "Segoe UI", sans-serif;`. Запрещено подключать Google Fonts (`@import url(...)`, `next/font/google`).

### 2. Токены — `src/styles/ig-tokens.css`

Взять `colors_and_type.css` целиком и применить правки:
- Добавить: `--ig-btn-primary-bg: #267D70; --ig-btn-primary-bg-hover: #1F6B60;` (основная кнопка — доступный по контрасту фон; `--ig-primary #2B8C7E` остаётся брендовым для акцентов/рамок/фокуса).
- `--ig-success-text: #237A35` (вместо #2B8A3E).
- Токены дополнительных цветов прототипов: `--ig-tint-green: #EEF2F0; --ig-ink-2: #3E464D; --ig-ink-3: #2A2F34; --ig-line-teal: #CFE3DF; --ig-gray-1: #AEB4BA; --ig-gray-2: #BFC4C8; --ig-teal-wash: #DCEBE8; --ig-slate-blue: #9FB0C2;` (имена можно уточнить по месту использования в CSS прототипов; значения обязательны).
- Сетка: `--ig-gutter: 70px` по умолчанию; `@media (max-width: 1365px) { :root { --ig-gutter: 40px } }`, `@media (max-width: 1100px) { :root { --ig-gutter: 24px } }`, `@media (max-width: 599px) { :root { --ig-gutter: 16px } }`. `--ig-container` (1440) удалить; `--ig-section-max: 1920px` оставить.
- Типографика: разделить на переменные размера и line-height, чтобы мост в Tailwind был возможен: `--ig-h1-size: 54px; --ig-h1-lh: 1.1;` (аналогично h2…h6, body, small, micro, price-l/m/s, stat); шорткаты `--ig-h1: 700 var(--ig-h1-size)/var(--ig-h1-lh) var(--ig-font)` и т. д.; на ≤599 меняются размеры (h1 32/1.15, h2 28/1.2, h3 22/1.25, h4 20/1.3, price-l 24, price-m 20, stat 36).
- Базовые правила `body {…}` и `a {…}` оставить (они попадут в слой `base`). Классы `.ig-h1…`, `.ig-body`, `.ig-label`, `.ig-price-*`, `.ig-stat`, `.ig-muted`, `.ig-section`, `.ig-container` (переписать: `max-width: var(--ig-section-max); margin-inline: auto; padding-inline: var(--ig-gutter)`) оставить.
- `body` шрифт берёт `--ig-font`.

### 3. Компонентные стили — `src/styles/ig-components.css`

Копия `components.css` с правками контраста:
- `.ig-btn--primary { background: var(--ig-btn-primary-bg) }`, `:hover → var(--ig-btn-primary-bg-hover)`, `:active/.is-pressed → var(--ig-primary-pressed)`, `.is-hover → hover`.
- Остальные заливки «белый текст на --ig-primary» (`.ig-chip.is-active`, `.ig-upload.is-drag .ig-upload__icon`, чекбокс `:checked`, радио-метка и т. п.) перевести на `--ig-btn-primary-bg`; рамки/фокус остаются на `--ig-primary`.
- Захардкоженные HEX (`#CFE3DF` и т. п.) заменить токенами из п. 2, где это возможно.
- Правило «бесконечных анимаций нет» и `prefers-reduced-motion`: добавить `@media (prefers-reduced-motion: reduce)` — отключить блик primary-кнопки и подъём карточек.
- Не удалять ни одного класса `.ig-*` (их используют задачи 12, 13).

### 4. globals.css — `src/app/(site)/globals.css`

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "../../styles/ig-tokens.css" layer(base);
@import "../../styles/ig-components.css" layer(components);

@theme {
  --breakpoint-*: initial;
  --breakpoint-sm: 600px;   /* max-sm: = ≤599 */
  --breakpoint-md: 1101px;  /* max-md: = ≤1100 */
  --breakpoint-lg: 1366px;  /* max-lg: = ≤1365 */
  --breakpoint-xl: 1536px;
  --breakpoint-2xl: 1920px;
}

@theme inline {
  --font-sans: var(--ig-font);
  /* цвета */
  --color-primary: var(--ig-btn-primary-bg);          /* доступный по контрасту фон кнопок/акцентов */
  --color-primary-hover: var(--ig-btn-primary-bg-hover);
  --color-primary-pressed: var(--ig-primary-pressed);
  --color-primary-dark: var(--ig-primary-dark);
  --color-primary-light: var(--ig-primary-light);
  --color-brand: var(--ig-primary);                   /* брендовый #2B8C7E: рамки, фокус, иконки */
  --color-navy: var(--ig-navy);
  --color-bg: var(--ig-bg); --color-surface: var(--ig-surface); --color-well: var(--ig-well);
  --color-line: var(--ig-line); --color-hairline: var(--ig-hairline);
  --color-text: var(--ig-text); --color-text-2: var(--ig-text-2); --color-muted: var(--ig-text-muted);
  --color-success: var(--ig-success); --color-success-bg: var(--ig-success-bg); --color-success-text: var(--ig-success-text);
  /* warning, danger, info — по аналогии */
  /* радиусы */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 24px;
  /* тени */
  --shadow-card: var(--ig-shadow-card); --shadow-card-hover: var(--ig-shadow-card-hover);
  --shadow-dropdown: var(--ig-shadow-dropdown); --shadow-modal: var(--ig-shadow-modal);
  /* движение */
  --ease-ig: cubic-bezier(.4, 0, .2, 1);
  --duration-fast: 120ms; --duration-base: 200ms; --duration-slow: 320ms;
  /* типографика: размер + line-height отдельными переменными */
  --text-h1: var(--ig-h1-size); --text-h1--line-height: var(--ig-h1-lh);
  /* h2…h6, body, small, micro, price-l/m/s, stat — аналогично */
}
```

Далее:
- shadcn-переменные переназначить на `--ig-*` в `:root` (`--background: var(--ig-bg)`, `--foreground: var(--ig-text)`, `--card: var(--ig-surface)`, `--card-foreground: var(--ig-text)`, `--popover: var(--ig-surface)`, `--primary: var(--ig-btn-primary-bg)`, `--primary-foreground: #fff`, `--secondary: var(--ig-well)`, `--muted: var(--ig-well)`, `--muted-foreground: var(--ig-text-2)`, `--accent: var(--ig-primary-light)`, `--accent-foreground: var(--ig-text)`, `--destructive: var(--ig-danger-text)`, `--border`/`--input: var(--ig-line)`, `--ring: var(--ig-primary)`, `--radius: 10px`) и связать с `--color-*` shadcn-именами (`--color-background`, `--color-foreground`, `--color-card`, `--color-border`, `--color-input`, `--color-ring`, `--color-destructive`, `--color-accent`, `--color-secondary` …) так, чтобы существующие `ui/*` компоненты продолжали собираться. **Удалить:** `.dark`, `--chart-*`, `--sidebar-*`, `@custom-variant dark`, oklch-палитру, ключевые кадры/утилиты, не используемые системой (анимации `fade-in/fade-up/scale-in` можно оставить как есть, если на них ссылаются компоненты; иначе удалить).
- Утилита сетки: `@utility px-gutter { padding-inline: var(--ig-gutter); }` (либо использовать `px-(--ig-gutter)` в компонентах).
- Глобальный фокус: `:focus-visible { outline: 2px solid var(--ig-primary); outline-offset: 2px }` для элементов без собственного стиля фокуса.
- Не использовать незаслойный пользовательский CSS: всё, кроме `@theme`, — внутри `@layer base|components|utilities`.

### 5. Компоненты (`src/components/ig/*`)

Общее: TypeScript, `"use client"` только где нужны хуки; пропсы расширяют нативные атрибуты; `className` сливается через `cn()`; никаких inline-цветов; иконки Lucide stroke 2 (по умолчанию в `Button` размер иконки 20).

- **`Container`**: `<div className={cn("mx-auto w-full max-w-[1920px] px-(--ig-gutter)", className)}>`, проп `as`.
- **`Section`**: пропсы `variant: "bg" | "sf" | "dark" | "primary-dark"` (по умолчанию `bg`; `bg` → `bg-bg`, `sf` → `bg-surface`, `dark` → `bg-navy text-on-navy`, `primary-dark` → `bg-primary-dark text-white`), `id` (якорь, например `ceny`), `as` (`section|div`), `contained` (по умолчанию true — внутри `Container`), `aria-labelledby`. Вертикальные отступы `.blk`: `py-24 max-md:py-[72px] max-sm:py-12` (96 / 72 / 48 px). Фон на всю ширину; контент ограничивает `Container`.
- **`SectionHead`**: заголовок `h2` (класс `ig-h2` / `.blk__h` размерами из прототипа Home), опциональные `sub` (абзац) и `action` (ссылка справа, `TextLink arrow`), `headingId`; выравнивание как `.blk__head` в Home.
- **`PageHero`**: варианты (источники CSS и разметки — `<helmet><style>` и `<x-dc>` прототипов):
  - `"ct-hero"` — `res/inex-glass-handoff/prototypes/ZakHub.dc.html`, `Thick10.dc.html`, `Osvetl.dc.html`: полоска хлебных крошек сверху (`ct-top`), сетка 2 колонки (левая: H1, `facts`, `strong`, кнопки; правая: `aside` — паспорт толщины / фото), полоса `Terms` под первым экраном;
  - `"p5-top"` — `Holes.dc.html`, `Constr.dc.html`, `Partitions.dc.html`: крошки внутри, H1, `lead`, кнопки, полоса условий;
  - `"home"` — `Home.dc.html` (`.hero`): полноширинное фото (`next/image`, `priority`, `fill`, object-cover) + `hero__fade` градиент, eyebrow-строка, H1 в КАПС (`ig-h1--caps`), lead, `ig-stats--glass` (слот `stats`), строка условий, кнопки.
  Пропсы: `variant`, `breadcrumbs?: ReactNode`, `eyebrow?: ReactNode[]`, `title: ReactNode` (рендерится `<h1>` — **единственный h1 на страницу**), `lead?`, `facts?`, `strong?`, `actions?: ReactNode`, `terms?: ReactNode`, `aside?: ReactNode`, `media?: { src: string; alt: string }` (для `home`), `stats?: ReactNode`, `children`. Все CSS страниц (`ct-*`, `p5-*`, `.hero*`) переписать на Tailwind внутри компонента, адаптив на брейкпоинтах 1365 / 1100 / 599 из прототипов.
- **`Button`**: пропсы `variant: "primary" | "secondary" | "ghost" | "onDark"` (по умолчанию `primary`), `size: "l" | "m" | "s" | "icon"` (по умолчанию `m`), `block`, `asChild` (Radix `Slot`), `loading`, `leftIcon`, `rightIcon`; рендерит классы `.ig-btn ig-btn--{variant} ig-btn--{size}` (`onDark` → `.ig-btn--on-dark`); состояния `disabled` / `aria-disabled`; `type="button"` по умолчанию для `<button>`. Экспорт `buttonVariants(props)` для ссылок-кнопок. Кнопка-иконка требует `aria-label` (проверка в dev через `console.error` либо типами). Основная кнопка использует доступный фон `#267D70`.
- **`TextLink`**: обёртка над `next/link` (внутренние) / `<a>` (внешние, `/admin`, `tel:`, `mailto:`; `rel="noopener noreferrer"` для `target="_blank"`) с классами `.ig-link`, `--arrow` (стрелка Lucide `arrow-right`) и `--dashed`; пропсы `href`, `variant: "default" | "arrow" | "dashed"`, `external`.

### 6. Каталог `/ui-kit/`

`src/app/(site)/ui-kit/page.tsx` (серверный компонент): `if (getEnv().SITE_ENV === "production") notFound();` и `export const metadata = { robots: { index: false, follow: false } }`. Показывает: палитру (все токены с подписями и HEX), шкалу типографики, кнопки (все варианты/размеры, disabled, loading, иконки), `TextLink`, `Section` во всех вариантах, три варианта `PageHero` с тестовым контентом, градиентный `.ig-ph`, примеры сетки с `--ig-gutter`. Страница нужна для визуальной проверки и скриншотов на 375 / 1366 / 1920; в production отдаёт 404 (проверить сборкой с `SITE_ENV=production`).

### 7. Сверка и проверка

- Эталоны CSS — `res/inex-glass-handoff/design-system/*` и `<helmet><style>` прототипов; PNG-референсов в `reference/` нет (там только README.txt) — визуальная сверка по значениям CSS и по прототипам (HTML прототипов без рантайма `support.js` не открывается, брать разметку/CSS).
- Проверить в браузере (Playwright MCP / скриншоты) `/ui-kit/` на 375, 1366, 1920: нет горизонтального скролла, поля 16 / 40 / 70 px, цвета и радиусы совпадают, шрифт Rubik применён (DevTools: `font-family` Rubik, файлы woff2 грузятся с того же origin).
- Контраст: белый текст на `--ig-btn-primary-bg` ≥ 4.5:1 (#267D70 → 4.9:1).

## Acceptance Criteria

- [ ] `src/styles/ig-tokens.css` и `ig-components.css` созданы; в них внесены правки: `--ig-btn-primary-bg #267D70`, hover `#1F6B60`, `--ig-success-text #237A35`, токены доп. цветов, `--ig-gutter` 70/40/24/16, раздельные переменные размера/line-height типографики; ни один класс `.ig-*` не потерян.
- [ ] `globals.css` импортирует оба файла **со слоями** (`layer(base)` / `layer(components)`), содержит `@theme` с брейкпоинтами 600/1101/1366/1536/1920 и `@theme inline` мост (цвета, радиусы 6/10/16/24, тени, `--ease-ig`, длительности 120/200/320, размеры текста); `.dark`, `chart-*`, `sidebar-*` удалены; shadcn-токены переназначены на `--ig-*`.
- [ ] Утилиты Tailwind перебивают `.ig-*` (проверка: `<button class="ig-btn ig-btn--primary bg-red-500">` красный), т. е. слои работают.
- [ ] Rubik 300/400/500/600/700 подключён через `next/font/local` (woff2 subset latin+cyrillic в `src/app/fonts/`), `display: swap`, Google Fonts нет; `lang="ru"`.
- [ ] Компоненты `Container`, `Section` (4 варианта, `SectionHead`, отступы 96/72/48), `PageHero` (3 варианта), `Button` (4 варианта × 4 размера, `asChild`, `block`, `loading`), `TextLink` созданы, типизированы и используют только токены.
- [ ] `/ui-kit/` показывает все компоненты и палитру; при `SITE_ENV=production` отвечает 404; на 375 / 1366 / 1920 нет горизонтального скролла.
- [ ] Существующие `src/components/ui/*` собираются и выглядят согласованно (радиусы, цвета), экспорты не изменены.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` проходят; `package.json` и `pnpm-lock.yaml` не изменены.
- [ ] Визуальная проверка `/ui-kit/` на 375 / 1366 / 1920 выполнена, скриншоты приложены к отчёту (можно `e2e`-скриншоты не коммитить).

## Notes

- Модель: премиальная (кодинг, вёрстка).
- Открытый вопрос handoff №1 (подпись у «21 год») и №4 (cookie) решаются в других задачах; здесь не затрагиваются.
- Цветовой токен `primary` в Tailwind = доступный фон кнопки (`#267D70`), а брендовый `#2B8C7E` доступен как `brand` — небольшое отступление от формулировки брифа (`--color-primary: var(--ig-primary)`), чтобы shadcn-компоненты автоматически получали контрастный цвет. Зафиксировать в отчёте.
- Страницы шапки/подвала, формы и контент-компоненты (`Field`, `DataTable`, `Faq`, `Breadcrumbs` …) НЕ входят в задачу — не создавать (задачи 12, 13, 14).
- Внимание на конфликты имён: Tailwind-цвет `bg` и утилита `bg-bg`; проверять, что `text-text` / `bg-bg` корректно резолвятся.
