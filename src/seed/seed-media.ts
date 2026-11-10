import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SEED_REQUEST_CONTEXT, type SeedContext } from "./context";

/**
 * Photos shipped with the seed (`src/seed/media/<group>/<file>`, WebP) → `media` documents.
 *
 * Idempotent: a seed photo is found by `sourceUrl` = `seed:<group>/<file>` (not by filename:
 * Payload renames an upload whose file already exists in MEDIA_DIR). An existing document is
 * reused as is, so editors may change its alt or replace the file in the admin. A repo file
 * overwritten with a picture of other dimensions (a sharper or re-cropped photo under the same
 * name) replaces the upload of its document, alt and kind included — unless an editor already
 * uploaded another file there (`isSeedUpload`). Real images (not generated placeholders): `isPlaceholder`
 * stays `false`, so `scripts/attach-generated-media.ts` never replaces them — unless the image is
 * a stand-in until the client's photo arrives (`temporary`): then it is flagged «Временное
 * изображение» and listed by the admin's quick filter.
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
  /** A stand-in picture to be replaced by the client's photo (`isPlaceholder: true`). */
  temporary?: boolean;
}

const sourceKey = (image: SeedImage) => `seed:${image.group}/${image.file}`;

/**
 * `true` while the stored file is still the seed's upload: Payload keeps the original name or
 * appends `-<n>` when the name is taken in MEDIA_DIR (`facet.webp` → `facet-1.webp`). An
 * editor's replacement in the admin carries its own name.
 */
export function isSeedUpload(filename: string | null | undefined, file: string): boolean {
  if (!filename) return false;
  const { name, ext } = path.parse(path.basename(file));
  if (path.extname(filename).toLowerCase() !== ext.toLowerCase()) return false;
  const stored = path.basename(filename, path.extname(filename));
  if (!stored.startsWith(name)) return false;
  const suffix = stored.slice(name.length);
  return suffix === "" || /^-\d+$/.test(suffix);
}

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

  const mimetype = MIME_TYPES[path.extname(image.file).toLowerCase()];
  if (!mimetype) throw new Error(`${sourceUrl}: неподдерживаемый формат файла`);
  const data = await readFile(path.join(MEDIA_ROOT, image.group, image.file));

  if (existing) {
    if (!isSeedUpload(existing.filename, image.file)) return existing.id;
    // Dimensions, not bytes: the upload hook strips metadata, so the stored bytes always differ.
    const { width, height } = await sharp(data).metadata();
    if (existing.width === width && existing.height === height) return existing.id;
    await payload.update({
      collection: "media",
      id: existing.id,
      data: { alt: image.alt, kind: image.kind ?? "photo" },
      file: { data, mimetype, name: image.file, size: data.length },
      overrideAccess: true,
      context: SEED_REQUEST_CONTEXT,
    });
    ctx.log(`media ${sourceUrl}: файл заменён (${width}×${height})`);
    return existing.id;
  }

  const media = await payload.create({
    collection: "media",
    data: {
      alt: image.alt,
      kind: image.kind ?? "photo",
      isPlaceholder: image.temporary ?? false,
      sourceUrl,
    },
    file: { data, mimetype, name: image.file, size: data.length },
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
  ctx.log(`media ${sourceUrl}: загружен`);
  return media.id;
}
