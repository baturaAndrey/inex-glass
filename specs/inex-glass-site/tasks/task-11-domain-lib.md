# Task 11: Доменная библиотека (цены, акция, отверстия, вес, рабочие дни, метки, стоп-слова, схемы квиза и форм) + vitest

## Status

complete

## Wave

3

## Description

Чистые TypeScript-функции без импортов Payload и React: все бизнес-правила сайта в одном месте, покрытые тестами. Их используют шаблоны страниц (правило 45 дней, цены, метки), калькуляторы (отверстия, вес), квиз и формы (zod-схемы, флаги, подсказки, ориентир цены), заявки на сервере (те же zod-схемы), аудит контента (стоп-слова) и сид. Ошибка здесь означает неверную цену на сайте или потерянную заявку, поэтому каждое правило из этой задачи проверяется unit-тестом.

## Dependencies

**Depends on:** task-02-testing-ci.md
**Blocks:** task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md, task-17-lead-intake-uploads.md, а также task-20, 21, 23, 25, 31 и др.

**Context from dependencies:** task-02 настроил Vitest (`vitest.config.ts`, тесты ищутся по маске `src/**/*.test.ts`, алиас `@/` → `src/`), скрипт `pnpm test` (и `pnpm test:e2e` для Playwright). Проект: Next.js 16.4 + Payload 3.91 (не нужен в этой задаче), TypeScript strict, `zod` версии 4.x уже установлен (используйте API zod 4: `z.email()`, `z.string().min()`, `.refine`, `z.discriminatedUnion`). Эта задача **не импортирует** `payload`, `react`, `next`, `@/payload-types`. Входные данные описываются локальными типами; адаптеры «global Payload → локальный тип» пишет task-15 (`src/lib/cms/globals.ts`).

## Files to Create

Все в `src/lib/domain/`, рядом — файлы `*.test.ts`:

- `types.ts` — общие типы и константы (`THICKNESSES`, `COMPANY_TZ`)
- `format.ts` (+ `format.test.ts`) — формат чисел, цен, размеров, дат; разбор чисел
- `prices.ts` (+ `prices.test.ts`) — правило 45 дней, цена толщины, подпись, ориентир
- `promo.ts` (+ `promo.test.ts`) — активность акции, подсказка
- `holes.ts` (+ `holes.test.ts`) — правила отверстий, допуски, разбор диаметров
- `weight.ts` (+ `weight.test.ts`) — вес одинарного стекла и триплекса, подсказки по переноске
- `working-days.ts` (+ `working-days.test.ts`) — календарь РФ, сдвиг рабочих дней, «срочно»
- `plural.ts` (+ `plural.test.ts`) — склонение
- `placeholders.ts` (+ `placeholders.test.ts`) — движок меток `{…}`
- `stop-words.ts` (+ `stop-words.test.ts`) — проверка стоп-слов и фразы про опыт
- `limits.ts` — технические лимиты (SSoT 4.5), `DEFAULT_TECH_LIMITS`
- `quiz-schema.ts` (+ `quiz-schema.test.ts`) — константы квиза (id, подписи), zod-схемы ответов
- `lead-schemas.ts` (+ `lead-schemas.test.ts`) — zod-схемы заявок всех форм, нормализация телефона
- `quiz-flags.ts` (+ `quiz-flags.test.ts`) — флаги заявки, подсказки квиза, ориентир цены
- `index.ts` — barrel (реэкспорт всего)

## Files to Modify

Нет. (Не трогать `package.json`: `zod` и `vitest` уже есть.)

## Technical Details

### Общие правила

- Все функции чистые; «сейчас» всегда параметр `now: Date` (в тестах — фиксированные даты), никаких `new Date()` внутри кроме значений по умолчанию аргументов.
- Часовой пояс компании: `COMPANY_TZ = 'Asia/Yekaterinburg'` (Челябинск, UTC+5). «Сегодняшний день» и разницу дат считать по календарной дате в этом поясе (`Intl.DateTimeFormat('en-CA', { timeZone: COMPANY_TZ })` → `YYYY-MM-DD`), а не по миллисекундам.
- Даты в данных — строки `YYYY-MM-DD` или ISO-datetime (Payload отдаёт `2026-10-15T00:00:00.000Z`): универсальный нормализатор `toDateKey(input: string | Date): string` берёт первые 10 символов ISO-строки либо форматирует `Date` в поясе компании. Разница в днях: `daysBetween(aKey, bKey)` через `Date.UTC`.
- Неразрывный пробел: `NBSP = ' '`. **Во всех форматах тысяч используется NBSP.**
- Русские сообщения — дословно как указано ниже.

### types.ts

```ts
export const THICKNESSES = [4, 5, 6, 8, 10, 12, 15, 19] as const;
export type Thickness = (typeof THICKNESSES)[number];
export const REQUEST_ONLY_THICKNESSES: readonly number[] = [15, 19]; // всегда «по запросу»
export const COMPANY_TZ = 'Asia/Yekaterinburg';
export const NBSP = ' ';
export type DateInput = string | Date;
```

### format.ts

```ts
parseNumber(input: string | number | null | undefined): number | null
// «12,5» → 12.5; «1 000» / «1 000» (в т.ч. NBSP) → 1000; пустое/мусор → null; отрицательные допустимы только если нужны вызывающему — оставить как есть
formatNumber(n: number, opts?: { decimals?: number; trim?: boolean }): string
// пробел-NBSP как разделитель тысяч, запятая как десятичный разделитель. По умолчанию: до 2 знаков, хвостовые нули обрезаются: 12.5→«12,5», 10→«10», 1400→«1 400» (NBSP)
formatPrice(n: number): string                // 1400 → «1 400» (NBSP), 700 → «700»
formatPriceFrom(n: number): string            // «от 1 400 ₽/м²»: «от» + обычный пробел + formatPrice + NBSP + «₽/м²»
formatRub(n: number): string                  // 125000 → «125 000 ₽» (NBSP перед ₽)
formatSizeMm(w: number, h: number): string    // «3000 × 2000 мм» (знак × U+00D7, обычные пробелы; NBSP перед «мм»)
formatDateRu(input: DateInput): string        // «15.10.2026»
```

### prices.ts

Локальные типы (адаптер из global `prices` — в task-15):

```ts
export interface PricesInput {
  items: ReadonlyArray<{ thickness: number; price: number | null }>; // 15 и 19 — price null
  priceDate: DateInput | null;
  staleAfterDays: number; // порог из global, по умолчанию 45
}
export type PriceState = 'price' | 'calc';
```

Функции:

```ts
getPrice(thickness: number, prices: PricesInput): number | null
priceState(thickness: number, prices: PricesInput, now?: Date): PriceState
```

**Правило `priceState`:** `'price'`, если (а) толщина не 15 и не 19, (б) у толщины есть цена > 0, (в) `priceDate` задана и `daysBetween(toDateKey(priceDate), today(now)) <= staleAfterDays` (то есть ровно 45 дней — ещё «price», 46-й — «calc»; дата в будущем — «price»). Иначе `'calc'`.

```ts
resolvePrice(thickness, prices, now?): { state: PriceState; price: number | null; label: string }
// label: state==='price' → formatPriceFrom(price); 15/19 → «по запросу»; просрочено/нет цены → «Цена по расчёту»
priceCaption(prices: PricesInput): string
// «Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется»
estimateAmount(areaM2: number, thickness: number, prices: PricesInput, now?: Date): number | null
// round(area × price), null если priceState==='calc' или area<=0
```

Данные на 15.10.2026 (используются в тестах и сидом): 4→700, 5→750, 6→800, 8→1300, 10→1400, 12→2000 ₽/м²; 15, 19 — «по запросу»; порог 45 дней. Экспортировать константу `SEED_PRICES_2026_10_15: PricesInput` (для сида task-16 и тестов).

### promo.ts

```ts
export interface PromoInput {
  active: boolean;
  text: string;                // «−5% на закалённое стекло при заказе от 100 м²»
  startDate: DateInput | null;
  endDate: DateInput | null;
  thresholdArea: number;       // 100
}
promoActive(promo: PromoInput | null | undefined, now?: Date): boolean
// active && today >= startDate && today <= endDate (включительно, по календарной дате пояса компании).
// Нет startDate → без нижней границы; нет endDate → без верхней границы; promo == null → false.
promoHint(areaM2: number | null | undefined, promo: PromoInput | null | undefined, now?: Date): string | null
// если area >= thresholdArea && promoActive → promo.text, иначе null
```

### holes.ts (ГОСТ 30698-2014, SSoT §11, ТЗ 7.2)

```ts
holeRules(t: number): { edge: number; between: number; corner: number; minDiameter: number }
// edge = 2t, between = 2t, corner = 6t, minDiameter = t. holeRules(10) → { edge: 20, between: 20, corner: 60, minDiameter: 10 }
holeHint(t?: number | null): string
// t задана: «Для стекла {t} мм отверстие — не ближе {2t} мм к кромке и {6t} мм к углу (ГОСТ 30698-2014)»
// t нет: «Отверстие — не ближе двух толщин стекла к кромке и шести — к углу (ГОСТ 30698-2014)»
holeToleranceMm(d: number): number | null
// 4 ≤ d ≤ 20 → 1; 20 < d ≤ 100 → 2; d > 100 → null («по согласованию»); d < 4 → null
type HoleDiameterStatus = 'ok' | 'by_agreement' | 'out_of_range';
holeDiameterStatus(d: number, t?: number | null, opts?: { oneSide?: boolean }): HoleDiameterStatus
// d < 4 → out_of_range; d > 130 (или > 220 при oneSide) → out_of_range; 4 ≤ d ≤ 130 и t задан и d < t → by_agreement; иначе ok
HOLE_DIAMETER_HINT = 'До 220 мм — при сверлении с одной стороны. Уточним по чертежу'
// показывать, если ЛЮБОЙ диаметр < 4 или > 130 мм
holesAllowed(t: number): boolean                  // t >= 4
glassWithHolesSizeOk(w: number, h: number): boolean
// стекло с отверстиями 250 × 100 — 3000 × 1600: long=max(w,h) в [250, 3000], short=min(w,h) в [100, 1600]
parseDiameters(input: string): number[]
// разделители: «;», пробельные символы, «/», запятая ТОЛЬКО если за ней пробел («10, 12»). «12,5» — десятичная запятая. Убирать «Ø», «мм», «ø». «10, 12,5; 20» → [10, 12.5, 20]
```

### weight.ts (teksty/10-blog-kalkulyator.md §1, ТЗ 7.1)

Константы: `GLASS_KG_PER_M2_PER_MM = 2.5`, `EVA_KG_PER_M2_PER_LAYER = 0.36` (слой 0,38 мм), `FILM_THICKNESSES = [0.38, 0.76, 1.14, 1.52]`.

```ts
filmWeightPerM2(filmMm: number): number          // 0.36 × round(filmMm / 0.38): 0.38→0.36, 0.76→0.72, 1.14→1.08, 1.52→1.44
weightPerM2Single(t: number): number             // 2.5 × t
weightPerM2Triplex(t1: number, t2: number, filmMm: number): number // 2.5 × (t1 + t2) + filmWeightPerM2(filmMm); 8+8, 0.76 → 40.72
interface WeightInput { mode: 'single' | 'triplex'; t?: number; t1?: number; t2?: number; film?: number; widthMm: number; heightMm: number; qty: number }
interface WeightResult { areaM2: number; perM2: number; perGlass: number; batch: number; carryHint: string }
calcWeight(input: WeightInput): WeightResult | null   // null при невалидных/нулевых размерах; qty → round(qty), минимум 1
// area = (w/1000)·(h/1000); perGlass = perM2·area; batch = perGlass·round(qty)
carryHint(perGlassKg: number): string
// ≤ 20 → «можно нести одному, в перчатках с покрытием»
// ≤ 40 → «один или вдвоём, с ручными присосками»
// ≤ 80 → «только вдвоём, по одной-две присоски на человека»
// > 80 → «бригада 3–5 человек или вакуумный подъёмник»   (строки дословно, строчная первая буква; UI капитализирует при необходимости)
formatWeightKg(value: number, kind: 'perM2' | 'perGlass' | 'batch'): string
// perM2 — 2 знака, perGlass — 1 знак, batch — 0 знаков если ≥ 1000, иначе 1 знак; затем formatNumber с обрезкой нулей: 12.5→«12,5», 25→«25», 1234.4→«1 234» (NBSP)
export const WEIGHT_TABLE: ReadonlyArray<{ thickness: number; kgPerM2: number }> // 4→10, 5→12.5, 6→15, 8→20, 10→25, 12→30, 15→37.5, 19→47.5
```

### working-days.ts

Календарь — **только список выходных будней** (праздники и перенесённые выходные), хранится в global `site-settings` (массив ISO-дат). Суббота и воскресенье всегда нерабочие (перенесённые рабочие субботы в схеме не поддерживаются — упрощение, упомянуть в комментарии).

```ts
isWorkingDay(dateKey: string, holidays: readonly string[]): boolean
addWorkingDays(from: DateInput, n: number, holidays: readonly string[]): string   // YYYY-MM-DD; считаем со СЛЕДУЮЩЕГО дня после from
workingDaysBetween(fromKey: string, toKey: string, holidays): number
leadTimeDays(isTriplex: boolean): number   // 10 или 14
earliestReadyDate(today: DateInput, isTriplex: boolean, holidays): string  // addWorkingDays(today, leadTimeDays)
isUrgent(desiredDate: DateInput | null | undefined, now: Date, isTriplex: boolean, holidays): boolean
// true, если желаемая дата РАНЬШЕ earliestReadyDate (строго меньше). Пустая дата → false
export const URGENT_MESSAGE = 'Срочного изготовления нет. Ближайший срок — от 10 рабочих дней с даты договора, для триплекса — от 14'
export const RU_HOLIDAYS_2026_2027: readonly string[]  // сид для task-16 (см. ниже)
```

`RU_HOLIDAYS_2026_2027` — ISO-даты выходных **будних** дней по производственному календарю РФ. Черновик по 2026 (обязательно сверить с официальным постановлением Правительства РФ через Exa/consultant.ru и поправить): `2026-01-01, 01-02, 01-05, 01-06, 01-07, 01-08, 01-09, 02-23, 03-09, 05-01, 05-11, 06-12, 11-04, 12-31`. Для 2027 найти официальный календарь; если ещё не опубликован — внести фиксированные праздники и пометить комментарием `// TODO verify`. Тесты календаря используют **передаваемые фикстуры**, не эту константу (кроме одного smoke-теста, что все даты валидны и это будни).

### plural.ts

```ts
pluralRu(n: number, forms: readonly [one: string, few: string, many: string]): string
// через Intl.PluralRules('ru'): 'one' → one, 'few' → few, 'many' → many, 'other' (дробные) → few
pluralObjects(n: number): string   // «объект» / «объекта» / «объектов» (только слово без числа)
```

### placeholders.ts — движок меток `{…}`

Работает со **строкой** (обёртки для Lexical и meta пишут task-16/15).

```ts
export interface PlaceholderContext {
  prices: PricesInput;
  promo: PromoInput | null;
  now: Date;
  conditions: string;   // готовая строка: «Заказы от 50 м² · срок от 10 рабочих дней с даты договора · КП в среднем за 2–3 рабочих дня»
  contacts: string;     // готовая многострочная/однострочная строка контактов
  requisites: string;
  phone: string;        // «+7 (351) 247-05-57»
  thickness?: number;   // толщина текущей страницы (для {N}, {цена}, {вес}…)
}
replacePlaceholders(input: string, ctx: PlaceholderContext): string
listPlaceholders(input: string): string[]
```

Таблица меток (поддерживать и ASCII «-», и «−» U+2212 в `{N-}`, `{цена-}`, `{вес-}`):

| Метка | Результат |
|---|---|
| `{цена_Nмм}` (`{цена_4мм}`, `{цена_10мм}`, …) | число через `formatPrice` (без «₽»); если нет цены/просрочено/15/19 → «по расчёту» (просрочено или нет цены) либо «по запросу» (15, 19) |
| `{цена}` | то же для `ctx.thickness`; без `thickness` — метка остаётся |
| `{дата_цен}` | `formatDateRu(prices.priceDate)` |
| `{акция_текст}` | `promo.text`, если `promoActive`, иначе пустая строка |
| `{условия}`, `{контакты}`, `{реквизиты}`, `{телефон}` | соответствующие строки контекста |
| `{N}` | `thickness` |
| `{2N}` / `{6N}` | `2·thickness` / `6·thickness` |
| `{вес}` | `formatNumber(2.5·thickness)` (5 мм → «12,5») |
| `{вес×2}` | вес стекла 1000 × 2000 мм, т.е. `2.5·thickness·2` |
| `{N-}` / `{N+}` | предыдущая / следующая толщина из `THICKNESSES`; у крайних — «—» |
| `{цена-}` / `{цена+}` | цена соседней толщины по правилам `{цена}`; нет соседа — «—» |
| `{вес-}` / `{вес+}` | вес соседней толщины; нет соседа — «—» |

Прочие метки (`{виды}`, `{faq}`, `{текст_подбора}`, `{обработка}`, `{блок «…»}`, `{площадь × цена}`) **не трогать** — остаются в тексте как есть. После подстановки пустых значений (`{акция_текст}`) убрать висящие разделители: `« · »` в начале/конце строки, двойные пробелы, пробел перед знаками препинания, возникшие из-за пустой подстановки (`{условия} · {акция_текст}` при неактивной акции → только условия).

### stop-words.ts (ТЗ §11)

```ts
export const EXPERIENCE_PHRASE = 'За 21 год специалисты Inex выполнили более 1500 проектов'
export interface StopWordOptions {
  partnerFactories?: readonly string[];      // названия заводов-партнёров из site-settings (целые слова, без регистра)
  extraStopWords?: readonly string[];
  experiencePhrase?: string;                 // по умолчанию EXPERIENCE_PHRASE (из site-settings)
  ignoreRules?: readonly StopRuleId[];       // для исключений на уровне документа
}
export interface StopWordFinding { rule: StopRuleId; match: string; index: number; message: string }
checkStopWords(text: string, opts?: StopWordOptions): StopWordFinding[]
```

Встроенные правила (регистронезависимо, флаг `u`; **границы слов — через `(?<![\p{L}\p{N}])` / `(?![\p{L}\p{N}])`, потому что `\b` не работает с кириллицей**):

| rule id | Паттерн |
|---|---|
| `heat-soak` | `heat\s*[- ]?soak`, `термовыдержк\p{L}*` |
| `hst` | `HST` как отдельное слово |
| `stekloppaket` | `стеклопакет\p{L}*` |
| `own-production` | `собственн\p{L}*\s+производств\p{L}*` |
| `harden-self` | `закаливаем\s+сам\p{L}*` |
| `turnkey` | `монтаж\p{L}*\s+под\s+ключ`; **исключение**: в том же предложении встречается `inex.su` (мост на inex.su) |
| `armored` | `бронированн\p{L}*` |
| `smart-glass` | `смарт[-\s]?стекл\p{L}*` |
| `antiglare` | `антиблик\p{L}*` |
| `spy` | `шпион\p{L}*` |
| `partner-factory` | каждое имя из `partnerFactories` |
| `experience` | любая фраза вида «за N лет/год/года … более N проектов» (регэксп `/за\s+\d+\s+(?:лет|год|года)[^.!?]{0,80}?\d[\d\s]*\+?\s*проект\p{L}*/iu`), отличающаяся от `EXPERIENCE_PHRASE` |

### limits.ts (SSoT 4.5, ТЗ 4.5)

```ts
export interface TechLimits {
  flat: { longMin: 300; shortMin: 150; longMax: 3000; shortMax: 2000 };
  painted: { thickMin: 4; thickMax: 15; longMin: 350; shortMin: 150; longMax: 3000; shortMax: 1600 };
  bent: { thickMin: 4; thickMax: 12; longMax: 2000; shortMax: 1200; radiusMin: [{ thickFrom: 4; thickTo: 6; mm: 1000 }, { thickFrom: 8; thickTo: 12; mm: 1500 }] };
  holes: { dMin: 4; dMax: 130; dMaxOneSide: 220; glassLongMin: 250; glassShortMin: 100; glassLongMax: 3000; glassShortMax: 1600 };
  print: { long: 1100; short: 700 };
  minAreaM2: 50;
}
export const DEFAULT_TECH_LIMITS: TechLimits;
```
(Типы-литералы приведены для читаемости; в коде допускаются `number`.) Адаптер global `tech-params` → `TechLimits` пишет task-15; домен использует `DEFAULT_TECH_LIMITS`, если лимиты не переданы.

### quiz-schema.ts

Константы с id и русскими подписями (дословно teksty/05-kviz.md):

- `QUIZ_TYPES`: `tempered` Закалённое стекло · `triplex` Триплекс · `partitions` Перегородки · `railings` Ограждения · `shower` Душевые перегородки · `canopies` Козырьки · `facade` Стеклянный фасад · `shopfronts` Торговые витрины · `verandas` Остекление веранд и террас · `mirrors` Зеркала · `other` Другое.
- `QUIZ_THICKNESSES = THICKNESSES` + значение `'custom'` («Подберите под нагрузку»).
- `QUIZ_KINDS`: `clear` Прозрачное · `low-iron` Осветлённое · `matte` Матовое · `tinted` Тонированное · `painted` Крашеное по RAL · `ribbed` Рифлёное · `bent` Гнутое. `TINT_COLORS`: `bronze` бронза · `graphite` графит · `grey` серое.
- `QUIZ_EDGES`: `ground` шлифованная · `polished` полированная · `trapezoid` «трапеция» · `euro` «еврокромка» · `facet30` фацет 30 мм · `facet50` фацет 50 мм · `unknown` не знаю — подскажите. Фацет допустим только при `type === 'mirrors'`.
- `QUIZ_DECOR`: `matting` матирование · `print` печать (до 1100 × 700 мм) · `film` плёнка. `QUIZ_STAMP`: `standard` в стандартном месте · `custom` укажу место · `none` без клейма. `QUIZ_PACKING`: `film` плёнка · `cardboard` картон · `crate` ящик под кран или погрузчик · `carrier` требования перевозчика. `QUIZ_ROLES`: `contractor` подрядчик · `manufacturer` производитель мебели или изделий · `developer` застройщик или генподрядчик · `designer` дизайнер или архитектор · `other` другое.
- `DEFAULT_DELIVERY_CITIES`: Челябинск, Екатеринбург, Тюмень, Омск, Новосибирск, Кемерово, Красноярск, Уфа, Пермь, Самара, Казань, Сыктывкар, Волгоград, Другой, Самовывоз (Челябинск). (Источник правды — global `tech-params`; константа — только значение по умолчанию.)
- `FILM_THICKNESSES` — из `weight.ts`.
- Типы id: `QuizTypeId`, `QuizKindId`, `QuizEdgeId`, `QuizPackingId`, `QuizRoleId`, `TintColorId` (вывести из констант). Они **канонические для всего проекта**: те же строки — ключи select-полей схемы (`quizPrefill.type/kind`, `tech-params.quizOptions`, `leads.role/productType`, `products.quizType`; задачи 06–08) и значения URL-параметров квиза `type`/`vid` (`buildQuizHref` task-15, парсер task-34). Маппинга между словарями нет. Поэтому id не меняются после задачи 10.

Схемы zod:

- `quizAnswersSchema` — **полные** ответы для отправки: `type` (enum), `thickness` (число из списка или `'custom'` + `customNote` обязателен), для `type='triplex'`: `triplex: { glass1, glass2, film }` (glass1/glass2 из списка толщин, film из `FILM_THICKNESSES`), `kind`, `tint?`, `ral?` (строка, обязательна при `painted`), `bendRadius?` (число, при `bent`), `positions?`, `area?` (число ≥ 0, парсится через `parseNumber`, разрешена запятая), `maxW?`, `maxH?`, `edges[]`, `holes: { has, count?, diameters?: number[] }`, `holeInnerEdge?`, `cutouts?`, `decor[]`, `stamp?`, `stampNote?`, `file?: { uploadToken, name, size }`, `noFile?: boolean`, `desiredDate?` (`YYYY-MM-DD`), `city?`, `cityOther?`, `packing[]`, `packingNote?`, `needDocs?`, `contact: { company (обяз.), inn? (10 или 12 цифр), name (обяз.), phone (обяз.), email?, role?, comment? }`, `consent: true`.
- `quizDraftSchema` = частичная версия для `localStorage` (ключ `QUIZ_DRAFT_KEY = 'inex-quiz-draft-v1'`), без требований обязательности.
- `sanitizeQuizAnswers(a)`: сбрасывает несовместимое (фацет при `type !== 'mirrors'`, `tint` при `kind !== 'tinted'`, `ral` при `kind !== 'painted'`, `bendRadius` при `kind !== 'bent'`, `triplex` при `type !== 'triplex'`).
- Блокирующая валидация — **только** контакты и согласие; остальное — подсказки (см. `quiz-flags.ts`).

Сообщения: обязательное поле — «Заполните поле, чтобы мы могли связаться с вами»; согласие — «Чтобы отправить заявку, отметьте согласие на обработку персональных данных»; телефон — «Укажите телефон в формате +7 (900) 000-00-00»; e-mail — «Проверьте адрес электронной почты»; ИНН — «ИНН — 10 или 12 цифр».

### lead-schemas.ts

```ts
export const FORM_TYPES = ['quiz', 'drawing', 'callback', 'sample', 'load', 'contacts', 'full'] as const;
normalizePhone(input: string): string | null   // «8 (900) 123-45-67», «+7 900 123 45 67», «9001234567» → «+79001234567»; не 10 цифр после кода → null
normalizeEmail(input: string): string          // trim + lower-case
```

`leadSubmitSchema = z.discriminatedUnion('formType', [...])`. Общая часть (`leadBase`):
`entryPage` (строка, путь, до 500), `utm?: { source?, medium?, campaign?, term?, content? }`, `metrikaClientId?` (строка до 64, может быть пустой), `consent: z.literal(true, { error: CONSENT_MESSAGE })`, `formToken` (строка), `company_website?` (honeypot: любая строка, схема допускает; сервер сам решает), `uploadTokens?: string[]` (≤ 5).

Состав по `formType`:

| formType | Поля (обязательные помечены *) |
|---|---|
| `quiz` | `answers: quizAnswersSchema` (контакты внутри `answers.contact`) |
| `drawing` и `full` (одинаковый набор) | name*, phone*, company, email, city, area, comment, uploadTokens (рекомендуется, не обязателен), `sourceLabel?` (откуда нажали, напр. «Отправить чертёж»), `params?` |
| `callback` | name*, phone* |
| `sample` | name*, phone*, company, email, glassKind (строка), address (город/адрес), comment |
| `load` («подобрать под нагрузку») | description*, sizes, mounting, name*, phone*, company, email, uploadTokens |
| `contacts` | name*, phone*, company, email, comment |

Телефон нормализуется в схеме (`transform`) в `+7XXXXXXXXXX`; e-mail — в нижний регистр. Экспортировать `type LeadSubmit = z.infer<typeof leadSubmitSchema>` и `leadSubmitSchemaForForm(formType)` для клиентской валидации отдельных форм.

### quiz-flags.ts

```ts
export type QuizFlag = 'small_volume' | 'nonstandard_size' | 'urgent' | 'no_file' | 'needs_docs';
export const QUIZ_FLAG_LABELS: Record<QuizFlag, string> = {
  small_volume: 'Малый объём', nonstandard_size: 'Нестандартный размер', urgent: 'Срочно', no_file: 'Без файла', needs_docs: 'Нужны документы',
};
interface QuizContext { now: Date; holidays: readonly string[]; prices: PricesInput; promo: PromoInput | null; limits?: TechLimits }
computeQuizFlags(a: QuizAnswersDraft, ctx: QuizContext): QuizFlag[]
getQuizHints(a: QuizAnswersDraft, ctx: QuizContext): QuizHint[]   // { id: string; severity: 'info' | 'warn'; text: string; step: 2|3|4|6 }
quizEstimate(a: QuizAnswersDraft, ctx: QuizContext): { amount: number; text: string } | null
```

Правила флагов:
- `small_volume`: `0 < area < 50` (49,9 — да; 50 — нет; нет площади — нет).
- `nonstandard_size`: есть `maxW`/`maxH` и выполнено хотя бы одно: вне плоских лимитов (`min(w,h) < 150 || max(w,h) < 300 || max(w,h) > 3000 || min(w,h) > 2000`); `kind='painted'` и (толщина вне 4–15 или стекло вне 350×150 — 3000×1600); `kind='bent'` и (толщина вне 4–12, или стекло больше 1200×2000, или радиус меньше минимума: 4–6 мм → 1000, 8–12 мм → 1500); `holes.has` и (стекло вне 250×100 — 3000×1600, или любой Ø < 4 / > 130, или Ø < толщины); `decor` содержит `print` и стекло больше 1100 × 700 (консервативно, менеджер уточнит). Для ориентации «длинная/короткая» сторона берётся как `max/min` независимо от порядка ввода W×H.
- `urgent`: `isUrgent(desiredDate, now, type==='triplex', holidays)`.
- `no_file`: `noFile === true` или `file` отсутствует на шаге отправки (флаг считается при отправке; в черновике — только по `noFile`).
- `needs_docs`: `needDocs === true`.

Тексты подсказок (дословно teksty/05-kviz.md):
- шаг 3, `small_volume`: «Мы работаем с заказами от 50 м². Если это часть большого проекта — оставьте контакты, объединим позиции в один заказ»;
- шаг 3, акция (`area >= promo.thresholdArea` и `promoActive`): `promo.text`;
- шаг 3, `nonstandard_size`: «Нестандартный размер — менеджер уточнит возможность изготовления»;
- шаг 2, `painted`: «Крашеное стекло — толщина 4–15 мм, размер до 3000 × 1600 мм»;
- шаг 2, `bent`: «Гнутое — до 1200 × 2000 мм; радиус от 1000 мм для 4–6 мм и от 1500 мм для 8–12 мм»;
- шаг 4, отверстия: `holeHint(thickness)`; если любой Ø вне 4–130 — `HOLE_DIAMETER_HINT`;
- шаг 4, печать: «Печать — до 1100 × 700 мм»;
- шаг 6, `urgent`: `URGENT_MESSAGE`.

`quizEstimate` (только при `priceState==='price'`, `area > 0`, `thickness` — число, `type !== 'triplex'`): текст «Ориентировочно от {formatRub-число без ₽ → amount} ₽ за стекло без обработки и доставки. Цены на {дата_цен}. Точная стоимость — в КП»; число с NBSP-разрядами, затем « ₽».

### Тесты (vitest, `describe`/`it`, фиксированные `now`)

Обязательные наборы (минимум):

- `prices`: priceDate 2026-10-15, `now` = 2026-11-29 → `'price'` (45 дней), 2026-11-30 → `'calc'` (46), дата в будущем → `'price'`; толщина 15 и 19 → всегда `'calc'`; `price: null` → `'calc'`; `priceCaption` равна эталону; `estimateAmount(100, 10, …)` = 140000; `resolvePrice` label для 10 мм «от 1 400 ₽/м²» (с NBSP), для 19 мм «по запросу», просрочено «Цена по расчёту».
- `format`: `formatPrice(1400) === '1 400'`, `formatPrice(700)`, `formatPriceFrom(2000) === 'от 2 000 ₽/м²'`, `formatSizeMm(3000, 2000) === '3000 × 2000 мм'`, `parseNumber('12,5') === 12.5`, `parseNumber('1 000') === 1000`, `parseNumber('abc') === null`, `formatDateRu('2026-10-15T00:00:00.000Z') === '15.10.2026'`.
- `promo`: активна внутри интервала, включительно в день окончания, неактивна на следующий день, `active:false` → неактивна; `promoHint(99.9)` null, `promoHint(100)` = текст при активной акции, null при неактивной.
- `holes`: `holeRules(10)`; `holeRules(4)` = 8/8/24/4; допуск: 4→1, 20→1, 20.1→2, 100→2, 101→null, 3→null; статусы: 3 → out_of_range, 131 → out_of_range, 150 + oneSide → ok, 221 + oneSide → out_of_range, d=8 при t=10 → by_agreement; `parseDiameters('10, 12,5; 20')` = [10, 12.5, 20]; `parseDiameters('Ø8 мм 12')` = [8, 12]; `glassWithHolesSizeOk(3000, 1600)` true, `(3001, 1600)` false, `(100, 250)` true (порядок не важен), `(90, 300)` false; `holeHint(10)` строка дословно; `holeHint()` общая.
- `weight`: 10 мм, 1000 × 2000, 3 шт → perM2 25, perGlass 50, batch 150; 8+8 с плёнкой 0,76 → perM2 ≈ 40.72 (`toBeCloseTo`), `formatWeightKg(40.72, 'perM2') === '40,72'`; `filmWeightPerM2(1.52) ≈ 1.44`; `carryHint` на границах 20 / 20.01 / 40 / 80 / 80.01; `calcWeight` с нулевой шириной → null; запятая в размерах обрабатывается на уровне `parseNumber`; `formatWeightKg(1234.4, 'batch') === '1 234'`; `WEIGHT_TABLE` совпадает с таблицей teksty.
- `working-days`: `addWorkingDays('2026-10-19', 10, [])` = `2026-11-02`; с праздником `2026-10-21` = `2026-11-03`; `addWorkingDays('2026-10-19', 14, [])` = `2026-11-06`; пятница+1 = понедельник; `isUrgent('2026-11-01', now=2026-10-19, false, [])` = true; `'2026-11-02'` = false; триплекс: `'2026-11-05'` = true, `'2026-11-06'` = false; пустая дата → false; «сегодня» берётся по поясу `Asia/Yekaterinburg` (тест на `now = 2026-10-19T20:00:00Z`, где в Челябинске уже 20-е число).
- `plural`: 1, 2, 5, 11, 12, 14, 21, 22, 25, 101, 111 → корректные формы «объект/объекта/объектов»; дробное 1,5 → «объекта».
- `placeholders`: примеры из таблицы (`{цена_10мм}` → «1 400» с NBSP; `{N}`, `{2N}`, `{6N}` при thickness=10 → 10, 20, 60; `{вес}` при 5 мм → «12,5»; `{вес×2}` при 10 → «50»; `{N-}` при 4 → «—», `{N+}` при 12 → «15»; `{цена+}` при 12 → «по запросу»; просроченные цены → «по расчёту»; `{дата_цен}` → «15.10.2026»; `{акция_текст}` при неактивной акции + висячий « · » вычищен; `{условия}`; неизвестная метка `{виды}` остаётся; без `thickness` метка `{N}` остаётся).
- `stop-words`: по одному положительному и одному отрицательному примеру на каждое правило; «стеклопакетов» (падеж) ловится; «HST» ловится, «AHSTB» — нет; «монтаж под ключ» ловится, но не в предложении с `inex.su`; фраза «За 20 лет мы сделали 1000 проектов» — `experience`; точная `EXPERIENCE_PHRASE` — чисто; `partnerFactories: ['Завод Х']` ловится; `ignoreRules` отключает правило.
- `quiz-schema` / `lead-schemas`: минимальная валидная заявка проходит; без согласия — ошибка с точным текстом; пустой телефон/имя — «Заполните поле, чтобы мы могли связаться с вами»; `normalizePhone('8 (900) 123-45-67') === '+79001234567'`; `+7 900 123 45 67`; 9 цифр → null; `type='triplex'` без `triplex` не ломает схему черновика; `sanitizeQuizAnswers` сбрасывает фацет при смене типа; ИНН из 9 цифр — ошибка; площадь «49,5» парсится как 49.5; honeypot-поле допускается схемой; `callback` требует только имя+телефон+согласие+formToken.
- `quiz-flags`: area 49.9 → `small_volume`, 50 → нет; размер 3001 × 100 → `nonstandard_size`; 150×300 → нет; painted 19 мм → `nonstandard_size`; bent 10 мм с радиусом 1200 → `nonstandard_size`, с 1500 → нет; holes с Ø 140 → nonstandard; `urgent`/`no_file`/`needs_docs`; `quizEstimate` для 10 мм и 60 м² = «Ориентировочно от 84 000 ₽ …» (с NBSP), для 15 мм и при просрочке → null; подсказка акции при area ≥ 100 и активной акции; тексты подсказок равны эталонам.

### Code Snippets

```ts
// priceState — ядро правила 45 дней
export function priceState(thickness: number, prices: PricesInput, now: Date = new Date()): PriceState {
  if (REQUEST_ONLY_THICKNESSES.includes(thickness)) return 'calc';
  const price = getPrice(thickness, prices);
  if (!price || price <= 0 || !prices.priceDate) return 'calc';
  const age = daysBetween(toDateKey(prices.priceDate), toDateKey(now));
  return age <= prices.staleAfterDays ? 'price' : 'calc';
}
```

## Acceptance Criteria

- [ ] Все перечисленные файлы созданы; ни один не импортирует `payload`, `react`, `next`, `@/payload-types`.
- [ ] Реэкспорт через `src/lib/domain/index.ts`; публичные имена и сигнатуры совпадают с описанием выше (другие задачи опираются на них).
- [ ] `pnpm test` проходит; покрыты все наборы из раздела «Тесты» (≥ 100 проверок суммарно), включая границы 45/46 дней, 20/20.01 кг, допуски Ø 20/20.1, 49.9/50 м², пояс Asia/Yekaterinburg.
- [ ] Все форматы тысяч содержат NBSP (U+00A0); тесты это проверяют явным ` `.
- [ ] `pnpm lint` и `pnpm typecheck` проходят.
- [ ] Русские сообщения совпадают дословно с teksty/05-kviz.md и teksty/10-blog-kalkulyator.md §1.

## Notes

- Модель: премиум (много точной логики).
- Источники: `docs/inex/16-tz-razrabotka.md` §4–§7, §11; `docs/inex/15-ssot-tehnologiya.md` §1, §4, §8, §11, §14; `res/inex-glass-handoff/teksty/05-kviz.md`, `teksty/10-blog-kalkulyator.md` §1, `teksty/03-kartochki-tolshchin.md` (таблица соседних толщин: 4: «— / 5», 19: «15 / —»); `docs/inex/struktury-stranic/p0-dokumenty-gost-kviz.md` §4.
- Особенность прототипа `Kviz.dc.html`: «срочно» там считается в календарных днях (14 / 20). **Правильное правило — рабочие дни (10 / 14)** по ТЗ и teksty/05; прототип не повторять.
- Поправки 19.10: Heat Soak Test, стеклопакеты и спецстёкла в квизе/подсказках отсутствуют; фацет только для зеркал (30/50 мм).
- Стоп-слово «М1» не встроено (в ТЗ §11 его нет). `partnerFactories` берётся из `site-settings.stopWords` (kind `factory`), по умолчанию список пустой. Если заказчик добавит «М1», статья `/blog/markirovka-zakalennogo-stekla/` (там «М1» — марка стекла) исключается так:
  - в аудите task-40 — записью allowlist `{ match: "М1", url: "/blog/markirovka-zakalennogo-stekla/" }`;
  - в тестах сида task-31 — `ignoreRules: ['partner-factory']` для этого документа.

  Других исключений нет.
- Правило `experience` срабатывает и на строках мета из 17-meta («1500+ проектов за 21 год»). Северность назначает потребитель: в аудите task-40 это `error` для текста страниц и `warn` для мета. Сама функция `checkStopWords` северность не знает.
- Использовать Exa/context7 для сверки с актуальным производственным календарём РФ и API zod 4.
