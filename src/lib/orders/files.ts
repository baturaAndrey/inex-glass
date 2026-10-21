import path from "node:path";
import { cleanOriginalName, extensionOf, sanitizeFilename } from "@/lib/uploads/stream";
import { THUMBNAIL_WIDTHS } from "./photo-widths";

export { LIGHTBOX_WIDTH, THUMBNAIL_WIDTH, THUMBNAIL_WIDTHS } from "./photo-widths";

/**
 * Files of an order on the public page (`/zakaz/<token>/docs/<id>/`, ТЗ §6.2): which file of
 * the order may be served, under which name and with which headers. Pure helpers (no Payload),
 * unit-tested in `files.test.ts`; the route handler does the I/O.
 */

/** The `order-files` fields the route needs (a subset of `OrderFile`). */
export interface OrderFileDoc {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  filesize?: number | null;
}

type Related = string | OrderFileDoc | null | undefined;

/** The order fields that reference files (a subset of `Order`). */
export interface OrderFilesSource {
  packPhotos?: { photo: Related; caption?: string | null }[] | null;
  documents?: { title: string; file: Related }[] | null;
}

export type ResolvedOrderFile =
  | { role: "photo"; file: OrderFileDoc; caption: string | null }
  | { role: "document"; file: OrderFileDoc; title: string };

/** Content types the route sends as is; anything else goes out as `application/octet-stream`. */
export const ORDER_FILE_CONTENT_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const FALLBACK_CONTENT_TYPE = "application/octet-stream";

/** Photos browsers display (HEIC from phones is accepted by the upload policy but is not one). */
const DISPLAYABLE_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** The related document when populated (`depth ≥ 1`), otherwise `null`. */
export function populatedFile(value: Related): OrderFileDoc | null {
  return typeof value === "object" && value !== null && typeof value.id === "string" ? value : null;
}

export function isDisplayableImage(mimeType: string | null | undefined): boolean {
  return typeof mimeType === "string" && DISPLAYABLE_IMAGE_TYPES.has(mimeType);
}

/** The stored MIME type when allow-listed, otherwise `application/octet-stream`. */
export function safeContentType(mimeType: string | null | undefined): string {
  return typeof mimeType === "string" && ORDER_FILE_CONTENT_TYPES.includes(mimeType)
    ? mimeType
    : FALLBACK_CONTENT_TYPE;
}

/** Allow-listed `?w=` width, or `null` (serve the original). */
export function parseThumbnailWidth(value: string | null): number | null {
  if (value === null || !/^\d{1,4}$/.test(value)) return null;
  const width = Number(value);
  return THUMBNAIL_WIDTHS.includes(width) ? width : null;
}

/**
 * The file `fileId` IF it belongs to this order: a packing photo or a document. Any other id
 * (another order's file, a deleted one) gives `null` — the route answers 404.
 */
export function findOrderFile(order: OrderFilesSource, fileId: string): ResolvedOrderFile | null {
  for (const row of order.packPhotos ?? []) {
    const file = populatedFile(row.photo);
    if (file?.id === fileId) return { role: "photo", file, caption: row.caption ?? null };
  }
  for (const row of order.documents ?? []) {
    const file = populatedFile(row.file);
    if (file?.id === fileId) return { role: "document", file, title: row.title };
  }
  return null;
}

/**
 * Name of the stored file inside the collection's `staticDir`: base name only, so a tampered
 * `filename` (`../../etc/passwd`) can never leave the directory. `null` when unusable.
 */
export function storedFileName(filename: string | null | undefined): string | null {
  if (typeof filename !== "string") return null;
  const base = path.basename(filename.replace(/\\/g, "/"));
  return base && base !== "." && base !== ".." ? base : null;
}

/**
 * Download name of a document: its title plus the stored file's extension
 * («Паспорт качества» + `passport.pdf` → «Паспорт качества.pdf»). Path separators and control
 * characters are removed.
 */
export function downloadName(title: string, filename: string | null | undefined): string {
  const ext = extensionOf(filename ?? "");
  const display = cleanOriginalName(title.replace(/[\\/]+/g, "-"));
  const suffix = ext ? `.${ext}` : "";
  return suffix && !display.toLowerCase().endsWith(suffix) ? `${display}${suffix}` : display;
}

/** RFC 6266 / 5987: an ASCII fallback plus the exact UTF-8 name. */
export function contentDisposition(type: "attachment" | "inline", name: string): string {
  const ascii = sanitizeFilename(name);
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** «PDF», «JPG» … — the file type shown under a document title. */
export function fileTypeLabel(filename: string | null | undefined): string | null {
  const ext = extensionOf(filename ?? "");
  if (!ext) return null;
  return (ext === "jpeg" ? "jpg" : ext).toUpperCase();
}

const KB = 1024;
const MB = KB * 1024;

/** «840 КБ», «1,2 МБ» (decimal comma) or `null`. */
export function formatFileSize(bytes: number | null | undefined): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < MB) return `${Math.max(1, Math.round(bytes / KB))} КБ`;
  const mb = Math.round((bytes / MB) * 10) / 10;
  return `${String(mb).replace(".", ",")} МБ`;
}
