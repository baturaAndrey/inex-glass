# Task 16: Рендер блоков, Rich Text с метками и каркас сида (globals + мини-сид)

## Status

pending

## Wave

4

## Description

Три связанные части: (1) компоненты библиотеки блоков и `RenderBlocks` — фронтенд-представление блоков, которые редактор собирает в `pages` (и других шаблонах); (2) рендерер Lexical → JSX с движком меток `{цена_10мм}`, `{условия}` и т. п.; (3) каркас сидирования: CLI `pnpm seed`, контекст без ревалидации, конвертер markdown → Lexical, наполнение всех globals значениями из ТЗ/SSoT и «мини-сид» (по одной записи на каждый шаблон) для e2e и разработки. Файлы срезов `src/seed/slices/*.ts` создаются как заглушки — их наполняют задачи Wave 5.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md
**Blocks:** task-15 (использует `RenderBlocks` — контракт той же волны), task-20–33 (срезы сида, замена блоков-заглушек: 21, 23, 25, 29, 31), task-35/36 (`docUrl`)

**Context from dependencies:**
- **task-10**: схема заморожена; `src/payload-types.ts` содержит типы всех коллекций, globals и **блоков** (`Page['layout']` — union по `blockType`). Блоки определены в `src/payload/blocks/*.ts` (task-07), всего **29** slug: hero, richText, table, steps, callout, terms, cards, collectionCards, pricesTable, faq, cta, compare, download, holesCalculator, weightCalculator, form (поле `formKey`: drawing / callback / sample / load / contacts / full), snippet (ссылка на global `snippets`), stats, objectsFeed, articlesFeed, whoDoesWhat, systems, gallery, twoColumns, linkList, contactsMap, requisites, teamGrid, quizCta. **Перед началом прочитайте** каждый файл блока и сгенерированные типы: имена полей и `blockType` берутся оттуда; схему не менять.
- **task-11**: `@/lib/domain` — движок меток (`replacePlaceholders`, `PlaceholderContext`), `SEED_PRICES_2026_10_15`, `RU_HOLIDAYS_2026_2027`, `EXPERIENCE_PHRASE`, `DEFAULT_TECH_LIMITS`, `DEFAULT_DELIVERY_CITIES`.
- **task-12/13**: UI-примитивы в `src/components/ig/*` (`DataTable`, `Steps`, `Callout`, `Terms`, `Compare`, `Faq`, `Card`, `StatsTiles`, `Accordion`, `Lightbox`, `Button`…).
- **Same-wave контракт с task-15**: `@/lib/cms/globals` экспортирует `getPlaceholderContext({ thickness? })` (серверная сборка `PlaceholderContext` из globals) и загрузчики globals; `PageShell`/catch-all импортируют `RenderBlocks` из `@/components/blocks/render-blocks` с сигнатурой `RenderBlocks({ blocks, ctx? })`, где `ctx?: PlaceholderContext` (если не передан — `RenderBlocks` сам вызывает `getPlaceholderContext()`).
- **Контракт с Wave 5**: эти файлы здесь — **заглушки**, которые целиком заменят задачи волны 5 (сохраняя имя экспорта и пропсы `{ block, ctx }`):
  - `holes-calculator-block.tsx` — task-25;
  - `weight-calculator-block.tsx` — task-31;
  - `form-block.tsx` — task-21;
  - `prices-table-block.tsx` — task-23 (обёртка над `PricesTableSection`);
  - `contacts-map-block.tsx`, `requisites-block.tsx`, `team-grid-block.tsx` — task-29 (обёртки над компонентами `src/components/company/*`).

## Files to Create

Блоки (`src/components/blocks/`):
- `render-blocks.tsx` — реестр `blockType → компонент`, подстановка контекста меток
- `hero-block.tsx`, `rich-text-block.tsx`, `table-block.tsx`, `steps-block.tsx`, `callout-block.tsx`, `terms-block.tsx`, `cards-block.tsx`, `collection-cards-block.tsx`, `faq-block.tsx`, `cta-block.tsx`, `compare-block.tsx`, `download-block.tsx`, `stats-block.tsx`, `snippet-block.tsx`, `objects-feed-block.tsx`, `articles-feed-block.tsx`, `who-does-what-block.tsx`, `systems-block.tsx`, `gallery-block.tsx`, `two-columns-block.tsx`, `link-list-block.tsx`, `quiz-cta-block.tsx` — полноценные реализации
- `holes-calculator-block.tsx`, `weight-calculator-block.tsx`, `form-block.tsx`, `prices-table-block.tsx`, `contacts-map-block.tsx`, `requisites-block.tsx`, `team-grid-block.tsx` — заглушки («Калькулятор появится…» / кнопка, открывающая форму через `FormTrigger` / заголовок секции и короткий текст), их заменят задачи волны 5 (см. «Контракт с Wave 5»)

SEO-утилита:
- `src/lib/seo/doc-url.ts` (+ `doc-url.test.ts`) — `docUrl(collection, doc): string | null` — **единственный** резолвер «документ → канонический путь со слешем» (используют `internal-links.ts`, поиск task-35, sitemap/IndexNow task-36)

Rich Text (`src/components/rich-text/`):
- `rich-text.tsx` — `RichText({ data, ctx? })`
- `placeholders-context.tsx` — клиентский провайдер и хук для клиентских компонентов
- `internal-links.ts` — `docToHref(doc)` для внутренних ссылок Lexical (тонкая обёртка над `docUrl` из `src/lib/seo/doc-url.ts`)
- `rich-text.test.tsx` или `.test.ts` — vitest на конвертер (метки внутри Lexical-узлов)

Сид (`src/seed/`):
- `index.ts` — CLI
- `context.ts`
- `lexical.ts` — `markdownToLexical`
- `globals.ts` — значения всех globals
- `minimal.ts` — мини-сид
- `slices/{home,zak-hub,thicknesses,glass-types,processing,constructions,glazing-mirrors,how-to-order,klientam-company,objects,blog,legal}.ts` — **заглушки** `export async function seed(ctx: SeedContext): Promise<void> {}`

## Files to Modify

Нет. (`package.json`: скрипт `seed` создан в task-01 — **не править**; прочитайте, как он запускает `src/seed/index.ts`, и подстройтесь. Если скрипта нет — сообщить координатору.)

## Technical Details

### 1. RenderBlocks

```tsx
export async function RenderBlocks({ blocks, ctx }: { blocks: Page['layout'] | null | undefined; ctx?: PlaceholderContext }) {
  const pctx = ctx ?? (await getPlaceholderContext());
  return <>{blocks?.map((b) => { const C = REGISTRY[b.blockType]; return C ? <C key={b.id} block={b} ctx={pctx} /> : null; })}</>;
}
```
- Реестр `REGISTRY: Record<BlockType, ComponentType<{ block; ctx }>>` — один компонент на **каждый** из 29 slug (тип `Record` по union из `payload-types` гарантирует полноту при typecheck), типы пропсов через `Extract<Page['layout'][number], { blockType: 'xxx' }>`. Реестр после этой задачи не меняется: волна 5 заменяет только файлы-заглушки.
- Неизвестный `blockType` — не падать, в dev логировать `console.warn`.
- Каждый блок-секция оборачивается в `Section` из task-05 с чередованием фонов `bg` / `surface` (ритм секций `.blk`: padding 96 / 72 / 48 px на ≥1366 / ≤1100 / ≤599, чередование `--ig-bg` и `--ig-surface`; тёмные — только `dark`/`primary-dark` варианты, если блок это требует: например callout-акцент). Чередование определяется индексом блока в списке.
- Все строковые поля блоков (заголовки, ячейки таблиц, подписи) пропускаются через `replacePlaceholders(text, ctx)`; Rich Text — через конвертер (см. ниже).
- Правила рендера по типам: `table` → `DataTable` (поля колонок/строк/подсветка/mobileCards из схемы), `steps` → `Steps`, `callout` → `Callout` (warning/info), `terms` → `Terms` с пунктами из global `conditions` (блок не хранит данные — берёт их из CMS), `cards` → сетка `Card` (дочерние ссылки; 4/3/2/1 колонок на ≥1366/≥1101/≥600/<600), `faq` → `Faq` + JSON-LD `FAQPage` (`faqLd` из `@/lib/seo/jsonld` task-15), `cta` → блок с кнопками (`QuizLink` из `@/components/page/quiz-cta`, `FormTrigger`), `compare` → `Compare`, `download` → список файлов (иконка `FileText`, размер, ссылка на медиа; `rel="noopener"`), `stats` → `StatsTiles` (без glass; glass — только hero главной в task-22), `snippet` → загружает документ global `snippets` по имени/ключу и рендерит его Rich Text, `objectsFeed`/`articlesFeed` → серверный запрос (через `@/lib/cms/queries`, лимит из блока, фильтр по продукту/тегу) и сетка карточек (карточки объектов/статей упрощённые; полноценные — task-30/31), `whoDoesWhat`/`systems`/`gallery` → простые варианты (таблица «кто за что отвечает», карточки систем, сетка фото с `Lightbox`); `hero` → `PageHero` (variant `ct-hero` по умолчанию) с H1, кнопками «Рассчитать стоимость» и вторичной.
- Дополнительные блоки (полноценно): `collectionCards` → серверный запрос по `source`/`mode`/`group` через `@/lib/cms/queries` и сетка `Card` (ссылки — `docUrl`; `showPrices` для толщин — `resolvePrice` + вес); `twoColumns` → две колонки `RichText`; `linkList` → чипсы/кнопки/«мост» (`variant` chips|bridge|buttons) со ссылками `linkField`; `quizCta` → `QuizCta` из `@/components/page/quiz-cta` (prefill из блока, `src` = путь страницы).
- Блоки-заглушки: `holes-calculator-block.tsx`, `weight-calculator-block.tsx` — карточка с текстом «Калькулятор подключается отдельной задачей»; `form-block.tsx` — секция с заголовком/описанием блока и кнопкой, открывающей модальную форму `FormTrigger formKey={block.formKey}` (на страницах без JS остаётся ссылка `/kontakty/`); `prices-table-block.tsx`, `contacts-map-block.tsx`, `requisites-block.tsx`, `team-grid-block.tsx` — секция с `heading` блока и нейтральным текстом (без выдуманных данных). Эти семь файлов будут заменены целиком (25, 31, 21, 23, 29) — не вносите в них логику.
- `next/image` для медиа: `src` относительный (`images.localPatterns`), явные `width/height` либо `fill` + `sizes`, `alt` берётся из документа `media` (обязателен), для `isPlaceholder` — аннотация не нужна.

### 2. RichText (Lexical → JSX)

- Использовать `RichText` из `@payloadcms/richtext-lexical/react` с кастомными `converters` (сверить API для Payload 3.91 через context7: `defaultJSXConverters`, переопределение `text`, `link`, `heading`, `list`, `upload`, блоки внутри Lexical).
- Конвертер текстовых узлов: перед выводом `node.text = replacePlaceholders(node.text, ctx)`; форматирование (`bold`, `italic`) сохраняется.
- Стили типографики на Tailwind: `h2`=`ig-h2`, `h3`=`ig-h3`, абзац — `font: var(--ig-body)`, `text-wrap: pretty`, списки с маркерами `marker:text-primary`, ссылки — цвет `--ig-primary-pressed` подчёркнутые, таблицы Lexical (если включены в схеме) → класс `ig-table`. Максимальная ширина строки текста ≈ 72ch.
- Внутренние ссылки (`link` с `doc`): `docToHref({ relationTo, value })` → `docUrl(relationTo, value)` → URL: `pages` → путь страницы; `thicknesses` → `/zakalennoe-steklo/{n}-mm/`; `glass-types` → `/zakalennoe-steklo/{slug}/` (исключения: `tripleks` → `/tripleks/`); `processing-services` → `/obrabotka-stekla/{slug}/`; `constructions` → корневой путь по таблице slug→URL (peregorodki → `/steklyannye-peregorodki/`, и т. д. — взять из схемы/поля `path`); `articles` → `/blog/{slug}/`; `objects` → `/obekty/{slug}/`. Внешние ссылки — `rel="noopener noreferrer"`, `target` только если задан в узле.
- `placeholders-context.tsx`: `'use client'` — `PlaceholdersProvider` (значение — сериализуемый `PlaceholderContext`: даты как ISO-строки) и `usePlaceholders()` + `usePlaceholderText(text)`; нужен клиентским компонентам, получающим строки с метками (калькуляторы, табы).
- Тест: JSON Lexical с текстом «Цена от {цена_10мм} ₽/м² на {дата_цен}» и ctx из `SEED_PRICES_2026_10_15` → в HTML присутствуют «1 400» (NBSP) и «15.10.2026»; неизвестная метка остаётся.

### 3. Сид: CLI и контекст

`pnpm seed -- [--minimal | --full | --only=<slice,slice>] [--only=globals] [--reset-slices]`:
- `--minimal`: globals + справочники + по одной записи на каждый шаблон (раздел 5).
- `--full`: globals + справочники + все срезы по порядку (home, zak-hub, thicknesses, glass-types, processing, constructions, glazing-mirrors, how-to-order, klientam-company, objects, blog, legal).
- `--only=a,b`: только указанные срезы (`globals` — отдельный «срез» для первичной заливки справочников на staging/prod).
- Без флагов — то же, что `--minimal`.
- Идемпотентность: повторный запуск не создаёт дублей (upsert по `slug`/`path`/`number`/`key`; globals — `updateGlobal`), не затирает правки редакторов в полях, которые сид не задаёт (для документов, уже существующих, обновлять только если передан `--force`; по умолчанию — пропуск существующих).
- `src/seed/context.ts`: `export interface SeedContext { payload: Payload; log: (msg: string) => void; force: boolean; options: { minimal: boolean } }`, `getSeedContext()` → `getPayload({ config })`; все записи делаются Local API с `overrideAccess: true`, `context: { disableRevalidate: true }` (хуки task-06/07 не вызывают `revalidateTag` вне Next-запроса) и `req`-less. В конце — вызвать `process.exit(0)`/`payload.destroy?.()`; ошибки → код выхода 1 с понятным сообщением.
- Запуск: как определено в `package.json` task-01 (рекомендуемый вариант — `payload run src/seed/index.ts`, чтобы env и конфиг загружались Payload; уточните по файлу).

### 4. `lexical.ts`: markdownToLexical

`markdownToLexical(markdown: string): SerializedEditorState` — использовать официальный конвертер Payload (`convertMarkdownToLexical` из `@payloadcms/richtext-lexical` + `editorConfigFactory.default({ config })`; сверить API для 3.91 в документации). Должны поддерживаться: заголовки `##`/`###`, абзацы, **жирный**, *курсив*, маркированные и нумерованные списки, ссылки `[текст](/путь/)`, таблицы (если включены в редакторе — иначе таблицы из teksty конвертируются в блок `table`, это дело срезов Wave 5). Хелпер `paragraphs(...strings)` для простых случаев. Тест: простой markdown даёт ожидаемые типы узлов.

### 5. Значения globals (`src/seed/globals.ts`)

Функции `seedGlobals(ctx)` — по одной на global; поля названы по схеме task-06 (читать `src/payload/globals/*.ts`).

| Global | Значения |
|---|---|
| `prices` | цены от, ₽/м²: 4→700, 5→750, 6→800, 8→1300, 10→1400, 12→2000; 15 и 19 — «по запросу» (цена пустая, флаг/текст); дата актуальности `2026-10-15`; порог устаревания 45 дней; «Входит в цену»: «листовое стекло выбранной толщины», «термическая закалка», «проверка параметров заказа»; «Считается отдельно»: «фигурная резка и сложная форма», «шлифовка, полировка, фацет», «отверстия, вырезы, печать, матирование»; подпись: «Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется» |
| `promo` | текст «−5% на закалённое стекло при заказе от 100 м²»; порог площади 100; дата начала 2026-10-15; дата окончания 2026-12-31 *(заглушка — уточнить у Inex)*; `active: true` |
| `conditions` | минимальный заказ «от 50 м²» (в FAQ — «50–100 м²»); срок «от 10 рабочих дней с даты договора»; срок триплекса «от 14 рабочих дней»; КП «в среднем 2–3 рабочих дня»; «срочного изготовления нет»; «монтаж не выполняем»; «цена в договоре фиксируется» |
| `contacts` | Челябинск — офис: ул. Артиллерийская, 124А, тел. +7 (351) 247-05-57, +7 951 489-04-09, sale@inex.su, пн–пт 9:00–18:00; Челябинск — склад и самовывоз: Свердловский тракт, 7В, пн–пт 9:00–18:00; Екатеринбург — офис: ул. Данилы Зверева, 17б, +7 982 329-11-08; основной телефон +7 (351) 247-05-57; основной e-mail sale@inex.su; часы «Пн–Пт 9–18»; мессенджеры — пустой массив *(данные ждут от Inex)* |
| `requisites` | оператор ПДн (`teksty/15-politika-pdn.md`, §1.2): ИП Копылов Александр Михайлович, ИНН 744700156319, ОГРНИП 323745600102871, адрес для корреспонденции: Свердловский тракт, 7В, г. Челябинск; остальные поля (банк, р/с, БИК) — пустые, PDF «Карточка предприятия» — не задан |
| `tech-params` | толщины 4,5,6,8,10,12,15,19; плоское стекло 150×300 — 3000×2000; крашеное 4–15 мм, 350×150 — 3000×1600; гнутое до 1200×2000, R ≥ 1000 (4–6 мм) / ≥ 1500 (8–12 мм), толщина 4–12; отверстия Ø 4–130 (до 220 с одной стороны), стекло с отверстиями 250×100 — 3000×1600; печать до 1100×700; правила ГОСТ 30698-2014: от кромки ≥ 2t, между отверстиями ≥ 2t, от угла ≥ 6t; допуски Ø: 4–20 → ±1 мм, 20–100 → ±2 мм, >100 по согласованию; допуски размеров (табл. 2 SSoT §11: до 2000 мм: ±2,0 / ±3,0; 2000–3000: ±3,0 / ±4,0; свыше 3000: ±4,0 / ±5,0 для толщины до 12 / свыше 12 мм); плёнки EVA 0,38 / 0,76 / 1,14 / 1,52 мм; кромки (шлифованная, полированная, «трапеция», «еврокромка», фацет 30 / 50 мм — только зеркала); цвета тонировки бронза / графит / серое; рифлёное 4 / 6 / 8 мм; города доставки: `DEFAULT_DELIVERY_CITIES` из domain (14 городов + «Самовывоз (Челябинск)»); вес 2,5 кг/м² на мм |
| `site-settings` | текст опыта «За 21 год специалисты Inex выполнили более 1500 проектов» (`EXPERIENCE_PHRASE`); `metrikaId` пусто; верификации пусто; e-mail уведомлений `sale@inex.su`; срок жизни ссылки заказа 90 дней; праздники — `RU_HOLIDAYS_2026_2027`; стоп-слова: «Heat Soak», «HST», «стеклопакет», «собственное производство», «закаливаем сами», «монтаж под ключ», «бронированн», «смарт-стекл», «антиблик», «шпион»; названия заводов-партнёров — пустой список *(заказчик внесёт; не придумывать)*; IndexNow выкл.; тексты cookie-баннера: из `teksty/15-politika-pdn.md` §3 |
| `navigation` | Верхняя строка: «Компания ▾» (О компании `/o-kompanii/`, Объекты `/obekty/`, Контакты `/kontakty/`, Реквизиты `/kontakty/#rekvizity`), «Связаться с нами ▾» (телефон, e-mail, мессенджеры, «Заказать звонок»), сегменты (Застройщикам `/klientam/zastrojshchikam/`, Подрядчикам `/klientam/podryadchikam/`, Дизайнерам и архитекторам `/klientam/dizajneram-i-arhitektoram/`, Производителям мебели `/klientam/proizvoditelyam-mebeli/`). Основная строка: Акции (`/zakalennoe-steklo/#ceny`, показывать только при активной акции), Блог `/blog/`. Строка разделов (9): Закалённое стекло `/zakalennoe-steklo/`, Триплекс `/tripleks/`, Обработка стекла `/obrabotka-stekla/`, Стеклянные перегородки `/steklyannye-peregorodki/`, Ограждения `/steklyannye-ograzhdeniya/`, Козырьки `/steklyannye-kozyrki/`, Остекление зданий `/osteklenie/`, Стекло для мебели `/zakalennoe-steklo/dlya-mebeli/`, Зеркала `/zerkala/`. Мега-меню «Каталог» (3 колонки: Стекло / Конструкции / Остекление зданий) и «Услуги» — состав и URL как в `res/inex-glass-handoff/zadaniya/02-shapka-podval.md` («Мега-меню»): *Стекло:* Закалённое стекло (4, 6, 8, 10, 12 мм → `/zakalennoe-steklo/{N}-mm/`), Матовое `/zakalennoe-steklo/matovoe/`, Тонированное `…/tonirovannoe/`, Крашеное по RAL `…/okrashennoe/`, Осветлённое `…/osvetlennoe/`, Рифлёное `…/riflenoe/`, Гнутое `…/mollirovannoe/`, Триплекс `/tripleks/`, Для мебели `…/dlya-mebeli/`; *Конструкции:* Стеклянные перегородки, Ограждения и перила, Козырьки, Душевые `/dushevye-peregorodki/`, Торговые витрины `/torgovye-vitriny/`, Зеркала (для залов `/zerkala/dlya-zalov/`, для салонов `/zerkala/dlya-salonov/`), Зажимной профиль и спайдеры `/furnitura/`; *Остекление:* Стеклянные фасады `/osteklenie/fasadov/`, Спайдерное `/osteklenie/spajdernoe/`, Витрины и магазины `/osteklenie/vitrin-i-magazinov/`, Лифтовые шахты `/osteklenie/liftovyh-shaht/`, Веранды и террасы `/osteklenie/verand-terras-besedok/`; *Услуги:* Обработка стекла (`/obrabotka-stekla/` + `kromka/`, `otverstiya-i-vyrezy/`, `facet/`, `matirovanie/`, `pechat/`, `plenki/`), Проектирование `/proektirovanie/`, Как заказать (`/kak-zakazat/` + `trebovaniya-k-chertezham/`, `dopuski-i-gost/`, `sroki/`, `upakovka-i-dostavka/`, `dokumenty/`, `priemka/`, `oplata/`), Калькулятор веса `/instrumenty/kalkulyator-vesa-stekla/`. Подвал: колонки «Каталог», «Услуги и Как заказать», «Компания», ссылки политики и согласия, мост «Двери, лестницы и другие конструкции Inex — на inex.su» (`https://inex.su/`) |
| `snippets` | «Образцы и цветопроба» — Rich Text: «Оттенок, матовость и цвет лучше согласовать до запуска партии. Пришлём образец или фото эталона под вашим освещением. Образцы — **бесплатно**, изготовление — **около недели**.» (источник `res/inex-glass-handoff/teksty/08-vidy-stekla.md`, шапка файла) |

### 6. Справочники и мини-сид (`minimal.ts`)

Всегда (и в `--minimal`, и в `--full`):
- `lead-statuses` (функция `seedLeadStatuses(ctx)` в `minimal.ts`, upsert по `slug`; **единственный сид статусов в проекте** — task-32 его не дублирует, только проверяет):

  | order | name | slug | isDefault | isFinal | requiresReason | isContract | `color` (фон / текст) |
  |---|---|---|---|---|---|---|---|
  | 10 | Новая | `new` | да | нет | нет | нет | `#EEF4FA` / `#2C5B86` |
  | 20 | В работе | `in-progress` | нет | нет | нет | нет | `#FCF6EA` / `#8A5A00` |
  | 30 | КП отправлено | `kp-sent` | нет | нет | нет | нет | `#EAF3F1` / `#16403D` |
  | 40 | Договор | `contract` | нет | да | нет | **да** | `#E6F4EA` / `#237A35` |
  | 50 | Отказ | `refused` | нет | да | **да** | нет | `#FCEFEF` / `#B23B3B` |

  Формат поля `color` — по схеме task-08 (одно текстовое значение: хранить цвет текста; фон task-32 вычисляет альфой 12 %).
- `thickness-groups`: «4–5 мм», «6–8 мм», «10–12 мм», «15–19 мм» (поля `podborText`/`obrabotkaText` — коротко, по `teksty/03-kartochki-tolshchin.md`, раздел «{текст_подбора} и {обработка} — по толщинам»; если текст в teksty полный — перенести его).
- `thicknesses` 4,5,6,8,10,12,15,19 мм (`indexable: false` у 5, 15, 19; группа по таблице).
- Таксономии `object-types` (торговые центры, банки, арены, офисы, гостиницы…), `products` (по списку изделий квиза), `cities` (14 городов доставки).

Мини-сид дополнительно создаёт по одной опубликованной записи на шаблон (минимальные, но валидные, с блоками `hero`, `richText`, `faq`, `cta`):
- `pages`: главная `/` (template `home`, `isHome: true`), хаб `/zakalennoe-steklo/` (hub), `/kak-zakazat/` (service), `/klientam/` (segment), `/o-kompanii/` (company), `/politika-konfidencialnosti/` (legal, noindex), `/soglasie-na-obrabotku-personalnyh-dannyh/` (legal, noindex);
- `glass-types`: `riflenoe`; `processing-services`: `kromka`; `constructions`: `steklyannye-peregorodki`; `articles`: `mozhno-li-rezat-zakalennoe-steklo`; `objects`: **один черновик** (`status: draft`, без публикации — публиковать вымышленные объекты нельзя);
- `team` — пусто.
Тексты — рабочие заглушки в стиле сайта (без выдуманных фактов): H1 из `docs/inex/17-meta.md`, тело — 1–2 абзаца из `teksty/` соответствующей страницы либо «[…]». Срезы `slices/*.ts` в этой задаче пустые.

### Environment Variables

- `DATABASE_URL`, `PAYLOAD_SECRET` — обязательны для сида; SMTP не нужен.

## Acceptance Criteria

- [ ] `REGISTRY` покрывает все 29 slug блоков из схемы task-07 (typecheck по union `blockType`); `RenderBlocks` рендерит их без ошибок на странице-тестере из мини-сида (7 заглушек — нейтрально); неизвестный блок не ломает страницу.
- [ ] `docUrl()` покрыт тестом для всех коллекций с публичными URL (pages, thicknesses, glass-types с `tripleks` → `/tripleks/`, processing-services, constructions по `path`, articles, objects).
- [ ] Метки `{…}` подставляются в строки блоков и в текстовые узлы Lexical (тест `rich-text` зелёный); мета-строки обрабатывает task-15 тем же движком.
- [ ] Блоки `holesCalculator`, `weightCalculator`, `form`, `pricesTable`, `contactsMap`, `requisites`, `teamGrid` — заглушки в семи отдельных файлах (названия файлов строго как указано).
- [ ] `pnpm seed -- --minimal` на чистой мигрированной БД завершается с кодом 0 и создаёт все globals, справочники и записи мини-сида; повторный запуск не создаёт дублей (проверить счётчиками через Local API); `--only=globals` работает; `--only=home` вызывает пустой срез без ошибок.
- [ ] После мини-сида: `/` открывается (200), `/zakalennoe-steklo/` резолвится через `pages`, `/politika-konfidencialnosti/` отдаёт noindex; шапка/подвал (task-14) наполнены данными из `navigation`/`contacts`.
- [ ] Сид не вызывает `revalidateTag` (нет ошибок «outside request»), использует `disableRevalidate`.
- [ ] Файлы срезов существуют и зарегистрированы в `index.ts`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` проходят.

## Notes

- Модель: премиум.
- Источники значений: ТЗ `docs/inex/16-tz-razrabotka.md` §4.1–4.5; SSoT `docs/inex/15-ssot-tehnologiya.md` §1, §4, §8, §11, §14; тексты — `res/inex-glass-handoff/teksty/*`; H1 — `docs/inex/17-meta.md`.
- Цена на 15.10.2026 «протухнет» через 45 дней (30.11.2026) — тогда сайт автоматически покажет «Цена по расчёту»; менеджер обновляет цены и дату в админке.
- Реальные данные, которых ждём от Inex: реквизиты (банк), мессенджеры, названия заводов-партнёров для стоп-слов, дата окончания акции, имена сотрудников — не придумывать.
- Контент срезов (тексты страниц) наполняют задачи Wave 5 в файлах `slices/*.ts`.
- (Ревью волны 3) Подписи `tech-params.quizOptions` в сиде брать дословно из `teksty/05-kviz.md`: дефолты схемы расходятся в двух местах — `decor.print` должно быть «печать (до 1100 × 700 мм)», `stamp.standard` — «в стандартном месте». id не менять (сверяет `src/lib/domain/ids-consistency.test.ts`).
- (Ревью волны 3) `src/components/ig/accordion.tsx` (task-13) ставит `role="region"` каждой панели — для длинных FAQ это много landmark-ов. Ставить `role="region"` только при ≤ 6 пунктах (правка разрешена этой задаче).
