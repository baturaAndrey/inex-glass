# Task 07: Схема — контент, каталог, библиотека блоков

## Status

complete

## Wave

2

## Description

Описываем в Payload всю контентную часть сайта: медиа, страницы (`pages`), карточки толщин, виды стекла, обработку, конструкции, душевые, статьи, объекты портфолио, таксономии, сотрудников и **библиотеку блоков** для конструктора страниц. Это самая объёмная задача схемы: после задачи 10 схема заморожена, и ни одна из ~30 задач шаблонов и страниц не сможет добавить поле. Поэтому поля перечислены исчерпывающе — по ТЗ, SSoT, текстам `teksty/` и прототипам (Home, ZakHub, Thick10/19, Osvetl, Riflenoe, Holes, Constr, Partitions, Canopies, Objects, ObjectPage, Article). Общие поля (SEO, предзаполнение квиза, slug с транслитом, FAQ, путь, карточка) выносятся в `src/payload/fields/*`.

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** task-10-schema-freeze.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, tasks 22–31 и 37–38 (шаблоны, сид, импорт), 35 (поиск)

**Context from dependencies:** Задача 01 создала Payload 3.91 + Next 16.4, `payload.config.ts` (spread реестров `contentCollections`, `catalogCollections`, `crmCollections`, `globals`, блоки — `pageBlocks`), пустые индексы `src/payload/collections/content/index.ts`, `src/payload/collections/catalog/index.ts` и `src/payload/blocks/index.ts` (их заполняет эта задача), роли `admin`/`manager` и контракты:
- `@/payload/access`: `isAdmin`, `isAdminOrManager`, `isLoggedIn`, `isAnyone`, `isAdminOrSelf`, `publishedOrLoggedIn`, `adminFieldAccess`, `adminOrManagerFieldAccess`;
- `@/payload/slugs`: `rel("media")` — приведение слага к `CollectionSlug` для `relationTo`/`join.collection` (используем везде, чтобы типизация не ломалась до задачи 10);
- `@/payload/editor`: `richTextEditor` (Lexical);
- `@/payload/fields/link`: `linkField({ name?, label?, required?, withLabel? })`.
Параллельно задача 06 создаёт globals и **хелпер ревалидации** `@/payload/hooks/revalidate` с экспортами `revalidateCollection(slug) → { afterChange, afterDelete }` (хуки Payload) и `@/lib/cache-tags` (`collectionTag`, `docTag`, `globalTag`). Используйте их по сигнатуре: `hooks: { afterChange: [revalidateCollection("pages").afterChange], afterDelete: [revalidateCollection("pages").afterDelete] }`. Если файла ещё нет к моменту вашей проверки типов — проверьте после слияния волны (файл появится от задачи 06). Задача 08 параллельно делает CRM (leads, orders, …) — в ваших коллекциях на них не ссылаться.

## Files to Create

Общие поля и утилиты (владеет эта задача):
- `src/payload/fields/seo.ts`, `quiz-prefill.ts`, `slug.ts` (в т. ч. `transliterate`), `faq.ts`, `path.ts`, `card.ts`, `tables.ts`, `validators.ts` (`requiredOnPublish`), `index.ts` (реэкспорт; `link.ts` принадлежит задаче 01 — не переписывать).
- `src/payload/utils/lexical-text.ts` — `lexicalToPlainText(root): string` (для `readingTime`, поиска, FAQPage JSON-LD).
- `src/payload/fields/*.test.ts`, `src/payload/utils/lexical-text.test.ts` — unit-тесты (транслит, путь, plain-text; запускаются Vitest после появления задачи 02).

Коллекции (каталог): `src/payload/collections/catalog/{thicknesses,thickness-groups,glass-types,processing-services,constructions,shower-configs,products,object-types,cities}.ts`.
Коллекции (контент): `src/payload/collections/content/{media,pages,articles,objects,team}.ts`.
Блоки: `src/payload/blocks/{_section,_cta}.ts` (хелперы полей), `hero.ts`, `rich-text.ts`, `table.ts`, `steps.ts`, `callout.ts`, `terms.ts`, `cards.ts`, `collection-cards.ts`, `prices-table.ts`, `faq.ts`, `cta.ts`, `compare.ts`, `download.ts`, `holes-calculator.ts`, `weight-calculator.ts`, `form.ts`, `snippet.ts`, `stats.ts`, `objects-feed.ts`, `articles-feed.ts`, `who-does-what.ts`, `systems.ts`, `gallery.ts`, `two-columns.ts`, `link-list.ts`, `contacts-map.ts`, `requisites.ts`, `team-grid.ts`, `quiz-cta.ts`.

## Files to Modify

- `src/payload/collections/catalog/index.ts` — `catalogCollections = [Thicknesses, ThicknessGroups, GlassTypes, ProcessingServices, Constructions, ShowerConfigs, Products, ObjectTypes, Cities]`.
- `src/payload/collections/content/index.ts` — `contentCollections = [Media, Pages, Articles, Objects, Team]`.
- `src/payload/blocks/index.ts` — `pageBlocks` (все блоки выше).

Не трогать: `payload.config.ts`, `src/payload/globals/**` (06), `src/payload/collections/crm/**` и `users.ts` (08), `package.json`, любые компоненты.

## Technical Details

### Общие правила

- Слаги коллекций — kebab-case: `media`, `pages`, `thicknesses`, `thickness-groups`, `glass-types`, `processing-services`, `constructions`, `shower-configs`, `articles`, `objects`, `object-types`, `products`, `cities`, `team`. Поля — английский camelCase, `label` и `description` — по-русски. Слаги блоков — camelCase (`holesCalculator`), у каждого блока `dbName: "blk_<snake>"` и короткие `dbName` у вложенных массивов, чтобы имена таблиц/enum укладывались в 63 символа Postgres (проверка: `pnpm payload generate:db-schema`, файл `src/payload-generated-schema.ts` не коммитить; **миграции не создавать** — это задача 10).
- Все ссылки на коллекции — `rel("slug")`; `join`-поля — `collection: rel("slug")`.
- `admin.group`: «Контент» (pages, articles, objects, team, media), «Каталог» (thicknesses, thickness-groups, glass-types, processing-services, constructions, shower-configs), «Справочники объектов» (products, object-types, cities). Для каждой коллекции заданы `admin.useAsTitle`, `defaultColumns`, `listSearchableFields`.
- Права: `read` — `publishedOrLoggedIn` для коллекций с черновиками, иначе `isAnyone`; `create/update/delete` — `isAdmin` (менеджер видит контент в админке только на чтение).
- Черновики/версии (`versions: { drafts: true, maxPerDoc: 20 }`, без автосохранения): `pages`, `articles`, `objects`, `glass-types`, `constructions`, `shower-configs`. У остальных версий нет.
- Хуки ревалидации: `revalidateCollection(slug)` на `afterChange` и `afterDelete` у каждой коллекции.
- Метки `{N}`, `{цена}` и др. остаются в тексте как есть (подстановка при рендере).
- Базовые поля Payload (`id` — UUID, `createdAt`, `updatedAt`) не дублировать.

### Общие поля — `src/payload/fields/*`

**`seoField({ priceVariant?: boolean })`** → group `seo` (label «SEO»):
`h1` (text), `title` (text, validate-предупреждение > 70 знаков не блокирует), `description` (textarea, предупреждение > 170), `noindex` (checkbox, default false), `canonical` (text; путь `/…/` или абсолютный URL; по умолчанию canonical = сам путь), `ogImage` (upload→media), `titleNoPrice` (text, только при `priceVariant: true` — title без цены для 15/19 мм и просроченной цены). Значения могут содержать метки (`{N}`, `{цена}`, `{вес}`…) — H1/title/description берутся из `docs/inex/17-meta.md`.

**`quizPrefillField()`** → group `quizPrefill`: `type` (select, ключи `productTypes` = `QUIZ_TYPES` домена task-11: tempered|triplex|partitions|railings|shower|canopies|facade|shopfronts|verandas|mirrors|other), `thickness` (select 4|5|6|8|10|12|15|19), `kind` (select = `QUIZ_KINDS` домена: clear|low-iron|matte|tinted|painted|ribbed|bent; значения уходят в URL квиза как есть — `?type=…&vid=…`, без маппинга), `ctaLabel` (text, default «Рассчитать стоимость»), `secondaryForm` (select drawing|load|sample|none, default drawing), `secondaryLabel` (text, default «Отправить чертёж»; напр. «Отправить проект», «Отправить планировку»).

**`slugField({ from?: string })`** → text `slug`: `required`, `index`, `unique`, validate `^[a-z0-9]+(?:-[a-z0-9]+)*$` (kebab-case, латиница в нижнем регистре), `beforeValidate`: если пусто и есть исходное поле `from` — транслитерировать. Экспорт `transliterate(input)` (ГОСТ 7.79 «система Б», упрощённо; **должен давать слаги из реестра ТЗ**): а a, б b, в v, г g, д d, е e, ё e, ж zh, з z, и i, й j, к k, л l, м m, н n, о o, п p, р r, с s, т t, у u, ф f, х h, ц c, ч ch, ш sh, щ shch, ъ «», ы y, ь «», э e, ю yu, я ya; пробелы и знаки → `-`; схлопывание дефисов; нижний регистр. Тесты: «Можно ли резать закалённое стекло» → `mozhno-li-rezat-zakalennoe-steklo`; «Для дизайнеров и архитекторов» → `dlya-dizajnerov-i-arhitektorov`; «Остекление веранд» → `osteklenie-verand`; «Застройщикам» → `zastrojshchikam`.

**`faqField()`** → array `faq` (label «Частые вопросы»): `question` (text, required), `answer` (richText `richTextEditor`, required). Текст ответа (plain) строится для JSON-LD `FAQPage`.

**`pathFields(opts)`** → набор для коллекций с явным URL (`pages`, `constructions`; прочие вычисляют `path` по шаблону):
- `path` (text, `index`, `unique`, `admin.readOnly`, вычисляется в `beforeValidate` и не вводится руками; формат `^/([a-z0-9]+(?:-[a-z0-9]+)*/)*$`, корень `/`);
- `assertUniquePath(req, path, selfCollection, selfId)` — проверка уникальности пути среди **всех** коллекций с `path`: `pages`, `constructions`, `glass-types`, `processing-services`, `thicknesses` (Local API `find` по `where path equals`, `limit 1`, `overrideAccess: true`); при конфликте — `ValidationError` «Такой адрес уже занят: …»;
- зарезервированные префиксы — запрещены: `/admin/`, `/api/`, `/_next/`, `/zakaz/`.

**`cardField()`** → group `card` (карточка в хабах, мега-меню, «Читать также»): `title` (text; если пусто — заголовок документа), `text` (textarea — подпись, напр. «приватность без потери света»), `image` (upload→media), `icon` (text — имя иконки Lucide), `priceHint` (text, напр. «от 700 ₽/м²*» — для статических подсказок; цены в карточках берутся из `prices`, а не отсюда).

**`tablesField()`** → array `tables` (универсальные таблицы для видов стекла, обработки, конструкций): `role` (select `parameters|comparison|schemes|other`), `heading` (text), `lead` (textarea), `columns` (array `{ label, align (left|center|right), numeric (checkbox) }`, min 2), `rows` (array `{ cells: array<{ value (textarea), positive (checkbox — подсветка «выгодного» значения, `ct-pos`), href (text) }>, rowHref (text) }`), `mobileMode` (select `cards|pairs`, default cards: на ≤599 px таблица → `.ig-mcard` или `.ig-pair`), `footnote` (text). Валидация: число ячеек в каждой строке = числу столбцов.

**`requiredOnPublish(message)`** → validate-хелпер для полей объектов: ошибка «message», если `data._status === "published"` и значение пусто; в черновике допускается пусто.

### Блоки — `src/payload/blocks/*`

Общие хелперы:
- `sectionFields()` — поля секции для блоков: `anchorId` (text, `^[a-z][a-z0-9-]*$`, напр. `ceny`), `background` (select `auto|bg|sf|dark|primaryDark`, default `auto` — чередуется автоматически), `heading` (text), `headingLevel` (select h2|h3, default h2), `sub` (textarea).
- `ctaFields()` — массив кнопок `buttons` (max 3): `label` (text, required), `kind` (select `quiz|form|link|download`), `formKey` (select drawing|callback|sample|load|contacts|full; при `kind=form`), `formParams` (json — параметры формы чертежа: `{ label, sourceLabel, accept }`), `link` (`linkField`, при `kind=link`), `file` (upload→media, при `kind=download`), `variant` (select primary|secondary|ghost), `icon` (text, Lucide).

| Блок (slug) | Поля сверх `sectionFields` (если у блока есть секция) |
|---|---|
| `hero` | `variant` (select `ctHero|p5Top|home`, required), `eyebrow` (array text), `titleOverride` (text; иначе H1 документа), `lead` (richText), `facts` (textarea — строка фактов `ct-facts`), `strong` (text — выделенная строка `ct-strong`), `buttons`, `showTerms` (checkbox, true), `termsMode` (select full|short), `image` (upload), `imageAlt` (text), `photos` (array `{ image, caption }`), `bigNumber` (text — «10» + «мм», `th-big`), `stats` (array `{ value, text }` — плитки статистики главной). Без `sectionFields` |
| `richText` | `content` (richText, required), `width` (select narrow|normal|wide, default normal) |
| `table` | `table` (group из полей `tablesField`-строки: `role`, `caption`, `columns`, `rows`, `mobileMode`, `footnote`, `highlightColumn` number) |
| `steps` | `items` (array `{ title, text (textarea), linkLabel, link (linkField без label) }`, min 2), `variant` (select horizontal|vertical), `footnote` (text), `buttons` |
| `callout` | `tone` (select `warning|info`), `title` (text), `body` (richText), `icon` (text), `items` (array `{ lead (text, жирный), text (richText) }` — маркированный список внутри callout, как «Что важно знать до заказа») |
| `terms` | `mode` (select `global|globalShort|custom`, default global — берёт `conditions.termsBar`), `items` (array `{ text, icon }` при custom), `variant` (select bar|plain) |
| `cards` | `layout` (select `g3|g4|ctCards|p5Cards|seg`), `items` (array `{ title, text, link (linkField), image, icon, priceHint, tone (select default|negative|accent) }`) — `negative` для плашки «физические шаблоны не принимаем» |
| `collectionCards` | `source` (select `glassTypes|processingServices|constructions|thicknesses|articles`), `mode` (select `all|manual|group`), `group` (select для constructions: constructions|glazing|mirrors|hardware), `items` (relationship polymorphic, hasMany — при manual), `columns` (select 3|4), `showPrices` (checkbox — для thicknesses показывать цены/вес из `prices`) |
| `pricesTable` | `variant` (select table|cards|both), `showIncluded` (checkbox, true), `showCaption` (checkbox, true), `showPromo` (checkbox — подпись акции), `showWeight` (checkbox, true), `calloutFromConditions` (checkbox) — рендер из глобала `prices`, анкор по умолчанию `ceny` |
| `faq` | `mode` (select `doc|inline`), `items` (по `faqField`) при inline — при `doc` выводится `faq` документа |
| `cta` | `variant` (select `buttons|banner|strip|split`), `title`, `body` (richText), `sideText` (textarea), `buttons`, `link` (`linkField` — для `strip`, напр. «inex.su»), `tone` (select light|primaryDark) — `split` = «Расчёт под снег» (слева текст, справа плашка с кнопкой) |
| `compare` | `topicTitle` (default «Этап»), `leftTitle` (default «Когда заказываете на заводе сами»), `rightTitle` (default «Когда через Inex Glass»), `rows` (array `{ topic, left, right }`, min 1), `footLink` (linkField) |
| `download` | `items` (array `{ title, description, file (upload→media), fileMissing (checkbox — «файл будет добавлен») }`), `variant` (select list|card) |
| `holesCalculator` | `defaultThickness` (select 4…19, default 10), `showScheme` (checkbox, true), `note` (textarea), `ctaLabel` (text) |
| `weightCalculator` | `defaultMode` (select single|triplex), `showTable` (checkbox, true), `showFormula` (checkbox, true) |
| `form` | `formKey` (select drawing|callback|sample|load|contacts|full, required), `variant` (select card|inline|page), `bullets` (array text), `showContacts` (checkbox), `submitLabel` (text), `fileLabel` (text), `sourceLabel` (text — метка источника в заявке), `params` (json) |
| `snippet` | `snippetKey` (text, required; validate: ключ существует в глобале `snippets` через `req.payload.findGlobal({ slug: relGlobal("snippets") })`) |
| `stats` | `items` (array `{ value, text }`, min 1), `variant` (select glass|tiles|plain) |
| `objectsFeed` | `mode` (select featured|byProduct|manual), `product` (rel products), `objects` (rel objects hasMany), `limit` (number, default 4), `showAllLink` (checkbox, true), `allLinkLabel` (text, default «Все объекты») |
| `articlesFeed` | `mode` (select featured|latest|manual), `articles` (rel articles hasMany), `limit` (number, default 4) |
| `whoDoesWhat` | `leftTitle` (default «Inex Glass»), `leftItems` (array text), `rightTitle` (default «Ваша бригада»), `rightItems` (array text), `strip` (group `{ enabled, title, text, buttonLabel, url }` — «Нужен монтаж «под ключ»?» → inex.su) |
| `systems` | `source` (select `doc|inline`), `items` (по структуре `constructions.systems`), `layout` (select cards|table) |
| `gallery` | `images` (array `{ image, alt (required), caption }`), `layout` (select grid|slider) |
| `twoColumns` | `left` (group `{ heading, body (richText) }`), `right` (group `{ heading, body }`) |
| `linkList` | `variant` (select chips|bridge|buttons), `label` (text — «Рядом:»), `items` (array `{ link (linkField), description }`) |
| `contactsMap` | `showMap` (checkbox, true — карта грузится по клику), `showLocations` (checkbox, true), `showHours` (checkbox, true) — данные из `contacts` |
| `requisites` | `showDownload` (checkbox, true), `anchorId` по умолчанию `rekvizity` — данные из `requisites` |
| `teamGrid` | `limit` (number), `emptyBehavior` (select hide|message) — данные из `team` |
| `quizCta` | `heading`, `text`, `buttonLabel`, `prefill` (`quizPrefillField`) |

### Коллекции — каталог

**`media`** (upload, `slug: "media"`): `upload.staticDir` = абсолютный `getEnv().MEDIA_DIR`; `mimeTypes`: `image/png`, `image/jpeg`, `image/webp`, `image/avif`, `image/svg+xml`, `application/pdf`; `imageSizes`: `thumbnail` (400 w), `card` (800 w), `hero` (1600 w), `og` (1200×630, crop center); `adminThumbnail: "thumbnail"`; `focalPoint: true`. Поля: `alt` (text; обязателен для изображений — validate по `siblingData.mimeType`), `caption` (text), `kind` (select `photo|illustration|background|scheme|document`, default photo), `isPlaceholder` (checkbox, `index`, default false — «временное изображение», фильтр в админке), `generatedId` (text, `index` — id из манифеста генератора изображений), `credit` (text), `sourceUrl` (text — происхождение, для импорта). Права: `read: isAnyone`; запись — admin. `admin.listSearchableFields: ["filename", "alt"]`.

**`pages`** (`slug: "pages"`, drafts): `title` (text, required, useAsTitle), `isHome` (checkbox; не более одного документа — валидатор/хук; путь `/`), `template` (select `home|hub|service|segment|company|contacts|legal|listing|tool|generic`, required, default generic), `parent` (rel self, `filterOptions` исключает сам документ), `pathPrefix` (text, default `/`, используется, если `parent` не задан и документ не главная; напр. `/instrumenty/`), `slug` (`slugField({ from: "title" })`, для главной можно `home`), `path` (по `pathFields`: главная → `/`; иначе `(parent?.path ?? pathPrefix) + slug + "/"`; `afterChange` пересчитывает `path` потомков, если путь изменился), `breadcrumbLabel` (text), `layout` (blocks: `pageBlocks`), `faq` (`faqField`), `seo` (`seoField`), `quizPrefill`, `hideConditions` (checkbox — отключить автоблок «Условия» в page shell), `hideQuizCta` (checkbox), `documentVersion` (text — версия документа для legal), `legacyUrls` (array `{ url }`), `publishedAt` (date). Права чтения — `publishedOrLoggedIn`.

**`thicknesses`** (без черновиков): `n` (number, required, unique, одно из 4,5,6,8,10,12,15,19, label «Толщина N, мм»), `slug` (text, readOnly, = `${n}-mm`), `path` (text, readOnly, = `/zakalennoe-steklo/${n}-mm/`), `indexable` (checkbox, default true; false для 5, 15, 19; итоговый noindex = `!indexable || seo.noindex`), `group` (rel `thickness-groups`, required), `weightPerM2` (number, readOnly, вычисляется `n × 2.5` в `beforeValidate`), `kindsText` (text, required — «Виды», напр. «все, включая крашеное и гнутое»), `canPaint` (checkbox, default n ≤ 15), `canBend` (checkbox, default 4 ≤ n ≤ 12), `sizeText` (text — переопределение строки размера; по умолчанию из `tech-params`), `leadTimeText` (text — переопределение срока), `podborOverride` (richText), `obrabotkaOverride` (richText), `faqOverride` (`faqField` с именем `faqOverride`), `internalApplications` (textarea, admin-only, `description`: «не публикуется» — колонка «применения» из `p0-kartochki-tolshchin.md`), `card` (`cardField`), `seo` (`seoField({ priceVariant: true })`), `quizPrefill` (default type tempered, thickness = n), `layout` (blocks `pageBlocks`, необязательные доп. секции). Соседние толщины вычисляются на рендере по отсортированному списку.

**`thickness-groups`**: `label` (text, required, «4–5 мм», «6–8 мм», «10–12 мм», «15–19 мм»), `slug` (text), `order` (number), `thicknesses` (join → `thicknesses` on `group`), `podborText` (richText, required; с метками `{N}`), `obrabotkaText` (richText, required), `faq` (`faqField`).

**`glass-types`** (drafts): `title` (text, required, useAsTitle; «Матовое закалённое»), `slug` (`slugField`; значения: `matovoe`, `okrashennoe`, `osvetlennoe`, `tonirovannoe`, `dlya-mebeli`, `riflenoe`, `mollirovannoe`, `tripleks`), `urlBase` (select `zakalennoe-steklo|root`, default zakalennoe-steklo; для `tripleks` — `root`), `path` (readOnly: `/zakalennoe-steklo/${slug}/` или `/${slug}/`), `breadcrumbLabel` (text), `order` (number), `showInHub` (checkbox, true), `card` (`cardField`), `heroImage` (upload), `intro` (richText — абзац `ct-facts`, допускает `{условия}`), `heroPhotos` (array `{ image, caption }`), `variantsHeading` (text, default «Варианты»), `variants` (array: `key` text, `name` text required, `description` textarea, `application` textarea («Где чаще применяют»), `swatchKind` select `color|image|pattern`, `swatchColor` text (hex), `swatchImage` upload, `patternKey` text (CSS-класс узора, напр. `moru`)), `variantsNote` (richText), `variantsCallout` (group `{ title, body richText }`), `tables` (`tablesField`), `importantTitle` (text, default «Что важно знать до заказа»), `importantItems` (array `{ lead text, text richText }`), `limits` (group: `thickMin` number, `thickMax` number, `allowedThicknesses` number hasMany (напр. рифлёное [4,6,8]), `sizeMinW`, `sizeMinH`, `sizeMaxW`, `sizeMaxH` numbers, `radius` array `{ thicknessFrom, thicknessTo, minRadius }`, `notes` textarea), `applications` (array `{ text, description, link (linkField) }` — «Где применяют»), `relatedLinks` (array `{ link (linkField), description }`), `showSamples` (checkbox), `samplesSnippetKey` (text, default `samples`), `showObjects` (checkbox), `objectsProduct` (rel `products`), `faq`, `seo`, `quizPrefill` (type tempered/triplex, kind), `layout` (blocks).

**`processing-services`** (без drafts): `title`, `slug` (kromka, otverstiya-i-vyrezy, facet, matirovanie, plenki, pechat), `path` (readOnly `/obrabotka-stekla/${slug}/`), `order`, `card` (`cardField`), `keyLimit` (text — главное ограничение на карточке хаба, напр. «Ø 4–130 мм»), `intro` (richText), `heroImage`, `tables` (`tablesField`), `howToSpecify` (richText — «Как указать в чертеже»), `importantTitle`/`importantItems` (как в glass-types), `callouts` (array `{ tone, title, body richText }`), `hasHoleCalculator` (checkbox), `ctaPrimaryLabel` (text), `ctaSecondaryLabel` (text), `relatedLinks`, `faq`, `seo`, `quizPrefill`, `layout`.

**`constructions`** (drafts): `title`, `kind` (select `hub|construction`), `group` (select `constructions|glazing|mirrors|hardware`), `parent` (rel self), `slug`, `path` (по `pathFields`: `(parent?.path ?? "/") + slug + "/"`; примеры `/steklyannye-peregorodki/`, `/osteklenie/fasadov/`, `/zerkala/dlya-zalov/`, `/furnitura/`), `children` (join → `constructions` on `parent`), `breadcrumbLabel`, `order`, `card` (`cardField`), `heroImage`, `intro` (richText), `systemsHeading` (text, default «Какую систему выбрать»), `systemsLayout` (select cards|table), `systems` (array: `name` text required, `subtitle` text, `whereFits` textarea («Где уместна»), `important` textarea («Что важно знать»), `howHeld` textarea («Как держится стекло»), `requiresInGlass` textarea («Что нужно в стекле»), `image` upload, `schemeSvg` textarea (inline SVG схема) ), `profileSystems` (array `{ name, note, url }` — Алютех, СИАЛ, Loft-Gratec, Доксал, Татпроф, Фристайл), `glassHeading` (text), `glassBullets` (array richText `{ body }`), `riskCallout` (group `{ enabled, title, body richText }`), `documents` (richText), `productTag` (rel `products`), `objectsHeading` (text), `whoDoesWhat` (group `{ enabled, leftItems[], rightItems[] }`), `inexSuBridge` (group `{ enabled, title, text, buttonLabel, url (default https://inex.su) }`), `snowCalcBlock` (group `{ enabled, title, body richText, sideText, ctaLabel, formParams json }` — «Расчёт под снег» это CTA, не калькулятор), `showShowerConfigs` (checkbox), `ctaPrimaryLabel` («Рассчитать комплект»), `ctaSecondaryLabel`, `secondaryFormKey` (select drawing|load|none), `tables` (`tablesField`), `faq`, `legacyUrls`, `seo`, `quizPrefill` (type), `layout`.

**`shower-configs`** (drafts; импорт с inex.su ~20 карточек): `name` (text, required), `slug`, `construction` (rel `constructions`), `configType` (select `straight-door|corner|trapezoid|walk-in|sliding|other`), `image` (upload), `gallery` (array `{ image, alt }`), `description` (textarea), `glassThicknesses` (select hasMany 8|10), `order` (number), `legacyUrl` (text), `legacyId` (text), `sourceUrl` (text), `importNotes` (textarea, admin).

**`products`** («Изделия»): `name` (text, required; Перегородки, Ограждения, Козырьки, Фасады, Душевые, …), `slug`, `order`, `quizType` (select — ключ типа квиза, те же значения, что `quizPrefill.type`), `construction` (rel `constructions`, optional).
**`object-types`** («Типы объектов»): `name` (ТЦ, банк, офис, арена, аэропорт, концертный зал, коттедж, …), `slug`, `order`.
**`cities`** («Города»): `name`, `slug`, `region` (text), `order`.

### Коллекции — контент

**`articles`** (drafts, `path` = `/blog/${slug}/`): `title` (text, required), `slug`, `path` (readOnly), `lead` (richText — «Коротко», плашка `primary-light`), `body` (richText, required; оглавление строится из H2 на рендере), `datePublished` (date, required при публикации), `dateModified` (date, автообновляется при изменении опубликованного документа), `author` (rel `team`, optional), `authorName` (text, default «Inex Glass»), `readingTimeMinutes` (number, авто = ceil(слов / 180) через `lexicalToPlainText`, если не задано), `card` (`cardField`), `heroImage`, `commercialLink` (group `{ label, link (linkField без label) }` — следующий шаг), `ctaCard` (group `{ title, text, buttonLabel, formKey (select drawing|load|callback) }`), `related` (rel `articles` hasMany, max 3), `featuredOnHome` (checkbox), `homeOrder` (number), `tools` (array `{ label, link }`), `seo`, `quizPrefill`.

**`objects`** (drafts, `path` = `/obekty/${slug}/`): `name` (text, required), `slug`, `path`, `city` (rel `cities`), `objectType` (rel `object-types`), `products` (rel `products`, hasMany), `year` (number, 1990…текущий+1), `task` (textarea, maxLength 300 — «Задача и сложность одной фразой»), `spec` (array: `product` text, `thickness` text («10», «8+8»), `kind` text, `triplexFormula` text, `processing` text), `chips` (array text, max 3 — «закалённый триплекс 8+8»), `photos` (array: `image` upload→media required, `alt` text required, `caption`), `related` (rel `objects` hasMany, max 4), `featured` (checkbox, index), `sortDate` (date, default now, index — для «Сначала новые»), `legacyUrls` (array `{ url }`), `legacyId`, `sourceUrl`, `importNotes` (textarea, admin-only), `seo`, `quizPrefill`. **Правила публикации (через `requiredOnPublish`)**: обязательны `city`, `objectType`, `products` (≥1), `year`, `task`, `spec` (≥1 строка с `product` и `thickness`), `photos` (≥1, у каждого `alt`). В черновике (импорт) можно пусто.

**`team`**: `name` (text, required), `role` (text — должность), `area` (textarea — зона ответственности), `photo` (upload), `order` (number), `email` (email), `phone` (text), `hidden` (checkbox). Страница-шаблон скрыта, пока нет ни одной записи (логика задачи 29).

### Хуки (в этой задаче)

- `beforeValidate`: транслит `slug`; вычисление `path` (pages/constructions по родителю; остальные — шаблоном выше); `weightPerM2`/`slug`/`path` у толщин; `readingTimeMinutes`; `dateModified`; проверка единственной главной; `assertUniquePath`.
- `afterChange` у `pages` и `constructions`: каскадный пересчёт `path` потомков (`req.context.disableRevalidate` не ломать; избегать бесконечной рекурсии через `req.context.skipPathCascade`).
- Все `afterChange/afterDelete` — ревалидация (контракт 06).

## Acceptance Criteria

- [ ] Созданы все 14 коллекций, общие поля и 29 блоков; `catalogCollections`, `contentCollections`, `pageBlocks` экспортированы; слаги коллекций kebab-case.
- [ ] Каждая коллекция содержит все перечисленные поля (имя, тип, обязательность, валидация); `media` принимает изображения и PDF, `staticDir` из `MEDIA_DIR`, поле `isPlaceholder` проиндексировано.
- [ ] `pages`: путь вычисляется (`parent`/`pathPrefix`/главная), уникальность пути проверяется по всем коллекциям с `path`, зарезервированные префиксы запрещены; пересчёт потомков работает (проверено ручным тестом через Local API на одноразовой БД).
- [ ] `thicknesses`: `slug`, `path`, `weightPerM2` вычисляются автоматически (`n=10` → `10-mm`, `/zakalennoe-steklo/10-mm/`, 25); `seo.titleNoPrice` присутствует.
- [ ] `objects`: черновик сохраняется без полей; публикация без `city`/`products`/`spec`/`photos` с `alt` запрещена с понятными сообщениями на русском.
- [ ] У `pages`, `articles`, `objects`, `glass-types`, `constructions`, `shower-configs` включены черновики/версии; чтение анонимом возвращает только опубликованные.
- [ ] `transliterate` проходит тесты на слаги из реестра ТЗ; `lexicalToPlainText` покрыт тестом.
- [ ] `snippet`-блок валидирует `snippetKey` по глобалу `snippets`; `form`-блок требует `formKey`.
- [ ] Все `relationTo`/`join` через `rel()`; нет импортов несуществующих типов; `pnpm lint` и `pnpm typecheck` проходят; проверка длины идентификаторов Postgres выполнена (`dbName` у блоков и вложенных массивов); **миграции не созданы**.
- [ ] В отчёте перечислены отступления от брифа (расширенный список шаблонов `pages.template`, дополнительные блоки `collectionCards`, `pricesTable`, `requisites`, `teamGrid`, `quizCta`, `twoColumns`, `linkList`, `contactsMap`, `tables[]` вместо единственной `parametersTable`).

## Notes

- Модель: премиальная (кодинг, крупная схема). Использовать context7 (`/payloadcms/payload`) и Exa: поля `blocks`, `join`, `upload`, `versions`, `validate` с `siblingData`, `dbName`.
- Принцип: типизированные поля — данные, нужные карточкам, хабам, мега-меню, JSON-LD, квизу и предзаполнению; все остальные секции страницы — `layout` (блоки). Шаблоны страниц (задачи 22–31) выводят типизированные секции в фиксированном порядке, затем `layout`.
- Тексты по умолчанию в схеме не нужны (сид — задача 16 и слайсы); исключение — подписи полей и `description` для редакторов.
- Если при чтении прототипов выяснится, что поля не хватает, добавьте его сейчас: после задачи 10 схему менять нельзя.
- Не создавать фиктивных опубликованных объектов; объекты в сиде — только черновики.
