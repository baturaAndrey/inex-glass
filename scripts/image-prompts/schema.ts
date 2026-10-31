/**
 * Types and zod validation for the kie.ai image generator (`scripts/gen-images.ts`).
 *
 * - `PromptSpec` — one entry of the JSON arrays in `scripts/image-prompts/*.json`.
 * - `StyleSpec` — `scripts/image-prompts/style.json` (shared prompt prefix/suffixes).
 * - `Manifest` — `public/generated/manifest.json`, consumed later by task-38
 *   (upload to the Payload media library with `isPlaceholder: true`).
 */
import { z } from "zod";

export const PROMPT_GROUPS = [
  "backgrounds",
  "glass-types",
  "constructions",
  "glazing-mirrors",
  "processing",
  "hubs-articles",
] as const;

export const IMAGE_KINDS = ["background", "card-illustration"] as const;

/** Aspect ratios we use; all of them are accepted by every model in `scripts/lib/kie.ts`. */
export const ASPECTS = ["16:9", "4:3", "21:9", "1:1"] as const;

export type PromptGroup = (typeof PROMPT_GROUPS)[number];
export type ImageKind = (typeof IMAGE_KINDS)[number];
export type Aspect = (typeof ASPECTS)[number];

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** At least one Cyrillic letter — alt texts must be Russian. */
const HAS_CYRILLIC = /[А-Яа-яЁё]/;
/**
 * Upper bound for alt texts: screen readers announce alt in one go, and common a11y guidance
 * keeps it short. Applied both to prompt specs and to the manifest.
 */
export const ALT_MAX_LENGTH = 125;
const altText = () =>
  z
    .string()
    .trim()
    .min(3)
    .max(ALT_MAX_LENGTH, `alt must be at most ${ALT_MAX_LENGTH} characters`)
    .regex(HAS_CYRILLIC, "alt must be in Russian");
/**
 * Prompt text must not contain literal codes (hex colours like "#2B8C7E", kelvin values,
 * etc.): image models render them as visible text on the glass. Describe colours in words.
 */
const NO_HEX_CODES = /^(?![\s\S]*#[0-9a-f]{3,8}\b)/i;
const promptText = (min: number) =>
  z
    .string()
    .trim()
    .min(min)
    .regex(NO_HEX_CODES, "describe colours in words: hex codes get rendered as text");

export const TargetSchema = z
  .object({
    kind: z.enum(["template", "section", "doc"]),
    collection: z
      .enum(["glass-types", "processing-services", "constructions", "pages", "articles"])
      .optional(),
    slug: z.string().regex(KEBAB_CASE).optional(),
    field: z.enum(["heroImage", "card.image", "backgroundKey"]),
  })
  .strict()
  .superRefine((target, ctx) => {
    if (target.kind === "doc" && (!target.collection || !target.slug)) {
      ctx.addIssue({ code: "custom", message: "doc target requires collection and slug" });
    }
    if (target.kind !== "doc" && target.collection) {
      ctx.addIssue({ code: "custom", message: "collection is only allowed for doc targets" });
    }
    if (target.kind === "template" && !target.slug) {
      ctx.addIssue({ code: "custom", message: "template target requires slug (template name)" });
    }
  });

export const PromptSpecSchema = z
  .object({
    id: z.string().regex(KEBAB_CASE, "id must be kebab-case"),
    group: z.enum(PROMPT_GROUPS),
    kind: z.enum(IMAGE_KINDS),
    aspect: z.enum(ASPECTS),
    subject: promptText(20),
    alt: altText(),
    target: TargetSchema,
  })
  .strict();

export const PromptFileSchema = z.array(PromptSpecSchema).min(1);

export const StyleSchema = z
  .object({
    prefix: promptText(1),
    suffix: z
      .object({
        background: promptText(1),
        "card-illustration": promptText(1),
      })
      .strict(),
  })
  .strict();

export const ManifestEntrySchema = z
  .object({
    id: z.string().regex(KEBAB_CASE),
    kind: z.enum(IMAGE_KINDS),
    files: z
      .object({
        avif: z.string(),
        webp: z.string(),
        avif1280: z.string().optional(),
        webp1280: z.string().optional(),
      })
      .strict(),
    alt: altText(),
    target: TargetSchema,
    /**
     * Actual pixel width of the main `avif`/`webp` file. Images are never upscaled, so this
     * can be below the nominal target: `google/nano-banana` tops out at 1344x768 for 16:9,
     * so backgrounds are 1344 px wide (not 1920); `next/image` serves that file as-is.
     */
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /** kie.ai model that produced the cached source PNG ("unknown" for legacy caches). */
    model: z.string(),
    generatedAt: z.iso.datetime(),
    /**
     * Set after human review when the image must be regenerated (stray text, off-brief, …).
     * task-38 must not upload flagged entries as final placeholders. A successful fresh
     * generation (`--force` or `--only-redo`) rewrites the entry without the flag.
     */
    needsRedo: z.literal(true).optional(),
    /** Short reason for `needsRedo`; only allowed together with it. */
    redoReason: z.string().trim().min(3).max(200).optional(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (entry.redoReason !== undefined && entry.needsRedo !== true) {
      ctx.addIssue({ code: "custom", message: "redoReason requires needsRedo: true" });
    }
  });

export const ManifestSchema = z.array(ManifestEntrySchema);

export type Target = z.infer<typeof TargetSchema>;
export type PromptSpec = z.infer<typeof PromptSpecSchema>;
export type StyleSpec = z.infer<typeof StyleSchema>;
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;
export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * Sidecar metadata stored next to each cached source (`scripts/.cache/kie/<id>.json`), so a
 * later run that reuses the cached PNG records the model that actually produced it.
 */
export const CacheMetaSchema = z
  .object({
    model: z.string().min(1),
    taskId: z.string().min(1),
    generatedAt: z.iso.datetime(),
  })
  .strict();

export type CacheMeta = z.infer<typeof CacheMetaSchema>;
