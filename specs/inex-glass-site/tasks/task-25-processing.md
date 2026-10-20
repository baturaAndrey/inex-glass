# Task 25: Обработка стекла (хаб + 6 страниц) и калькулятор расстояний для отверстий

## Status

pending

## Wave

5

## Description

Вертикальный срез раздела «Обработка стекла»: хаб `/obrabotka-stekla/` и шесть страниц услуг (`kromka`, `otverstiya-i-vyrezy`, `facet`, `matirovanie`, `plenki`, `pechat`) на шаблоне «услуга обработки». Ключевая часть — **калькулятор расстояний для отверстий** (`HolesCalculator`): ввод толщины → минимальные расстояния от кромки (2t), между отверстиями (2t), от угла (6t), допуск диаметра; схема 640 × 400 перерисовывается под выбранную толщину. Калькулятор выводится на `/obrabotka-stekla/otverstiya-i-vyrezy/` и (через блок `holesCalculator`) на `/kak-zakazat/dopuski-i-gost/` (task-28). Эта задача заменяет заглушку блока `holes-calculator-block.tsx`.

## Dependencies

**Depends on:** task-10-schema-freeze.md, task-11-domain-lib.md, task-12-ui-form-primitives.md, task-13-ui-content-primitives.md, task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-19-metrika-analytics.md, task-21-forms-modals.md (контракт той же волны)
**Blocks:** task-28-how-to-order.md (блок `holesCalculator` на странице допусков), task-36-sitemap-robots-indexnow.md, task-38-placeholder-media.md, task-40-content-audit.md

**Context from dependencies:**
- **task-10/07** заморозили схему (`src/payload-types.ts`; **не менять**, нет поля — остановиться и написать координатору). Коллекция `processing-services` (без черновиков): `title`, `slug` (`kromka`, `otverstiya-i-vyrezy`, `facet`, `matirovanie`, `plenki`, `pechat`), `path` (вычисляется `/obrabotka-stekla/<slug>/`), `order`, `card{title,text,image,icon,priceHint}`, `keyLimit` (главное ограничение — для строки хаба), `intro` (richText), `heroImage`, `tables` (универсальные таблицы: `role`, `heading`, `lead`, `columns`, `rows[{cells[{value, positive, href}], rowHref}]`, `mobileMode`, `footnote`), `howToSpecify` (richText — «Как указать в чертеже»), `importantTitle`/`importantItems[{lead,text}]`, `callouts[{tone,title,body}]`, `hasHoleCalculator` (checkbox), `ctaPrimaryLabel`, `ctaSecondaryLabel`, `relatedLinks[{link,description}]`, `faq[{question,answer}]`, `seo` (`h1`, `title`, `description`, `noindex`, `canonical`), `quizPrefill{type,thickness,kind,ctaLabel,secondaryForm,secondaryLabel}`, `layout` (блоки). Хаб — документ `pages` (`template: 'hub'`, путь `/obrabotka-stekla/`, `layout`, SEO-группа). Блок `holesCalculator`: `defaultThickness` (4…19, по умолчанию 10), `showScheme` (true), `note`, `ctaLabel` + `sectionFields` (`anchorId`, `background`, `heading`, `headingLevel`, `sub`).
- **task-11** (`@/lib/domain`): `holeRules(t)` → `{edge, between, corner, minDiameter}`, `holeHint(t?)`, `holeToleranceMm(d)` (4–20 → 1; >20–100 → 2; >100 → null), `holeDiameterStatus(d, t?, {oneSide?})` (`ok | by_agreement | out_of_range`), `HOLE_DIAMETER_HINT` («До 220 мм — при сверлении с одной стороны. Уточним по чертежу»), `parseNumber`, `formatNumber`, `THICKNESSES`, `checkStopWords`.
- **task-12/13/05**: `ChipGroup` (single, roving tabindex), `Field`, `Input`, `Callout`, `DataTable`, `Faq`, `Steps`, `Placeholder`, `PageHero` (`variant="p5-top"`: крошки внутри, H1, `lead`, кнопки, полоса условий), `Section`, `Button`, `TextLink`.
- **task-15**: `getDocBySlug`, `listPublished`, `getPageByPath`, `getPlaceholderContext`, `buildMetadata`, `PageShell` (крошки + JSON-LD `BreadcrumbList` + блок условий + CTA квиза), `QuizLink`, `FormTrigger`, `faqLd`/`JsonLd`.
- **task-16**: `RenderBlocks`, `RichText`, сид-фреймворк (`markdownToLexical`, `SeedContext`), **заглушки** `src/seed/slices/processing.ts` и `src/components/blocks/holes-calculator-block.tsx` (будут заменены целиком этой задачей); мини-сид создаёт заглушку `kromka`.
- **task-19**: `reachGoal(name, params)` в `src/components/analytics/`; цель `calc_holes` (ТЗ §10).
- **task-21 (та же волна):** реальные формы `FormTrigger formKey="drawing"` с параметрами `label`/`source`.

## Files to Create

- `src/app/(site)/obrabotka-stekla/page.tsx` — хаб
- `src/app/(site)/obrabotka-stekla/[slug]/page.tsx` — страницы услуг (`kromka`, `otverstiya-i-vyrezy`, `facet`, `matirovanie`, `plenki`, `pechat`; иное → `notFound()`)
- `src/components/templates/processing-template.tsx` — `ProcessingServicePage({ slug })`, `generateProcessingMetadata(slug)`, `ProcessingHubPage()`, `generateProcessingHubMetadata()`
- `src/components/processing/operations-table.tsx` — таблица хаба «Операция | Главное ограничение | →» (из коллекции)
- `src/components/calculators/holes-calculator.tsx` — клиентский калькулятор `HolesCalculator`
- `src/components/calculators/holes-scheme.tsx` — SVG-схема 640 × 400 (порт из `Holes.dc.html`)
- `src/components/calculators/holes-calculator-model.ts` (+ `holes-calculator-model.test.ts`) — чистая функция `buildHolesView(thickness, diameterText)` поверх доменной библиотеки
- `src/seed/content/processing.ts` — данные хаба и шести услуг (строки скопированы из teksty дословно)
- `src/seed/slices/processing.test.ts` — Vitest: соответствие teksty, стоп-слова, ссылки
- `e2e/processing.spec.ts`

## Files to Modify

- `src/components/blocks/holes-calculator-block.tsx` — **заменить заглушку** реальной реализацией блока `holesCalculator` (обёртка `Section` с `anchorId` по умолчанию `kalkulyator`, `heading`/`sub` блока, `<HolesCalculator …/>`); сохранить имя экспорта и форму пропсов заглушки (`{ block, ctx }`).
- `src/seed/slices/processing.ts` — заменить заглушку реальным сидом.

**Не трогать:** остальные файлы `src/components/blocks/*` и `render-blocks.tsx` (task-16), `src/payload/**`, `src/seed/index.ts`, чужие срезы сида, `package.json`.

## Technical Details

### Общие правила среза

- Next.js 16.4, `trailingSlash: true`, `cacheComponents` выключен; данные через `@/lib/cms/*` (теги `collection:processing-services`, `doc:processing-services:<id>`, `doc:pages:<id>`); цен на страницах нет → `generateStaticParams → []`, `dynamicParams = true`, build без БД.
- Тексты дословно из teksty; H1/title/description — `docs/inex/17-meta.md` (при двух description берётся **первое**: для `facet` — «Фацет — широкая полированная фаска по краю зеркала. Делаем на зеркалах шириной 30 или 50 мм — для залов, салонов и гостиниц.»). Заголовок `#` в teksty, отличающийся от 17-meta, не выводится. Метки `{…}` остаются в данных. Стоп-слова ТЗ §11 запрещены; **фацет — только на зеркалах (30 и 50 мм)**, на закалённом стекле не делается (SSoT §13).
- Только светлая тема; CSS прототипов (`p5-*`) переписывается на Tailwind; брейкпоинты 1365 / 1100 / 599; Lucide stroke 2; без эмодзи; таблицы ≤599 → `.ig-mcard`.
- Правило обновления в сиде: срез обновляет существующий документ по ключу (`slug` / `path`), только если передан `--force` **или** документ не редактировался (|`updatedAt` − `createdAt`| < 2 с — его создал мини-сид); иначе пропуск с записью в лог. `pnpm seed --only=processing` идемпотентен.

### Метаданные (`docs/inex/17-meta.md`, блок «Обработка и фурнитура»)

| URL | H1 | Title | Description |
|---|---|---|---|
| `/obrabotka-stekla/` | Обработка стекла до закалки | Обработка стекла до закалки: кромка, отверстия \| Inex Glass | Кромка, отверстия и вырезы, фацет, матирование и печать — в одном заказе с закалкой. После закалки стекло уже не обработать. |
| `/obrabotka-stekla/kromka/` | Обработка кромки стекла | Обработка кромки стекла — шлифовка, еврокромка \| Inex Glass | Шлифованная, полированная, «трапеция» и «еврокромка». Какую кромку выбрать для профиля, видимого торца и мебели. |
| `/obrabotka-stekla/otverstiya-i-vyrezy/` | Отверстия и вырезы в стекле | Сверление отверстий в стекле по ГОСТ \| Inex Glass | Отверстия Ø 4–130 мм с притуплённой кромкой, фрезерование от R10. Отверстие — не ближе двух толщин стекла к кромке: калькулятор внутри. |
| `/obrabotka-stekla/facet/` | Фацет на зеркале | Фацет на зеркале — что это, ширина 30 и 50 мм \| Inex Glass | (первая колонка, см. выше) |
| `/obrabotka-stekla/matirovanie/` | Пескоструйное матирование стекла | Матирование стекла — пескоструй, логотипы, рисунки \| Inex Glass | Пескоструйное матирование до закалки: сплошное, полосы приватности, логотип на перегородке. Долговечнее плёнки. |
| `/obrabotka-stekla/plenki/` | Наклейка плёнки на стекло | Матовая плёнка на стекло для офиса — в составе заказа \| Inex Glass | Матовые, тонирующие и защитные плёнки на стекло вашего заказа. Когда лучше плёнка, а когда — пескоструй или сатин. |
| `/obrabotka-stekla/pechat/` | Печать на стекле | Печать на стекле — шелкография с закалкой, УФ-печать \| Inex Glass | Шелкография керамической краской вжигается при закалке и не стирается. Цвета по RAL, формат до 1100 × 700 мм. |

Все — `index, follow`, canonical на себя (абсолютный), на staging — noindex общей логикой `buildMetadata`. JSON-LD: `BreadcrumbList` (`PageShell`), `FAQPage` — только у `otverstiya-i-vyrezy` (4 вопроса). Крошки: `Главная › Обработка стекла › <метка>`; метки — «Кромка», «Отверстия и вырезы», «Фацет», «Матирование», «Плёнки», «Печать» (`breadcrumbLabel`/`lastLabel`).

### Хаб `/obrabotka-stekla/` (`ProcessingHubPage`)

Хранение: документ `pages` (`template: 'hub'`, `slug: 'obrabotka-stekla'`, опубликован; SEO-группа; `layout`). Макет — `Constr.dc.html` (p5-top-hero + карточки). Порядок:
1. **Hero** (`PageHero variant="p5-top"`): крошки, H1, `lead` = абзац из teksty/07 §1 («Закалённое стекло нельзя резать, сверлить и шлифовать: после закалки любое вмешательство его разрушает. Поэтому вся обработка делается до печи, а проверка чертежа — до запуска в производство. Ошибку в отверстии на закалённом стекле не исправить, только изготовить стекло заново.»), кнопки primary «Рассчитать стоимость» (иконка calculator, `QuizLink` `type=tempered`) и secondary «Отправить чертёж» (`FormTrigger drawing`, `source: 'obrabotka-stekla'`). Это первый блок `layout` (`hero`) либо поля документа — по схеме `pages`.
2. **«Что делаем»** — `OperationsTable` (код, не блок): `h2` «Что делаем»; таблица `DataTable` из опубликованных `processing-services` по `order`: «Операция» (`card.title` либо `title`: «Обработка кромки», «Отверстия и вырезы», «Фацет», «Пескоструйное матирование», «Печать на стекле», «Плёнки»), «Главное ограничение» (`keyLimit`), стрелка-ссылка на `path`; строка целиком кликабельна (`rowHref`); ≤599 — карточки. Таблица вставляется сразу после первого блока `layout`.
3. Остальные блоки `layout` (`richText` через `RenderBlocks`): «Как считается цена» и «Перед отправкой чертежа» — тексты дословно teksty/07 §1; ссылки: «Требования к чертежам» → `/kak-zakazat/trebovaniya-k-chertezham/`, «Допуски по ГОСТ 30698-2014» → `/kak-zakazat/dopuski-i-gost/`; затем `cta`-блок с кнопками «Рассчитать стоимость» и «Отправить чертёж».
`keyLimit` для карточек (teksty/07 §1, таблица «Что делаем»): kromka — «Шлифованная, полированная, «трапеция», «еврокромка»»; otverstiya-i-vyrezy — «Ø 4–130 мм; от кромки — не ближе двух толщин стекла»; facet — «На зеркалах, ширина 30 или 50 мм»; matirovanie — «Сплошное, полосы, рисунок, логотип»; pechat — «Шелкография до 1100 × 700 мм»; plenki — «По согласованию».

### Шаблон услуги (`ProcessingServicePage`) — порядок секций

`PageShell` (`path = doc.path`, `lastLabel`, `showConditions` = true, `quiz` = false) → 
1. **Hero** (`PageHero variant="p5-top"`, макет `Holes.dc.html`): H1 (`seo.h1`), `lead` = `intro` (richText; `{условия}` подставляется), кнопки: primary `l` «Рассчитать стоимость» (`ctaPrimaryLabel`, `QuizLink`, `prefill` из `quizPrefill`), secondary `ctaSecondaryLabel` (`FormTrigger drawing`, `params {label, source: slug}`), если `quizPrefill.secondaryForm !== 'none'`.
2. **`tables[]`** (по порядку): `h2` = `heading`, `lead` абзацем (`sub`), `DataTable` (≥600 таблица, ≤599 `.ig-mcard`; `mobileMode: pairs` → пары), `footnote` — мелкий абзац под таблицей.
3. **`layout`** — `<RenderBlocks blocks={doc.layout} ctx={…} />` (в нём могут быть блоки `table`, `richText`, `callout`, `holesCalculator`, `cta`…).
4. **`howToSpecify`** (richText) — секция «Как указать в чертеже» (`h2` по умолчанию; если в teksty другой заголовок — раздел оформляется блоком `richText` в `layout`, а `howToSpecify` не заполняется).
5. **`importantItems`** («Что важно знать до заказа») и **`callouts[]`** (`Callout` warning/info с заголовком) — если заданы.
6. **`relatedLinks`** — строка ссылок со стрелкой.
7. **FAQ** (`faq`) — `Faq` + JSON-LD `FAQPage`; `h2` «Частые вопросы».
8. **Итоговые кнопки**: primary «Рассчитать стоимость» + secondary из `ctaSecondaryLabel`, порядок для `otverstiya-i-vyrezy`: «Отправить чертёж на проверку», затем «Рассчитать стоимость» (как в teksty).

Фоны секций чередуются `--ig-bg`/`--ig-surface`, отступы `.blk` 96/72/48. `generateProcessingMetadata(slug)` → `buildMetadata({ seo: doc.seo, path: doc.path, fallbackTitle: doc.title, placeholders: await getPlaceholderContext() })`.

### Раскладка данных по страницам (teksty → поля)

Таблицы Markdown → `tables[]` / блок `table` (ячейки со ссылками — `href`); абзацы и списки → `markdownToLexical`; ссылки `→ [Название]`: Требования к чертежам `/kak-zakazat/trebovaniya-k-chertezham/`, Допуски по ГОСТ 30698-2014 `/kak-zakazat/dopuski-i-gost/`, Отверстия и вырезы `/obrabotka-stekla/otverstiya-i-vyrezy/`, Кромка `…/kromka/`, Фацет `…/facet/`, Матирование `…/matirovanie/`, Плёнки `…/plenki/`, Печать `…/pechat/`, Матовое стекло `/zakalennoe-steklo/matovoe/`, Зеркала для залов `/zerkala/dlya-zalov/`, Зеркала для салонов `/zerkala/dlya-salonov/`, Зеркала для проектов `/zerkala/`, Обработка кромки `/obrabotka-stekla/kromka/`.

| Страница | Источник | `intro` | `tables[]` | `layout` (по порядку) | прочее |
|---|---|---|---|---|---|
| **otverstiya-i-vyrezy** | `teksty/07` §2 | «Отверстие, сделанное не там, — самая частая причина…» (абзац) | [0] «Где можно сверлить: правила ГОСТ 30698-2014» (`lead`: «Расстояния считаются от кромки отверстия, а не от его центра. t — толщина стекла.»; 3 колонки Что / Минимум / Пример для стекла 10 мм; 4 строки) | `holesCalculator` (`heading` «Калькулятор расстояний», `sub` «Укажите толщину стекла — калькулятор покажет минимальные расстояния для чертежа.», `anchorId: 'kalkulyator'`, `defaultThickness: 10`, `note` = «Если по проекту отверстие нужно ближе к кромке или к углу, скажите об этом при отправке чертежа: обсудим варианты до запуска (сместить крепёж, взять другую толщину или схему триплекса).»); `table` «Допуски диаметра» (Диаметр / Допуск; 4–20 мм ±1,0 мм; 20–100 мм ±2,0 мм; свыше 100 мм по согласованию; `footnote` «Выбирая крепёж, учитывайте допуск: втулка или прокладка должна садиться в отверстие и с минимальным, и с максимальным диаметром.»); `richText` «Что мы делаем с отверстиями» (4 пункта, **жирные** лиды); `richText` «Вырезы и фрезерование» (3 пункта) | `howToSpecify` «Как указать отверстие в чертеже» (нумерованный список 4 пункта + «Чертёж в DWG или DXF. → Требования к чертежам»); `callouts[0]` warning «Если фурнитура не подходит к отверстию» (2 абзаца); `faq` 4 вопроса; `hasHoleCalculator: true`; `ctaSecondaryLabel` «Отправить чертёж на проверку» |
| **kromka** | §3 | «После резки кромка стекла острая…» (абзац) | [0] «Виды кромки» (3 колонки Кромка / Как выглядит / Где уместна; 4 строки) | `richText` «Что выбрать» (абзац: «**Что выбрать.** Для большинства задач … рекомендуем **еврокромку** …»); `table` «Размеры» (2 колонки Обработка / Размер стекла; 2 строки; `footnote` «Максимальный размер закалённого стекла — 3000 × 2000 мм; кромку обрабатывают до закалки.»); `richText` «Углы»; `richText` «Кромка отверстий» (ссылка «Отверстия и вырезы») | `howToSpecify` «Как указать в чертеже» (абзац); `ctaSecondaryLabel` «Отправить чертёж» |
| **facet** | §4 | «**Фацет** — широкая наклонная фаска по краю зеркала…» (абзац); `heroImage` — заглушка «зеркало с фацетом крупным планом; схема сечения — фацет и обычная кромка» | [0] «Что делаем» (Параметр / Значение; Изделие · Ширина фацета · Отделка) | `richText` (абзац «На краю после фацета остаётся узкая тупая грань…»); `richText` «А на закалённом стекле?» (ссылка «Обработка кромки»); `richText` «Где применяют» (3 пункта со ссылками на `/zerkala/dlya-zalov/`, `/zerkala/dlya-salonov/`, `/zerkala/`); `richText` «Как указать в заказе» | `quizPrefill.type = 'mirrors'`; `ctaSecondaryLabel` «Отправить размеры» |
| **matirovanie** | `teksty/17` §1 | «Матовая поверхность наносится абразивом под давлением…» + `{условия}` | [0] «Что можно сделать» (Вариант / Где применяют; 4 строки) | `table` «Пескоструй или матовое стекло» (3 колонки; 3 строки), затем `richText` с абзацем «Если нужна равномерная матовость без рисунка — выгоднее заказать матовое стекло.» и ссылкой «Матовое стекло»; `richText` «Матирование или плёнка» (ссылка «Плёнки на стекло»); `callout` info «Что важно знать» (3 пункта: Матирование — до закалки · Отпечатки и уход · Водоотталкивающее покрытие после матирования не делаем); `richText` «Что прислать» | `ctaSecondaryLabel` «Отправить макет»; на первом экране рядом — «Рассчитать стоимость»; фото-плейсхолдер `heroImage` («перегородка с полосой приватности; логотип на стеклянной двери») |
| **plenki** | `teksty/12` §8 | «Матовую, тонирующую или защитную плёнку наклеиваем на стекло вашего заказа — по согласованию. Стекло приходит на объект уже с плёнкой.» | [0] «Плёнка или матирование» (3 колонки: пусто / Плёнка / Пескоструй или сатин; 2 строки) | `richText` (строка со ссылками «Матирование» · «Матовое стекло»); `callout` info «Что важно знать» (2 пункта) | `quizPrefill.secondaryForm = 'none'` (в teksty только «Рассчитать стоимость») |
| **pechat** | §7 | «Два способа — для разных задач.» | [0] comparison (колонки пусто / Шелкография / УФ-печать; 5 строк: Как наносится · Изображение · Стойкость · Толщина стекла · Максимальный размер) | `richText` «Где применяют» (2 пункта: **Шелкография:** … **УФ-печать:** …); `richText` «Что прислать» | `ctaSecondaryLabel` «Отправить макет» |

Общее для всех: `order` 1…6 в порядке kromka, otverstiya-i-vyrezy, facet, matirovanie, pechat, plenki; `card{title,text}`; `quizPrefill.type = 'tempered'` (facet — `mirrors`), `ctaLabel` «Рассчитать стоимость»; `_status` не применим (нет черновиков). Хаб `pages`: SEO-группа, `layout` по описанию; `quizPrefill` type `tempered`.

### Калькулятор `HolesCalculator` (`src/components/calculators/holes-calculator.tsx`)

```ts
interface HolesCalculatorProps {
  defaultThickness?: 4 | 5 | 6 | 8 | 10 | 12 | 15 | 19;   // по умолчанию 10
  showScheme?: boolean;                                     // по умолчанию true
  note?: string;                                            // абзац под результатами
  ctaLabel?: string;                                        // необязательная ссылка в квиз с thick={t}
  source?: string;                                          // для цели calc_holes (page slug)
}
```

Макет — `Holes.dc.html` (`<div class="p5-calc">`): две колонки `minmax(0,1.15fr) / minmax(0,1fr)`, gap 32 (≤1365 одна колонка); обе — белые карточки `rounded-xl` (24), тень `card`, padding 24/28 (≤599 — 16).
- **Схема** (`HolesScheme`): SVG `viewBox="0 0 640 400"`, `role="img"`, `aria-label="Схема: стекло с тремя отверстиями и минимальными расстояниями по ГОСТ 30698-2014"`; координаты и фигуры переносятся один-в-один из прототипа (стекло 560 × 320 `fill #EAF3F1` с обводкой `#5B636B`; три круга; размерные линии с засечками; подписи `2t` / `2t` / `6t` и значения «{N} мм»; подпись «Ø ≥ {t}» внутри первых двух отверстий; «Стекло {t} мм» слева сверху). Цвета — токены (линии `--ig-text-2`, размеры `--ig-primary-pressed` 600/15 px). Все числа и подписи — из `buildHolesView`. SVG масштабируется по ширине (`width:100%; height:auto`).
- **Панель**: подпись «Толщина стекла»; `ChipGroup mode="single"` (4 · 5 · 6 · 8 · 10 · 12 · 15 · 19 мм, `aria-label="Толщина стекла"`, ровно один выбран, повторный клик не сбрасывает, стрелки меняют значение); результат — три плитки `primary-light` (`rounded-lg`, число 40/700 `tabular-nums` с `<small>мм</small>`; ≤599 строки «число — подпись»): «не ближе к кромке» ({2t}), «между отверстиями» ({2t}), «от угла» ({6t}); контейнер результатов `aria-live="polite"`, `aria-atomic="true"`; строка «Минимальный диаметр — {t} мм; меньше — по согласованию» (иконка `Info`, фон `--ig-bg`); поле **«Диаметр отверстия, мм»** (необязательное, `inputMode="decimal"`, запятая допустима) — под ним сообщение по `buildHolesView`:
  - пусто/не число — ничего;
  - `out_of_range` (Ø < 4 или > 130) — warn-подсказка `HOLE_DIAMETER_HINT`;
  - `by_agreement` (Ø < t) — «Диаметр меньше толщины стекла — только по согласованию»;
  - `ok` — «Допуск диаметра: ±1,0 мм» (Ø 4–20), «Допуск диаметра: ±2,0 мм» (Ø > 20–100), «Допуск диаметра: по согласованию» (Ø > 100);
  затем абзац `note` (muted) и, если задан `ctaLabel`, `QuizLink` «{ctaLabel}» с `thick={t}`.
- Состояния/доступность: клавиатура (Tab/стрелки), видимый фокус, контраст ≥ 4,5:1, без анимаций больше 200 мс; изменение значений озвучивается через `aria-live`. SSR выводит состояние по умолчанию (десять мм) — без «мигания».
- Цель **`calc_holes`**: `reachGoal('calc_holes', { thickness, source })` при первом взаимодействии (выбор толщины или ввод диаметра) за жизнь компонента; повторно — только при смене толщины не чаще раза в 3 с.
- `holes-calculator-model.ts`: `buildHolesView(thickness, diameterText?)` → `{ edge, between, corner, minDiameter, diameter?: { value, status, toleranceText, message } }` (использует `holeRules`, `parseDiameters`/`parseNumber`, `holeDiameterStatus`, `holeToleranceMm`, `HOLE_DIAMETER_HINT`, `formatNumber`). Тесты: 10 → 20/20/60; 4 → 8/8/24; 19 → 38/38/114; Ø 12 → «±1,0 мм»; Ø 25 → «±2,0 мм»; Ø 120 → «по согласованию»; Ø 3 и Ø 131 → hint; Ø 8 при t=10 → «только по согласованию»; запятая «12,5».

### Блок `holesCalculator` (замена заглушки)

`holes-calculator-block.tsx` экспортирует тот же компонент блока, что и заглушка: `Section` (`id = anchorId ?? 'kalkulyator'`, `background`), `SectionHead` из `heading`/`sub`, `HolesCalculator` с `defaultThickness`, `showScheme`, `note`, `ctaLabel`. Строки блока проходят через `replacePlaceholders` (`ctx`). Используется и на `/kak-zakazat/dopuski-i-gost/` (task-28).

### Метрика

`calc_holes` (выше). Квиз — `quiz_start` (task-20); формы — `form_submit` (task-21).

### Vitest

`holes-calculator-model.test.ts` (выше); `processing.test.ts`: (а) строки содержимого найдены в teksty/07, teksty/12 §7–8, teksty/17 §1 (`test.skip`, если нет `res/`); (б) `checkStopWords` пусто; (в) 7 URL: slug, H1/title/description равны 17-meta; (г) все внутренние ссылки в нижнем регистре со слешем; (д) в `otverstiya-i-vyrezy` присутствуют блок `holesCalculator` с `anchorId: 'kalkulyator'`, 4 FAQ и таблица допусков из 3 строк.

### e2e (`e2e/processing.spec.ts`, проекты 375 / 1366 / 1920)

Предусловие: `pnpm seed --minimal`, затем `pnpm seed --only=processing --force` (в `beforeAll` проверить `/obrabotka-stekla/` = 200). Для хаба и 6 услуг: 200; один `h1` из 17-meta; title/description дословно; canonical; крошки; JSON-LD `BreadcrumbList`; нет `{`/`}` и горизонтального скролла на 375; первая кнопка «Рассчитать стоимость» в первом экране со ссылкой `/raschet-stoimosti/?…src=…` (facet — `type=mirrors`); вторичная кнопка (Отправить чертёж / на проверку / размеры / макет — по странице) открывает `role=dialog`. Хаб: таблица «Что делаем» — 6 строк, строка кликабельна и ведёт на нужный URL, на 375 — карточки. `facet`: в тексте нет утверждения, что фацет делается на закалённом стекле; присутствует «А на закалённом стекле?» с «на закалённом стекле фацет не делаем». **`otverstiya-i-vyrezy`:** якорь `#kalkulyator` существует; по умолчанию выбрано 10 мм и показаны 20 / 20 / 60 мм и «Минимальный диаметр — 10 мм; меньше — по согласованию»; клик по 4 → 8 / 8 / 24, по 19 → 38 / 38 / 114; подписи SVG («Стекло 19 мм», «114 мм», «Ø ≥ 19») обновились; клавиатурные стрелки в группе меняют значение; ввод Ø 12 → «Допуск диаметра: ±1,0 мм», 25 → «Допуск диаметра: ±2,0 мм», 120 → «Допуск диаметра: по согласованию», 150 и 3 → подсказка `HOLE_DIAMETER_HINT` («До 220 мм — при сверлении с одной стороны. Уточним по чертежу»), Ø 8 при 10 мм → «Диаметр меньше толщины стекла — только по согласованию»; контейнер результатов имеет `aria-live="polite"`; цель `calc_holes` отправлена один раз (перехват через init-script и `consent=all`); таблица допусков 3 строки; FAQ раскрывается, JSON-LD `FAQPage` из 4 вопросов; на 375 схема не выходит за экран, плитки результатов в строку. `axe` без критических нарушений. Скриншоты хаба и страницы отверстий на 375 / 1366 / 1920 — к отчёту для сверки с `Holes.dc.html`, `Constr.dc.html`.

## Acceptance Criteria

- [ ] Хаб и 6 страниц отдают 200; H1/title/description совпадают с 17-meta; canonical на себя; неизвестный slug → 404.
- [ ] Хаб строит таблицу операций из коллекции (6 строк, `keyLimit`), строка кликабельна; тексты дословно из teksty.
- [ ] `HolesCalculator` считает по `holeRules` (2t / 2t / 6t, мин. Ø = t), показывает допуски и подсказки по `holeDiameterStatus`, схема 640 × 400 перерисовывается под толщину, результаты озвучиваются (`aria-live`), цель `calc_holes` отправляется один раз за визит компонента.
- [ ] Якорь `#kalkulyator` на `/obrabotka-stekla/otverstiya-i-vyrezy/`; блок `holesCalculator` в `layout` работает на любой странице `pages`; заглушка заменена.
- [ ] Фацет описан только для зеркал (30/50 мм); нет стоп-слов; нет редакторских пометок (`[Фото: …]` заменены заглушками `.ig-ph`).
- [ ] Вёрстка совпадает с `Holes.dc.html` на 375 / 1366 / 1920 (калькулятор: две колонки → одна при ≤1365; плитки результатов; таблицы → карточки ≤599); нет горизонтального скролла.
- [ ] `pnpm seed --only=processing` идемпотентен, не затирает правки редактора без `--force`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` (модель калькулятора, сид), `pnpm build` (без БД), `pnpm test:e2e e2e/processing.spec.ts` проходят.
- [ ] Схема Payload, остальные блоки и роуты других задач не изменены.

## Notes

- **Модель:** премиум.
- Источники: `res/inex-glass-handoff/teksty/07-obrabotka-stekla.md`, `12-p2-konstrukcii-steklo.md` §7–§8, `17-matirovanie-markirovka-listingi.md` §1; `docs/inex/17-meta.md`; `docs/inex/struktury-stranic/p1-katalog-obrabotka.md` (блоки; **устаревшие** места про фацет «до 30 мм» на закалённом и Title’ы — не использовать), `docs/inex/15-ssot-tehnologiya.md` §4, §9, §11, §13, §14; ТЗ `docs/inex/16-tz-razrabotka.md` §5, §7.2; `zadaniya/05-obrabotka-konstrukcii.md` §5.1; прототип `Holes.dc.html` (разметка в `<x-dc>`, SVG и логика в `<script type="text/x-dc">`).
- Прототип калькулятора не содержит поля диаметра — оно добавлено по ТЗ §7.2 («допуск диаметра ±1/±2»); тексты допуска собраны из таблицы teksty/07 §2.
- Гидрация: калькулятор — единственный клиентский остров страницы; страница остаётся серверной.
- **Открытые вопросы:** (1) если `tables[]` не позволяет ссылки в `footnote`, ссылочный абзац оформляется `richText` в `layout`; (2) заголовок секции `howToSpecify` фиксирован шаблоном — отличающиеся заголовки оформляются в `layout`; (3) `OperationsTable` вставляется после первого блока `layout` — если первым блоком не `hero`, сообщить; (4) фото-заглушки для facet/matirovanie заменяются в task-38.
- (Ревью волны 4) Записи, созданные вне админки (сид, импорт, скрипты `payload run`), не сбрасывают кэш Next. Сид (`src/seed/index.ts`) в конце вызывает `POST /api/revalidate/` (HMAC-токен от `PAYLOAD_SECRET`, `src/lib/cms/revalidate-token.ts`); свои скрипты завершать тем же вызовом (переиспользовать хелпер из `src/seed/context.ts`). Блоки получают данные страницы через проп `page` у `RenderBlocks` — в сиде не копировать `seo.h1` в `titleOverride`.
- (Ревью волны 4) **404 в типизированных маршрутах:** не вызывать голый `notFound()` / `redirectOrNotFound()` из страницы — иначе SSR отдаёт пустое тело. Паттерн: `await redirectIfExists(path)` (из `@/lib/cms/queries`), затем `return <NotFoundResponse/>` (`src/components/page/not-found-response.tsx`), в `generateMetadata` — 404-title + `robots: noindex, follow`. Маршрут должен быть статическим/ISR (не вызывать `headers()`/`cookies()`), иначе статус 404 не выставится. Корневой layout `(site)` должен оставаться статическим.
