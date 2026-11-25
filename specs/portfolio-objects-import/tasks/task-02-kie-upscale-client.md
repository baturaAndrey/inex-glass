# Task 02: kie.ai client — upscale models, file upload, new key name

## Status

complete

## Wave

1

## Description

Extend the existing kie.ai client `scripts/lib/kie.ts` (today: text-to-image only) so scripts can upscale an existing photo:
add image-input upscale models (Topaz, Recraft crisp), a local-file upload helper (kie needs a public URL as input), and read
the API key from the new env var `KIE_AI_API_app_KEY` (the user rotated the key; the old `KIE_AI_API_KEY` returns 401).
Task 06 uses this to upscale the cover photo of each imported portfolio object.

## Dependencies

**Depends on:** None (Wave 1)
**Blocks:** task-06-upscale-covers

**Context from dependencies:** none.

## Files to Modify

- `scripts/lib/kie.ts` — add upscale support + key helper (keep existing text-to-image API backwards compatible).
- `scripts/gen-images.ts` — read the key through the new helper (line ~596: `process.env.KIE_AI_API_KEY ?? ""`).

## Files to Create

- none (optionally `scripts/lib/kie-upscale-smoke.ts` is NOT wanted — keep scope to the library).

## Technical Details

### Existing client (read it first)

`KieClient` wraps `POST https://api.kie.ai/api/v1/jobs/createTask` with `{ model, input }`, polls
`GET /api/v1/jobs/recordInfo?taskId=` (`data.state` = waiting|queuing|generating|success|fail; `data.resultJson` is a JSON
**string** with `resultUrls[]`; `data.creditsConsumed`), and `GET /api/v1/chat/credit` for the balance. Errors come with
HTTP 200 and the real code in the body; it retries 429 with backoff and never retries an ambiguous `createTask` (to avoid
paying twice). `KIE_MODELS[model].buildInput(prompt, aspect)` builds text-to-image inputs.

### Key name

Add `export function kieApiKey(): string` returning `process.env.KIE_AI_API_app_KEY || process.env.KIE_AI_API_KEY || ""`;
update the constructor error message to mention both names (`KIE_AI_API_app_KEY (or legacy KIE_AI_API_KEY) is not set`).
Never log the key. `gen-images.ts` uses `kieApiKey()`.

### Upscale models

Add a separate registry (don't overload `buildInput(prompt, aspect)`):

```ts
export type UpscaleModel = "topaz/image-upscale" | "recraft/crisp-upscale";
export const KIE_UPSCALE_MODELS: Readonly<Record<UpscaleModel, { credits: number; buildInput: (imageUrl: string, factor: 1 | 2 | 4) => Record<string, unknown> }>> = {
  // Topaz: ×1/×2/×4, long side × factor ≤ 20000 px; 10 credits ≤2K output, 20 credits 4K. Pure SR (content-preserving).
  "topaz/image-upscale": { credits: 10, buildInput: (image_url, factor) => ({ image_url, upscale_factor: String(factor) }) },
  // Recraft crisp: no factor (up to ×4, exact size undocumented), 0.5 credits; input ≤16 MP, sides 32–4096 px.
  "recraft/crisp-upscale": { credits: 0.5, buildInput: (image) => ({ image }) },
};
```
Do NOT add `kie/image-upscale` (generative — hallucinates detail; forbidden for real-object photos).

Add `async upscale(model: UpscaleModel, imageUrl: string, factor: 1|2|4 = 2): Promise<TaskResult>` that reuses the same
create/poll path as text-to-image (refactor the shared part into a private `runTask(model, input)`), returning result URLs
and credits consumed.

Docs (verify field names before coding, fetch with web tools): https://docs.kie.ai/market/topaz/image-upscale.md,
https://docs.kie.ai/market/recraft/crisp-upscale.md.

### File upload (for photos that have no public URL — user folder `res/Объекты`)

Add `async uploadFile(filePath: string, uploadPath = "inex-objects"): Promise<string>` →
`POST https://kieai.redpandaai.co/api/file-stream-upload` (multipart: `file`, `uploadPath`, optional `fileName`; header
`Authorization: Bearer <key>`), returns `data.downloadUrl`. The spec page also lists `api.kie.ai` as host — try
`kieai.redpandaai.co` first, fall back to `https://api.kie.ai/api/file-stream-upload` on 404. Files are deleted after 24 h.
Docs: https://docs.kie.ai/file-upload-api/upload-file-stream.md. Use global `fetch` + `FormData` + `Blob` (Node 24).

### Verification without spending credits

Only `getCredits()` may be called for real (it is free): write a one-off scratch run (not committed) like
`pnpm tsx --env-file=.env -e "import('./scripts/lib/kie.ts').then(async m=>console.log(await new m.KieClient({apiKey:m.kieApiKey()}).getCredits()))"`
→ prints a number (~1362). Do NOT call `upscale` or `uploadFile` in this task (task 06 pilots them with approval).

## Acceptance Criteria

- [ ] `getCredits()` works with `KIE_AI_API_app_KEY` from `.env` (balance printed, key never printed).
- [ ] `KieClient.upscale()` and `uploadFile()` exist, typed, sharing the create/poll/retry logic; no `createTask` retries on ambiguous errors.
- [ ] Text-to-image generation code paths and `gen-images.ts` behaviour unchanged apart from the key helper.
- [ ] `pnpm lint` and `pnpm typecheck` pass.
