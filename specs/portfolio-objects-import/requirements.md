# Requirements: Portfolio objects import (inex.su → «Объекты»)

## Summary

The old site inex.su has a portfolio split by construction type (railings, partitions, facades, showers…). The same real
object (e.g. ТРК «Кольцо», a Chelyabinsk mall) appears on several pages, each showing only one kind of construction. The
new site has one card per real object (Payload collection `objects`, pages `/obekty/<slug>/`, home marquee «Объекты»).

The customer asked to take the photos from inex.su, merge them into real objects and fill the object cards from the photos
and the inex.su texts; a content manager will correct the data later. This feature builds a reviewed **merge manifest**,
writes the card **content** per object, **upscales the cover photo** of each object via kie.ai, and loads/publishes the
objects with a committed, idempotent script — first on a local copy of the prod DB, then on production (run by the
coordinator after user approval).

Scope is deliberately small to keep kie.ai costs low: **only large (named, commercial/public) objects with a known city
and glass — 43 objects, ~440 photos, only 43 cover photos upscaled**. If the customer likes the result, the rest
(private cottages/apartments/showers, all photos upscaled) is a separate, budgeted follow-up.

## Goals

- 43 published objects on prod: 40 merged inex.su groups (the 39 approved + Концертный зал (Омск), exact group keys listed in
  task 01) + 3 user-only objects from `res/Объекты` (РМК-Арена, Аэропорт Челябинск, Мизар).
- Every object passes publish validation: city, object type, ≥1 product, year, task (≤300 chars), ≥1 spec row with product
  and thickness, ≥1 photo, alt on every photo.
- One object = all its glass photos from all inex.su pages (+ user folder photos), deduplicated by sha1; metal-only pages
  and photos excluded.
- Cover photo (first in `photos[]`) upscaled ×2 (≥1600 px long side) without visible hallucinations; all photos WebP.
- Up to 8 objects `featured` for the home marquee.
- Content manager can see everything that was guessed: `importNotes` lists «уточнить: …» items.

## Non-Goals

- No schema changes (schema is frozen; AGENTS.md). Adding records to `cities` / `object-types` is data, allowed.
- No small objects (private cottages, apartments, single showers), no objects without a city, no stairs/doors pages that
  were not crawled (stairs stay on inex.su per ТЗ §9), no new Firecrawl crawling.
- No upscaling of non-cover photos.
- No changes to site templates/components.
- The production run itself is not a task-agent job (coordinator + user approval).
- No tests tasks.

## Acceptance Criteria

- [ ] `scripts/import-inex/data/objects-manifest.json` lists 43 objects with photos, legacy URLs, source texts and a content `batch`; contact sheets exist for every object.
- [ ] `scripts/import-inex/data/content/<slug>.json` exists for every manifest object and passes
      `pnpm tsx scripts/import-inex/validate-content.ts` (no errors).
- [ ] Pilot of the upscale models done in wave 2 and the user approved a model; the full cover run (task 08) leaves the QA
      report `scripts/.import-tmp/covers/report.json` with no unreviewed failures.
- [ ] `scripts/import-inex/merge-objects.ts --dry-run` reports 0 validation errors; a real run on a local copy of the prod
      DB creates/updates and publishes all objects; a second run changes nothing (idempotent) and creates no new media — even after
      deleting `media-index.json`. On the dev DB, old one-page drafts from `import.ts` are skipped by the overwrite guard
      (no force).
- [ ] `pnpm audit:content --db` has no errors for `objects`.
- [ ] Screenshots 375 / 1366 / 1920 of `/obekty/`, one merged object page and the home marquee look correct.
- [ ] Redirect CSV regenerated for changed slugs: `fix-csv.ts` (without `--check`) over `slugs.json` merged with `slugs-objects.json`
      writes `docs/inex/12-migration-inex-su.fixed.csv` and `docs/reports/migration-disputed.md`; the source CSV is not edited.

## Assumptions

- Research artefacts in `specs/portfolio-objects-import/research/` (grouping of the Firecrawl cache) are correct; the
  Firecrawl cache `scripts/.cache/firecrawl/` and downloaded photos `scripts/.import-tmp/photos/<sha1>/<file>` exist
  locally (not in git).
- Photos are used from local files (`scripts/.import-tmp/photos/<sha1>/<name>`, `res/Объекты`); kie.ai gets them through
  `uploadFile(local file)`, the inex.su `sourceUrl` is only a fallback.
- kie.ai key in root `.env` as `KIE_AI_API_app_KEY` (balance ~1362 credits ≈ $6.8).
- Thickness rarely appears in sources; typical values are acceptable (customer decision) with an «уточнить» note.

## Technical Constraints

- Payload 3.91 Local API, Postgres uuid ids. Scripts run with `pnpm tsx --env-file=.env …` (or `payload run` with
  top-level `await` — otherwise it exits silently).
- On prod the `-tools` image `/app` is root-owned and read-only for the `node` user (docs/deploy.md §9): every file the
  loader writes (media index, `slugs-objects.json`, report) goes to a writable `--out` dir / bind mount, temp files to
  `os.tmpdir()`.
- Overwrite protection uses the existing seed KV markers (`mayOverwrite` / `rememberSeedWrite`, `src/seed/marker.ts`,
  re-exported by `@/seed/context`), not timestamps in `importNotes`.
- Writes use the seed request context (`getSeedContext()` / `SEED_REQUEST_CONTEXT`, `overrideAccess: true`) so no IndexNow
  jobs and no per-doc revalidation; `revalidateSite()` once at the end. Search plugin still indexes published docs.
- Prod guard: refuse `SITE_ENV=production` or hosts in `IMPORT_PROD_GUARD_HOSTS` without `--i-know-this-is-prod`.
- Copy rules: page copy must not be invented beyond what the customer approved («fill from photos + inex.su, content
  manager fixes later»). Forbidden wording: `docs/inex/16-tz-razrabotka.md` §11 and `src/lib/domain/stop-words.ts`
  (we do not make glass ourselves; no partner factory names; no «стеклопакет», «закаливаем сами», «монтаж под ключ»,
  heat soak/HST, бронированное, армированное, солнцезащитное, смарт, ГОСТ 24866, срочное изготовление, «наше
  производство»…). **Object cards are stricter than the site: no installation wording at all** (no «монтаж», «шеф-монтаж»,
  «бригада-партнёр», «установили», «замер», «под ключ») and no «в своём цехе»; «изготовили конструкции» / «поставили стекло»
  only if a source text says so. Experience claim only «За 21 год специалисты Inex выполнили более 1500 проектов» (not
  used on cards). Text is Russian; code identifiers English. The validator (task 01) enforces this with Unicode regexes
  (START/END look-arounds like `stop-words.ts`) and reuses `scripts/audit/lib/content-rules.ts`; task 07 re-checks with
  `loadCmsStopWords(ctx)` (CMS partner factory names).
- Never commit secrets; never print `KIE_AI_API_app_KEY`.
- Generated files (`src/payload-types.ts`, `importMap.js`) must not change; revert if running Payload regenerates them.
