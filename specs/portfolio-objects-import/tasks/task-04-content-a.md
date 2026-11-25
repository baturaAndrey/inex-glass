# Task 04: Card content for manifest batch a

## Status

pending

## Wave

2

## Description

Write the card content of the portfolio objects of **batch "a"** (`scripts/import-inex/data/objects-manifest.json`,
objects with `"batch": "a"`; the two batches are balanced by total photo count) as one JSON file per object in `scripts/import-inex/data/content/<slug>.json`. The customer is busy and
approved: «fill from the photos and inex.su texts, the content manager fixes later». So every field must be filled, but
everything that is a guess goes into `notes` as «уточнить: …». Task 05 does the same for batch "b" (different files;
do not touch them).

## Dependencies

**Depends on:** task-01-merge-manifest
**Blocks:** task-08-local-verification

**Context from dependencies:** task 01 produced `scripts/import-inex/data/objects-manifest.json` (one entry per real object:
`slug, name, city, yearHint, legacyUrls, categories, productHints, objectTypeHint, xlsx (raw user row — highest priority),
sourceTexts[{url,title,text}] (inex.su H1 + description), photos[{key (sha1), file (repo-relative local path), sourceUrl,
origin, pageUrl, width, height, caption}], coverKey, featuredDefault, notes, batch`) and the validator
`pnpm tsx scripts/import-inex/validate-content.ts [--slug=<slug>]` which must pass for your files. It also produced
**contact sheets**: `scripts/.import-tmp/sheets/<slug>-NN.jpg` (~12 numbered thumbnails per sheet, each labelled with the
first 8 hex chars of its sha1) and a sidecar `<slug>-NN.json` listing the photos in sheet order (`index`, `label` = short prefix, full sha1 `key`, file, size,
page URL). Use the full key from the sidecar in `photos[].key`.

## Files to Create

- `scripts/import-inex/data/content/<slug>.json` — for each manifest object with `batch: "a"` only.

## Files to Modify

- none.

## Technical Details

### Output format (`ObjectContent`)

```ts
{
  "slug": "trk-rodnik",                 // = manifest slug = file name
  "name": "ТРК «Родник»",
  "city": "Челябинск",                  // existing city or a new one (no regions)
  "objectType": "Торговые центры",
  "year": 2011,
  "products": ["ograzhdeniya", "peregorodki"],
  "task": "…",                          // ≤300 chars, one or two sentences
  "spec": [{ "product": "Ограждение атриума", "thickness": "8+8", "kind": "Закалённый триплекс", "triplexFormula": "8+8", "processing": "Шлифовка кромки" }],
  "chips": ["Триплекс 8+8", "Цельностеклянные перегородки"],
  "photos": [{ "key": "<sha1>", "alt": "Стеклянное ограждение атриума ТРК «Родник» на втором этаже" }],
  "featured": true,
  "related": ["trk-ural", "torgovyj-kompleks-gorki"],
  "notes": ["уточнить: толщина типовая", "уточнить: год по дате публикации на inex.su"]
}
```

Allowed values:
- `products` (existing slugs only): `dushevye-peregorodki`, `kozyrki`, `ograzhdeniya`, `osteklenie-verand-i-terras`,
  `peregorodki` (use this, NOT `steklyannye-peregorodki`), `steklyannyj-fasad`, `torgovye-vitriny`, `tripleks`,
  `zakalennoe-steklo`, `zerkala`. The first product decides the quiz prefill on the object page — put the main
  construction first.
- `objectType`: Аэропорты, Арены, Банки, Концертный зал, Коттедж, Гостиницы, Офисы, Торговые центры, or new: Спорт и отдых,
  Рестораны, Медицина, Госучреждения, Производство, Образование.
- `city`: city name, e.g. Челябинск, Омск, Сургут, Ишим, Ханты-Мансийск, Магнитогорск, Пласт, Варна, Павлодар,
  Каменск-Уральский, Златоуст, Соколиная гора.

### How to fill each field (priority: xlsx row → inex.su texts → photos → typical values)

1. **Look at the contact sheets** (Read tool shows images) of the object — every photo is on a sheet, so you see all of
   them. Open a full-size file (`photos[].file` from the manifest) ONLY for cover candidates and for photos that are unclear
   on the sheet (glass or not, fittings, blur). Identify construction types, glass kind (clear/tinted/matte, triplex film edge visible, tempered), fittings
   (point fixings, clamp profile, handrail, aluminium frame), setting (atrium, stairs, office, pool…).
2. **Drop photos** that show no glass (pure metal railings, stone, columns) or are near-duplicates/blurred — just omit
   their keys from `photos`; record «исключено N фото без стекла» in `notes`.
3. **Order photos**: first = cover. It must be the most impressive, sharp, well-lit glass photo; for `featured` objects it
   must crop well to 4:5 portrait (subject in the centre) and to 427:300 landscape (listing card). Start from manifest
   `coverKey` but change it if a better one exists.
4. **task** («Задача и сложность одной фразой», ≤300 chars): rephrase (never copy verbatim) the inex.su description and/or
   xlsx task + what the photos show: what was made, where, what made it complex (radius glass, large heights, fire
   rating, heavy traffic, triplex for safety). Facts not visible or not in sources must not be invented (no areas,
   metres, deadlines, counts). Example: «Цельностеклянные ограждения атриума и галерей в торговом комплексе: триплекс на
   точечных креплениях по периметру трёх этажей, с поручнем из нержавеющей стали».
5. **spec** (≥1 row, each row = one construction): `product` (e.g. «Ограждение атриума», «Перегородки офиса», «Фасад»),
   `thickness` — from sources if stated, else TYPICAL: atrium railings triplex «8+8»; stair/interior railings triplex
   «6+6»; frameless glass partitions «10 мм»; partitions in aluminium profile «6 мм» (or per source); showers «8 мм»;
   canopies triplex «8+8»; facades «6 мм» (never write «стеклопакет» — forbidden word). Add
   `kind` («Закалённое стекло», «Закалённый триплекс», «Матовое закалённое стекло»…), `triplexFormula` for triplex,
   `processing` if visible/stated (шлифовка кромки, отверстия, моллирование для радиусного стекла). Every typical value →
   note «уточнить: толщина типовая (<row>)».
6. **chips** (≤3, short, visible on the card): main glass + main construction, e.g. «Триплекс 8+8», «Точечное крепление»,
   «Радиусное стекло». If omitted, the site generates them from spec — so chips are optional but preferred.
7. **year**: xlsx → `yearHint` → if unknown pick the inex.su page date year or a plausible year and note «уточнить: год».
8. **featured**: keep manifest `featuredDefault` (≤8 in total across both content tasks: Кольцо, Родник, Трактор, Аэропорт,
   Сургутнефтегаз, шахматная академия, РМК-Арена, Урал).
9. **related**: 2–4 manifest slugs of similar objects (same type or same product, same city preferred).
10. **alt** for each kept photo: 10–200 chars, describes what is visible + object name, Russian, no «фото/изображение»
    prefix, no stop words. Different alts for different photos.
11. **name**: keep xlsx/manifest name; fix obvious typos («Детским мир» → «Детский мир», «Угорская» → «Югорская» for the
    chess academy — the real name is «Югорская шахматная академия»; keep the slug unchanged).

### Copy rules (hard)

- Russian. **No installation wording at all on object cards**: never «монтаж», «шеф-монтаж», «бригада-партнёр»,
  «смонтировали», «установили/установка», «замер», «под ключ» — even the allowed site wording is forbidden here. No
  «в своём цехе» / «наше производство». We do NOT make glass ourselves (no «закаливаем», «наше стекло», «собственное
  производство стекла», no partner factory names). «Изготовили конструкции» / «поставили стекло» are allowed ONLY when a
  source text (inex.su description, xlsx) says so — otherwise describe the construction neutrally («цельностеклянные
  ограждения атриума из закалённого триплекса»). No «стеклопакет», «heat soak», «HST», «бронированное», «армированное»,
  «солнцезащитное», «смарт», «антиблик», «шпион», «ГОСТ 24866», «срочное изготовление». No experience claims (the
  «За 21 год…» sentence is not used on cards). The validator (task 01) rejects all of the above (Unicode, case-insensitive);
  task 07 re-checks with the CMS stop-word list (partner factory names).
- The xlsx task for ТРК «Кольцо» contains «монтажа» and is >300 chars — rewrite it without any installation wording.
- Known data issues: the .txt in folder «04 ТРЦ «Алмаз»» is Аркаим Плаза text; Сбербанк Ишим folder is empty (use inex.su).

### Process

For each object: write the file → `pnpm tsx scripts/import-inex/validate-content.ts --slug=<slug>` → fix until 0 errors.
At the end run the validator for all your slugs. Commit nothing else.

## Acceptance Criteria

- [ ] One content file per manifest object with `batch: "a"`, each passes the validator with 0 errors.
- [ ] Every object has ≥1 photo, cover chosen consciously (full-size file opened), every photo seen on a contact sheet.
- [ ] Every guessed value has a «уточнить: …» note; no invented numbers beyond typical thicknesses.
- [ ] No forbidden wording and no installation wording at all (validator + manual read-through).
