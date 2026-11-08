import { readFile } from "node:fs/promises";
import path from "node:path";
import { SEED_REQUEST_CONTEXT, type SeedContext } from "./context";

/**
 * Photos shipped with the seed (`src/seed/media/<group>/<file>`, WebP) → `media` documents.
 *
 * Idempotent: a seed photo is found by `sourceUrl` = `seed:<group>/<file>` (not by filename:
 * Payload renames an upload whose file already exists in MEDIA_DIR). An existing document is
 * reused as is, so editors may change its alt or replace the file in the admin; a new file in
 * the repo needs a new file name. Real images (not generated placeholders): `isPlaceholder`
 * stays `false`, so `scripts/attach-generated-media.ts` never replaces them.
 */

const MEDIA_ROOT = path.join(import.meta.dirname, "media");
const MIME_TYPES: Readonly<Record<string, string>> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export interface SeedImage {
  /** Folder under `src/seed/media/` (kebab-case). */
  group: string;
  /** File path inside the group folder (`facet.webp`, `diagrams/facet.webp`). */
  file: string;
  /** Russian alt text (required for images). */
  alt: string;
  kind?: "photo" | "illustration" | "background" | "scheme";
}

const sourceKey = (image: SeedImage) => `seed:${image.group}/${image.file}`;

/** Id of the `media` document of a seed photo, uploading the file on the first run. */
export async function ensureSeedImage(ctx: SeedContext, image: SeedImage): Promise<string> {
  const { payload } = ctx;
  const sourceUrl = sourceKey(image);
  const found = await payload.find({
    collection: "media",
    where: { sourceUrl: { equals: sourceUrl } },
    sort: "createdAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const existing = found.docs[0];
  if (existing) return existing.id;

  const mimetype = MIME_TYPES[path.extname(image.file).toLowerCase()];
  if (!mimetype) throw new Error(`${sourceUrl}: неподдерживаемый формат файла`);
  const data = await readFile(path.join(MEDIA_ROOT, image.group, image.file));
  const media = await payload.create({
    collection: "media",
    data: { alt: image.alt, kind: image.kind ?? "photo", isPlaceholder: false, sourceUrl },
    file: { data, mimetype, name: image.file, size: data.length },
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
  ctx.log(`media ${sourceUrl}: загружен`);
  return media.id;
}
