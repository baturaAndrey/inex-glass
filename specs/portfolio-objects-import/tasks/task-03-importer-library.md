# Task 03: Extract reusable importer library from import.ts

## Status

complete

## Wave

1

## Description

`scripts/import-inex/import.ts` (1559 lines, task 37 of the site spec) imports inex.su portfolio pages one-page-per-object
as drafts. The new loader (task 07) merges several pages into one object and publishes, but must reuse the proven pieces:
media download/dedupe/creation, taxonomy lookup/creation, image sniffing, alt texts, stop-word loading, import notes and
the prod guard. Move these into an importable module without changing the behaviour of `import.ts`.

## Dependencies

**Depends on:** None (Wave 1)
**Blocks:** task-07-merge-objects-loader

**Context from dependencies:** none.

## Files to Create

- `scripts/import-inex/lib/media-store.ts` — `MediaStore` (+ `sniffImage`, `download`, constants it needs).
- `scripts/import-inex/lib/taxonomies.ts` — `Taxonomies` (+ `OBJECT_TYPE_ALIASES` if used by it).
- `scripts/import-inex/lib/common.ts` — `assertNotProduction`, `photoAlts`, `importNotesText`, `loadCmsStopWords`,
  `errorMessage`, small shared helpers/types.
- (split differently if cleaner — max ~4 files under `scripts/import-inex/lib/`)

## Files to Modify

- `scripts/import-inex/import.ts` — import those symbols from `./lib/*` instead of defining them; no behaviour change.

## Technical Details

Current top-level definitions in `import.ts` (line numbers approximate): constants `PHOTO_DIR`, `MEDIA_INDEX_JSON`,
`DOWNLOAD_CONCURRENCY=4`, `DOWNLOAD_TIMEOUT_MS=30000`, `DOWNLOAD_ATTEMPTS=3`, `MEDIA_CREDIT="inex.su"`,
`OBJECT_TYPE_ALIASES` (125); `assertNotProduction(allowProd)` (137); `stats` object (186); `errorMessage` (203);
`class Taxonomies` (217); `sniffImage(bytes)` (315); `download(src)` (325); `class MediaStore` (343); `photoAlts` (471);
`importNotesText` (490); `loadCmsStopWords(ctx)` (1358).

Behaviour to preserve (task 07 relies on it):
- `MediaStore`: download (4 parallel, 30 s timeout, 3 tries) → signature check JPEG/PNG/WebP, ≥10 KB, ≥400 px long side →
  dedupe by source URL (existing `media.sourceUrl`) and by sha1 (`scripts/.import-tmp/media-index.json`) →
  `payload.create({ collection: "media", filePath, data: { alt, kind: "photo", isPlaceholder: false, sourceUrl, credit: "inex.su" } })`
  with the seed request context. Sha1 is computed on the original bytes (the `stripUploadMetadata` beforeOperation hook
  re-encodes EXIF-bearing files later — dedupe unaffected).
- **`MediaStore` constructor option for the index path** (default `MEDIA_INDEX_JSON` = `scripts/.import-tmp/media-index.json`,
  so `import.ts` is unchanged): task 07 passes `<out>/media-index.json`, because on prod `/app` is read-only for the `node`
  user (`save()` writes the index through `writeFileAtomic`). With the default path and `dryRun` nothing is written, as now.
- **Fix media dedupe across runs and on prod.** Today `init()` (import.ts ~353) loads only media whose `sourceUrl` is like
  `inex.su` and then drops sha1-index entries whose ids are not in that set — so folder photos (`inex-objects:<path>`) are never
  re-found, and on prod there is no index file at all. Change `init()` to load media for BOTH prefixes (`like: "inex.su"` and
  `like: "inex-objects:"`, e.g. `or`), fill `bySource` from them and filter the loaded sha1 index against the union of ids. The
  sha1 index becomes an optional accelerator, never the only source of truth (a deleted/missing `media-index.json` must not cause
  duplicates). `import.ts` behaviour stays the same for its own URLs.
- Add to `MediaStore` (new, needed by task 07) a method to create media from a **local file** that is not downloaded:
  `fromLocalFile(file, { alt, sourceUrl?, credit? })` → media id. Order of dedupe: (1) exact `sourceUrl` match in `bySource`
  (when a `sourceUrl` is given) → reuse; (2) otherwise sha1 of the bytes **that will be uploaded** (for covers/WebP: the
  converted file, not the original) via the optional index → reuse; (3) create (same checks as `createMedia`: signature, size,
  ≥400 px — small checks may be relaxed for covers via an option). The photos are already local in
  `scripts/.import-tmp/photos/<sha1>/<name>` and `res/Объекты/...`, covers come as upscaled WebP files; it never writes into
  `scripts/.import-tmp/photos`. `credit` overridable (e.g. «inex.su» vs «Inex Glass»), `alt` passed through. With no
  `sourceUrl` the media has none (loader passes `inex-objects:<path>` for folder photos and `<url>#cover-x2` for upscaled
  covers, see task 07).
- `Taxonomies`: today `product(category)` goes through `CATEGORY_PRODUCTS` and may CREATE products, and `objectType(text)`
  matches `OBJECT_TYPE_RULES` keywords (it cannot find «Концертный зал» or «Коттедж»). Keep both for `import.ts` and add, for
  task 07:
  - `productBySlug(slug)` — find-only by `slug` (cached), throws a clear error if the product does not exist; never creates;
  - `objectTypeByName(name, { create })` — exact (case-insensitive trimmed) match on the object-type `name`; when missing and
    `create: true` creates it (names allowed by the caller: «Спорт и отдых», «Рестораны», «Медицина», «Госучреждения»,
    «Производство», «Образование»), slug via `src/payload/fields/transliterate.ts`, `order` after the existing ones; with
    `create: false` returns/throws «missing» (dry-run reports «would create»);
  - the existing `city(name)` keeps rejecting regions.
- `CATEGORY_PRODUCTS.osteklenie` in `selectors.ts` would create a near-duplicate product «Остекление»: leave `import.ts`
  as is but document in the lib that new callers must map to `osteklenie-verand-i-terras`.
- `stats` counters used by the report: keep them in `import.ts` or make the lib accept an optional stats sink — no global
  mutable state shared between two scripts.

Run the importer's dry mode to prove nothing changed:
`pnpm tsx --env-file=.env scripts/import-inex/import.ts --dry-run --limit=5` against the local dev DB (docker compose
Postgres `inex-glass-postgres-1`; start Docker Desktop if needed). Payload may regenerate `src/payload-types.ts` — revert it
(`git checkout src/payload-types.ts`).

## Acceptance Criteria

- [ ] `import.ts` has no copies of the moved code; output of `--dry-run --limit=5` is identical before/after (diff the console output).
- [ ] New `fromLocalFile`, the index-path constructor option, `init()` loading both `inex.su` and `inex-objects:` media,
      `productBySlug` and `objectTypeByName` exist, documented with JSDoc.
- [ ] Dedupe check (dev DB): creating media twice through `fromLocalFile` with the same `sourceUrl` returns the same id, also
      after deleting `media-index.json` and re-running `init()`.
- [ ] `pnpm lint`, `pnpm typecheck` pass; `src/payload-types.ts` unchanged.

## Notes

- Do not touch `parse-objects.ts`, `selectors.ts` (except comments), `shared.ts`, `fix-csv.ts`, `crawl.ts`.
