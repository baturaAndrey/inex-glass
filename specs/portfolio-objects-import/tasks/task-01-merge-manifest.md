# Task 01: Merge manifest builder + content validator

## Status

complete

## Wave

1

## Description

Build `scripts/import-inex/data/objects-manifest.json` — the single reviewed list of the 43 real objects to import, with
all their glass photos (sha1-deduplicated, local files), legacy inex.su URLs, source texts and hints, a content `batch`
("a"/"b") per object and per-object contact sheets for the content writers — and a validator for
the per-object content files written later (importable as `validateAll`). The old site inex.su shows one real object on several portfolio pages (one per
construction type); research already grouped the cached pages into 137 real objects. This task turns that research into a
committed, re-runnable TypeScript builder restricted to the approved scope (large named objects with a city and glass), and
adds the user-only objects from `res/Объекты`.

## Dependencies

**Depends on:** None (Wave 1)
**Blocks:** task-04-content-a, task-05-content-b, task-06-upscale-covers, task-07-merge-objects-loader

**Context from dependencies:** none. Inputs already exist (not produced by tasks):
- `specs/portfolio-objects-import/research/objects-grouped.json` — `{ generatedAt, method, defaultCoords, xlsxWithoutInexPages, groups[] }`;
  each group: `groupName, key, city, cities, addresses, coords, coordsAreCityDefault, pages[{url, category, name, mapLabel,
  location, photos, glass}], categories, photoCount, photosLocal, photosMaxWidth, glass, merge, uncachedSiblings,
  suggestedLinks, xlsx{folder,name,slug}`. `page.glass` is `"yes (category|name|visual)"`, `"no (visual: …)"` or `"unclear (visual)"`.
- `research/pages.json` — per cached page: `url, cat, slug, name (H1), loc, city, kind (map label), coord, geos, photos[] (inex.su URLs), task (description text), photoInfo`.
- `research/inex-files.json` — `{ <sha1>: { file (absolute path under scripts/.import-tmp/photos/<sha1>/<name>), w, h, bytes, fmt } }`.
  Note: research found 16 photo URLs whose file name exists in several sha1 dirs (no URL→sha1 index) — resolve by matching
  `photoInfo` in pages.json if present, else by file name + first match, and record a note.
- `research/own-photos.json` — photos in `res/Объекты/<folder>/` with sha1/dims; `research/group.cjs` — the grouping code (port its logic, don't depend on it).
- `res/Объекты/Объекты.xlsx` (sheet «Лист1», header row 1: №, (keywords), Название, Год, Слаг, Город, Тип объекта, Изделия,
  «Задача и сложность одной фразой», «Метки на карточке», «Похожие объекты», Спецификация, Спецификация). Read with `exceljs`
  (already a dependency). Rows: ТРК «Кольцо» (2012, tk-kolco), РМК-Арена (2026, rmk-arena), Аэропорт Челябинск (2017,
  aeroport-chelyabinsk), ТРЦ «Алмаз» (skip: no photos), Угорская шахматная академия (2015, ugorskaya-shahmatnaya-akademiya,
  Югра → city «Ханты-Мансийск», real address ул. Лопарёва 6), Аркаим Плаза (2007, arkaim-plaza), Сбербанк (Ишим) (2014,
  sberbank-ishim), Сбербанк (Омск) (2013, sberbank-omsk), Главное управление «Сургутнефтегаз» (2014,
  glavnoe-upravlenie-surgutneftegaz), Концертный зал (Омск) (2015, koncertnyj-zal-omsk), «Трактор» арена (2008, traktor-arena),
  ТРК «Урал» (2010, trk-ural), ТРК «Родник» (2011, trk-rodnik).

## Files to Create

- `scripts/import-inex/build-manifest.ts` — builder CLI (`pnpm tsx scripts/import-inex/build-manifest.ts [--check]`), pure Node (no Payload).
- `scripts/import-inex/validate-content.ts` — validator CLI for `data/content/*.json` (no Payload, no DB).
- `scripts/import-inex/data/objects-manifest.json` — generated output (committed).
- `scripts/.import-tmp/sheets/<slug>-NN.jpg` + `<slug>-NN.json` — contact sheets and sidecars (generated, not in git; this task owns the folder).
- `scripts/import-inex/data/content/.gitkeep` — folder for content files.
- `scripts/import-inex/data/README.md` — short description of the two formats and how to regenerate.

## Files to Modify

- none (do not touch `import.ts`, `lib/`, `package.json`).

## Technical Details

### Scope (approved selection)

The selection is a hard-coded **allow-list of group keys** (field `key` of `research/objects-grouped.json`) — it is the source of
truth. The earlier heuristic (city set, ≥1 `yes` glass page, ≥3 glass photos) matches 61 groups, not 39, because it also lets
through descriptive groups (`A:…`, `U:…` keys: «Угловая душевая», «Алюминиевые стеклянные фасады», private apartments…), so do
NOT use it to select; use it only for a `--check` warning when a non-listed `L:` group qualifies.

Allow-list (40 inex groups = the 39 approved + Концертный зал (Омск), whose folder `010` exists; glass on its inex pages is
«unclear», the content task decides per photo):

```json
[
 "L:сургутнефтегаз",
 "L:березка",
 "L:сбербанк",
 "L:шахматная академия",
 "L:аркаим плаза",
 "L:buta spa",
 "L:родник",
 "L:рестостар",
 "L:sokol fit",
 "L:урал",
 "L:комсомольский",
 "L:горки",
 "L:краснодеревщик",
 "L:кольцо",
 "L:трактор",
 "L:сбербанк@Омск",
 "L:бовид",
 "L:восточная",
 "L:куба",
 "L:банк снежинский",
 "L:мтс",
 "L:орто-ленд",
 "L:стройком",
 "L:строймеханизация",
 "L:банк ммб",
 "L:кхп",
 "L:ростикс",
 "L:администрация",
 "L:детский мир",
 "L:рэкком",
 "L:чук",
 "L:miras",
 "L:фристайл",
 "L:проспект",
 "L:промсвязьбанк",
 "L:энергоинвест",
 "L:бум",
 "L:панорама",
 "L:уралсибпромсервис",
 "L:концертный зал"
]
```
(`L:сбербанк` is Сбербанк Ишим, `L:сбербанк@Омск` the Омск one; the strings are the exact `key` values of the JSON — the builder
must fail if any of them is missing from `objects-grouped.json`, and `--check` must fail if the selected set differs.) Display names / cities / glass photo counts of the 39 (Концертный зал is the 40th):

Сургутнефтегаз (Сургут, 30); SPA Березка (Пласт, 31); Сбербанк (Ишим, 31); Шахматная академия (ХМАО → Ханты-Мансийск, 22);
Аркаим Плаза (Челябинск, 12); Buta Spa (Челябинск, 6); Родник (Челябинск, 57); Группа Рестостар (Челябинск, 17); Sokol Fit
(поселок Соколиная гора, 10); Урал (Челябинск, 4); Комсомольский (Магнитогорск, 12); Горки (Челябинск, 11); Краснодеревщик
(Челябинск, 7); Кольцо (Челябинск, 10); Трактор (Челябинск, 9); Сбербанк (Омск, 24); Бовид (Челябинск, 8); Восточная (Пласт, 8);
Куба (Челябинск, 8); Банк Снежинский (Челябинск, 7); МТС (Омск, 7); Орто-ленд (Челябинск, 7); Стройком (Челябинск, 6);
Строймеханизация (Челябинск, 6); Банк ММБ (Магнитогорск, 6); КХП (Варна, 6); Ростикс (Омск, 4); Администрация (Омск, 4);
Детским мир → «Детский мир» (Омск, 4); Рэкком (Челябинск, 4); ЧУК (Челябинск, 4); Miras (Павлодар, 4); Фристайл (Сургут, 4);
Проспект (Челябинск, 4); Промсвязьбанк (Челябинск, 4); Энергоинвест (Челябинск, 3); Бум (Каменск-Уральский, 3); Панорама
(Златоуст, 3); Уралсибпромсервис (Челябинск, 3).

Plus 3 user-only objects (photos only in `res/Объекты`, no inex.su pages, no group key — built from `own-photos.json` and `xlsxWithoutInexPages`): `02 РМК-Арена` (5 webp, 1080–1920 px), `03 Аэропорт
Челябинск` (16), `014 Мизар` (5, stairs, Челябинск, «ОЦ ВИПР Мизар» per inex.su URL `lestnicy/bolcovye/oc-vipr-mizar`;
year unknown). Skip `04 ТРЦ «Алмаз»` (no photos; its .txt is actually Аркаим Плаза text), `07 Сбербанк Ишим` (empty folder —
inex.su pages cover it), `Коттедж` (empty).

### Building each object

1. Pages: only member pages with glass `yes…` (drop metal-only: e.g. arkaim-plaza-lestnica, trk-ural-lestnica, sokol-fit
   stairs page); keep `unclear` only for Концертный зал. `legacyUrls` = all member page paths INCLUDING dropped metal pages?
   — No: legacyUrls only for imported pages; list dropped pages in `notes`.
2. Photos: for each glass page, its photos (URL → local file via inex-files.json / photoInfo). Then, if the object has a
   `res/Объекты` folder, add folder photos whose sha1 is not already present (152 folder photos are byte-identical to inex
   downloads — import once). Known: Родник `16.jpg` == `17.jpg` (sha1 dedupe handles it). Skip files < 400 px long side or < 10 KB.
   Order: keep inex page order, pages sorted by category priority (atrium/facade first, then railings, partitions, showers),
   folder-only photos last. `coverKey` default: the first landscape-or-portrait photo with long side ≥ 900 px from the
   most representative page (atrium/facade); for `featuredDefault` objects prefer a photo that crops well to 4:5 portrait
   (subject centered). Content tasks may reorder.
3. `slug`: xlsx slug if a row exists (Концертный зал: `koncertnyj-zal-omsk` = the prod seed placeholder, so it is adopted; the
   CSV row says `koncertnyi-zal-omsk`, which the redirect step of task 08 corrects through `slugs-objects.json`); else an
   existing prod placeholder slug from the README; else the slug of the CSV `new_url` of the first legacy path
   (`docs/inex/12-migration-inex-su.csv`, `objectSlugFromUrl(new_url)` from `@/lib/migration/rules`, same as `import.ts`;
   gives e.g. Мизар → `oc-vipr-mizar`); else transliterate the display name with `src/payload/fields/transliterate.ts`
   (pure, import it). Ensure uniqueness in the manifest; put a note in `notes` when the slug differs from the CSV one.
4. `name`: xlsx name if present, else a proper display name built from the map label + kind, e.g. «ТРК «Горки»», «Банк
   «Снежинский»», «Детский мир», «SPA-комплекс «Берёзка»» — mark built names in `notes` («название по метке карты, уточнить»).
5. `city`: «Ханты-Мансийск» for the chess academy; keep «Соколиная гора» / «Пласт» / «Варна» / «Павлодар» etc. as given;
   normalise «поселок X» → «X» + note.
6. `productHints` from categories: `ograzhdeniya/*` → `ograzhdeniya`; `peregorodki/*` → `peregorodki` (NOT
   `steklyannye-peregorodki`, a duplicate created by hand on 23.11); `fasady` → `steklyannyj-fasad`; `kozyrki` → `kozyrki`;
   `dushevye/*` → `dushevye-peregorodki`; `osteklenie/*` → `osteklenie-verand-i-terras`. Add `tripleks` if any source text
   mentions триплекс. Never invent new products.
7. `objectTypeHint`: xlsx type, else heuristic from label/text: ТРК/ТЦ/ТРЦ → «Торговые центры»; банк/Сбербанк → «Банки»;
   арена → «Арены»; аэропорт → «Аэропорты»; гостиница/отель → «Гостиницы»; офис/управление/компания → «Офисы»; SPA/fit/фитнес
   → «Спорт и отдых» (new type); ресторан/Рестостар/Ростикс → «Рестораны» (new); медицин/Орто → «Медицина» (new);
   администрация → «Госучреждения» (new); КХП/завод → «Производство» (new); else omit (content task decides).
8. `yearHint`: xlsx year; else page date year (pages.json / parser `pageDate`) if any.
9. `sourceTexts`: for every member page `{ url, title: H1, text: description }` (pages.json `name`, `task`), plus the
   folder .txt where it is correct (not the Алмаз one).
10. `featuredDefault`: true for Кольцо, Родник, Трактор, Аэропорт Челябинск, Сургутнефтегаз, шахматная академия, РМК-Арена, Урал.
11. Order of `objects`: the xlsx objects first (xlsx order, Мизар after them), then the rest by glass photo count desc.
12. `batch`: split the 43 objects into two content batches balancing the TOTAL photo count (greedy: objects by photo count
    desc, each to the batch with the smaller total; deterministic, tie → "a"). xlsx/featured objects may be in either.
    Print both totals in the summary (they should differ by < 10 %). Tasks 04/05 take their objects by `batch`.
13. **Contact sheets** (content agents look at these instead of opening every file): per object, with `sharp` composite,
    ~12 thumbnails per sheet (4×3 grid, thumbnails ≤320 px, `fit: inside`, grey background), each thumbnail overlaid with
    its short key (first 8 hex chars of the sha1, SVG text — latin/digits only, white on a dark plate; make sure the
    prefixes are unique within the object, else lengthen). Write `scripts/.import-tmp/sheets/<slug>-NN.jpg` (NN = 01, 02, …,
    JPEG q≈80, ≤ ~1600 px wide) and a sidecar `<slug>-NN.json` = an ordered array `[{ "index": n, "label": "<prefix>", "key": "<full sha1>", "file": "…", "width":
    w, "height": h, "origin": "…", "pageUrl": "…" }]`. Photos on a sheet follow manifest order. Sheets are regenerated by
    every build.

Write the JSON with 2-space indent, deterministic (stable sort), `generatedAt` only changes when content changes
(`--check` mode: rebuild in memory and exit 1 if it differs from the committed file).

### Content validator (`validate-content.ts`)

`pnpm tsx scripts/import-inex/validate-content.ts [--slug=<slug>]` loads the manifest and every
`data/content/<slug>.json` and prints errors/warnings per object; exit 1 on any error. Checks:
- file exists for every manifest object; `slug` equals file name and a manifest slug; no extra files;
- types per the `ObjectContent` contract (README); `year` integer 1990..2027; `task` 40..300 chars; `chips` ≤3 items ≤40 chars;
  `spec` ≥1 row each with non-empty `product` and `thickness`; `related` ≤4, existing manifest slugs, not self;
- `products` ⊆ existing slugs (list in README); `objectType` ∈ existing names ∪ allowed new names {«Спорт и отдых»,
  «Рестораны», «Медицина», «Госучреждения», «Производство», «Образование»}; `city` non-empty, not a region («область»,
  «округ», «край»);
- `photos`: ≥1, keys ⊆ manifest keys of that object, unique, every `alt` 10..200 chars, Russian, not starting with «Фото»;
- stop words, run on `name`, `task`, chips, every spec value, alts and captions:
  1. `checkStopWords(text)` from `src/lib/domain/stop-words.ts` (pure). Also reuse `checkTextUnit(unit, DEFAULT_SETTINGS)` from
     `scripts/audit/lib/content-rules.ts` — it is pure (text in, findings out; its only I/O helper `loadAllowlist` is not
     called) and already carries the ТЗ §11 audit rules (ГОСТ 24866, «наше производство», армированное, солнцезащитное,
     срочное изготовление, шаблоны, emoji, prices, placeholders); map its `error`/`warn` findings to validator errors/warnings.
     If importing it turns out to drag in anything non-pure, copy the patterns instead.
  2. Object-card rule (stricter than the site): **no installation wording at all** and no workshop claim. Case-insensitive
     Unicode regexes built like in `stop-words.ts` (`START = "(?<![\\p{L}\\p{N}])"`, `END = "(?![\\p{L}\\p{N}])"`, flags `giu`;
     `\\b` does not work with Cyrillic). Errors: `${START}(?:смонтир|монтаж|установ|бригад|шеф-?монтаж|замер)\\p{L}*`,
     `${START}под\\s+ключ${END}`, `${START}в\\s+своём\\s+цех\\p{L}*` (and the «е» spelling), `${START}собственн\\p{L}*\\s+производств\\p{L}*`,
     `${START}наш\\p{L}*\\s+производств\\p{L}*`, `${START}закаливаем`, `${START}стеклопакет\\p{L}*`, `ГОСТ\\s*24866`,
     `${START}(?:армированн|солнцезащитн|бронированн|антиблик|шпион)\\p{L}*`, `${START}срочн\\p{L}*\\s+(?:изготовлен|производств)\\p{L}*`,
     `heat\\s*soak|${START}hst${END}`. Warn (allowed only if a source text says so; a human checks):
     `${START}(?:изготовили|изготовлены|поставили|поставлено)\\p{L}*`.
  3. Warn on «[…]» and on Latin-only words;
- `featured` true on ≤8 objects total; every content file belongs to a manifest object, and objects of both batches are covered;
- warn when `notes` is empty (everything guessed should be noted).

Use `import { checkStopWords } from "@/lib/domain/stop-words";` — `tsx` resolves the `@/` alias via tsconfig (as the
existing import scripts do).

**Importable API (task 07 depends on it):** export `validateAll({ manifest, contentDir, slugs? }): { errors, warnings }` (`manifest` =
parsed manifest object or path; `contentDir` = directory with `<slug>.json`, default `scripts/import-inex/data/content`; each
finding carries `slug` and `message`). The CLI part (`--slug`, `--content=<dir>`, `--manifest=<file>`, printing,
`process.exit`) runs only behind a main guard (compare `import.meta.url` with `pathToFileURL(process.argv[1])`, or the pattern
already used in `scripts/`), so `import { validateAll }` has no side effects.

## Acceptance Criteria

- [ ] `pnpm tsx scripts/import-inex/build-manifest.ts` writes `data/objects-manifest.json` with exactly 43 objects (the 40
      allow-listed group keys + РМК-Арена, Аэропорт Челябинск, Мизар) — print a summary table (slug, city, batch, pages,
      photos, cover size) and both batch photo totals (balanced, < 10 % apart).
- [ ] Contact sheets exist for every object (`scripts/.import-tmp/sheets/<slug>-NN.jpg` + sidecar JSON, ≤ ~12 photos per
      sheet, every manifest photo exactly once, prefixes unique).
- [ ] Every photo `file` exists locally; no duplicate sha1 within an object or across objects; no metal-only page photos.
- [ ] `--check` exits 0 right after a build.
- [ ] `validate-content.ts` runs (reports «missing content» for all objects now), its checks match the list above, and
      `validateAll({ manifest, contentDir })` is importable without side effects (smoke: a `tsx` one-liner).
- [ ] Validator smoke with throw-away fixtures (not committed): «монтаж», «бригада-партнёр», «в своём цехе», «Армированное»,
      «ГОСТ 24866», «срочное изготовление», «Стеклопакеты» each produce an error.
- [ ] `pnpm lint` and `pnpm typecheck` pass.

## Notes

- Do not crawl anything (no Firecrawl credits); everything comes from the research files and local photos.
- `scripts/.import-tmp/` and `scripts/.cache/` are not in git — the manifest stores repo-relative paths into them.
- Keep the builder readable; it will be re-run if the selection changes later (follow-up with small objects).
