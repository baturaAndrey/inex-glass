# Design System — Inex Glass

Все новые компоненты и страницы **обязаны** следовать этому документу.

Источники истины:
- токены и компоненты — `res/inex-glass-handoff/design-system/` (`colors_and_type.css`, `components.css`, `README.md`, `SKILL.md`), с принятыми правками из этого документа;
- копирайт — `res/inex-glass-handoff/teksty/`;
- функциональность — ТЗ `docs/inex/16-tz-razrabotka.md`;
- вёрстка страниц — прототипы `res/inex-glass-handoff/prototypes/`.

При расхождении `design-system/README.md` или `res/inex-glass-handoff/CLAUDE.md` с этим документом приоритет у этого документа (сетка 70 px, кнопка `#267D70`, success-text `#237A35`).

Файлы, помеченные «создаёт задача NN», реализуются задачами спека `specs/inex-glass-site/` и могут отсутствовать, пока задача не выполнена. Этот документ описывает их как целевое состояние.

---

## 1. Стек

- Next.js 16.4 (App Router) + React 19.2 + TypeScript.
- Tailwind CSS v4: CSS-first, `@theme inline` в CSS, **без** `tailwind.config.ts`.
- shadcn/ui — база примитивов, перекрашена под токены `--ig-*`.
- Иконки: Lucide React, линия 2 px, размер 20–24 px (16–18 px внутри кнопок и полей).
- Шрифт: **Rubik 300/400/500/600/700** через `next/font/local` (woff2, subset latin + cyrillic), CSS-переменная `--font-rubik`.
- Утилита `cn()` из `@/lib/utils`.
- **Только светлая тема.** `next-themes` и класс `.dark` удалены.

## 2. Файлы системы

| Файл | Назначение |
|---|---|
| `src/styles/ig-tokens.css` | токены `--ig-*` (создаёт задача 05) |
| `src/styles/ig-components.css` | классы `.ig-*` из `components.css` handoff (создаёт задача 05) |
| `src/app/(site)/globals.css` | Tailwind, `@theme inline`, импорты со слоями |
| `src/app/(site)/fonts.ts` | Rubik через `next/font/local` |
| `src/app/(site)/ui-kit/page.tsx` | каталог компонентов (создаёт задача 05) |
| `src/components/ig/*` | React-обёртки над `.ig-*` (каркас — задача 05, формы — 12, контент — 13) |
| `src/components/layout/*` | макет страниц: шапка, подвал и т. п. (создаёт задача 14) |

Импорты в `globals.css` — **строго со слоями**:

```css
@import "../../styles/ig-tokens.css" layer(base);
@import "../../styles/ig-components.css" layer(components);
```

Незаслойный CSS в Tailwind v4 перебивает утилиты. Слои обязательны.

Правила:
- `.ig-*` классы остаются в CSS; React-обёртки типизируют пропсы и состояния (через `aria-*`).
- CSS страниц прототипов (префиксы `ct-`, `p5-`, `th-`, `qz-`, `ob-`, `od-`, `wc-`, `ar-`, `pg-`) переписывается на Tailwind внутри компонентов. В глобальный CSS его не переносить.
- Демо-панели прототипов на сайт не переносятся.
- Каталог компонентов `/ui-kit/` существует только вне production (`SITE_ENV !== 'production'`, иначе `notFound()`).

## 3. Цвета

Значения — из `colors_and_type.css` с принятыми правками. Не придумывать новых.

### Бренд

| Токен | HEX | Применение |
|---|---|---|
| `--ig-primary` | `#2B8C7E` | бренд, иконки, рамки, фокус (не фон основной кнопки) |
| `--ig-primary-hover` | `#267D70` | hover бренд-элементов |
| `--ig-primary-pressed` | `#1F6B60` | pressed, цвет текстовых ссылок |
| `--ig-primary-dark` | `#16403D` | акцентные тёмные блоки |
| `--ig-primary-light` | `#EAF3F1` | светлые плашки, hover фона |
| `--ig-navy` | `#324B64` | подвал, тёмные блоки |
| `--ig-on-navy` | `#FFFFFF` | текст на navy |
| `--ig-on-navy-2` | `#C9D3DD` | вторичный текст на navy |
| `--ig-logo-orange` | `#EF7F1A` | **только логотип** |
| `--ig-logo-blue` | `#0081AF` | **только логотип** |

**Принятые правки контраста (AA):**
- основная кнопка: `--ig-btn-primary-bg #267D70`, hover `--ig-btn-primary-bg-hover #1F6B60` (в Tailwind — `primary` / `primary-hover`);
- `--ig-success-text #237A35` (в исходнике `#2B8A3E`).

### Нейтральные

| Токен | HEX | Применение |
|---|---|---|
| `--ig-bg` | `#F4F5F3` | фон страницы |
| `--ig-surface` | `#FFFFFF` | карточки, чередующиеся секции |
| `--ig-well` | `#ECEEEC` | утопленные области, плейсхолдеры |
| `--ig-line` | `#D9DCDE` | рамки |
| `--ig-hairline` | `#E6E8E6` | тонкие разделители |
| `--ig-text` | `#1C1F22` | основной текст |
| `--ig-text-2` | `#5B636B` | вторичный текст |
| `--ig-text-muted` | `#9AA1A8` | **только** плейсхолдеры и disabled |

### Семантика

`tone` — рамки, точки, иконки; `bg` — заливка плашек; `text` — текст.

| Статус | tone | bg | text |
|---|---|---|---|
| success | `#A8DAB4` | `#EEF8F0` | `#237A35` (правка) |
| warning | `#F2D59C` | `#FCF6EA` | `#8A5A00` |
| danger | `#EAADAD` | `#FCEFEF` | `#B23B3B` |
| info | `#AECAE6` | `#EEF4FA` | `#2C5B86` |

### Дополнительные цвета прототипов (вынесены в токены)

`#EEF2F0`, `#3E464D`, `#2A2F34`, `#CFE3DF`, `#AEB4BA`, `#BFC4C8`, `#DCEBE8`, `#9FB0C2`. Имена токенов задаёт задача 05 в `ig-tokens.css`; использовать только через токены.

### Фокус

Рамка `--ig-primary` + кольцо `--ig-focus-ring: 0 0 0 3px rgba(43, 140, 126, .2)`.

## 4. Мост в Tailwind (`@theme inline`)

Токены `--ig-*` пробрасываются в Tailwind через `@theme inline`.

- **Цвета:** `primary` (= `--ig-btn-primary-bg #267D70`, заливка основной кнопки, доступна по контрасту), `primary-hover` (= `--ig-btn-primary-bg-hover #1F6B60`), `primary-pressed` (= `--ig-primary-pressed`), `primary-dark`, `primary-light`, `brand` (= `--ig-primary #2B8C7E`: рамки, иконки, фокус), `navy`, `on-navy`, `on-navy-2`, `bg`, `surface`, `well`, `line`, `hairline`, `text`, `text-2`, `muted` (= `--ig-text-muted`, **цвет текста плейсхолдеров и disabled**, а не поверхность shadcn), `tint-green`, `ink-2`, `ink-3`, `line-teal`, `gray-1`, `gray-2`, `teal-wash`, `slate-blue`, `success|warning|danger|info` (+ `-bg`, `-text`). Примеры: `bg-surface`, `text-text-2`, `border-line`, `bg-primary-light`.
- **Радиусы:** `rounded-sm` 6, `rounded-md` 10, `rounded-lg` 16, `rounded-xl` 24, `rounded-full` для кнопок.
- **Тени:** `card`, `card-hover`, `dropdown`, `modal`.
- **Движение:** `--ease-ig: cubic-bezier(.4, 0, .2, 1)` (в `ig-tokens.css` — `--ig-ease`); длительности `--duration-fast|base|slow` = 120 / 200 / 320 мс.
- **Сетка:** утилита `px-gutter` (см. раздел 7).
- **Размеры текста:** `h1…h6`, `body`, `small`, `micro`, `price-l/m/s`, `stat` — отдельные переменные размера и line-height; на ≤599 px значения меняются.
- Токены shadcn (`--primary` = `--ig-btn-primary-bg`, `--border`, `--ring` = `--ig-primary`, `--background`, …) переназначены на `--ig-*`; `--muted`/`--muted-foreground` shadcn — `well`/`text-2`, но Tailwind-цвет `muted` — это `--ig-text-muted`. Токены `.dark`, `chart-*`, `sidebar-*` удалены.

## 5. Типографика

| Стиль | Desktop | ≤599 px | Вес |
|---|---|---|---|
| H1 | 54 / 1.1 | 32 / 1.15 | 700 |
| H2 | 40 / 1.15 | 28 / 1.2 | 700 |
| H3 | 32 / 1.2 | 22 / 1.25 | 700 |
| H4 | 24 / 1.3 | 20 / 1.3 | 600 |
| H5 | 18 / 1.4 | то же | 600 |
| H6 | 16 / 1.4 | то же | 600 |
| body | 16 / 1.5 | то же | 400 |
| small | 14 / 1.45 | то же | 400 |
| micro | 12 / 1.4 | то же | 500 |
| цена L / M / S | 30 / 22 / 16 | 24 / 20 / 16 | 700 |
| stat | 48 / 1 | 36 / 1 | 700 |

- КАПС — только H1 первого экрана главной и метки до 3 слов (`.ig-label`, `.ig-h1--caps`).
- Веса: 700 заголовки H1–H3, 600 H4–H6, 500 кнопки и метки, 400 текст.
- Цены и статистика: `tabular-nums`.

## 6. Брейкпоинты

Заменяют дефолтные Tailwind (в `@theme`):

```css
@theme {
  --breakpoint-*: initial;
  --breakpoint-sm: 600px;
  --breakpoint-md: 1101px;
  --breakpoint-lg: 1366px;
  --breakpoint-xl: 1536px;
  --breakpoint-2xl: 1920px;
}
```

Смысл: `max-sm:` = ≤599 (телефон), `max-md:` = ≤1100 (планшет и меньше), `max-lg:` = ≤1365.

| Диапазон | Поведение |
|---|---|
| ≤599 | 2 колонки карточек, sticky-CTA, таблицы → карточки |
| ≤1100 | гамбургер, CTA иконкой, фильтры в дровере |
| 1100–1365 | строка разделов «5 + Ещё ▾» |
| ≥1366 | 4 колонки карточек |

Проверочные ширины для скриншотов: 375, 1366, 1920.

## 7. Сетка

Токен `--ig-gutter` (боковое поле):

| Ширина | Поле |
|---|---|
| ≥1366 | 70 px |
| 1101–1365 | 40 px |
| 600–1100 | 24 px |
| ≤599 | 16 px |

- Фон секции — на всю ширину, максимум до 1920 px.
- Контент — `Container`: `mx-auto w-full max-w-[1920px] px-(--ig-gutter)`. Только боковое поле без ограничения ширины — утилита `px-gutter` (`padding-inline: var(--ig-gutter)`, `@utility` в `globals.css`).
- Контейнер 1440 px из исходного README дизайн-системы (`--ig-container`) **не используется**.
- Ритм секций (`Section`, утилиты `py-24 max-md:py-[72px] max-sm:py-12`): вертикальные отступы 96 / 72 / 48 px (desktop / ≤1100 / ≤599); фоны чередуются `bg` ↔ `surface`.
- Тёмные блоки: только подвал (`navy`) и акцентные (`primary-dark`, например «Расчёт под снег»).

## 8. Пространство, радиусы, тени, движение

- **Пространство:** база 4 px — 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 120.
- **Радиусы:** sm 6 (чипсы, бейджи), md 10 (инпуты), lg 16 (карточки, модалки), xl 24 (hero, плашки), pill (кнопки).
- **Тени:** только токенами `card`, `card-hover`, `dropdown`, `modal`.
- **Движение:** 120 / 200 / 320 мс, `--ease-ig` (`--ig-ease`).
  - наведение на карточку: `translateY(-2px)` + `card-hover`;
  - нажатие: `scale(.98)`;
  - блик на primary-кнопке — один проход;
  - **бесконечных анимаций нет.**

## 9. Компоненты

React-обёртки лежат в `src/components/ig/`. Файлы создаются указанными задачами.

### Каркас (задача 05)

| Компонент | Файл | CSS-класс | Примечания |
|---|---|---|---|
| `Container` | `container.tsx` | — (утилиты Tailwind; в `ig-tokens.css` есть и `.ig-container`) | проп `as`: `div\|section\|header\|footer\|nav\|article\|aside`; поля по `--ig-gutter` |
| `Section`, `SectionHead` | `section.tsx` | — (утилиты Tailwind) | `Section`: `variant` `bg\|sf\|dark\|primary-dark`, `as` `section\|div`, `contained`, `containerClassName`; `SectionHead`: `title`, `sub`, `action`, `headingId` |
| `PageHero` (+ `PageHeroTerm`, `PageHeroStat`) | `page-hero.tsx` | `.ig-terms`, `.ig-stats--glass` | `variant`: `ct-hero\|p5-top\|home` (обязателен); `title`, `titleId`, `breadcrumbs`, `eyebrow`, `lead`, `facts`, `strong`, `actions`, `terms`, `aside`, `media`, `stats` |
| `Button` (+ `buttonVariants`) | `button.tsx` | `.ig-btn` | `variant`: `primary\|secondary\|ghost\|onDark`; `size`: `l\|m\|s\|icon` (для `icon` обязателен `aria-label`); `asChild`, `block`, `loading`, `leftIcon`, `rightIcon` |
| `TextLink` | `text-link.tsx` | `.ig-link` | `variant`: `default\|arrow\|dashed` (классы `--arrow`, `--dashed`); `external` |

### Формы (задача 12)

| Компонент | Файл | CSS-класс |
|---|---|---|
| `Field` | `field.tsx` | `.ig-field` |
| `Input` | `input.tsx` | `.ig-input` |
| `Textarea` | `textarea.tsx` | `.ig-textarea` |
| `Select` | `select.tsx` | `.ig-select` |
| `ConsentCheckbox` | `consent-checkbox.tsx` | `.ig-check` |
| `Chip`, `ChipGroup` | `chip.tsx`, `chip-group.tsx` | `.ig-chip`, `.ig-chips` |
| `RadioCard`, `RadioCardGroup` | `radio-card.tsx` | `.ig-radio-card` |
| `FileUpload` (empty / drag / done / fmt / size) | `file-upload.tsx` | `.ig-upload`, `.ig-file` |
| `PhoneInput` | `phone-input.tsx` | `.ig-input` |
| `DatePicker` | `date-picker.tsx` | `.ig-input` |

### Контент (задача 13)

| Компонент | Файл | CSS-класс |
|---|---|---|
| `Badge` | `badge.tsx` | `.ig-badge` |
| `Breadcrumbs` | `breadcrumbs.tsx` | `.ig-crumbs` |
| `DataTable` (≤599 → карточки) | `data-table.tsx` | `.ig-table`, `.ig-mcard` |
| `Compare` (≤599 → пары) | `compare.tsx` | `.ig-compare`, `.ig-pair` |
| `Terms` | `terms.tsx` | `.ig-terms` |
| `Callout` | `callout.tsx` | `.ig-callout` |
| `Steps` | `steps.tsx` | `.ig-steps`, `.ig-step` |
| `StatsTiles` | `stats-tiles.tsx` | `.ig-stats`, `.ig-stat` |
| `Timeline` | `timeline.tsx` | `.ig-tl` |
| `Accordion`, `Faq` | `accordion.tsx`, `faq.tsx` | `.ig-acc` |
| `Card` | `card.tsx` | `.ig-card` |
| `ThickCard` | `thick-card.tsx` | `.ig-thick` |
| `Placeholder` | `placeholder.tsx` | `.ig-ph` |
| `CookieBanner` | `cookie-banner.tsx` | `.ig-cookie` |
| `StickyCta` | `sticky-cta.tsx` | `.ig-sticky-cta` |
| `Lightbox` | `lightbox.tsx` | — |
| `Drawer` | `drawer.tsx` | — |

### Правила компонентов

- `className` мержится через `cn()`; остальные нативные атрибуты пробрасываются.
- Состояния — через `aria-*` / `data-*`; ошибка поля — `aria-invalid` + класс `is-error`.
- Никаких inline-стилей с цветами.
- `forwardRef`, где нужен ref.
- Серверные компоненты по умолчанию; `'use client'` только при состоянии и эффектах.
- Недостающий стиль — Tailwind-классами в компоненте; не править чужие файлы системы без разрешения задачи.

## 10. Правила продукта (из handoff)

- Главное действие «Рассчитать стоимость» (primary, иконка `calculator`) — на первом экране **каждой** страницы. Второе — «Отправить чертёж» (secondary, `file-text`).
- На ≤599 px — закреплённая кнопка `.ig-sticky-cta` (`StickyCta`).
- Под первым экраном и перед формами — полоса условий `.ig-terms` (4 пункта).
- Таблицы на ≤599 → карточки, сравнение → пары.
- Frosted glass — **только** `.ig-stats--glass` в hero главной.
- Нет корзины, избранного, личного кабинета, бейджей «Хит/Новинка», эмодзи.
- Иконки Lucide: `calculator`, `file-text`, `clipboard-list` («Мой расчёт»), `upload`, `triangle-alert`, `info`.
- Логотип: тёмный на светлом, светлый на navy; минимальная высота 30 px (моб.) / 44 px (шапка).
- Изображения до появления фото — `.ig-ph` (`Placeholder`).
- Цены: «от 1 400 ₽/м²» с неразрывным пробелом (U+00A0) и подписью «ориентировочная цена на ДД.ММ.ГГГГ».
- Размеры: «3000 × 2000 мм».
- Тексты — дословно из `res/inex-glass-handoff/teksty/`; отсутствующий текст — заглушка `[…]`, ничего не придумывать.

## 11. Доступность

- Контраст не ниже AA.
- Видимый фокус (`outline`/кольцо primary), не убирать.
- `aria-live` для результатов калькуляторов.
- `prefers-reduced-motion` отключает блик и подъём карточки.
- Alt у каждого изображения (декоративные — `alt=""`).
- Размер касаний на мобильных не меньше 44 px.

## 12. Изображения и шрифты

- `next/image` с относительным `src`; форматы AVIF/WebP.
- `sizes` обязателен; hero-изображение — `preload` (в Next 16 вместо `priority`).
- Временные изображения (`isPlaceholder`) заменяются реальными, когда они поступят.
- Шрифты только локальные (`next/font/local`), без запросов к сторонним хостам в рантайме.

## 13. Что нельзя

- Возвращать `next-themes` или `.dark`.
- Подключать Google Fonts в рантайме.
- Добавлять цвета вне токенов.
- Использовать оранжевый и голубой цвета логотипа в интерфейсе.
- Подключать незаслойный CSS системы (см. раздел 2).
- Использовать контейнер 1440 px.
- Добавлять бесконечные анимации.

## 14. Админка

Админка — Payload 3.91 со своей светлой темой (`admin.theme: 'light'`, Rubik, логотип). Эталон — одобренный макет `res/admin-mockup/*.dc.html` (`Main`, `Leads`, `Lead`, `PageEdit`).

- **Без Tailwind.** Его preflight ломает вёрстку Payload; в админку Tailwind не подключать.
- **Токены общие с сайтом:** `src/styles/ig-vars.css` (вынесенный `:root`). Его импортируют `ig-tokens.css` сайта и `src/app/(payload)/layout.tsx` админки. Цвета — только через `--ig-*`.
- **Стили — SCSS.** `src/app/(payload)/custom.scss` содержит только `@use` партиалов `src/app/(payload)/styles/_*.scss`. Файл не слоёный: он перебивает `@layer payload-default`.

| Партиал              | Назначение                                                          |
| -------------------- | ------------------------------------------------------------------- |
| `_base.scss`         | переменные Payload, `--iga-*` и общие классы `.iga-*`               |
| `_nav.scss`          | боковое меню (navy `#324B64`)                                       |
| `_dashboard.scss`    | дашборд `/admin/`                                                   |
| `_kanban.scss`       | канбан заявок                                                       |
| `_max.scss`          | привязка MAX: кнопка в профиле, панель группы                       |
| `_edit-form.scss`    | форма редактирования документа, SEO-счётчики, «Изменена / Кем»      |
| `_lead-card.scss`    | карточка заявки, вкладка «Сводка»                                   |
| `_lead-history.scss` | комментарии и история заявки                                        |
| `_screens.scss`      | остальные экраны: списки, заказ, глобалы, логин, медиатека, модалки |

**Общие классы `_base.scss`:**

| Класс                                                                                       | Варианты                                                                           |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `.iga-card`                                                                                 | —                                                                                  |
| `.iga-btn`                                                                                  | `--primary`, `--secondary`, `--ghost`, `--danger`, `--sm`                          |
| `.iga-badge`                                                                                | `--new`, `--work`, `--kp`, `--ok`, `--no`; произвольный цвет — `--iga-badge-color` |
| `.iga-tag`, `.iga-input`, `.iga-select`, `.iga-field`, `.iga-dl`, `.iga-bar`, `.iga-avatar` | `.iga-avatar--sm`                                                                  |
| `.iga-chip`                                                                                 | состояние `[aria-pressed="true"]`                                                  |
| `.iga-seg`                                                                                  | сегментированный переключатель, активный — `[aria-pressed="true"]`                 |
| `.iga-page-head`, `.iga-section-head`                                                       | заголовки экрана и секции                                                          |

**Правила:**

- новые компоненты админки используют `.iga-*`; собственные классы — с префиксом экрана (`.iga-kanban*`, `.iga-lead*`, `.iga-max*`) и только в своём партиале;
- никаких inline-цветов и `var(--theme-*)` в `style`; динамический цвет передаётся CSS-переменной (`--iga-badge-color`, `--iga-bar-color`, `--iga-status-color`);
- ссылки — `<a>`, не `next/link`; server components по умолчанию;
- изменения заявок из UI — `PATCH /api/leads/:id/` + `router.refresh()`;
- адаптив проверять на 375 / 1366 / 1920;
- основная кнопка `#267D70`; цвета логотипа — только в логотипе; бесконечных анимаций нет.
