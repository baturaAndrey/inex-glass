# Task 07: merge-objects.ts — loader and publisher

## Status

pending

## Wave

2

## Description

Write the committed, idempotent script that loads the merged portfolio objects into Payload and publishes them: media
(WebP; upscaled cover), taxonomies, `objects` documents (adopting existing seed placeholders), `related` links, publish pass
with full validation, a report, and a site revalidation. It will run first on a local copy of the prod DB (task 08), then
on production inside the `-tools` Docker image with inputs bind-mounted (coordinator, after user approval). On prod the
`/app` tree of the image is root-owned and read-only for the `node` user, so everything the script writes goes to a
writable `--out` dir (or `os.tmpdir()`), never into the repo tree.

## Dependencies

**Depends on:** task-01-merge-manifest, task-03-importer-library
**Blocks:** task-08-local-verification

**Context from dependencies:**
- task 01: `scripts/import-inex/data/objects-manifest.json` (`objects[]`: `slug, name, city, yearHint, legacyUrls[]
  (inex.su paths), categories, productHints, objectTypeHint, xlsx, sourceTexts, photos[{key (sha1), file (repo-relative
  path, e.g. scripts/.import-tmp/photos/<sha1>/<name> or res/Объекты/<dir>/<file>), sourceUrl?, origin "inex"|"folder",
  pageUrl?, width, height, caption?}], coverKey, featuredDefault, batch, notes[]`) and
  `scripts/import-inex/validate-content.ts`, which **exports `validateAll({ manifest, contentDir, slugs? }): { errors, warnings }`**
  (CLI behind a main guard, no side effects on import) — import and call it; never spawn the CLI.
  Content files (tasks 04/05, written in parallel with you — develop with 1–2 hand-made samples in a temp dir passed via
  `--content`): `<slug>.json` = `{ slug, name, city, objectType, year, products[] (product slugs), task (≤300),
  spec[{product, thickness, kind?, triplexFormula?, processing?}], chips: string[] (≤3), photos[{key, alt, caption?}]
  (ordered, first = cover, subset of manifest keys), featured, related[] (≤4 slugs), notes[] }`.
  Object cards contain no installation wording and no «в своём цехе» (validator enforces; you re-check with the CMS list).
  Covers (task 06 script, run by task 08): `scripts/.import-tmp/covers/<sha1>.webp` for each cover + `covers/report.json`
  (`{ <sha1>: { slug, model, status: ok|rejected|skipped-large|original, … } }`).
- task 03: `scripts/import-inex/lib/*` exports
  - `MediaStore` — constructor takes the media-index path (pass `<out>/media-index.json`); `init()` loads media with
    `sourceUrl` like `inex.su` AND like `inex-objects:`; `fromLocalFile(file, { alt, sourceUrl?, credit? })` dedupes by exact
    `sourceUrl` first (then optionally by sha1 of the uploaded bytes);
  - `Taxonomies` — `city(name)` (find or create, regions rejected), `productBySlug(slug)` (find-only, throws if missing),
    `objectTypeByName(name, { create })`;
  - `assertNotProduction`, `photoAlts`, `loadCmsStopWords`, `errorMessage`.
  - Seed context: `getSeedContext()` / `SEED_REQUEST_CONTEXT` (see how `scripts/import-inex/import.ts` gets `payload` and the
    context; reuse the same).
- Existing seed helpers (read `src/seed/marker.ts`, re-exported by `@/seed/context`): `mayOverwrite(ctx, "objects", where,
  label)` — true when the doc does not exist, when `ctx.force`, or while its latest version (`draft: true`) still has the
  `updatedAt` stored in `payload.kv` after our last write (legacy fallback for docs without a marker: `updatedAt` within 2 s
  of `createdAt`); logs the skip otherwise. `rememberSeedWrite(ctx, "objects", id)` — stores the doc's current `updatedAt`
  as the marker; must be called after the LAST write of each document.

## Files to Create

- `scripts/import-inex/merge-objects.ts` — CLI.

## Files to Modify

- none (no schema, no `package.json` script needed; run with `pnpm tsx --env-file=.env …`).

## Technical Details

### CLI

```
pnpm tsx --env-file=.env scripts/import-inex/merge-objects.ts [--input=<root>] [--content=<dir>] [--out=<dir>]
     [--dry-run] [--only=<slug,…>] [--no-publish] [--force-dev] [--i-know-this-is-prod]
```
- `--input` (default: repo root): base dir for the manifest and the photo/cover `file` paths. On prod the inputs are
  bind-mounted (read-only is fine) at `/import` with the same relative layout (`/import/scripts/import-inex/data/…`,
  `/import/scripts/.import-tmp/photos/…`, `/import/scripts/.import-tmp/covers/…`, `/import/res/Объекты/…`).
- `--content=<dir>` (default `<input>/scripts/import-inex/data/content`): directory with `<slug>.json`; lets a developer
  point at sample content without touching `data/content/` (owned by tasks 04/05).
- `--out=<dir>` (default `scripts/.import-tmp`, i.e. `<repo>/scripts/.import-tmp`): the ONLY place the script writes besides
  Payload/media storage: `media-index.json` (MediaStore index), `slugs-objects.json`, `merge-objects-report.md`. Created if
  missing. On prod it is a writable bind mount (`-v /root/objects-import/out:/app/scripts/.import-tmp`, see
  `action-required.md`, pattern of `docs/deploy.md` §9.3). Temp WebP conversions go under `os.tmpdir()` (`mkdtemp`, removed
  at the end, also on error).
- Prod guard: `assertNotProduction(flag)` — refuse `SITE_ENV=production` / `IMPORT_PROD_GUARD_HOSTS` hosts without
  `--i-know-this-is-prod`.
- `--force-dev`: sets `force` on the seed context so `mayOverwrite` always returns true (to exercise the write path on a
  dev DB over old drafts). **Refused** (exit 1) when `SITE_ENV=production` or the DB host is in `IMPORT_PROD_GUARD_HOSTS`,
  regardless of `--i-know-this-is-prod`.
- `--dry-run`: no writes at all (no media, no objects, no files in `--out`, no revalidation; the report goes to stdout); still
  loads everything, resolves taxonomies (report «would create»), runs the content validation and the Payload-equivalent
  publish checks (required fields), and prints the plan.

### Steps

1. Load the manifest and the content files; call `validateAll({ manifest, contentDir })` (import from `./validate-content`).
   Additionally re-check every text of the content (`name, task, chips, spec values, alts, captions`) with
   `checkStopWords(text, { partnerFactories, extraStopWords })` using the CMS list from `loadCmsStopWords(ctx)` (partner
   factory names live in `site-settings`, unknown to the static validator). Abort on errors.
2. **Taxonomies** (seed context): cities via `Taxonomies.city(name)` (creates missing ones as data: Ханты-Мансийск, Магнитогорск,
   Пласт, Варна, Павлодар, Каменск-Уральский, Златоуст, Соколиная гора…), object types via
   `objectTypeByName(name, { create: true })` (creation only for the allowed new names «Спорт и отдых», «Рестораны»,
   «Медицина», «Госучреждения», «Производство», «Образование»; any other unknown name = error), products via
   `productBySlug(slug)` (must exist — never created; `peregorodki`, never `steklyannye-peregorodki`). Dry-run: «would create».
3. **Media** per kept photo (content order), all through `MediaStore.fromLocalFile`:
   - cover (index 0): `<input>/scripts/.import-tmp/covers/<sha1>.webp` (task 06/08 output) — if the file is missing, fail the
     object with a clear message («обложка не подготовлена: запустите upscale-covers»);
   - others: convert the original to WebP in the temp dir (`sharp(file).rotate().webp({ quality: 80, effort: 5 })`, no
     resize; long side stays ≤1000 px);
   - `sourceUrl` (the media field): inex URL for inex photos (`photo.sourceUrl`); for folder photos
     `inex-objects:<repo-relative path>`; for a cover with report status `ok` append `#cover-x2` (the upscaled variant must
     not be confused with the low-res original of the same photo — both may coexist); covers with status
     `rejected`/`original`/`skipped-large` keep the plain value. `credit`: «inex.su» for inex photos, «Inex Glass» for
     folder photos. Media `alt` = the photo alt from content (required for images).
   - Dedupe is by exact `sourceUrl` (MediaStore) — so a second run creates no new media even when `media-index.json` is
     missing (fresh prod `--out` dir).
4. **Objects** — three sub-steps.
   a. **Find the target document** per manifest object:
      1. by `legacyUrls.url` ∈ manifest `legacyUrls` (earlier runs of this script or of `import.ts` locally);
      2. else by `slug` (seed placeholders on prod: aeroport-chelyabinsk, arkaim-plaza, glavnoe-upravlenie-surgutneftegaz,
         koncertnyj-zal-omsk, rmk-arena, sberbank-ishim, traktor-arena, trk-rodnik, trk-ural,
         ugorskaya-shahmatnaya-akademiya — drafts with no photos and no legacyUrls → adopt and overwrite);
      3. else create.
      - If (1) matches SEVERAL documents (the local dev DB has 162 one-page drafts from the old `import.ts` run), pick the one
        whose slug equals the content slug, else the oldest; list the others in the report as «дубли старого импорта» (never
        delete them). On prod these old drafts do not exist.
   b. **Overwrite guard (existing documents only):** `await mayOverwrite(ctx, "objects", { id: { equals: id } }, slug)`
      BEFORE the first write. `false` → skip the object, report «пропущено: изменён вручную / опубликован вручную» together
      with a list of what the import would add (e.g. photos/fields that are empty on the doc but filled in content) and do
      not write anything for it (`tk-kolco`, published by the user on 23.11, has no marker and is far from its `createdAt`,
      so it is skipped; the 162 old `import.ts` drafts on a dev DB are expected to be skipped the same way — they are not
      forced; the dev write path is exercised with `--force-dev`). Documents the script itself wrote stay pristine because
      the marker is stored after the last write (step 5). Never add `importNotes` timestamps to detect edits.
   c. **Write**: data written = `name, slug (keep existing), city, objectType, year, products, task, spec,
      chips: content.chips.map((text) => ({ text })) (collection shape is an array of {text}; content holds strings),
      photos[{image, alt, caption}], featured, sortDate = "<year>-01-01T00:00:00.000Z", related (ids, see 5),
      legacyUrls: [{ url }]` (all manifest legacyUrls merged with existing ones, de-duplicated), `sourceUrl`
      = `"https://inex.su" + legacyUrls[0]` **only when the object has at least one legacy URL — otherwise do not set it**
      (folder-only objects must not get «https://inex.suundefined»), `importNotes` = marker line «Импорт объектов
      (merge-objects)» **without a date/timestamp** + content `notes` (one per line) + manifest notes. Leave `seo`, `quizPrefill`
      untouched.
   - New objects are first created as drafts (`draft: true`, no `related` yet) so that all ids exist; existing ones are not
     written here.
5. **Related + publish pass** (all object ids known now). For each object compute the desired full data (as in 4c, with
   `related` mapped from content slugs to ids — only objects that exist in the DB/this run; others → report). Then:
   - **Compare** with the stored latest version (`find` with `draft: true`, `depth: 0`) on the written keys, normalised: strip
     array row ids from `chips`, `spec`, `photos`, `legacyUrls`; compare `photos[].image` as ids; `related` as sorted ids;
     `legacyUrls` as a set of URLs. Equal and already published (checked with `find({ draft: false })`) → «unchanged», no write.
   - `--no-publish`: write the data as a draft (`draft: true`) and stop for that object.
   - Otherwise publish with the **full data + `_status: "published"`, `draft: false`** (never `{ _status: "published" }` alone: an
     adopted placeholder may lack fields that publish validation needs and a partial update validates against the stored
     draft only). Seed context (`context: SEED_REQUEST_CONTEXT`, `overrideAccess: true`). Publish validation runs here;
     on a validation error **re-save the full data as a draft** (`draft: true`) so the content is not lost, and record the
     field errors per object (do not abort the run).
   - **Verify:** after the pass re-query `find({ collection: "objects", where: { id: { in: ids } }, draft: false, depth: 0 })`
     and check that every object that should be published is — this is what the site renders; report mismatches as errors.
   - **Marker:** after the LAST write of each object (publish/draft write of this step, or the creation if nothing else was
     written) call `rememberSeedWrite(ctx, "objects", id)`. Nothing writes to the object after that.
6. Write into `--out` (skipped in `--dry-run`): `slugs-objects.json` `{ "<legacy path>": "<slug>" }` for all legacy URLs of
   all manifest objects (same shape/keys as `scripts/.import-tmp/slugs.json` of `import.ts` — input for task 08's
   `fix-csv.ts` redirect merge), `merge-objects-report.md` (also printed to stdout): counts (created / adopted / updated /
   unchanged / skipped-by-guard / publish errors), media created/reused, taxonomies created, per-object table (slug, status,
   photos, cover model), the skipped list with reasons, «дубли старого импорта», and the **featured section**: the objects
   this run would make `featured` plus the objects ALREADY `featured` in the DB that are not in the manifest or were
   skipped (e.g. `tk-kolco` on prod) — they all feed the home marquee, so the total is printed in the dry-run report.
   `media-index.json` is written by `MediaStore.save()` into `--out`.
7. `revalidateSite(ctx)` at the end (same helper `import.ts` uses: signed `POST /api/revalidate/`); in `--dry-run` skip.
   Search: the search plugin indexes published docs on its own; mention `scripts/reindex-search.ts` in the report.
8. Idempotency: a second run with unchanged inputs → every object «unchanged» (step 5 compare), no new media — also after
   `media-index.json` was deleted — and no new `payload_kv` churn (markers are rewritten only after real writes).

Write with the seed context so no IndexNow jobs and no per-document revalidation are triggered (`SEED_REQUEST_CONTEXT =
{ disableRevalidate: true }`, honoured by the revalidation hooks and IndexNow; objects have no MAX hooks).

## Acceptance Criteria

- [ ] `--dry-run` on the local dev DB with 2 sample content files (`--content=<temp dir>`, `--only=<those slugs>`) prints a
      correct plan and writes nothing (no media, no docs, nothing in `--out`).
- [ ] Real run on the local dev DB with `--force-dev --out=<scratch dir>` creates media + objects and publishes them
      (verified with `find({ draft: false })`); second run → all unchanged, no new media, also after deleting
      `<out>/media-index.json`.
- [ ] Without `--force-dev`, matching old `import.ts` drafts (no marker) are skipped and reported, not modified; objects
      published by a human (`tk-kolco` shape: published, no marker) are skipped and reported with the would-add list.
- [ ] Prod guard works (refuses without `--i-know-this-is-prod` when `SITE_ENV=production`; `--force-dev` refused there).
- [ ] The script writes only into `--out` and `os.tmpdir()` (run it with the repo tree read-only or check with a diff of
      `git status`); `--dry-run` writes nothing.
- [ ] `chips` stored as `[{ text }]`; a folder-only object has no `sourceUrl`; adopted placeholders publish through the full
      data update.
- [ ] `pnpm lint`, `pnpm typecheck` pass; `src/payload-types.ts` / `importMap.js` unchanged (revert if Payload regenerated them).

## Notes

- Do not delete anything (no cleanup of old local import drafts) — out of scope; report them instead.
- Do not put sample content into `scripts/import-inex/data/content/` (tasks 04/05 own it): keep samples in a temp dir and pass
  `--content`.
