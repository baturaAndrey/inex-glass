# Task 06: Схема — globals (справочники, настройки, навигация, сниппеты) и хелпер ревалидации

## Status

complete

## Wave

2

## Description

Описываем в Payload все глобальные справочники сайта — единый источник значений, которые подставляются на страницы, в title, квиз и калькуляторы: `prices`, `promo`, `conditions`, `contacts`, `requisites`, `tech-params`, `site-settings`, `navigation`, `snippets`. Тут же создаём хелпер ревалидации кэша (`src/payload/hooks/revalidate.ts`) и модуль имён кэш-тегов (`src/lib/cache-tags.ts`), которыми пользуются все остальные задачи. **Схема после задачи 10 заморожена** и ни одна следующая задача не сможет её менять — поэтому состав полей ниже исчерпывающий; если сомневаетесь, добавляйте поле (добавить дёшево, удалить нельзя без миграции). Значения по умолчанию (дефолты) в схеме — разумный минимум; полное наполнение делает seed (задача 16).

## Dependencies

**Depends on:** task-01-foundation-payload-setup.md
**Blocks:** task-10-schema-freeze.md, task-11-domain-lib.md (типы), task-14-site-header-footer.md, task-15-page-framework-seo.md, task-16-blocks-render-miniseed.md и все страницы, читающие справочники

**Context from dependencies:** Задача 01 создала Payload 3.91 + Next 16.4, `payload.config.ts` (spread реестров), пустой реестр `src/payload/globals/index.ts` (`export const globals: GlobalConfig[] = []`) и контракты, на которые опирается эта задача:
- `src/payload/access/index.ts`: `isAdmin`, `isAdminOrManager`, `isLoggedIn`, `isAnyone`, `isAdminOrSelf`, `publishedOrLoggedIn`, `adminFieldAccess`, `adminOrManagerFieldAccess`.
- `src/payload/slugs.ts`: `rel("media")` / `relGlobal("prices")` — приведение строкового слага к `CollectionSlug`/`GlobalSlug` (используем во **всех** `relationTo`/`findGlobal`, пока `payload-types.ts` не перегенерирован задачей 10; иначе `tsc` ругается на слаги ещё не существующих коллекций).
- `src/payload/editor.ts`: `richTextEditor` (Lexical: h2–h4, списки, ссылки, цитата, таблицы).
- `src/payload/fields/link.ts`: `linkField({ name?, label?, required?, withLabel? })` — группа `{ type: "doc"|"custom", doc (polymorphic), url, label, newTab }`.
- `src/lib/env.ts` → `getEnv()` (нужна ли здесь — по месту).
Роли: `admin` (всё), `manager` (глобалы `prices` и `promo` + заявки/заказы; остальные глобалы только читает). Коллекция `media` создаётся параллельно задачей 07 — на неё ссылаемся через `rel("media")`. Задача 07 и задача 08 импортируют из этой задачи `@/payload/hooks/revalidate` (контракт ниже) — **файл должен быть создан в первую очередь**.

## Files to Create

- `src/payload/globals/prices.ts`, `promo.ts`, `conditions.ts`, `contacts.ts`, `requisites.ts`, `tech-params.ts`, `site-settings.ts`, `navigation.ts`, `snippets.ts` — по одному globals-конфигу на файл (экспорт именованный: `Prices`, `Promo`, `Conditions`, `Contacts`, `Requisites`, `TechParams`, `SiteSettings`, `Navigation`, `Snippets`).
- `src/payload/hooks/revalidate.ts` — хелперы ревалидации (контракт ниже).
- `src/payload/hooks/revalidate.test.ts` — unit-тест (Vitest; если Vitest ещё не установлен параллельной задачей 02 — написать, прогнать после слияния).
- `src/lib/cache-tags.ts` — единый модуль имён тегов кэша.

## Files to Modify

- `src/payload/globals/index.ts` — экспортировать массив `globals` из девяти конфигов (порядок: prices, promo, conditions, contacts, requisites, tech-params, site-settings, navigation, snippets).

Не трогать: `payload.config.ts`, `src/payload/collections/**` (задачи 07, 08), `package.json`, любые компоненты/страницы.

## Technical Details

### Общие правила

- Слаги globals — kebab-case: `prices`, `promo`, `conditions`, `contacts`, `requisites`, `tech-params`, `site-settings`, `navigation`, `snippets`. Названия полей — английский camelCase, `label` — по-русски.
- `admin.group`: «Справочники» (prices, promo, conditions, contacts, requisites, tech-params), «Настройки» (site-settings, navigation, snippets).
- Права (`access`): `prices`, `promo` — `read: isAnyone`, `update: isAdminOrManager`; `conditions`, `contacts`, `requisites`, `tech-params`, `navigation`, `snippets` — `read: isAnyone`, `update: isAdmin`; `site-settings` — `read: isAdminOrManager`, `update: isAdmin` (в нём e-mail уведомлений). Внутри `requisites.bank` — `access.read: adminOrManagerFieldAccess`.
- Сервер читает глобалы через Local API (`overrideAccess` по умолчанию true), REST публично нужен не всем — поэтому ограничения чтения безопасны.
- Версионирование: у `prices`, `promo`, `contacts`, `requisites` включить `versions: { max: 20 }` (история изменений цен/акции). Черновики (`drafts`) не включать.
- Хук `afterChange: [revalidateGlobal("<slug>")]` у каждого глобала.
- Даты — `type: "date"`, `admin.date.pickerAppearance: "dayOnly"` для календарных дат.
- Все строки с метками (`{N}`, `{цена}` …) — обычный текст, валидировать фигурные скобки не нужно.
- Глубоко вложенные массивы/селекты: следить за длиной имён таблиц и enum в Postgres (лимит идентификатора 63 символа). При необходимости задавать `dbName` у массивов/групп (`dbName: "nav_mega"` и т. п.). Для проверки сгенерировать схему (`pnpm payload generate:db-schema`, результат `src/payload-generated-schema.ts` в git **не** коммитить); создавать миграции в этой задаче **нельзя** (это делает задача 10).
- В dev на личной одноразовой БД можно временно включить `PAYLOAD_DB_PUSH=true`; на общих БД — никогда.

### Контракт хелпера ревалидации — `src/payload/hooks/revalidate.ts`

```ts
import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from "payload";
import { collectionTag, docTag, globalTag } from "@/lib/cache-tags";

const IMMEDIATE_GLOBALS = new Set(["prices", "promo", "contacts"]); // revalidateTag(tag, { expire: 0 })

function safeRevalidate(tag: string, immediate: boolean) {
  try {
    revalidateTag(tag, immediate ? { expire: 0 } : "max");
  } catch {
    // вне запроса Next (seed, jobs, CLI) revalidateTag бросает — игнорируем
  }
}

export const revalidateGlobal = (slug: string): GlobalAfterChangeHook => ({ doc, req }) => {
  if (req.context?.disableRevalidate) return doc;
  safeRevalidate(globalTag(slug), IMMEDIATE_GLOBALS.has(slug));
  return doc;
};

export const revalidateCollection = (slug: string) => ({
  afterChange: (({ doc, previousDoc, req }) => {
    if (req.context?.disableRevalidate) return doc;
    // для коллекций с черновиками: черновик, не затрагивающий опубликованную версию, кэш не сбрасывает
    if (doc?._status && doc._status !== "published" && previousDoc?._status !== "published") return doc;
    safeRevalidate(collectionTag(slug), false);
    if (doc?.id) safeRevalidate(docTag(slug, String(doc.id)), false);
    return doc;
  }) as CollectionAfterChangeHook,
  afterDelete: (({ doc, req }) => {
    if (req.context?.disableRevalidate) return doc;
    safeRevalidate(collectionTag(slug), false);
    if (doc?.id) safeRevalidate(docTag(slug, String(doc.id)), false);
    return doc;
  }) as CollectionAfterDeleteHook,
});
```

Использование в коллекциях (задачи 07, 08): `hooks: { afterChange: [revalidateCollection("pages").afterChange], afterDelete: [revalidateCollection("pages").afterDelete] }`. Сигнатуру `revalidateTag(tag, profile)` сверить с Next 16.4 (`import { revalidateTag } from "next/cache"`); профиль `"max"` — stale-while-revalidate, `{ expire: 0 }` — немедленное истечение. Тест `revalidate.test.ts` (с `vi.mock("next/cache")`): (1) пропуск при `req.context.disableRevalidate`; (2) глобалы prices/promo/contacts → `{ expire: 0 }`, остальные → `"max"`; (3) исключение из `revalidateTag` не пробрасывается; (4) черновик без опубликованной версии не ревалидирует.

`src/lib/cache-tags.ts` (контракт для задачи 15, которая оборачивает загрузчики в `unstable_cache`):

```ts
export const globalTag = (slug: string) => `global:${slug}`;
export const collectionTag = (slug: string) => `collection:${slug}`;
export const docTag = (slug: string, id: string) => `doc:${slug}:${id}`;
```

### 1. `prices` — «Цены от»

| Поле | Тип | Обяз. | Валидация / default | Заметки |
|---|---|---|---|---|
| `rows` | array | да | `minRows: 8`, `maxRows: 8`; `admin.initCollapsed: false`; запрещено добавлять/удалять (`admin.components` не нужны — достаточно minRows=maxRows и default) | По одной строке на толщину |
| `rows.thickness` | number | да | допустимо только из {4,5,6,8,10,12,15,19}; уникально среди строк (validate по `siblingData`/`data.rows`) | |
| `rows.priceFrom` | number | если не `onRequest` | целое ≥ 0 | ₽/м² |
| `rows.onRequest` | checkbox | нет | default `false` (для 15 и 19 — `true`) | «по запросу» |
| `rows.note` | text | нет | | напр. «закалка по согласованию» |
| `priceDate` | date (dayOnly) | да | | Дата актуальности цен; от неё считается правило 45 дней |
| `staleAfterDays` | number | да | default 45, min 1 | Порог «Цена по расчёту» |
| `caption` | text | да | default «Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется» | Подпись рядом с ценой; `{дата_цен}` подставляется ДД.ММ.ГГГГ |
| `onRequestLabel` | text | да | default «по запросу» | |
| `staleLabel` | text | да | default «Цена по расчёту» | вместо цифры при просроченной дате |
| `includedTitle` | text | да | default «Входит в цену «от»» | |
| `included` | array(text) `{ text }` | да | default: «Листовое стекло выбранной толщины», «Термическая закалка», «Проверка параметров заказа» | |
| `extraTitle` | text | да | default «Считается отдельно» | |
| `extra` | array(text) `{ text }` | да | default: «Фигурная резка и сложная форма», «Шлифовка, полировка кромки», «Отверстия, вырезы, печать, матирование» | **Без «фацета»** (с 19.10 фацет — только зеркала) |
| `footnote` | textarea | нет | default «Окончательная цена зависит от размеров, формы, обработки кромки, количества отверстий и объёма заказа.» | |

Дефолтные строки `rows`: 4→700, 5→750, 6→800, 8→1300, 10→1400, 12→2000, 15→по запросу, 19→по запросу. Дата в default не задаётся (её вводит менеджер; seed ставит 15.10.2026 или актуальную). Права: manager может править.

### 2. `promo` — «Акция»

| Поле | Тип | Обяз. | Валидация / default |
|---|---|---|---|
| `active` | checkbox | да | default `false` — ручной переключатель |
| `text` | text | да, если `active` | default «−5% на закалённое стекло при заказе от 100 м²» (знак минус U+2212) |
| `badgeText` | text | нет | если пусто — берётся `text` (плашка в шапке) |
| `startDate` | date | нет | |
| `endDate` | date | да, если `active` | не раньше `startDate`; **после этой даты плашка, подпись под ценами и подсказка в квизе скрываются автоматически** (логика `promoActive = active && now >= startDate && now <= endDate` — в задаче 11) |
| `thresholdArea` | number | да | default 100 (м², порог подсказки в квизе) |
| `discountPercent` | number | нет | default 5, информативно |
| `linkUrl` | text | да | default `/zakalennoe-steklo/#ceny` (куда ведёт пункт «Акции» и плашка) |
| `quizHint` | text | нет | override подсказки в квизе; по умолчанию используется `{акция_текст}` |

Права: manager может править. Валидатор `endDate`: ошибка, если `active` и дата пуста.

### 3. `conditions` — «Условия» (блок `{условия}` и полоса `.ig-terms`)

| Поле | Тип | default |
|---|---|---|
| `minOrderM2` | number | 50 (порог флага `small_volume`) |
| `minOrderText` | text | «Заказы от 50 м²» |
| `minOrderFaqText` | text | «50–100 м²» (в FAQ: «от 50 м²; для части заказов — от 100 м²») |
| `leadTimeDays` | number | 10 (рабочих дней; порог флага `urgent`) |
| `leadTimeText` | text | «Срок от 10 рабочих дней с даты договора» |
| `triplexLeadTimeDays` | number | 14 |
| `triplexLeadTimeText` | text | «Срок для триплекса — от 14 рабочих дней с даты договора» |
| `kpText` | text | «КП в среднем за 2–3 рабочих дня» |
| `kpDaysMin`, `kpDaysMax` | number | 2, 3 |
| `priceFixedText` | text | «Цена в договоре фиксируется» |
| `noUrgentText` | text | «Срочного изготовления нет» |
| `noInstallText` | text | «Монтаж не выполняем» |
| `inlineText` | textarea | «Заказы от 50 м², срок от 10 рабочих дней с даты договора, КП в среднем за 2–3 рабочих дня.» — текст метки `{условия}` в абзацах |
| `termsBar` | array `{ text, icon }` (min 3, max 5) | 4 пункта полосы: «Заказы от 50 м²», «Срок от 10 рабочих дней с даты договора», «КП в среднем за 2–3 рабочих дня», «Цена в договоре фиксируется» (`icon` — имя иконки Lucide, text; по умолчанию `check`) |
| `termsBarShort` | array `{ text }` | сокращённая полоса из трёх пунктов (для страниц видов стекла, без «Цена в договоре…») |
| `callout` | richText | «Что нужно учесть: минимальный заказ — от 50 м². Размер одного стекла — от 150 × 300 до 3000 × 2000 мм. Срочного изготовления нет. Стекло заказчика не закаливаем.» |
| `calloutTitle` | text | «Что нужно учесть» |

### 4. `contacts` — «Контакты»

| Поле | Тип | Обяз. | default / заметки |
|---|---|---|---|
| `brandName` | text | да | «Inex Glass» |
| `copyrightHolder` | text | да | «ИП Копылов А. М.» |
| `phones` | array `{ number, label, isPrimary }` | да, min 1 | `number` в формате отображения «+7 (351) 247-05-57» (tel-href строится из цифр); основной один (`isPrimary`, ровно один — validate). Default: +7 (351) 247-05-57 (основной), +7 951 489-04-09, +7 982 329-11-08 |
| `emails` | array `{ address, label, isPrimary }` | да, min 1 | sale@inex.su (основной) |
| `workHours` | group `{ full, short }` | да | full «Пн–пт, 9:00–18:00», short «Пн–Пт 9–18» |
| `callPrompt` | text | да | «Звоните Пн–Пт 9–18» (подпись над телефоном в шапке) |
| `locations` | array | да, min 1 | см. ниже; default — 3 точки |
| `locations.key` | text | да | уникальный slug: `chelyabinsk-office`, `chelyabinsk-warehouse`, `ekaterinburg-office` |
| `locations.type` | select `office|warehouse` | да | |
| `locations.title` | text | да | «Челябинск — офис», «Челябинск — склад и самовывоз», «Екатеринбург — офис» |
| `locations.city` | text | да | |
| `locations.address` | text | да | «ул. Артиллерийская, 124А», «Свердловский тракт, 7В», «ул. Данилы Зверева, 17б» |
| `locations.postalCode`, `locations.region` | text | нет | для JSON-LD LocalBusiness |
| `locations.phones` | array(text) | нет | у офиса Челябинска: +7 (351) 247-05-57, +7 951 489-04-09; у Екатеринбурга: +7 982 329-11-08 |
| `locations.email` | email | нет | sale@inex.su (у склада нет) |
| `locations.hours` | text | да | «Пн–пт, 9:00–18:00» |
| `locations.lat`, `locations.lng` | number | нет | координаты для карты (заполняются позже) |
| `locations.mapUrl` | text | нет | ссылка на Яндекс.Карты |
| `locations.localBusiness` | checkbox | нет | `true` для офисов Челябинска и Екатеринбурга (JSON-LD LocalBusiness); у склада `false` |
| `messengers` | array `{ name, url, icon }` | нет | `icon` select `telegram|whatsapp|max|viber|vk|other`; выпадающий список «Связаться с нами» |
| `sameAs` | array(text url) | нет | соцсети для Organization |
| `inlineText` | textarea | да | текст метки `{контакты}`: «+7 (351) 247-05-57, sale@inex.su, пн–пт 9:00–18:00» |
| `inexSuUrl` | text | да | default `https://inex.su` |
| `inexSuFooterLabel` | text | да | «Двери, лестницы и другие конструкции Inex — на inex.su» |
| `inexSuBridgeLabel` | text | да | «Двери, лестницы и другие конструкции Inex — на inex.su» (та же дословная формулировка `teksty/01-glavnaya.md`, что и в подвале) |

Контакты «временно от inex.su» — заменяются в одном месте. `{телефон}` = основной телефон из `phones`.

### 5. `requisites` — «Реквизиты»

| Поле | Тип | default / заметки |
|---|---|---|
| `legalName` | text | «Индивидуальный предприниматель Копылов Александр Михайлович» |
| `shortName` | text | «ИП Копылов А. М.» |
| `inn` | text | «744700156319» (validate: 10 или 12 цифр) |
| `ogrnip` | text | «323745600102871» (15 цифр) |
| `ogrn`, `kpp` | text | пусто |
| `actualAddress` | text | «г. Челябинск, Свердловский тракт, 7В» |
| `legalAddress` | text | пусто |
| `publishLegalAddress` | checkbox | default `false` — юр. адрес = жилое помещение, **не публиковать** без решения Inex |
| `phone`, `email` | text/email | пусто (берутся из contacts, если пусто) |
| `bank` | group `{ name, bik, account, corrAccount }` | name «ООО «Банк Точка»»; **чтение только admin/manager** |
| `cardPdf` | upload → `rel("media")` | «Карточка предприятия» (PDF; заполнит Inex) |
| `cardLabel` | text | «Скачать карточку предприятия» |
| `inlineText` | textarea | текст метки `{реквизиты}`: «ИП Копылов Александр Михайлович, ИНН 744700156319, ОГРНИП 323745600102871» |
| `pdContactEmail` | email | e-mail для отзыва согласия на ПДн (в тексте политики/согласия) |
| `pdPostalAddress` | text | почтовый адрес для отзыва согласия |

### 6. `tech-params` — «Технические параметры»

Единый источник для квиза, калькуляторов, шаблонов. Числа — мм, если не указано иное. Все поля required с default (значения SSoT `docs/inex/15-ssot-tehnologiya.md` §1–§4, §8, §11 и ТЗ §4.5).

| Группа / поле | Тип | default |
|---|---|---|
| `thicknesses` | number hasMany | [4,5,6,8,10,12,15,19] |
| `flat` | group `{ minW, minH, maxW, maxH }` | 150 / 300 / 3000 / 2000 (правило «нестандартный размер»: min сторона < 150, max сторона < 300, max сторона > 3000 или min сторона > 2000) |
| `painted` | group `{ thickMin, thickMax, minW, minH, maxW, maxH }` | 4 / 15 / 350 / 150 / 3000 / 1600 |
| `bent` | group `{ thickMin, thickMax, minW, minH, maxW, maxH, radius[] }` | 4 / 12 / 150 / 350 / 1200 / 2000; `radius`: array `{ thicknessFrom, thicknessTo, minRadius }` = [4–6 → 1000], [8–12 → 1500] |
| `holes` | group | `diameterMin` 4, `diameterMax` 130, `diameterMaxOneSide` 220, `glassMinW` 250, `glassMinH` 100, `glassMaxW` 3000, `glassMaxH` 1600, `glassThicknessMin` 4, `glassThicknessMaxTwoSides` 25, `glassThicknessMaxOneSide` 50, `edgeFactor` 2, `betweenFactor` 2, `cornerFactor` 6, `minDiameterFactor` 1, `cutoutInnerRadiusMin` 10, `toleranceRanges` array `{ from, to (number, пусто = без верхней границы), tolerance (number, пусто = «по согласованию»), label }` = [4–20 → 1.0], [20–100 → 2.0], [100–∞ → пусто, «по согласованию»] |
| `print` | group `{ thickMin, thickMax, maxW, maxH }` | 4 / 15 / 1100 / 700 |
| `tintColors` | array `{ key (select bronze/graphite/grey — id из task-11 `TINT_COLORS`), name }` | bronze/бронза, graphite/графит, grey/серое |
| `ribbed` | group `{ thicknesses (number hasMany) }` | [4, 6, 8] |
| `facet` | group `{ mirrorsOnly (checkbox), widths (number hasMany), minGlassThickness }` | true / [30, 50] / 4 |
| `mirrors` | group `{ maxSizeMm }` | 2800 (зеркала для залов, максимум 2,8 м) |
| `triplex` | group `{ rawMaxW, rawMaxH, temperedMaxW, temperedMaxH }` | 3500 / 2500 / 3000 / 2000 |
| `clampProfileThicknesses` | number hasMany | [10, 12, 16, 20] |
| `weight` | group `{ kgPerM2PerMm, filmUnitThickness, filmUnitWeight, filmLayers (number hasMany) }` | 2.5 / 0.38 / 0.36 / [0.38, 0.76, 1.14, 1.52] |
| `carryHints` | array `{ upToKg (number, пусто = «больше»), text }` | пороги ≤20, ≤40, ≤80, >80; тексты — **дословно** из `res/inex-glass-handoff/teksty/10-blog-kalkulyator.md` §1 (подставит seed; в схеме default пустой массив допустим) |
| `gost` | group | `tempered` «ГОСТ 30698-2014», `triplex` «ГОСТ 30826-2014», `sizeTolerance` array `{ sizeRange, upTo12, over12 }` = [«до 2000 мм» ±2,0 / ±3,0], [«2000–3000 мм» ±3,0 / ±4,0], [«свыше 3000 мм» ±4,0 / ±5,0]; `flatness` array `{ thicknessRange, general, local }` = [«3–5 мм», «3 / 4», «0,5»], [«6–25 мм», «2 / 3», «0,4»] (значения таблицы 2 ГОСТ сверить с оригиналом — пометка в admin description) |
| `deliveryCities` | array `{ name, kind }` | `kind` select `city|other|pickup`: Челябинск, Екатеринбург, Тюмень, Омск, Новосибирск, Кемерово, Красноярск, Уфа, Пермь, Самара, Казань, Сыктывкар, Волгоград (13, `city`), «Другой» (`other` → в квизе открывает текстовое поле), «Самовывоз (Челябинск)» (`pickup`) |
| `quizOptions` | group | массивы `{ key, label }` (key — латиница, меняется только разработчиком; в admin `description` предупреждает). **Ключи совпадают с id доменной библиотеки task-11 (`src/lib/domain/quiz-schema.ts`: `QUIZ_TYPES`, `QUIZ_KINDS`, `QUIZ_EDGES`, `QUIZ_DECOR`, `QUIZ_STAMP`, `QUIZ_PACKING`, `QUIZ_ROLES`)** — единый словарь для схемы, квиза, URL предзаполнения и заявок; маппинга нет |

`quizOptions` содержит (key → label):
- `productTypes`: `tempered` Закалённое стекло · `triplex` Триплекс · `partitions` Перегородки · `railings` Ограждения · `shower` Душевые перегородки · `canopies` Козырьки · `facade` Стеклянный фасад · `shopfronts` Торговые витрины · `verandas` Остекление веранд и террас · `mirrors` Зеркала · `other` Другое (в таком порядке; у каждого поле `icon` Lucide).
- `kinds`: `clear` Прозрачное · `low-iron` Осветлённое · `matte` Матовое · `tinted` Тонированное · `painted` Крашеное по RAL · `ribbed` Рифлёное · `bent` Гнутое.
- `edges`: `ground` шлифованная · `polished` полированная · `trapezoid` «трапеция» · `euro` «еврокромка» · `facet30` фацет 30 мм · `facet50` фацет 50 мм (оба **только для типа «Зеркала»**; поле `onlyForTypes` — массив ключей типов, `['mirrors']`) · `unknown` «не знаю — подскажите».
- `decor`: `matting` матирование · `print` печать (до 1100 × 700) · `film` плёнка.
- `stamp`: `standard` стандартное место · `custom` укажу место · `none` без клейма.
- `packaging`: `film` плёнка · `cardboard` картон · `crate` ящик под кран или погрузчик · `carrier` требования перевозчика.
- `roles`: `contractor` подрядчик · `manufacturer` производитель мебели или изделий · `developer` застройщик или генподрядчик · `designer` дизайнер или архитектор · `other` другое.

### 7. `site-settings` — «Настройки сайта»

| Группа / поле | Тип | default / заметки |
|---|---|---|
| `experienceText` | text | «За 21 год специалисты Inex выполнили более 1500 проектов» — единственно допустимая формулировка (валидатор-предупреждение: если не совпадает с каноническим текстом — warning в description, не ошибка) |
| `experienceYears` | number | 21 |
| `analytics` | group | `metrikaId` text (цифры), `webvisor` checkbox (true), `yandexVerification` text, `googleVerification` text |
| `branding` | group | `logoDark`, `logoLight`, `logoPng` (для e-mail, @2x), `favicon`, `defaultOgImage` — все upload → `rel("media")` |
| `notifications` | group (**read: adminOrManager**) | `leadNotifyEmails` array `{ email }` (общий ящик), `fromName` text («Inex Glass»), `replyTo` email, `ccAssignee` checkbox |
| `orderLinkTtlDays` | number | 90 (срок жизни ссылки на заказ после статуса «Получено»), min 1 |
| `orderStatuses` | array (ровно 5) `{ key, label, emailText }` | `spec_agreed` «Спецификация согласована», `in_production` «В производстве», `packed` «Упаковано», `shipped` «Отгружено», `received` «Получено» (`emailText` — абзац письма; дефолты задаёт seed) |
| `orderPage` | group | `expiredTitle` «Ссылка больше не действует — свяжитесь с менеджером», `emptyPhotosText` «Фото появятся при отгрузке», `copyLabel` «Скопировать», `copiedLabel` «Скопировано», `emailSubject` «Статус заказа № {номер}: {статус}», `emailButton` «Открыть страницу заказа», `emailSignatureTitle` «Менеджер по заказам Inex Glass», `emailFooterNote` «Вы получили это письмо, потому что оформили заказ в Inex Glass.» |
| `holidays` | array `{ date, name, isWorkday }` | календарь РФ для расчёта рабочих дней (`isWorkday` = перенесённый рабочий день); seed 2026–2027 |
| `stopWords` | array `{ word, kind }` | `kind` select `stem|phrase|factory` (список заводов-партнёров задаёт заказчик, по умолчанию пустой; «М1» в ТЗ не входит — если заказчик его добавит, статья `/blog/markirovka-zakalennogo-stekla/` исключается allowlist'ом аудита task-40, т. к. там «М1» — марка стекла); seed — из ТЗ §11 |
| `indexNow` | group | `enabled` checkbox (false) |
| `cookieBanner` | group | `text` textarea (default «Мы используем файлы cookie и Яндекс.Метрику, чтобы сайт работал удобнее, а мы понимали, какие разделы полезны. Подробнее — в {политике обработки персональных данных}.» — слова в `{}` = ссылка на политику), `acceptLabel` «Принять», `necessaryLabel` «Только необходимые» |
| `consent` | group | `consentVersion` text (напр. «2026-10-20»), `policyVersion` text, `errorText` text («Чтобы отправить заявку, отметьте согласие на обработку персональных данных») |
| `forms` | group | `thankYouTitle` «Спасибо, заявка принята», `thankYouText` («Менеджер проверит данные и пришлёт КП — в среднем за 2–3 рабочих дня. Связь — звонком и по e-mail»), `submitErrorText` («Не удалось отправить заявку. Попробуйте ещё раз или позвоните: {телефон}»), `antispamMinSeconds` 3, `antispamMaxHours` 2 |
| `notFound` | group | `title` «Страница не найдена», `text`, `linksTitle` «Разделы сайта» |

### 8. `navigation` — меню шапки и подвала

Источник: `res/inex-glass-handoff/zadaniya/02-shapka-podval.md`, ТЗ §3.2. Все ссылки — через `linkField()`.

| Поле | Структура |
|---|---|
| `topBar.companyLabel` | text, «Компания» |
| `topBar.companyItems` | array `{ link }`: О компании, Объекты, Контакты, Реквизиты (`/kontakty/#rekvizity`) |
| `topBar.contactLabel` | text, «Связаться с нами»; чекбоксы `showPhone`, `showEmail`, `showMessengers` (true), `callbackLabel` «Заказать звонок» |
| `topBar.segments` | array (max 6) `{ link }`: Застройщикам · Подрядчикам · Дизайнерам и архитекторам · Производителям мебели (ссылки `/klientam/…`) |
| `actionsLink` | group `{ label «Акции», url `/zakalennoe-steklo/#ceny` }` — показывается **только при активной акции** (проверка `promoActive` на сервере) |
| `mainRow` | group: `pills` array `{ key (select services|catalog), label }` (Услуги, Каталог), `links` array `{ link }` (Блог), `searchLabel` «Поиск по сайту», `searchPlaceholder` «Введите запрос», `ctaLabel` «Рассчитать стоимость», `callbackLabel` «Заказать звонок», `myCalcLabel` «Мой расчёт», `myCalcUrl` `/raschet-stoimosti/?resume=1` |
| `sectionRow` | group: `items` array (max 12) `{ link }` — 9 ссылок: Закалённое стекло · Триплекс · Обработка стекла · Стеклянные перегородки · Ограждения · Козырьки · Остекление зданий · Стекло для мебели · Зеркала; `laptopVisibleCount` number (5; на 1280–1365 px показываются первые 5, остальные под «Ещё ▾»), `moreLabel` «Ещё» |
| `megaMenus` | array `{ key (select catalog|services, уникальный), label, columns[], promoCard }` |
| `megaMenus.columns` | array `{ title, links[] }`; `links` array `{ link, hint, subLinks[] }`; `subLinks` array `{ label, url }` (чипсы вида «4», «6», «8», «10», «12 мм») |
| `megaMenus.promoCard` | group `{ enabled, title «Рассчитать стоимость по чертежу», text, buttonLabel «Рассчитать стоимость», buttonKind (select quiz|link), url }` |
| `footer.columns` | array `{ title, links[] }` (`links` array `{ link }`): «Каталог», «Услуги», «Компания» (колонка «Контакты» строится из `contacts`) |
| `footer.bottomLinks` | array `{ link }`: Политика обработки персональных данных, Согласие на обработку персональных данных |
| `footer.showContactsColumn` | checkbox, true |

Состав по умолчанию мега-меню «Каталог» (3 колонки: «Стекло» — Закалённое стекло (подссылки 4, 6, 8, 10, 12), Матовое, Тонированное, Крашеное по RAL, Осветлённое, Рифлёное, Гнутое, Триплекс, Для мебели; «Конструкции» — Стеклянные перегородки, Ограждения и перила, Козырьки, Душевые перегородки для проектов, Торговые витрины, Зеркала (для залов, для салонов), Зажимной профиль и спайдеры; «Остекление зданий» — Стеклянные фасады, Спайдерное остекление, Витрины и магазины, Лифтовые шахты, Веранды и террасы) и «Услуги» (Обработка стекла (кромка, отверстия и вырезы, фацет на зеркалах, матирование, печать, плёнки), Проектирование узлов, Как заказать (требования к чертежам, допуски по ГОСТ, сроки, упаковка и доставка, документы, оплата, приёмка), Калькулятор веса стекла) задаёт seed (задача 16); в схеме default можно не задавать.

### 9. `snippets` — переиспользуемые блоки

`items` array: `key` (text, обяз., уникальный, kebab-case, validate `^[a-z0-9-]+$` и уникальность в массиве), `title` (text), `content` (richText), `ctaLabel` (text), `ctaFormKey` (select `sample|drawing|callback|load|contacts|none`), `ctaFormParams` (json, нужен для параметризуемой формы чертежа, напр. `{ "label": "Отправить проект" }`), `usageNote` (textarea, внутренняя заметка). Минимальные записи, которые создаст seed: `samples` («Образцы и цветопроба», кнопка «Заказать образец» → `sample`; текст: «Оттенок, матовость и цвет лучше согласовать до запуска партии. Пришлём образец или фото эталона под вашим освещением. Образцы — бесплатно, изготовление — около недели.»), `inex-su-bridge` («Нужен монтаж «под ключ»?» — «Проект с монтажом выполняет инжиниринговая компания Inex», кнопка «inex.su»).

## Acceptance Criteria

- [ ] Девять globals созданы в `src/payload/globals/*.ts`, зарегистрированы в `src/payload/globals/index.ts` в указанном порядке; слаги kebab-case, подписи на русском, `admin.group` задан.
- [ ] Для каждого глобала реализованы все поля из таблиц (имя, тип, обязательность, валидация, default); для `rows`, `phones`, `locations`, `orderStatuses` соблюдены min/max.
- [ ] Права соответствуют матрице: manager редактирует только `prices` и `promo`; `site-settings` читают admin/manager; `bank` и `notifications` недоступны публично.
- [ ] `src/payload/hooks/revalidate.ts` и `src/lib/cache-tags.ts` реализованы по контракту; unit-тесты зелёные (после установки Vitest задачей 02), покрывают 4 сценария.
- [ ] Все `relationTo`/`findGlobal` используют `rel()`/`relGlobal()`; нет прямых зависимостей от `payload-types.ts` для ещё не существующих слагов.
- [ ] `pnpm lint` и `pnpm typecheck` проходят; миграции в этой задаче **не** создаются; `src/payload-generated-schema.ts` (если генерировался) не в коммите.
- [ ] Проверка длины идентификаторов Postgres (≤ 63) выполнена по сгенерированной схеме — длинные вложенные имена получили `dbName`.
- [ ] В описании PR/отчёте перечислены все ключи `quizOptions`/`carryHints`, которые должен наполнить seed.

## Notes

- Модель: премиальная (кодинг). Актуальные API Payload 3.91 (поля, access, `dbName`, versions для globals) проверять через context7 `/payloadcms/payload` и Exa.
- Если поля не хватает уже после слияния этой задачи — нужно остановиться и сообщить координатору; после задачи 10 схема заморожена.
- Тексты по умолчанию — дословно из ТЗ/teksty; не придумывать новых формулировок; в сомнении — оставлять `[…]`.
- Значения цен/дат — только в seed; в схеме нет захардкоженной даты цен.
- Расхождение с брифом: в `prices` вместо строгого перечня полей по толщинам использован массив из 8 строк с ограничением min=max=8 (удобнее для админки и расчёта соседних толщин).
