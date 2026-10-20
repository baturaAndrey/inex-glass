# Task 04: Переписать DESIGN.md и AGENTS.md под проект Inex Glass

## Status

pending

## Wave

2

## Description

Корневые `DESIGN.md` и `AGENTS.md` — правила, которые читают все следующие агенты. Сейчас они описывают стартер (oklch-токены shadcn, Geist, тёмная тема, правило про Drizzle). Задача заменяет `DESIGN.md` описанием дизайн-системы Inex Glass (токены `--ig-*`, мост в Tailwind v4, брейкпоинты, сетка, компоненты `src/components/ig/*`, правила вёрстки) и обновляет `AGENTS.md`: миграции Payload вместо Drizzle, правило заморозки схемы, актуальные команды тестов. Это документационная задача без кода.

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** все задачи, где агенты читают проектные правила (практически все последующие)

**Context from dependencies:** Задача 01 переводит проект на Next.js 16.4.x + Payload CMS 3.91.x (Postgres, `idType: uuid`), группы маршрутов `src/app/(site)` и `src/app/(payload)`, админка `/admin/`. Скрипты: `pnpm dev`, `build` (без миграций и без БД), `lint`, `typecheck`, `check`, `migrate`, `migrate:create`, `generate:types`, `generate:importmap`, `seed`. Тесты (Vitest + Playwright) добавляет параллельная задача 02: `pnpm test`, `pnpm test:e2e`. Дизайн-систему (токены, шрифт, компоненты) реализует параллельная задача 05 — этот документ описывает её **как целевую**; опираться на исходники: `res/inex-glass-handoff/design-system/{README.md,SKILL.md,colors_and_type.css,components.css}` и `res/inex-glass-handoff/CLAUDE.md`.

## Files to Create

Нет.

## Files to Modify

- `DESIGN.md` — переписать целиком.
- `AGENTS.md` — обновить разделы (см. ниже), остальные сохранить.

Не трогать: `CLAUDE.md` (содержит `@AGENTS.md`), любой другой файл.

## Technical Details

### DESIGN.md — структура и обязательное содержимое (русский)

Заголовок: «Design System — Inex Glass». Начать с пометки: все новые компоненты и страницы **обязаны** следовать документу; источник истины по токенам — `design-system/` в handoff, по копирайту — `res/inex-glass-handoff/teksty/`, по функциональности — ТЗ `docs/inex/16-tz-razrabotka.md`.

Разделы:

1. **Стек**: Next.js 16.4 (App Router) + React 19.2 + TS, Tailwind CSS v4 (CSS-first, `@theme inline`, без `tailwind.config.ts`), shadcn/ui как база примитивов (перекрашен), Lucide (линия 2 px, 20–24 px), шрифт **Rubik 300/400/500/600/700** через `next/font/local` (woff2, subset latin+cyrillic, переменная `--font-rubik`), утилита `cn()` из `@/lib/utils`. **Только светлая тема** (next-themes и `.dark` удалены).
2. **Файлы системы**: `src/styles/ig-tokens.css` (токены `--ig-*`), `src/styles/ig-components.css` (классы `.ig-*`), `src/app/(site)/globals.css` (импорты со слоями: `@import "../../styles/ig-tokens.css" layer(base); @import "../../styles/ig-components.css" layer(components);` — **слои обязательны**: незаслойный CSS в Tailwind v4 перебивает утилиты), `src/app/(site)/fonts.ts`, React-обёртки `src/components/ig/*`, макет страниц `src/components/layout/*`. Общее правило: `.ig-*` классы остаются в CSS, React-обёртки типизируют пропсы и состояния (через aria-атрибуты), CSS страниц прототипов (`ct-`, `p5-`, `th-`, `qz-`, `ob-`, `od-`, `wc-`, `ar-`, `pg-`) переписывается на Tailwind внутри компонентов.
3. **Цвета** (таблицы токенов с HEX): бренд (`--ig-primary #2B8C7E`, hover `#267D70`, pressed/ссылки `#1F6B60`, dark `#16403D`, light `#EAF3F1`, navy `#324B64`, on-navy `#FFFFFF`/`#C9D3DD`), нейтральные (bg `#F4F5F3`, surface `#FFFFFF`, well `#ECEEEC`, line `#D9DCDE`, hairline `#E6E8E6`, text `#1C1F22`, text-2 `#5B636B`, muted `#9AA1A8` — только плейсхолдеры/disabled), семантика (tone/bg/text для success, warning, danger, info — значения из `colors_and_type.css`), логотипные цвета (#EF7F1A, #0081AF — **только логотип**). **Принятые правки контраста**: основная кнопка `--ig-btn-primary-bg #267D70` / hover `--ig-btn-primary-bg-hover #1F6B60`; `--ig-success-text #237A35`. Дополнительные цвета прототипов, вынесенные в токены: `#EEF2F0`, `#3E464D`, `#2A2F34`, `#CFE3DF`, `#AEB4BA`, `#BFC4C8`, `#DCEBE8`, `#9FB0C2`. Фокус: рамка primary + кольцо `0 0 0 3px rgba(43,140,126,.2)`.
4. **Мост в Tailwind** (`@theme inline`): цвета `primary` (= кнопочный, доступный по контрасту) / `primary-hover` / `primary-pressed` / `primary-dark` / `primary-light` / `brand` (= `--ig-primary`) / `navy` / `bg` / `surface` / `well` / `line` / `hairline` / `text` / `text-2` / `muted` / `success|warning|danger|info` (+`-bg`, `-text`), радиусы `sm 6 / md 10 / lg 16 / xl 24` (+ `rounded-full` для кнопок), тени `card / card-hover / dropdown / modal`, `--ease-ig: cubic-bezier(.4,0,.2,1)`, длительности 120/200/320 мс, размеры текста `h1…h6, body, small, micro, price-l/m/s, stat` (отдельные переменные размера и line-height, на ≤599 px значения меняются). Токены shadcn (`--primary`, `--border`, `--ring`, `--background`, …) переназначены на `--ig-*`; `.dark`, `chart-*`, `sidebar-*` удалены.
5. **Типографика**: шкала desktop/mobile (H1 54/1.1 → 32/1.15 на ≤599; H2 40 → 28; H3 32 → 22; H4 24 → 20; H5 18; H6 16; body 16/1.5; small 14/1.45; micro 12/1.4; цена 30/22/16 (моб. 24/20/16); stat 48 (моб. 36)). КАПС — только H1 первого экрана главной и метки до 3 слов. Веса: 700 заголовки, 600 H4–H6, 500 кнопки/метки, 400 текст.
6. **Брейкпоинты** (в `@theme`, заменяют дефолтные Tailwind):
   ```css
   @theme { --breakpoint-*: initial; --breakpoint-sm: 600px; --breakpoint-md: 1101px;
            --breakpoint-lg: 1366px; --breakpoint-xl: 1536px; --breakpoint-2xl: 1920px; }
   ```
   Смысл: `max-sm:` = ≤599 (телефон), `max-md:` = ≤1100 (планшет и меньше), `max-lg:` = ≤1365. Таблица поведения: ≤599 — 2 колонки карточек, sticky-CTA; ≤1100 — гамбургер, CTA иконкой, фильтры в дровере; 1100–1365 — строка разделов «5 + Ещё ▾»; ≥1366 — 4 колонки.
7. **Сетка**: токен `--ig-gutter` = 70 px (≥1366) / 40 px (1101–1365) / 24 px (600–1100) / 16 px (≤599); фон секции на всю ширину до 1920 px; контент — `Container` (`mx-auto w-full max-w-[1920px] px-(--ig-gutter)`). Контейнер 1440 из исходного README дизайн-системы **не используется**. Ритм секций `.blk`: вертикальные отступы 96 / 72 / 48 px (desktop / ≤1100 / ≤599), чередование фонов `bg` ↔ `surface`; тёмные только подвал (`navy`) и акцентные блоки (`primary-dark`, например «Расчёт под снег»).
8. **Пространство, радиусы, тени, движение**: база 4 px (4/8/12/16/20/24/32/40/48/64/80/120); radius sm 6 (чипсы, бейджи), md 10 (инпуты), lg 16 (карточки, модалки), xl 24 (hero, плашки), pill (кнопки); тени только токенами; движение 120/200/320 мс `--ease-ig`, наведение на карточку `translateY(-2px)` + `card-hover`, нажатие `scale(.98)`, блик на primary-кнопке — один проход; **бесконечных анимаций нет**.
9. **Компоненты** (таблица «компонент → файл → CSS-класс → задача»):
   - Каркас (задача 05): `Container`, `Section` (варианты `bg|sf|dark|primary-dark`, `SectionHead`), `PageHero` (`ct-hero | p5-top | home`), `Button` (`primary|secondary|ghost|onDark`, размеры `l|m|s|icon`, `asChild`, `block`), `TextLink` (`.ig-link`, `--arrow`, `--dashed`). Каталог `/ui-kit/` (только не-production).
   - Формы (задача 12): `Field`, `Input`, `Textarea`, `Select`, `ConsentCheckbox`, `Chip`, `ChipGroup`, `RadioCard`, `FileUpload` (состояния empty/drag/done/fmt/size), `PhoneInput`, `DatePicker`.
   - Контент (задача 13): `Badge`, `Breadcrumbs`, `DataTable` (≤599 → `.ig-mcard`), `Compare` (≤599 → `.ig-pair`), `Terms`, `Callout`, `Steps`, `StatsTiles`, `Timeline`, `Accordion`/`Faq`, `Card`, `ThickCard`, `Placeholder` (`.ig-ph`), `CookieBanner`, `StickyCta`, `Lightbox`, `Drawer`.
   - Правила компонентов: `className` через `cn()`, состояния через `aria-*`/`data-*`, никаких inline-стилей с цветами, `forwardRef` где нужен ref.
10. **Правила продукта (из handoff)**: главное действие «Рассчитать стоимость» (primary, иконка `calculator`) на первом экране **каждой** страницы; второе — «Отправить чертёж» (secondary, `file-text`); на ≤599 — закреплённая кнопка `.ig-sticky-cta`; под первым экраном и перед формами — полоса условий `.ig-terms` (4 пункта); таблицы на ≤599 → карточки, сравнение → пары; frosted glass **только** `.ig-stats--glass` в hero главной; нет корзины, избранного, личного кабинета, бейджей «Хит/Новинка», эмодзи; иконки Lucide (`calculator`, `file-text`, `clipboard-list` «Мой расчёт», `upload`, `triangle-alert`, `info`); логотип: тёмный на светлом, светлый на navy, мин. высота 30 px (моб.) / 44 px (шапка); изображения до фото — `.ig-ph`; цены «от 1 400 ₽/м²» с неразрывным пробелом (U+00A0) и подписью «ориентировочная цена на ДД.ММ.ГГГГ»; размеры «3000 × 2000 мм»; тексты дословно из `teksty/`, отсутствующий текст — заглушка `[…]`.
11. **Доступность**: контраст ≥ AA, видимый фокус (`outline` primary), `aria-live` для результатов калькуляторов, `prefers-reduced-motion` отключает блик и подъём карточки, alt у каждого изображения.
12. **Изображения и шрифты**: `next/image` с относительным `src`, форматы AVIF/WebP, `sizes` обязательны, hero — `priority`; временные изображения (`isPlaceholder`) заменяются реальными.
13. **Что нельзя**: возвращать `next-themes`/`.dark`, подключать Google Fonts на рантайме, добавлять цвета вне токенов, использовать оранжевый/голубой логотипа в интерфейсе.

### AGENTS.md — что изменить

Сохранить структуру и формулировки разделов **RESPONSES**, **PLANNING MODE**, **CHANGE / EDIT MODE**, **UI DESIGN** (ссылка `@DESIGN.md`). Изменения:

- Раздел **DATABASE SCHEMA CHANGES** заменить на:
  - Схема описывается в Payload (коллекции/globals/блоки в `src/payload/**`), БД — Postgres с `idType: 'uuid'`.
  - Изменения схемы фиксируются **миграциями Payload**: `pnpm migrate:create <имя>` (в dev), в production миграции применяются при старте через `prodMigrations` (`src/migrations/index.ts`). `pnpm migrate` — для ручного применения локально.
  - **Никогда** не использовать Payload/Drizzle `push` на общей БД (dev/staging/prod); `PAYLOAD_DB_PUSH=true` допустим только на личной одноразовой локальной БД.
  - После изменения схемы всегда: `pnpm generate:types`, `pnpm generate:importmap`.
  - Миграции только expand/contract: сначала добавляем, удаляем в следующем релизе (откат образа не откатывает схему).
  - Все ID не-BetterAuth — UUID (обеспечивается `idType: 'uuid'`). Слаги коллекций/globals — kebab-case.
  - **Правило заморозки схемы:** схема определяется в Wave 2 (задачи 06–08) и замораживается задачей 10 (миграция `content_schema`, `payload-types.ts`, `importMap.js`). Позже схему не меняют; если поля не хватает — агент останавливается и сообщает координатору (он делает отдельную схемную задачу с миграцией). Исключения со своей миграцией: задача 18 (очередь Payload Jobs, все slug заданий) и задача 35 (поиск). Генерируемые файлы (`payload-types.ts`, `importMap.js`, `migrations/index.ts`) в волне коммитит только задача-владелец из README спека; остальные запускают генераторы локально.
  - Упоминания Drizzle/`drizzle generate`/`drizzle push` удалить полностью.
- Раздел **TESTING**: заменить на актуальные инструменты — Vitest (`pnpm test`, доменная логика в `src/lib/domain`, проекты `unit` и `dom`), Playwright (`pnpm test:e2e`, проекты 375/1366/1920), `pnpm lint`, `pnpm typecheck`, `pnpm build`. «Никогда не предполагай, что изменения работают — проверяй»; для UI — скриншоты на 375 / 1366 / 1920 и сверка с прототипом; вопрос «пропустить ли тесты» убрать (инструменты есть).
- В **CHANGE / EDIT MODE**: после «lint, type check и next build» добавить `pnpm test`; добавить правило «агент правит только файлы своей задачи; общие реестры (`src/payload/**/index.ts`, `payload.config.ts`, `package.json`, `pnpm-lock.yaml`) — только если это явно разрешено задачей; точки расширения (реестры, файлы-заглушки) меняются только их владельцем по таблице «Владение общими файлами» в README спека».
- Добавить правило: id вариантов квиза (`QUIZ_TYPES`, `QUIZ_KINDS` и т. д. из `src/lib/domain/quiz-schema.ts`) — единый словарь для схемы, URL и заявок; маппингов между словарями не заводить.
- Добавить короткий раздел **PROJECT FACTS**: сайт — B2B-комплектатор закалённого стекла Inex Glass (inexglass.ru), монтаж и собственное производство не заявляем; язык интерфейса и контента — русский (код, идентификаторы, пути — английские); тексты берутся дословно из `res/inex-glass-handoff/teksty/`, H1/title/description — из `docs/inex/17-meta.md`; значения справочников (цены, акция, условия, контакты) — только из CMS/globals, не хардкодить; запрещённые формулировки — `docs/inex/16-tz-razrabotka.md` §11; ссылки на `/admin` — обычный `<a>`; cacheComponents выключен, данные читаются через Local API + `unstable_cache` с тегами.
- Раздел **PLANNING MODE** оставить без изменений.

Стиль: русский, коротко, списками; AGENTS.md — императивные «правила», без воды.

## Acceptance Criteria

- [ ] `DESIGN.md` не содержит упоминаний Geist, oklch-палитры стартера, `next-themes`, `.dark`, `chart-*`, `sidebar-*` (кроме явного «удалены»), «neutral base» стартера.
- [ ] В `DESIGN.md` присутствуют все 13 разделов; все HEX значения сверены с `res/inex-glass-handoff/design-system/colors_and_type.css` и принятыми правками (#267D70, #1F6B60, #237A35); брейкпоинты и поля 70/40/24/16 совпадают с брифом.
- [ ] Перечень компонентов совпадает с задачами 05, 12, 13 (имена файлов `src/components/ig/*`).
- [ ] В `AGENTS.md` нет упоминаний Drizzle; есть правило про миграции Payload, запрет `push` на общей БД, UUID, заморозку схемы, команды `pnpm migrate:create|generate:types|generate:importmap|test|test:e2e`.
- [ ] `CLAUDE.md` не изменён и по-прежнему ссылается на `AGENTS.md`; прочие файлы не изменены (`git status` показывает только `DESIGN.md` и `AGENTS.md`).
- [ ] Документы читаются как самодостаточные инструкции для агента (проверить, что ссылки на пути существуют или явно помечены как создаваемые задачами 05/12/13).

## Notes

- Модель: средняя (документация), без глубокого кодинга.
- Никакого кода не писать. Не придумывать значений токенов — брать из исходных CSS.
- Если в процессе обнаружатся расхождения между `design-system/README.md` и `CLAUDE.md` handoff — приоритет у решений из этого описания (сетка 70 px, кнопка #267D70, success-text #237A35).
