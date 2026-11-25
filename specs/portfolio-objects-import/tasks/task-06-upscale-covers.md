# Task 06: Upscale script and pilot (full cover run is in task 08)

## Status

complete

## Wave

2

## Description

Every imported portfolio object shows its first photo (the cover) large: listing card (427:300 crop at the 800 px `card`
size), home marquee (4:5 portrait crop), and the object page main frame (1288:760, original file). All inex.su photos are
≤1000 px on the long side, so the covers look soft. To keep costs low the customer approved upscaling ONLY the cover of
each of the 43 objects via kie.ai (×2), converting everything to WebP. In this task (wave 2) write an idempotent script that
upscales covers and QA-checks that the AI did not change the content, and **run only the pilot** (5 covers, both models),
then STOP and report so the user can approve a model. The content (final covers) is not ready in wave 2, so the full run
over all covers is done by task 08 step 1 with the approved model; it writes the results to a local folder for the loader (task 07).

## Dependencies

**Depends on:** task-01-merge-manifest, task-02-kie-upscale-client
**Blocks:** task-08-local-verification

**Context from dependencies:**
- task 01: `scripts/import-inex/data/objects-manifest.json` — `objects[]` with `slug`, `coverKey` (sha1) and
  `photos[{key, file (repo-relative local path), sourceUrl (public https://inex.su/media/big/<name> for origin "inex"), origin, width, height}]`.
  Content tasks (04/05, running in parallel with you) write `scripts/import-inex/data/content/<slug>.json` whose
  `photos[0].key` is the FINAL cover (may differ from `coverKey`). Your script must prefer `content.photos[0].key` when
  the content file exists, else `coverKey` — the pilot therefore uses manifest `coverKey`s, and task 08 simply runs the
  script over everything after the content is done.
- task 02: `scripts/lib/kie.ts` exports `KieClient`, `kieApiKey()` (reads `KIE_AI_API_app_KEY`), `KieClient.upscale(model,
  imageUrl, factor)` → `{ resultUrls, creditsConsumed, … }`, `KieClient.uploadFile(filePath)` → public URL (24 h, free),
  `getCredits()`. Models: `"topaz/image-upscale"` (×2 → 10 credits ≈ $0.05/photo) and `"recraft/crisp-upscale"`
  (0.5 credits; output size undocumented, input ≤16 MP).

## Files to Create

- `scripts/import-inex/upscale-covers.ts` — CLI.
- Output (not in git, `scripts/.import-tmp/` is ignored): `scripts/.import-tmp/covers/<sha1>.webp`,
  `scripts/.import-tmp/covers/raw/<sha1>.<model>.<ext>` (downloaded kie result), `scripts/.import-tmp/covers/report.json`,
  `scripts/.import-tmp/covers/pilot/` (comparison images).

## Files to Modify

- none.

## Technical Details

### CLI

```
pnpm tsx --env-file=.env scripts/import-inex/upscale-covers.ts --pilot=5            # both models on 5 covers, then STOP
pnpm tsx --env-file=.env scripts/import-inex/upscale-covers.ts --model=topaz|recraft [--only=<slug>] [--dry-run]   # full run: executed by task 08, not here
```

This task implements both modes but only RUNS `--pilot` (and `--dry-run` of the full mode to prove resolution works).

- Resolve covers: for each manifest object → cover key (content file first) → photo record. Skip covers whose long side is
  already ≥1600 px (e.g. РМК-Арена webp) — just convert to WebP.
- Idempotent: skip a sha1 that already has `covers/<sha1>.webp` with `status: "ok"` in `report.json` for the same model.
- Input URL: ALWAYS `uploadFile(<local file of the photo>)` (free, no dependency on inex.su being reachable from kie, and
  the local file is the exact sha1 that is in the manifest — 16 file names exist in several sha1 dirs, so a `sourceUrl` could
  point to a different image). Use the manifest `sourceUrl` only as a fallback when the local file is missing/unreadable.
- Print the balance (`getCredits`) before and after; abort if the estimated cost exceeds the balance.
- Concurrency 2; never retry an ambiguous createTask (library handles); log `taskId`, credits, timing to the report.

### Pilot (must run first, then stop)

`--pilot=5`: pick 5 covers with varied content (one with text/logos/signage, one with thin railings/cables, one with
reflections, one portrait, one dark interior). Run both models (~5×10 + 5×0.5 = 52.5 credits ≈ $0.26). For each write
`pilot/<slug>.png` = side-by-side: original (bicubic ×2) | topaz | recraft, plus crops 400×400 of a detailed area. Print a
table: model, output size, SSIM/PSNR, credits. **Then stop and report to the coordinator** — the user chooses the model
(action-required.md). Do not upscale all covers before that approval.

### QA per image (automatic)

1. Output dims: topaz must be exactly input × 2 (±1 px); recraft — record the actual factor.
2. Downscale the result back to the input size with sharp (`kernel: "lanczos3"`), greyscale, compute SSIM (8×8 windows,
   standard constants, implement in the script — no new dependency) and PSNR vs the original greyscale.
3. Flag if SSIM < 0.95 or PSNR < 30 dB (tune on the pilot; record thresholds in the report). For flagged images write a
   diff heatmap `covers/flagged/<sha1>.png` and look at it (Read tool shows images). If the upscale changed content (text,
   shapes, extra objects) → `status: "rejected"`, keep the original instead. Never retry a rejected image automatically.

### WebP output

`sharp(buf).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 80, effort: 5 })`;
ensure < 2 MB (else quality 72). For rejected/skipped covers write the WebP of the original so the loader always finds
`covers/<sha1>.webp`. Report entry:

```json
{ "<sha1>": { "slug": "trk-rodnik", "model": "topaz/image-upscale", "status": "ok|rejected|skipped-large|original",
  "src": [1000, 666], "out": [2000, 1332], "ssim": 0.97, "psnr": 34.1, "credits": 10, "taskId": "…", "at": "ISO" } }
```

## Acceptance Criteria

- [ ] Pilot ran (≤ 60 credits), comparison images + table produced, coordinator informed. The full run is NOT done in this
      task (task 08 runs it after the user approves a model).
- [ ] `--dry-run` of the full mode resolves a cover (content cover first, else `coverKey`) and a local file for all 43 objects
      and prints the estimated cost per model; re-running the pilot costs nothing for already-processed sha1s (idempotent).
- [ ] Credits before/after reported; key never printed.
- [ ] `pnpm lint`, `pnpm typecheck` pass.

## Notes

- Topaz «Standard» behaviour is content-preserving; still, real-object photos must not get invented details — QA is the gate.
- Non-cover photos are NOT upscaled (budget); the loader converts them to WebP itself.
