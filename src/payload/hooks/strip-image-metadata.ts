import { readFile, writeFile } from "node:fs/promises";
import sharp, { type Metadata } from "sharp";
import type { CollectionBeforeOperationHook } from "payload";

/**
 * Removes EXIF / XMP / IPTC metadata (GPS position, camera serials, author names) from images
 * uploaded to the public `media` collection (task 39; review note of wave 6 after the inex.su
 * import added ~840 photos).
 *
 * Why a hook: Payload re-encodes only the generated `imageSizes` (sharp drops metadata there);
 * the ORIGINAL is stored byte-for-byte unless `formatOptions` / `resizeOptions` are configured,
 * and it is publicly served at `/api/media/file/<name>`. Changing the upload config would alter
 * every original; this hook touches only files that actually carry metadata.
 *
 * - Pixels are re-encoded only when metadata is present (generated placeholders have none and
 *   stay byte-identical); the EXIF orientation is applied first (`rotate()`), so a portrait
 *   photo stays portrait once the tag is gone; the ICC colour profile is kept.
 * - High-quality settings (JPEG/WebP q92, lossless PNG, AVIF q70) keep the original visually
 *   identical; the site serves resized copies through `next/image` anyway.
 * - Animated images and other types (PDF) are left untouched. A file sharp cannot decode is
 *   passed through unchanged: Payload's own validation reports it.
 */

/** Formats sharp decodes and re-encodes here (by `metadata().format`). */
type StrippableFormat = "jpeg" | "png" | "webp" | "heif";

const STRIPPABLE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const JPEG_QUALITY = 92;
const WEBP_QUALITY = 92;
const AVIF_QUALITY = 70;

function isStrippableFormat(format: string | undefined): format is StrippableFormat {
  return format === "jpeg" || format === "png" || format === "webp" || format === "heif";
}

/** Whether the image carries metadata that may identify a place, device or person. */
export function hasPrivateMetadata(metadata: Metadata): boolean {
  return Boolean(metadata.exif ?? metadata.xmp ?? metadata.iptc);
}

/**
 * The image without EXIF / XMP / IPTC, or `null` when there is nothing to strip (or the image
 * is animated / of an unsupported format) — the caller then keeps the original bytes.
 */
export async function stripImageMetadata(input: Buffer): Promise<Buffer | null> {
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  if (!hasPrivateMetadata(metadata)) return null;
  if ((metadata.pages ?? 1) > 1 || !isStrippableFormat(metadata.format)) return null;

  // sharp writes no metadata unless asked to; `keepIccProfile()` keeps only the colour profile.
  const pipeline = sharp(input, { failOn: "none" }).rotate().keepIccProfile();
  switch (metadata.format) {
    case "jpeg":
      return pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    case "png":
      return pipeline.png().toBuffer();
    case "webp":
      return pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
    case "heif":
      return pipeline.avif({ quality: AVIF_QUALITY }).toBuffer();
  }
}

/**
 * Collection `beforeOperation` hook: runs before Payload reads `req.file` in `generateFileData`,
 * so the stored original and every generated size come from the clean bytes. Works for REST,
 * admin and Local API uploads (`file` / `filePath`), in memory or as a temp file.
 */
export const stripUploadMetadata: CollectionBeforeOperationHook = async ({
  args,
  operation,
  req,
}) => {
  if (operation !== "create" && operation !== "update") return args;
  const file = req.file;
  if (!file || !STRIPPABLE_MIME_TYPES.has(file.mimetype)) return args;

  try {
    const input =
      file.data && file.data.length > 0
        ? file.data
        : file.tempFilePath
          ? await readFile(file.tempFilePath)
          : null;
    if (!input) return args;

    const output = await stripImageMetadata(input);
    if (!output) return args;

    file.data = output;
    file.size = output.length;
    if (file.tempFilePath) await writeFile(file.tempFilePath, output);
  } catch (error) {
    // Never block an upload over metadata: an undecodable file fails Payload's own checks.
    req.payload.logger.warn({ err: error, file: file.name }, "media: метаданные не удалены");
  }
  return args;
};
