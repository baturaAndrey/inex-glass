# Task 23: Хаб «Закалённое стекло» и 8 карточек толщин (+ единый динамический роут `/zakalennoe-steklo/[slug]/`)

## Status

pending

## Wave

5

## Description

Вертикальный срез каталога закалённого стекла: хаб `/zakalennoe-steklo/` (таблица цен по толщинам из справочника, «что входит / что отдельно», чек-лист «что проверить до заказа», блоки риска, выбора толщины, видов, обработки, сроков, FAQ, форма) и 8 карточек толщин `/zakalennoe-steklo/{N}-mm/` (паспорт толщины, расстояния для отверстий, соседние толщины). Критичное правило: цена показывается только пока дата цен свежее 45 дней — иначе «Цена по расчёту», title без цены, Product-разметка исчезает. Задача также владеет **динамическим роутом** `/zakalennoe-steklo/[slug]/`, который диспетчеризует на шаблон толщины (здесь) либо на шаблон вида стекла (task-24).

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md, task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-21-forms-modals.md (контракт той же волны), task-24-glass-types.md (контракт той же волны)
**Blocks:** task-36-sitemap-robots-indexnow.md, task-38-placeholder-media.md, task-39-perf-images.md, task-40-content-audit.md

**Context from dependencies:**
- **task-10/07** заморозили схему (`src/payload-types.ts`; **не менять** — нет поля: остановиться и написать координатору). Коллекции этой задачи:
  - `thicknesses` (без черновиков): `n`, `slug` (`10-mm`), `path` (`/zakalennoe-steklo/10-mm/`), `indexable` (false у 5, 15, 19), `group` (rel), `weightPerM2` (вычисляется), `kindsText` («Виды» в паспорте), `canPaint`, `canBend`, `sizeText` (переопределение строки размера; по умолчанию размеры из `tech-params`), `leadTimeText` (переопределение срока), `podborOverride`, `obrabotkaOverride`, `faqOverride` (richText / FAQ — переопределяют тексты группы), `internalApplications` (внутреннее, не публикуется), `card`, `seo` (`h1`, `title`, `description`, `noindex`, `canonical`, `ogImage`, **`titleNoPrice`**), `quizPrefill{type, thickness, kind, ctaLabel, secondaryForm, secondaryLabel}`, `layout` (необязательные доп. секции);
  - `thickness-groups`: `label` («4–5 мм», «6–8 мм», «10–12 мм», «15–19 мм»), `order`, `podborText` (richText, метки `{N}`), `obrabotkaText` (richText), `faq[{question, answer(richText)}]`;
  - `pages` (хаб): `template: 'hub'`, `slug: 'zakalennoe-steklo'`, `path`, `layout` (блоки), `seo`, `quizPrefill`. Блоки: `hero` (`variant` ctHero|p5Top|home, `facts`, `strong`, `buttons[]`, `showTerms`, `termsMode`, `image`), `pricesTable` (`variant` table|cards|both, `showIncluded`, `showCaption`, `showPromo`, `showWeight`, `calloutFromConditions`; якорь по умолчанию `ceny`), `steps` (`items[{title,text,linkLabel,link}]`, `variant`, `footnote`, `buttons`), `cards` (`layout`: `ctCards`…, `items[{title,text,link,image,icon,priceHint,tone}]`), `table`, `richText`, `cta` (`variant`, `buttons`), `faq` (`mode: inline`, `items`), `objectsFeed`, `form`; общие поля секции: `anchorId`, `background`, `heading`, `headingLevel`, `sub`.
  - Globals: `prices` (`rows[{thickness, priceFrom, onRequest, note}]`, `priceDate`, `staleAfterDays`, `caption`, `onRequestLabel`, `staleLabel`, `includedTitle`, `included[{text}]`, `extraTitle`, `extra[{text}]`, `footnote`), `promo` (`active`, `text`, `startDate`, `endDate`, `linkUrl`), `conditions` (`termsBar`, `leadTimeDays`, `leadTimeText`, `kpText`, `callout`, `calloutTitle`, …), `tech-params`, `contacts`, `snippets`.
- **task-11** (`@/lib/domain`): `THICKNESSES = [4,5,6,8,10,12,15,19]`, `priceState`, `resolvePrice` (`{state, price, label}`: «от 1 400 ₽/м²» с NBSP / «по запросу» (15, 19) / «Цена по расчёту»), `priceCaption`, `formatPrice`, `formatPriceFrom`, `formatNumber`, `formatSizeMm`, `formatDateRu`, `promoActive`, `holeRules(t)`, `weightPerM2Single`, `WEIGHT_TABLE`, `formatWeightKg`, `replacePlaceholders` (метки `{цена}`, `{дата_цен}`, `{акция_текст}`, `{N}`, `{2N}`, `{6N}`, `{вес}`, `{вес×2}`, `{N-}`/`{N+}`, `{цена-}`/`{цена+}`, `{вес-}`/`{вес+}`, `{условия}`; прочие не трогает), `PricesInput`, `PromoInput`, `checkStopWords`.
- **task-15**: `getPageByPath`, `getThicknessByN(n)`, `getThicknessGroups()`, `getPrices()`/`getPricesInput()`/`getPromoInput()`/`getConditions()`/`getContacts()`/`getPlaceholderContext({ thickness })`, `buildMetadata`, JSON-LD (`productLd`, `faqLd`, `JsonLd`), `PageShell` (`path`, `lastLabel`, `showConditions`, `quiz`; крошки `/zakalennoe-steklo/10-mm/` → «Главная › Закалённое стекло › 10 мм» строятся автоматически; JSON-LD `BreadcrumbList` выводит он), `QuizLink`/`QuizCta` (`prefill`, `src`), `FormTrigger` (`formKey`, `params {label, source, …}`).
- **task-16**: `RenderBlocks` (реестр покрывает все 29 slug блоков; `collectionCards`, `linkList`, `twoColumns`, `quizCta` реализованы полностью; **`pricesTable` — заглушка `src/components/blocks/prices-table-block.tsx`, которую заменяет эта задача**), `docUrl`, `RichText`, сид-фреймворк (`markdownToLexical`, `SeedContext{payload, log, force}`) и **заглушки** `src/seed/slices/zak-hub.ts`, `src/seed/slices/thicknesses.ts`; **базовый сид (`--minimal` и `--full`) уже создаёт** 4 `thickness-groups` и 8 `thicknesses` (короткие тексты, правильные `indexable`) — срезы их обогащают; мини-сид создаёт заглушку хаба. Seed globals содержит цены на 15.10.2026, акцию, условия (`callout`, `termsBar`), контакты.
- **task-05/12/13**: `PageHero` (`variant="ct-hero"`: крошки, H1, `facts`, `strong`, `actions`, `terms`, `aside`), `Section`/`SectionHead`, `Breadcrumbs`, `Terms`, `Callout`, `Faq`/`Accordion`, `DataTable`, `Chip`, `Button`, `Placeholder`.
- **task-14** — layout `(site)` (шапка со ссылкой «Акции» → `/zakalennoe-steklo/#ceny`, подвал, sticky CTA). **task-21 (та же волна):** `FormSection` (`@/components/forms/form-section`, `<FormSection formKey="full" source="…" />`), `FormTrigger formKey="drawing"|"load"`.
- **task-24 (та же волна, контракт):** `src/components/templates/glass-type-template.tsx` экспортирует `isGlassTypeSlug(slug)`, `GlassTypePage({ slug })`, `generateGlassTypeMetadata(slug)`; эта задача только **вызывает** их.

## Files to Create

Роуты:
- `src/app/(site)/zakalennoe-steklo/page.tsx` — хаб
- `src/app/(site)/zakalennoe-steklo/[slug]/page.tsx` — диспетчер: `N-mm` → толщина, `isGlassTypeSlug` → вид стекла (task-24), иначе `notFound()`

Хаб (`src/components/zak-hub/`):
- `hub-page.tsx` — сборка по блокам документа (ключ секции — `blockType`/`anchorId`)
- `prices-table-section.tsx` (таблица цен: десктоп-таблица + мобильные `.ig-mcard`; «Входит / Считается отдельно»; callout условий), `numbered-checklist.tsx` («Что проверить до заказа»), `weight-section.tsx`, `kinds-section.tsx`, `ct-cards-section.tsx` (общие карточки `ct-card`)

Карточка толщины:
- `src/components/templates/thickness-template.tsx` — экспорты `ThicknessPage({ n })`, `generateThicknessMetadata(n)`, `parseThicknessSlug(slug): number | null`
- `src/components/templates/thickness/{passport.tsx, holes-rules.tsx, neighbors.tsx}`
- `src/lib/thickness-view.ts` — чистый построитель модели страницы (+ `src/lib/thickness-view.test.ts`)

Сид и тесты:
- `src/seed/content/zak-hub.ts`, `src/seed/content/thicknesses.ts` — данные (строки скопированы из teksty дословно)
- `src/seed/slices/zak-hub-thicknesses.test.ts` — Vitest: соответствие teksty, стоп-слова
- `e2e/zak-hub-thicknesses.spec.ts`

## Files to Modify

- `src/seed/slices/zak-hub.ts` — реальный сид хаба.
- `src/seed/slices/thicknesses.ts` — реальный сид групп и толщин (обогащение документов, созданных базовым сидом).
- `src/components/blocks/prices-table-block.tsx` — заменить заглушку task-16 целиком: блок `pricesTable` рендерит `PricesTableSection` (те же данные из `prices`/`promo`/`conditions`, якорь по умолчанию `ceny`). Сохранить имя экспорта и пропсы `{ block, ctx }`. Так блок работает на любой странице, где редактор его поставит, а не только на хабе.

**Не трогать:** `src/components/templates/glass-type-template.tsx` и `src/components/glass-types/*` (task-24), `src/app/(site)/layout.tsx` (task-14), `src/components/ig/*`, `src/components/forms/*` (task-21), `src/components/blocks/*` (task-16; кроме `prices-table-block.tsx`), `src/payload/**`, `src/seed/index.ts`, чужие `src/seed/slices/*`, `package.json`.

## Technical Details

### Общие правила

- Next.js 16.4, `trailingSlash: true`, `cacheComponents` выключен. Страницы зависят от `now` (правило 45 дней) → `export const revalidate = 3600`; динамический роут: `generateStaticParams` → `[]`, `dynamicParams = true` (build без БД); при изменении цен/акции хук global делает `revalidateTag(tag, { expire: 0 })`.
- Тексты — дословно из teksty; мета — из `17-meta.md` (при двух description первое); метки `{…}` хранятся в данных как есть. Никаких «Heat Soak», «стеклопакет» и т. п. (ТЗ §11): блоки про HST в `hub-zakalennoe-steklo.md` **не реализовывать**.
- Цена, вес, расстояния и состояния — только доменная библиотека и справочники; констант с ценами в компонентах нет. Только светлая тема; CSS прототипов (`ct-*`, `th-*`) переписывается на Tailwind; брейкпоинты 1365 / 1100 / 599; Lucide stroke 2; без эмодзи.
- Правило обновления в сиде: срез обновляет существующий документ по естественному ключу (`path` / `n` / `label`), только если передан `--force` **или** документ ещё не редактировался (|`updatedAt` − `createdAt`| < 2 с — его создал базовый/мини-сид); иначе пропуск с записью в лог. Запуск `pnpm seed --only=zak-hub` и `--only=thicknesses`; повторный прогон не создаёт дублей.

### Часть A. Хаб `/zakalennoe-steklo/`

**Мета** (`17-meta.md`, `teksty/02`):
- H1: `Закалённое (калёное) стекло на заказ по размерам`
- Title: `Закалённое стекло на заказ 4–19 мм по чертежу | Inex Glass` (цены в title хаба нет)
- Description: `Проверим чертёж и согласуем спецификацию до закалки, упакуем в обрешётку с фото при отгрузке. Заказы от 50 м².`
- og:description (если есть поле): `Закалённое стекло 4–19 мм по вашему чертежу: проверка до закалки, заказы от 50 м², доставка по Уралу и Сибири.`
- `index, follow`, canonical `/zakalennoe-steklo/`. JSON-LD: `BreadcrumbList` (`PageShell`), `FAQPage` (7 вопросов). Product не выводится.

**Рендер:** `getPageByPath('/zakalennoe-steklo/')`; нет документа → `notFound()`. `PageShell` (`path`, `showConditions={false}` — полоса условий в hero, `quiz={false}`). `HubPage` перебирает `layout` и для известных секций вызывает свои компоненты (ключ — `blockType`/`anchorId` ниже), остальные блоки (`objectsFeed` и добавленные редактором) отдаёт в `RenderBlocks`; «блоки-спутники» (`*-bridge`, `*-cta`) читаются своей секцией и отдельно не выводятся. Фоны секций чередуются `--ig-bg` / `--ig-surface`, отступы `.blk` 96/72/48 (в сиде у блоков явный `background`). Макет — `prototypes/ZakHub.dc.html`, `zadaniya/04-katalog-shablony.md` §4.1.

| # | Ключ | `blockType` | Что хранится / как рендерится |
|---|---|---|---|
| 1 | `hero` | `hero` (`ctHero`) | `PageHero ct-hero`: крошки (от `PageShell`), `h1`, `facts`: «По вашему чертежу DWG или DXF · толщина 4–19 мм · заказы от 50 м² · от 10 рабочих дней с даты договора · доставка по Уралу, Сибири и Поволжью», `strong`: «Проверяем чертёж до закалки — после неё стекло уже не изменить.», `buttons`: primary `l` «Рассчитать стоимость» (иконка calculator, квиз `type=tempered`, `src`) и secondary `l` «Загрузить чертёж DWG / DXF» (`FormTrigger drawing`, `params {label, source: 'zakalennoe-steklo'}`), `showTerms` — `Terms` из `conditions.termsBar` |
| 2 | `ceny` | `pricesTable` | `PricesTableSection` (см. ниже); **собственная секция, `id="ceny"`** (на неё ведёт «Акции» из шапки) |
| 3 | `checklist` | `steps` | «Что проверить до заказа»: `heading`, `sub` (абзац), 7 `items{title,text}`, `buttons` (3 secondary `s`-ссылки) → `NumberedChecklist` |
| 4 | `risk` | `cards` (`ctCards`) | «Как мы снижаем риск ошибки», 5 карточек |
| 5 | `weights` | `table` + companion `weights-cta` (`cta`) | «Как выбрать толщину»: `sub` (абзац), таблица «Толщина / Вес, кг/м²» (значения из `WEIGHT_TABLE`), `footnote`; кнопки companion-блока |
| 6 | `vidy` | `cards` (`ctCards`) + companion `vidy-bridge` (`richText`) | «Виды закалённого стекла», **`id="vidy"`**, 7 карточек-ссылок, строка «Рядом:» |
| 7 | `obrabotka` | `cards` (`ctCards`) | «Обработка до закалки», 6 карточек-ссылок |
| 8 | `sroki` | `richText` + companion `sroki-cta` (`cta`) | «Сроки и доставка» |
| 9 | `forwhom` | `cards` (`ctCards`) | «Для кого», 3 карточки-ссылки |
| 10 | `objects` | `objectsFeed` (`featured`, `limit: 4`) | лента (RenderBlocks); скрывается, если опубликованных объектов нет |
| 11 | `faq` | `faq` (`inline`) | «Частые вопросы», `Faq`, max-width 1100, JSON-LD `FAQPage` |
| 12 | `form` | `form` (`formKey: 'full'`) | `<FormSection formKey="full" source="zakalennoe-steklo" />` (task-21), фон `#EAF3F1` |

**`PricesTableSection`** (`ceny`): `h2` «Цены на закалённое стекло»; подпись над таблицей (14 px, muted) = `priceCaption(prices)` + при `promoActive` пробел и `promo.text` → «Ориентировочные цены на 15.10.2026. Точная стоимость — в КП после расчёта; цена в договоре фиксируется. −5% на закалённое стекло при заказе от 100 м²»; при просроченной дате вместо даты — «Цена по расчёту. Точная стоимость — в КП после расчёта; цена в договоре фиксируется.» (формулировка по ТЗ §4.1; утвердить). **Таблица** (`ig-table`, max-width 900): «Толщина» (ссылка `/zakalennoe-steklo/{N}-mm/`, 600), «Цена от, ₽/м²» (`resolvePrice`: «от 700» жирным без ₽/м² в ячейке, «по запросу» для 15 и 19, «Цена по расчёту» при просрочке), «Вес» («10 кг/м²», `formatWeightKg`), колонка со стрелкой; **строка кликабельна целиком** (ссылка-оверлей), hover — подсветка `primary-light`; 8 строк. ≤599 — `.ig-mcard`-ссылки: «4 мм» (22/700) слева и цена (`ig-price-s`) справа, `dl` «Вес». Ниже (margin-top 40) — две колонки «Входит в цену «от»» (`prices.includedTitle`, `included[]`, фон primary-light, чек-иконки) и «Считается отдельно» (`extraTitle`, `extra[]`, фон `--ig-bg`) (≤599 одна колонка); `Callout variant="info"` из `conditions.calloutTitle` + `conditions.callout` («Что нужно учесть: минимальный заказ — от 50 м². Размер одного стекла — от 150 × 300 до 3000 × 2000 мм. Срочного изготовления нет. Стекло заказчика не закаливаем.»). Состояние цены — на корне секции `data-price-state="price|calc"`.

Тексты блоков 3–9 и FAQ — дословно teksty/02 (разделы «Что проверить до заказа», «Как мы снижаем риск ошибки», «Как выбрать толщину», «Виды закалённого стекла», «Обработка до закалки», «Сроки и доставка», «Для кого», «Частые вопросы»); ссылки: Требования к чертежам `/kak-zakazat/trebovaniya-k-chertezham/`, Допуски по ГОСТ 30698-2014 `/kak-zakazat/dopuski-i-gost/`, Можно ли резать закалённое стекло `/blog/mozhno-li-rezat-zakalennoe-steklo/`, Калькулятор веса стекла `/instrumenty/kalkulyator-vesa-stekla/`, «Подобрать толщину под нагрузку» — `FormTrigger load` (`source: 'zakalennoe-steklo'`), виды: Осветлённое `/zakalennoe-steklo/osvetlennoe/`, Матовое `…/matovoe/`, Тонированное `…/tonirovannoe/`, Крашеное по RAL `…/okrashennoe/`, Рифлёное `…/riflenoe/`, Гнутое `…/mollirovannoe/` (Прозрачное — без ссылки), «Рядом»: Триплекс `/tripleks/` · Обработка стекла `/obrabotka-stekla/` · Стеклянные конструкции `/steklyannye-konstrukcii/`; обработка: Кромка `/obrabotka-stekla/kromka/`, Отверстия и вырезы `…/otverstiya-i-vyrezy/`, Фацет `…/facet/` («на зеркалах, ширина 30 или 50 мм»), Матирование `…/matirovanie/`, Печать на стекле `…/pechat/`, Плёнки `…/plenki/`; сроки: «Сроки изготовления» `/kak-zakazat/sroki/`, «Упаковка и доставка» `/kak-zakazat/upakovka-i-dostavka/`; для кого: Подрядчикам `/klientam/podryadchikam/`, Производителям мебели `/klientam/proizvoditelyam-mebeli/`, Крупным объектам `/klientam/zastrojshchikam/`; FAQ «Почему закалённое стекло иногда лопается само?» содержит ссылку «Триплекс» `/tripleks/`.

`NumberedChecklist`: 2 колонки ≥1101 (карточки `rounded-lg`, круг-номер 44 px `primary-light`/`#16403D`, 700/18; ≤1100 одна колонка, номер 36 px, padding 16). `ct-card`: белая `rounded-lg`, padding 24, тень card, заголовок 18/600 `#16403D`, текст 15 px; сетка `auto-fit minmax(min(300px,100%), 1fr)` gap 20.

### Часть B. Карточки толщин `/zakalennoe-steklo/{N}-mm/`

**Допустимые N:** 4, 5, 6, 8, 10, 12, 15, 19 (slug `4-mm` …). `parseThicknessSlug` — строго `^(4|5|6|8|10|12|15|19)-mm$`; иное (`7-mm`, `010-mm`) → `notFound()`. Загрузка: `getThicknessByN(n)` (+ группа, `depth` ≥ 1), нет документа → 404.

**Мета** (17-meta, teksty/03; при расхождении приоритет у 17-meta — «, до 3000 × 2000» из teksty/03 в title **не добавлять**):
- H1: `Закалённое стекло {N} мм`
- Title при `priceState === 'price'`: `Закалённое стекло {N} мм — от {цена} ₽/м² | Inex Glass` (поле `seo.title`)
- Title иначе (15, 19 мм, просроченная цена): `Закалённое стекло {N} мм — под заказ | Inex Glass` (поле `seo.titleNoPrice`)
- Description (одинаков): `Закалённое стекло {N} мм: вес {вес} кг/м², размеры от 150 × 300 до 3000 × 2000 мм, срок от 10 рабочих дней. Расчёт по вашему чертежу.`
- `generateThicknessMetadata(n)` → `buildMetadata({ seo: { ...doc.seo, title: state==='price' ? doc.seo.title : doc.seo.titleNoPrice }, path: doc.path, fallbackTitle, placeholders: await getPlaceholderContext({ thickness: n }) })`.
- Индексация: `!doc.indexable || doc.seo.noindex` → `noindex, follow` (5, 15, 19 мм); canonical всегда на себя; 4, 6, 8, 10, 12 — `index, follow`.
- JSON-LD: `BreadcrumbList` (`PageShell`), `FAQPage` (вопросы группы или `faqOverride`) и **`Product` + `AggregateOffer`** (`productLd`: `name` «Закалённое стекло {N} мм», `lowPrice` = цена, `priceCurrency: 'RUB'`, `priceDate`) **только** при `priceState === 'price'` — для 15, 19 мм и при просрочке `Product` не выводится вообще.

**Модель страницы** — чистая `buildThicknessView({ n, doc, group, prices, promo, conditions, now })` → `{ priceState, priceLabel, priceNote, caption, promoText, weight {value, label}, sizeText, kindsText, leadTimeText, holeRules, neighbors {prev, next}, neighborsTable, metaTitleKey, showProductJsonLd }`. Правила: `priceNote` = «ориентир на {дата_цен}» (`price`) либо «пришлите чертёж — назовём цену в КП» (`calc`); `sizeText` = `doc.sizeText` либо «от 150 × 300 до 3000 × 2000 мм» (из `tech-params.flat`); `leadTimeText` = `doc.leadTimeText` либо «от {conditions.leadTimeDays} рабочих дней с даты договора»; соседи — предыдущая/следующая толщина в `THICKNESSES` (у 4 нет левой, у 19 нет правой); цены соседей — `resolvePrice`. Vitest `thickness-view.test.ts` (фиксированные `now`): 45 дней → `price`, 46 → `calc`; 15/19 всегда `calc`; соседи 4 → [—, 5], 10 → [8, 12], 12 → [10, 15], 19 → [15, —]; цены соседей-15/19 → «по запросу»; просрочка → «Цена по расчёту» у всех; `showProductJsonLd` false при `calc`; `weight` для 5 мм = «12,5».

**Блоки страницы** (макет — `Thick10.dc.html`, `Thick19.dc.html`; значения — teksty/03; `PageShell`: `showConditions` по умолчанию true, `quiz={false}`; фоны чередуются):
1. **Hero** — `PageHero ct-hero` с сеткой `1fr` / `520px` (gap 56; ≤1100 одна колонка): слева `h1`, **крупная цифра** `{N}<small>мм</small>` (`aria-hidden`, 120 px/700, `#16403D`, `letter-spacing -.03em`; ≤599 72 px), строка «Заказы от 50 м².», кнопка primary `l` «Загрузить чертёж» (`FormTrigger drawing`, `source: 'thickness-{N}'`). Справа **«Паспорт толщины»** (`<aside aria-label="Паспорт толщины" data-price-state="price|calc">`, белая `rounded-xl`, тень, padding 32 / 20): метка (12 px, uppercase, muted) «Паспорт толщины»; цена (30/700, `tabular-nums`; вариант «Цена по расчёту» 26 px `#16403D`) и подпись (13 px, muted) = `priceNote`; `dl` (колонки 120px/1fr): **Размер** (`sizeText`; для 15 и 19 мм: «до 3000 × 2000 мм; точнее — после согласования с заводом»), **Вес** («{вес} кг/м²»), **Срок** (`leadTimeText`), **Виды** (`kindsText`), **Стандарт** («ГОСТ 30698-2014»); кнопка primary `l` block «Рассчитать стекло {N} мм» (`QuizLink`, `prefill {type: tempered, thickness: N}`, иконка calculator); под ней мелко полная подпись `caption` и при `promoActive` — `promo.text`.
2. **«Что входит в цену»**: «В цену «от» входят стекло толщиной {N} мм, закалка и проверка параметров заказа. Отдельно считаются фигурная резка, обработка кромки и фацет, отверстия и вырезы, печать и матирование. Точная стоимость — в КП; цена в договоре фиксируется.»
3. **«Подберём толщину под вашу нагрузку»**: `podborOverride ?? group.podborText` + абзац «Опишите конструкцию — размер стекла, способ крепления, назначение, — и мы подберём толщину или схему триплекса.» + secondary-кнопка «Подобрать под нагрузку» (`FormTrigger load`, `params {source: 'thickness-{N}', thickness: N}`).
4. **«Обработка стекла {N} мм»**: `obrabotkaOverride ?? group.obrabotkaText`.
5. **«Отверстия в стекле {N} мм — по ГОСТ 30698-2014»**: три карточки (`th-hole`: белая `rounded-lg`, число 40/700 `#16403D`, подпись 15 px) «до кромки стекла — не менее» **{2N} мм**, «между отверстиями — не менее» **{2N} мм**, «до угла — не менее» **{6N} мм** (числа из `holeRules(N)`; ≤599 одна колонка, число 32 px); строка «диаметр — от 4 до 130 мм; меньше {N} мм — по согласованию» + ссылка «Калькулятор расстояний» → `/obrabotka-stekla/otverstiya-i-vyrezy/#kalkulyator`.
6. **«Соседние толщины»**: чипсы-ссылки (`Chip` как ссылка: текущая `is-active`, `aria-current="page"`; соседи 1–2) и таблица «| {N−} мм | **{N} мм** | {N+} мм |» со строками «Цена от, ₽/м²» и «Вес, кг/м²» (колонка текущей подсвечена `primary-light`, 600; цена соседа — «от 1 300» / «по запросу» / «Цена по расчёту»; ≤599 — карточки). У 4 и 19 мм колонок две.
7. **«Частые вопросы»**: `faqOverride` либо `group.faq` (метки `{N}`, `{2N}`, `{вес}`, `{вес×2}` подставляются) — `Faq`, JSON-LD `FAQPage`.
8. `layout` документа — `RenderBlocks` (необязательные доп. секции).
9. **Форма** — `<FormSection formKey="full" source="thickness-{N}" />`.

Значения для сида (teksty/03 «Значения по толщинам»; вес и расстояния считаются доменной библиотекой, в БД не хранятся):

| N | `group.label` | `kindsText` | `sizeText` |
|---|---|---|---|
| 4, 5, 6, 8, 10, 12 | «4–5 мм» (4, 5), «6–8 мм» (6, 8), «10–12 мм» (10, 12) | «все, включая крашеное и гнутое» | — (по умолчанию) |
| 15 | «15–19 мм» | «прозрачное и другие виды по запросу; крашеное — до 15 мм; гнутое — нет» | «до 3000 × 2000 мм; точнее — после согласования с заводом» (для 15 мм явно не задано — по группе FAQ 15–19) |
| 19 | «15–19 мм» | «по запросу; крашеное и гнутое — нет» | «до 3000 × 2000 мм; точнее — после согласования с заводом» |

Тексты групп (`podborText`, `obrabotkaText`, `faq`) — дословно teksty/03 («{текст_подбора} и {обработка} — по толщинам», «{faq} — по толщинам»); для каждой толщины: `seo.h1` «Закалённое стекло {N} мм», `seo.title` (с ценой), `seo.titleNoPrice`, `seo.description` (шаблоны выше), `quizPrefill {type: 'tempered', thickness: N, ctaLabel: 'Рассчитать стекло {N} мм'}`; `indexable` не менять (задаёт базовый сид: false у 5, 15, 19).

### Часть C. Динамический роут `[slug]`

```tsx
// src/app/(site)/zakalennoe-steklo/[slug]/page.tsx
export const revalidate = 3600
export const dynamicParams = true
export function generateStaticParams() { return [] }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const n = parseThicknessSlug(slug)
  if (n) return generateThicknessMetadata(n)
  if (isGlassTypeSlug(slug)) return generateGlassTypeMetadata(slug)   // task-24
  return {}
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const n = parseThicknessSlug(slug)
  if (n) return <ThicknessPage n={n} />
  if (isGlassTypeSlug(slug)) return <GlassTypePage slug={slug} />       // task-24
  notFound()
}
```

Каталожный `[...slug]` (task-15) и этот explicit-роут не конфликтуют.

### Seed

- `zak-hub.ts`: upsert `pages` (`path /zakalennoe-steklo/`, `template: 'hub'`) — SEO-группа, `quizPrefill` (type `tempered`), `layout` из таблицы «Рендер» (12 блоков + companion-блоки), `_status: 'published'`; `pricesTable`: `variant: 'table'`, `showIncluded`, `showCaption`, `showPromo`, `showWeight`, `calloutFromConditions` — true.
- `thicknesses.ts`: обновляет 4 группы и 8 толщин, созданных базовым сидом, значениями выше (по правилу обновления); если базового документа нет — создаёт.
- Данные — `src/seed/content/*.ts`, скопированные из teksty скриптом. Vitest `zak-hub-thicknesses.test.ts`: строки содержимого найдены в teksty/02 и teksty/03 (`test.skip`, если нет `res/`); `checkStopWords` пусто; `indexable` true только у 4, 6, 8, 10, 12; 7 вопросов FAQ хаба.

### Метрика

Специальных целей нет. Квиз — `quiz_start` (task-20); формы — `form_submit` (task-21).

### e2e (`e2e/zak-hub-thicknesses.spec.ts`, проекты 375 / 1366 / 1920)

Предусловие: `pnpm seed --minimal`, затем `pnpm seed --only=zak-hub,thicknesses --force` (в `beforeAll` проверить `/zakalennoe-steklo/` = 200 и наличие `#ceny`).
- **Хаб:** 200; один `h1` из 17-meta; title/description дословно; canonical; крошки; JSON-LD `BreadcrumbList` и `FAQPage` (7); `id="ceny"` и `id="vidy"`; таблица цен — 8 строк, 15 и 19 мм — «по запросу», остальные «от …» (NBSP) либо «Цена по расчёту» (ветвление по `data-price-state`); клик по строке открывает `/zakalennoe-steklo/{N}-mm/`; на 375 вместо таблицы — `.ig-mcard`, на 1366 — `table`; «Входит / Отдельно» — по 3 пункта; 7 пунктов чек-листа; 5 карточек риска; таблица веса 8 строк; 7 карточек видов; 6 карточек обработки; FAQ раскрывается по клику и с клавиатуры; кнопки «Рассчитать стоимость» (`href` содержит `/raschet-stoimosti/`, `type=tempered`) и «Загрузить чертёж DWG / DXF» (открывает `role=dialog`); форма «Получить расчёт» внизу; порядок секций; нет `{`/`}`; нет горизонтального скролла на 375.
- **Карточки** (по N = 4, 5, 6, 8, 10, 12, 15, 19): 200; h1 «Закалённое стекло {N} мм»; title: при `data-price-state="price"` — «… — от {цена} ₽/м² | Inex Glass», иначе «… — под заказ | Inex Glass»; description равен шаблону; `meta robots` — у 5, 15, 19 `noindex, follow`, у остальных без `noindex`; паспорт: вес/размер корректны; карточки 2N/6N совпадают с таблицей (4 → 8/24, 10 → 20/60, 19 → 38/114); соседи: у 4 две колонки, у 10 три (8, 10, 12), у 19 две (15, 19), цены соседей 15/19 — «по запросу»; JSON-LD `Product`/`AggregateOffer` присутствует **тогда и только тогда**, когда `data-price-state="price"` (`lowPrice` = цена из паспорта), для 15 и 19 — никогда; «Цена по расчёту» в паспорте при `calc`; «Рассчитать стекло {N} мм» ведёт на `/raschet-stoimosti/?…thick={N}…`; «Подобрать под нагрузку» открывает диалог; чипсы соседей — ссылки; метки подставлены.
- **Роутинг:** `/zakalennoe-steklo/7-mm/` → 404; `/zakalennoe-steklo/10-mm` → редирект на версию со слешем; `/zakalennoe-steklo/10-MM/` → 301 на нижний регистр; `/zakalennoe-steklo/unknown/` → 404; (когда task-24 слит) `/zakalennoe-steklo/matovoe/` → 200.
- Скриншоты хаба и карточек 10 и 19 мм на 375 / 1366 / 1920 — к отчёту для сверки с `ZakHub.dc.html`, `Thick10.dc.html`, `Thick19.dc.html`. Просроченная цена в e2e не воспроизводится — её покрывает Vitest.

## Acceptance Criteria

- [ ] Хаб и 8 карточек отдают 200; H1/title/description совпадают с 17-meta (title карточки зависит от `priceState`); canonical на себя; 5, 15, 19 мм — `noindex, follow`.
- [ ] Правило 45 дней соблюдается везде: просрочка/15/19 мм → «Цена по расчёту», title «— под заказ», нет `Product`/`AggregateOffer`, цена в таблицах соседей скрыта; свежая цена — с NBSP-разрядами и подписью «Ориентировочная цена на ДД.ММ.ГГГГ. Точная стоимость — в КП; цена в договоре фиксируется»; Vitest покрывает границы 45/46 дней.
- [ ] Якоря `#ceny` и `#vidy` на хабе существуют; строка таблицы цен кликабельна целиком; на ≤599 таблицы — карточки.
- [ ] Расстояния для отверстий, вес, соседи вычисляются доменными функциями; значения для каждой N совпадают с teksty/03.
- [ ] Динамический роут диспетчеризует на толщину / вид стекла (task-24) / 404; хаб не требует наличия объектов.
- [ ] Тексты дословно из teksty/02 и teksty/03 (тест); нет стоп-слов; сиды идемпотентны и не затирают правки редактора без `--force`.
- [ ] Вёрстка совпадает с прототипами на 375 / 1366 / 1920 (паспорт, hero-цифра, сетки, брейкпоинты 1365/1100/599); нет горизонтального скролла.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (без БД), `pnpm test:e2e e2e/zak-hub-thicknesses.spec.ts` проходят.
- [ ] Схема Payload, layout, `render-blocks.tsx`, чужие файлы не изменены.

## Notes

- **Модель:** премиум для кода и вёрстки; перенос текстов — скриптом.
- Источники: `res/inex-glass-handoff/teksty/02-zakalennoe-steklo.md`, `teksty/03-kartochki-tolshchin.md`; `docs/inex/struktury-stranic/hub-zakalennoe-steklo.md` (порядок блоков; **блоки про Heat Soak Test и стеклопакеты — не реализовывать**), `docs/inex/struktury-stranic/p0-kartochki-tolshchin.md`; `docs/inex/17-meta.md`; `docs/inex/15-ssot-tehnologiya.md` §1, §1.1; ТЗ `docs/inex/16-tz-razrabotka.md` §3.1, §4.1, §5, §8; прототипы `ZakHub.dc.html`, `Thick10.dc.html`, `Thick19.dc.html`; `zadaniya/04-katalog-shablony.md`.
- Расхождения источников: `teksty/03` добавляет к title «, до 3000 × 2000» — приоритет у `17-meta.md`; в teksty/02 таблица цен двухколоночная, в прототипе/`zadaniya/04` добавлены «Вес» и ссылка — следуем макету; `hub-zakalennoe-steklo.md` предлагает подпись «скидка 5%» — берётся `promo.text` только пока акция активна.
- Дата цен в seed globals (task-16) — 15.10.2026; после 30.11.2026 сайт честно покажет «Цена по расчёту», и проверка `Product`-разметки в e2e не выполнится — спека устойчива к обоим состояниям (ветвление по `data-price-state`); координатор может выставить дату цен в тестовом сиде на «сегодня».
- **Открытые вопросы:** (1) размер для 15 мм не задан явно; (2) формулировка подписи цен при просрочке на хабе — утвердить; (3) решено: `pricesTable` есть в реестре `RenderBlocks` (заглушка task-16), эта задача заменяет заглушку обёрткой над `PricesTableSection`; хаб может рендерить секцию напрямую или через реестр — результат одинаковый; (4) блок `steps` для чек-листа и `cards` для «Видов» используют companion-блоки (`vidy-bridge`, `weights-cta`, `sroki-cta`) — схема их не запрещает, но редактору нужна подсказка в `description` блоков.
- (Ревью волны 4) Записи, созданные вне админки (сид, импорт, скрипты `payload run`), не сбрасывают кэш Next. Сид (`src/seed/index.ts`) в конце вызывает `POST /api/revalidate/` (HMAC-токен от `PAYLOAD_SECRET`, `src/lib/cms/revalidate-token.ts`); свои скрипты завершать тем же вызовом (переиспользовать хелпер из `src/seed/context.ts`). Блоки получают данные страницы через проп `page` у `RenderBlocks` — в сиде не копировать `seo.h1` в `titleOverride`.
- (Ревью волны 4) **404 в типизированных маршрутах:** не вызывать голый `notFound()` / `redirectOrNotFound()` из страницы — иначе SSR отдаёт пустое тело. Паттерн: `await redirectIfExists(path)` (из `@/lib/cms/queries`), затем `return <NotFoundResponse/>` (`src/components/page/not-found-response.tsx`), в `generateMetadata` — 404-title + `robots: noindex, follow`. Маршрут должен быть статическим/ISR (не вызывать `headers()`/`cookies()`), иначе статус 404 не выставится. Корневой layout `(site)` должен оставаться статическим.
