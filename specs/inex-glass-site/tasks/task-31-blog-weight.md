# Task 31: Блог, 6 статей и калькулятор веса стекла

## Status

complete

## Wave

5

## Description

Вертикальный срез информационного входа в коммерцию: листинг `/blog/` с пагинацией `/blog/page/N/`, шаблон статьи `/blog/[slug]/` (узкая колонка, sticky-«Содержание», карточка CTA, «Читать также», JSON-LD `Article`), seed шести статей и страница-инструмент `/instrumenty/kalkulyator-vesa-stekla/` с интерактивным калькулятором веса (одинарное стекло и триплекс) и переходом в квиз с переданными параметрами. Задача заменяет блок-заглушку калькулятора веса, создаёт seed и e2e.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md, task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-19-metrika-analytics.md
**Blocks:** task-36-sitemap-robots-indexnow.md, task-40-content-audit.md

**Context from dependencies:**
- **task-10:** схема заморожена. `articles`: slug, `lead` («Коротко»), `body` (Lexical), `datePublished`, `dateModified`, `author`, `readingTime`, `commercialLink`, `related[]`, SEO-группа, versions/drafts. `pages` — документы листинга `/blog/` (template `listing`) и инструмента `/instrumenty/kalkulyator-vesa-stekla/` (template `tool`, блок `weightCalculator`). Точные имена/типы полей (особенно `lead`, `commercialLink`, фичи редактора `body`) — в `src/payload/collections/content/articles.ts` и `src/payload-types.ts`. **Схему не менять**: если `body` не поддерживает таблицы — остановиться и написать координатору (в статьях есть таблицы, см. ниже).
- **task-11 (`@/lib/domain`):** `calcWeight(input) → { areaM2, perM2, perGlass, batch, carryHint } | null`, `carryHint(kg)`, `formatWeightKg(value, 'perM2'|'perGlass'|'batch')`, `WEIGHT_TABLE` (4→10 … 19→47.5), `FILM_THICKNESSES = [0.38, 0.76, 1.14, 1.52]`, `parseNumber` (принимает запятую), `formatNumber`, `THICKNESSES`, `checkStopWords`.
- **task-13:** `Breadcrumbs`, `DataTable`, `Callout`, `Card`, `Terms`, `Placeholder`, `Chip`, `Select`-обёртки (task-12), `Button`.
- **task-15:** `PageShell` (`<PageShell path breadcrumbLabel? breadcrumbs? hideBreadcrumbs? showConditions quiz lastLabel?>`), `buildMetadata` (поддерживает суффикс пагинации «— страница N»), JSON-LD билдеры (`articleJsonLd`, `breadcrumbList`), загрузчики `src/lib/cms/*`, `buildQuizHref(p)` и `QuizLink` из `@/components/page/quiz-cta` (порядок ключей `type, thick, vid, src, w, h, q, t1, t2, film`), `FormTrigger`.
- **task-16:** `RichText` (Lexical + метки), `RenderBlocks`, seed-фреймворк, **заглушки** `src/seed/slices/blog.ts` и `src/components/blocks/weight-calculator-block.tsx` (последний заменяется здесь).
- **task-19:** `reachGoal(name, params?)` из `@/components/analytics/reach-goal` — безопасный no-op без согласия/счётчика.
- Парсер предзаполнения квиза (task-34) принимает `type`, `thick`, `w`, `h`, `q`, `t1`, `t2`, `film`, `src` (запятая в числе допустима, `film` из `0.38|0.76|1.14|1.52`); `type` — id из `QUIZ_TYPES` (`tempered`, `triplex`, …).

## Files to Create

- `src/app/(site)/blog/page.tsx` — листинг, страница 1
- `src/app/(site)/blog/page/[n]/page.tsx` — страницы 2…N
- `src/app/(site)/blog/[slug]/page.tsx` — статья
- `src/lib/cms/articles.ts` — `getArticlesIndex()` (кэш, тег `collection:articles`), `getArticleBySlug()`, `getRelatedArticles()`
- `src/lib/blog/pagination.ts` (+ `pagination.test.ts`) — `BLOG_PAGE_SIZE = 12`, нарезка и список страниц
- `src/lib/blog/toc.ts` (+ `toc.test.ts`) — извлечение H2 из Lexical, `slugifyHeading` (транслит + дедупликация), разбиение корня на секции
- `src/lib/blog/reading-time.ts` (+ тест) — `estimateReadingMinutes(text)`
- `src/components/blog/article-card.tsx`, `blog-pagination.tsx`, `article-body.tsx`, `article-toc.tsx` (scroll-spy), `article-cta-card.tsx`, `related-articles.tsx`
- `src/components/calculators/weight-calculator.tsx` — клиентский калькулятор
- `src/components/calculators/weight-table.tsx` — таблица веса 4–19 мм
- `src/seed/content/blog.ts` — статьи, листинг, страница инструмента (строки дословно)
- `src/seed/slices/blog.test.ts` — Vitest: дословность, стоп-слова, 6 slug
- `e2e/blog-weight.spec.ts`

## Files to Modify

- `src/components/blocks/weight-calculator-block.tsx` — заменить заглушку на `<WeightCalculator />`
- `src/seed/slices/blog.ts` — реализовать

**Не трогать:** `src/payload/**`, `src/components/rich-text/*` (16), `src/components/ig/*`, `src/lib/domain/*` (11), `package.json`.

## Technical Details

### URL и метаданные (источник — `docs/inex/17-meta.md`, блок «Для кого, объекты, инструменты, статьи, компания»)

| URL | H1 | Title | Description | Приоритет |
|---|---|---|---|---|
| `/instrumenty/kalkulyator-vesa-stekla/` | Калькулятор веса стекла | Вес стекла — калькулятор для 4–19 мм и триплекса \| Inex Glass | Вес стекла: 2,5 кг на м² на каждый миллиметр толщины. Калькулятор для одинарного стекла и триплекса + таблица 4–19 мм. | P1 |
| `/blog/` | Статьи | Статьи о закалённом стекле для инженеров \| Inex Glass | Допуски, толщина, триплекс, маркировка — практические ответы для тех, кто заказывает стекло на объект. | P1 |
| `/blog/mozhno-li-rezat-zakalennoe-steklo/` | Можно ли резать закалённое стекло | Можно ли резать закалённое стекло — и что делать с размером | Коротко: нет — после закалки стекло рассыпается при резке и сверлении. Почему так и как не ошибиться с размером заранее. | P1 |
| `/blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/` | Чем закалённое стекло отличается от обычного | Чем закалённое стекло отличается от обычного | Закалённое прочнее обычного в 5–6 раз и рассыпается на тупые осколки, но его нельзя обработать после закалки. Как отличить на глаз. | P1 |
| `/blog/kak-vybrat-tolshchinu-stekla/` | Как выбрать толщину стекла | Толщина стекла — как выбрать и когда нужен триплекс | От чего зависит толщина: размер, крепление, нагрузка, безопасность. Почему её подбирают расчётом, а не по таблице. | P1 |
| `/blog/kak-snyat-razmery-dlya-stekla/` | Как снять размеры проёма для закалённого стекла | Как снять размеры проёма для закалённого стекла | Когда мерить, чем мерить, какие зазоры заложить и как отрисовать сложный проём — чтобы стекло встало с первого раза. | P1 |
| `/blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/` | Триплекс или закалённое стекло для ограждений | Триплекс или закалённое стекло для ограждения — что выбрать | Как ведёт себя стекло при разрушении, какие нагрузки задаёт проект и когда однослойного закалённого недостаточно. | P2 |
| `/blog/markirovka-zakalennogo-stekla/` | Марки и маркировка стекла | Стекло М1 и маркировка — что значат марки стекла | Что значит М1 и 4М1 в формуле, марки листового стекла М0–М7 и как найти клеймо закалённого стекла. | P2 |

Title статей — без суффикса «| Inex Glass» (так в 17-meta; `buildMetadata` суффикс не добавляет, если title задан явно — проверьте поведение функции). Тексты — `res/inex-glass-handoff/teksty/10-blog-kalkulyator.md` (§1 калькулятор, §2–5 статьи), `teksty/14-blog-tripleks-ili-zakalennoe.md`, `teksty/17-matirovanie-markirovka-listingi.md` (§2 маркировка, §4 листинг). Структуры — `docs/inex/struktury-stranic/p1-instrumenty-blog.md` (**блоки про стеклопакеты и Heat Soak Test не реализовывать** — решение 19.10; разделы в структуре «Позиция/Открытые вопросы» на сайт не идут). Прототипы: `prototypes/Article.dc.html`, `prototypes/Weight.dc.html`. Задание: `zadaniya/07-servis-obekty-blog.md` §7.4–7.5.

Крошки: статья — `Главная / Блог / <H1 статьи>`; листинг — `Главная / Блог`; инструмент — `Главная / Инструменты / Калькулятор веса стекла` (раздела `/instrumenty/` не существует: «Инструменты» — **некликабельный** сегмент; в JSON-LD `BreadcrumbList` его включить без `item` нельзя — для этого пункта использовать вариант task-15 `buildBreadcrumbs` (проверить, как он обрабатывает несуществующий родитель; при необходимости передать `breadcrumbs` явно, пропустив «Инструменты» в JSON-LD)).

### Листинг `/blog/` (роут явный, читает документ `pages` `/blog/`)

- H1 «Статьи». Вводный абзац (страница 1, дословно teksty 17 §4): «Практические ответы для тех, кто заказывает стекло на объект: как выбрать толщину, почему закалённое стекло нельзя резать, как снять размеры проёма и что значат марки стекла. Без рекламы — только то, что помогает заказать стекло без переделок.»
- Сетка карточек `grid-cols-3` ≥1101 (gap 24), 2 колонки 600–1100, 1 на ≤599. `ArticleCard` (`.ig-card`, ссылка целиком): изображение 16:9 (если у статьи есть картинка — `next/image`, иначе `Placeholder` без подписи), метка «Статья» (`.ig-label`), заголовок (h2 19–20 px/600), анонс 1–2 строки (`line-clamp-2`: description из SEO-группы статьи), строка `Clock`-иконка + «N мин» (`readingTime`).
- Сортировка: `datePublished` убыв., при равенстве — по заголовку.
- Блок «Инструменты» под сеткой (teksty 17 §4): ссылки «Калькулятор веса стекла» → `/instrumenty/kalkulyator-vesa-stekla/` и «Допуски по ГОСТ 30698-2014 и калькулятор отверстий» → `/kak-zakazat/dopuski-i-gost/` (стиль `.ig-link--arrow`).
- Пагинация: `BLOG_PAGE_SIZE = 12`; `/blog/page/N/` N ≥ 2; `/blog/page/1/` → `permanentRedirect('/blog/')`; N вне диапазона → `notFound()`; slug `page` зарезервирован. Страницы 2+: `index, follow`, canonical на себя, title = `<title стр. 1> — страница N`, `metadata.pagination.previous/next`; вводный абзац и блок инструментов только на странице 1. `BlogPagination` — nav `aria-label="Страницы"`, ссылки `<a>`, `aria-current="page"`, скрыта при одной странице. (Компонент намеренно отдельный от пагинации объектов — task-30.)
- JSON-LD: `BreadcrumbList`.

### Статья `/blog/[slug]/` (прототип `Article.dc.html`)

- `pg-top`: крошки, H1 (54/44/32). Дальше секция `blk--sf` (padding-top 56) с сеткой `minmax(0,760px) / 360px`, `justify-content: space-between`, gap 64; ≤1100 — одна колонка (порядок: Содержание → текст → карточка CTA).
- Текст `.ar-text`: 18/1.65 (16 на ≤599); H2 32/700 (24 на ≤599), `scroll-margin-top` ≥ 96 px; маркеры списков — цвет primary-pressed, ссылки — `#1F6B60`; `ul/ol` gap 12.
- **Лид «Коротко»** (`lead`, плашка `#EAF3F1`, радиус 16, текст 20/1.55 цвет `#16403D`): выводится **только** у статей, где в teksty абзац начинается с «**Коротко»**: `mozhno-li-rezat-zakalennoe-steklo` («**Коротко: нет.** Закалённое стекло нельзя резать, …»), `tripleks-ili-zakalennoe-dlya-ograzhdenij` («**Коротко:** если за ограждением перепад высот …»), `markirovka-zakalennogo-stekla` («**Коротко:** «М1» — это не название завода, …»). У остальных трёх статей вводные абзацы до первого H2 остаются в начале `body` без плашки. Жирный префикс сохраняется.
- **Тело** (`ArticleBody`): корневые узлы Lexical делятся по H2 (`toc.ts`): сам H2 рисуется как `<h2 id={slug}>` (plain-text заголовка → `slugifyHeading`: транслит, нижний регистр, дефисы, дедупликация суффиксом `-2`), узлы между H2 — через `RichText` (task-16) отдельными кусками (контекст меток общий). Таблицы — `.ig-table` внутри `.ig-table-wrap`, на ≤599 каждая строка таблицы превращается в `.ig-mcard` (если `RichText` этого не делает для таблиц — обернуть таблицу компонентом `DataTable`; если Lexical-таблицы в `body` не поддержаны редактором — **остановиться** и сообщить координатору: в статьях есть таблицы «Главные отличия», «Нагрузка на поручень», «Марки», «Как ведёт себя стекло…», «Когда что выбирают»).
- **Aside** (sticky `top: 88px` на ≥1101; высота сжатой шапки 64 + 24): `ArticleToc` — `nav aria-label="Содержание"`, заголовок `.ig-label` «Содержание», ссылки на H2 (серая плашка `#F4F5F3`, радиус 16, padding 24; ссылка: 15/500, левая линия 2 px `#D9DCDE`, hover/активная — primary и линия `#2B8C7E`); scroll-spy через `IntersectionObserver` (активный пункт `aria-current="true"`; без JS остаются обычные якоря). Если H2 меньше двух — TOC не рисуется. Под ним `ArticleCtaCard` (тёмный `#16403D`, радиус 16, padding 24): иконка 44 px в `rgba(255,255,255,.12)`, заголовок 20/600 = метка CTA, описание 14 px «КП — в среднем за 2–3 рабочих дня. Работаем с заказами от 50 м².» (значения из global `conditions`, если доступны, иначе дословно), primary block-кнопка.
- **CTA статьи** (`commercialLink` + кнопка в конце тела, primary l с иконкой): метки и цели по teksty:

| Статья | Метка кнопки (дословно) | Действие |
|---|---|---|
| mozhno-li-rezat-zakalennoe-steklo | Отправить чертёж на проверку | форма `drawing`, `source: 'blog-mozhno-li-rezat'` |
| chem-otlichaetsya-… | «Закалённое стекло на заказ» и «Рассчитать стоимость» (две ссылки в конце текста — как в teksty, внутри тела) | ссылка `/zakalennoe-steklo/`; квиз `type=tempered` |
| kak-vybrat-tolshchinu-stekla | «Проектирование» и «Рассчитать стоимость» (ссылки в теле) | `/proektirovanie/`; квиз |
| kak-snyat-razmery-dlya-stekla | Отправить чертёж / Рассчитать стоимость | форма `drawing`; квиз |
| tripleks-ili-zakalennoe-dlya-ograzhdenij | Отправить проект ограждения | форма `drawing`, `source:'blog-tripleks-ograzhdeniya'` |
| markirovka-zakalennogo-stekla | Рассчитать стоимость | квиз `type=tempered` |

  `commercialLink` заполняется сидом по реальной форме поля (посмотреть `articles.ts`); карточка CTA в aside использует его метку. Если форма поля не позволяет выразить «открыть форму drawing», хранить в нём внутреннюю ссылку и в `ArticleCtaCard` для известных slug подставлять `FormTrigger` по таблице выше (маппинг в `src/components/blog/article-cta-card.tsx`; отметить в отчёте).
- **«Читать также»** (фон bg): 3 карточки: `related[]`, иначе остальные статьи новейшие 3 (без текущей); заголовок H2 `pg-h2`. Затем полоса условий — компонент `Terms` (4 пункта: «Заказы от 50 м²», «Срок от 10 рабочих дней с даты договора», «КП в среднем за 2–3 рабочих дня», «Цена в договоре фиксируется»), из global `conditions` — **вызывать `PageShell` с `showConditions={false}` и `quiz={false}`**, чтобы автоблоки shell не дублировали эту полосу и CTA.
- JSON-LD: `Article` (headline = H1; description; `datePublished`/`dateModified` ISO; `author` — поле `author`, по умолчанию `Organization` «Inex Glass»; `publisher` Organization «Inex Glass»; `mainEntityOfPage`; `image`, если есть) + `BreadcrumbList`. `canonical` — абсолютный, `index, follow`.
- Расчёт `readingTime`: `estimateReadingMinutes(plainText)` = `max(1, ceil(words / 200))`; seed считает и записывает.

### Калькулятор веса (`WeightCalculator`, прототип `Weight.dc.html`)

Страница `/instrumenty/kalkulyator-vesa-stekla/` — документ `pages` (template `tool`, `pathPrefix: '/instrumenty/'` — страницы `/instrumenty/` нет, крошка «Инструменты» без ссылки; `parent` не задаётся), блоки по порядку: `hero` (только H1, без lead и кнопок — «Первый экран — сам калькулятор, без вступления»), `weightCalculator`, `table`-секция «Сколько весит 1 м² стекла» (рендерится `WeightTable` из `WEIGHT_TABLE`, не из текста) вместе с секцией «Как посчитать вручную» и «Зачем знать вес» (двухколоночная секция: ≤1100 одна колонка). `weight-calculator-block.tsx` просто рендерит `<WeightCalculator />` (клиентский компонент).

**Поведение:**
- Переключатель-сегмент (`role="group"`, кнопки с `aria-pressed`) «Одинарное стекло / Триплекс», радиус 999, активная — белая с тенью.
- Одинарное: чипсы толщины 4–19 мм (`THICKNESSES`, `aria-pressed`), по умолчанию 10.
- Триплекс: два `Select` «Стекло 1», «Стекло 2» (4–19 мм, по умолчанию 8 и 8) со знаком «+» между ними, чипсы плёнки 0,38 / 0,76 / 1,14 / 1,52 мм (`FILM_THICKNESSES`, по умолчанию 0,76).
- Поля «Ширина, мм», «Высота, мм» (по умолчанию 1000 и 2000), «Количество, шт.» (по умолчанию 10). `type="text"` + `inputMode="decimal"` (принимают запятую; разбор `parseNumber`); отрицательные/нечисловые → результат пересчитывается как 0, поле подсвечивается `aria-invalid`, ошибка не блокирует интерфейс.
- Результат (панель `#16403D`, `aria-live="polite"`): подпись режима («Стекло 10 мм» / «Триплекс 8+8, плёнка 0,76 мм»), три строки: «Вес 1 м²» (32 px/700), «Вес одного стекла», «Вес партии» (44 px/700; на ≤599 — 26/32), единицы «кг» меньшим кеглем; форматирование `formatWeightKg` (пробел-NBSP тысяч, запятая-десятичная, нули обрезаются). Подсказка по переноске под результатом — иконка (`user` при ≤ 20 кг, иначе `users`) + «**Одно стекло {perGlass} кг:** {carryHint}» (строки подсказок дословно из `carryHint`, teksty 10 §1: ≤20 «можно нести одному, в перчатках с покрытием»; ≤40 «один или вдвоём, с ручными присосками»; ≤80 «только вдвоём, по одной-две присоски на человека»; >80 «бригада 3–5 человек или вакуумный подъёмник»).
- Нулевые размеры (`calcWeight` → `null`): результаты «0», подсказка скрыта, кнопка CTA остаётся активной (ведёт в квиз без размеров).
- Кнопка primary l block «Посчитать стоимость этого стекла» (иконка calculator) — ссылка `buildQuizHref`: одинарное → `{ type:'tempered', thick, w, h, q, src:'/instrumenty/kalkulyator-vesa-stekla/' }`; триплекс → `{ type:'triplex', t1, t2, film, w, h, q, src }` (w/h/q — только если > 0). Клик вызывает `reachGoal('calc_to_quiz', { mode })` и не мешает переходу.
- `reachGoal('calc_weight', { mode })` — **один раз за просмотр страницы**, при первом изменении любого поля после загрузки, через 800 мс после последнего ввода и только если результат ненулевой.
- Доступность: у каждого поля `<label>`, группа плёнки — `role="group"` с `aria-label="Толщина плёнки"`, чипсы толщины — `aria-label="Толщина стекла"`; фокус-кольцо по дизайн-системе.
- Адаптив: ≥1101 — две колонки `1.25fr / 1fr` (вход белая карточка 36 px, выход тёмная), ≤1100 — одна колонка; ≤599: сегмент на всю ширину, количество на всю строку, карточки радиус 16 / padding 20.

**Секции под калькулятором** (тексты дословно из teksty 10 §1): H2 «Сколько весит 1 м² стекла» + таблица «Толщина | Вес 1 м²» (4 мм — 10 кг … 19 мм — 47,5 кг, из `WEIGHT_TABLE`) + абзац «Закалка вес не меняет: закалённое стекло весит столько же, сколько обычное той же толщины.»; H2 «Как посчитать вручную»: «Плотность листового стекла — около 2500 кг/м³. Значит, **1 м² стекла толщиной 1 мм весит 2,5 кг**.», формула-плашка «Вес = ширина, м × высота, м × толщина, мм × 2,5.», «**Пример.** Стекло для перегородки 1000 × 2000 мм, 10 мм: 1 × 2 × 10 × 2,5 = **50 кг**.», «**Триплекс 8+8 с плёнкой 0,76 мм:** 1 м² — 20 + 20 + 0,72 ≈ 40,7 кг.»; H2 «Зачем знать вес» — 3 пункта; ссылки «Закалённое стекло» (→ `/zakalennoe-steklo/`) и «Рассчитать стоимость» (квиз). Курсивные пометки «(Первый экран…)», «Поля/Результат/Кнопка/Логика (для разработчика)» — служебные, **на сайт не выводить**.

JSON-LD: `BreadcrumbList`. Индекс `index, follow`.

### Seed (`src/seed/slices/blog.ts`)

- Документы `pages`: `/blog/` (template `listing`, SEO + блок вводного абзаца), `/instrumenty/kalkulyator-vesa-stekla/` (SEO + блоки выше).
- 6 `articles` (`_status: 'published'`), slug и SEO из таблицы выше; `lead` — только у трёх статей (см. выше), остальной текст из teksty в `body` (Lexical через хелпер task-16 markdown → Lexical; таблицы — узлами таблицы; ссылки `→ [Название]` — внутренние ссылки по карте: «Как снять размеры проёма» → `/blog/kak-snyat-razmery-dlya-stekla/`, «Требования к чертежам» → `/kak-zakazat/trebovaniya-k-chertezham/`, «Допуски по ГОСТ» → `/kak-zakazat/dopuski-i-gost/`, «Калькулятор веса» → `/instrumenty/kalkulyator-vesa-stekla/`, «Триплекс» → `/tripleks/`, «Триплекс или закалённое для ограждения» → `/blog/tripleks-ili-zakalennoe-dlya-ograzhdenij/`, «Чем закалённое стекло отличается от обычного» → `/blog/chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo/`, «Закалённое стекло на заказ» → `/zakalennoe-steklo/`, «Осветлённое стекло» → `/zakalennoe-steklo/osvetlennoe/`, «Тонированное стекло» → `/zakalennoe-steklo/tonirovannoe/`, «Проектирование» → `/proektirovanie/`, «Зажимной профиль и спайдеры» → `/furnitura/`, «Стеклянные ограждения» → `/steklyannye-ograzhdeniya/`, «Документы» → `/kak-zakazat/dokumenty/`, «Рассчитать стоимость» → ссылка квиза; финальные `[кнопки]` из teksty не входят в `body` — они выражены через `commercialLink`/CTA).
- Даты (редакторские placeholder-значения, заменить перед запуском): `datePublished`/`dateModified` для статей по порядку таблицы — 2026-10-20, 2026-10-19, 2026-10-18, 2026-10-17 (волна 1), 2026-10-16, 2026-10-15 (волна 2) — так листинг стартует в порядке таблицы 17-meta. `author` пусто (в JSON-LD — Organization). `related[]` — взаимные ссылки: mozhno ↔ chem/kak-snyat/vybrat; vybrat ↔ chem/tripleks; tripleks ↔ chem/vybrat; markirovka ↔ chem/mozhno.
- Контент статей — `src/seed/content/blog.ts`, **строки скопированы дословно** (скриптом). Слово «М1» в статье маркировки легитимно (марка стекла, не завод): список `partnerFactories` в тесте пустой.
- Запуск: `pnpm seed --only=blog`, идемпотентно по slug/path.
- Vitest `blog.test.ts`: (а) дословность (с `test.skip` без `res/`); (б) `checkStopWords` пусто для всех текстов (в статье `chem-otlichaetsya…` нет упоминаний Heat Soak/HST — **убедиться, что при переносе не появились**; тексты из teksty уже очищены); (в) 6 slug-ов, `^[a-z0-9-]+$`, не `page`; (г) `estimateReadingMinutes` ≥ 1.

### Метрика

- `calc_weight` — первое изменение полей калькулятора (см. выше); `calc_to_quiz` — клик по «Посчитать стоимость этого стекла». Параметры события: `{ mode: 'single' | 'triplex' }` (без ПДн).
- `quiz_start` фиксирует квиз (entry page = `src`). `click_phone`/`click_email` — глобально.

### Тесты

- **Vitest:** `pagination.test.ts` (границы 12/13, `totalPages`, невалидный N), `toc.test.ts` (извлечение H2, транслит «Почему оно рассыпается» → `pochemu-ono-rassypaetsya`, дубликаты → `-2`, разбиение корня), `reading-time.test.ts`. Логику веса отдельно не тестировать — покрыта `weight.test.ts` (task-11); достаточно теста сборки URL квиза из состояния калькулятора (функция `buildWeightQuizHref(state)` вынесена в `weight-calculator.tsx` или `src/lib/blog/weight-quiz.ts` — чистая, тестируется).
- **Playwright** (`blog-weight.spec.ts`, проекты 375/1366/1920):
  1. Калькулятор: значения по умолчанию → «25» (1 м²), «50» (стекло), «500» (партия); подсказка «только вдвоём, по одной-две присоски на человека»; триплекс 8+8, плёнка 0,76 → «40,72», «81,4» (стекло 2 м²), «814,4», подсказка «бригада 3–5 человек или вакуумный подъёмник»; ввод «1,5» в ширину принимается; пустое поле → нули без ошибок JS; ссылка CTA содержит `type=tempered&thick=10&…&w=1000&h=2000&q=10` (одинарное) и `type=triplex&…&t1=8&t2=8&film=0.76` (триплекс); таблица веса: 8 строк, «12,5 кг» для 5 мм, «47,5 кг» для 19 мм; первый экран на 375/1366 содержит калькулятор без вводного текста, H1 один.
  2. Цели: через `page.addInitScript` определить `window.ym` как накопитель вызовов (и `localStorage` согласие `all` по контракту `src/lib/consent.ts`); убедиться, что `reachGoal('calc_weight')` вызван один раз после нескольких правок, `calc_to_quiz` — при клике по CTA. Если контракт `reachGoal` не позволяет перехват через `window.ym`, заменить проверку Vitest-тестом с моком модуля (документировать).
  3. Листинг: 6 карточек в порядке таблицы, у каждой метка «Статья», анонс, «N мин»; нет пагинации; `/blog/page/1/` → 301 `/blog/`; `/blog/page/2/` → 404; блок «Инструменты» с двумя ссылками. Пагинация с фикстурами: REST под админом создаёт 8 доп. статей `[e2e] …` (в `afterAll` удалить) → `/blog/page/2/` 200, title оканчивается на «— страница 2», canonical на себя, 2 карточки.
  4. Статья `mozhno-li-rezat-…`: плашка «Коротко: нет.»; TOC из 4 пунктов с правильными якорями (`#pochemu-ono-rassypaetsya`…); клик по пункту прокручивает к H2; sticky на 1366 (`position: sticky`), на 375 порядок «Содержание → текст → CTA»; JSON-LD `Article` с `datePublished`; нумерованный список из 4 пунктов; кнопка «Отправить чертёж на проверку» открывает `dialog`; «Читать также» — 3 карточки без текущей; на статье с таблицей на 375 — карточки вместо `table`.
  5. Для всех 7 URL: один `h1`, title/description/canonical из таблицы, крошки, нет `{`/`}`, нет стоп-слов.

## Acceptance Criteria

- [ ] `/blog/`, `/blog/page/N/`, `/blog/[slug]/` (6 статей) и `/instrumenty/kalkulyator-vesa-stekla/` работают; H1/title/description совпадают с 17-meta; пагинация следует правилам ТЗ §8 п.4.
- [ ] Статья: плашка «Коротко» только у трёх статей, TOC с рабочими якорями и scroll-spy, CTA, «Читать также», полоса условий; JSON-LD `Article` + `BreadcrumbList`; таблицы адаптивны.
- [ ] Калькулятор считает и форматирует как в прототипе/teksty (контрольные значения из e2e), подсказки по переноске дословные, ввод с запятой работает, CTA передаёт параметры по контракту task-34/15.
- [ ] Цели `calc_weight` (один раз) и `calc_to_quiz` вызываются.
- [ ] Тексты дословно из teksty (Vitest), служебные пометки не выведены, стоп-слов нет.
- [ ] Визуальная сверка с `Article` и `Weight` на 375 / 1366 / 1920.
- [ ] `pnpm seed --only=blog` идемпотентен; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e e2e/blog-weight.spec.ts` проходят.

## Notes

- **Модель:** premium для кодинга.
- Вес 5 мм в `WEIGHT_TABLE` — «12,5 кг»; в таблице использовать `formatNumber` (запятая).
- Заголовок-подзаголовок «Инструменты» в крошках не кликабелен: страницы `/instrumenty/` нет.
- Таблицы внутри Lexical: см. стоп-условие выше; если редактор `body` не поддерживает таблицы, нужно dedicated schema change (координатор).
- Даты публикации — плейсхолдеры (не из источников).
- Для API Payload Lexical (`@payloadcms/richtext-lexical/react`) и Next 16.4 при сомнениях — context7.
- (Ревью волны 4) Записи, созданные вне админки (сид, импорт, скрипты `payload run`), не сбрасывают кэш Next. Сид (`src/seed/index.ts`) в конце вызывает `POST /api/revalidate/` (HMAC-токен от `PAYLOAD_SECRET`, `src/lib/cms/revalidate-token.ts`); свои скрипты завершать тем же вызовом (переиспользовать хелпер из `src/seed/context.ts`). Блоки получают данные страницы через проп `page` у `RenderBlocks` — в сиде не копировать `seo.h1` в `titleOverride`.
- (Ревью волны 4) **404 в типизированных маршрутах:** не вызывать голый `notFound()` / `redirectOrNotFound()` из страницы — иначе SSR отдаёт пустое тело. Паттерн: `await redirectIfExists(path)` (из `@/lib/cms/queries`), затем `return <NotFoundResponse/>` (`src/components/page/not-found-response.tsx`), в `generateMetadata` — 404-title + `robots: noindex, follow`. Маршрут должен быть статическим/ISR (не вызывать `headers()`/`cookies()`), иначе статус 404 не выставится. Корневой layout `(site)` должен оставаться статическим.
