import sharp from "sharp";
import { checkUpload, LEAD_FILE_POLICY } from "@/payload/collections/crm/upload-policy";
import type { UploadPurpose } from "./tokens";

/**
 * Content checks of public uploads (task 17): extension allow-list per purpose + magic bytes.
 *
 * The signature rules are NOT duplicated here: they come from the `lead-files` upload policy
 * (`upload-policy.ts`), the same rules the collection's `enforceUploadPolicy` hook applies when
 * the file is attached to a lead (PDF `%PDF-`, PNG 8-byte magic, JPEG `FF D8 FF`, DWG `AC10…`,
 * DXF: binary sentinel or a leading group code `0`/`999`). On top of that this module mirrors the
 * two content checks Payload itself runs when the file is stored, so a file accepted by
 * `/api/upload/` is not rejected later, when the lead is being saved:
 * - PDF: Payload's `validatePDF` wants `%%EOF` and `xref` (`startxref`) in the last 1 KB;
 * - PNG/JPEG: Payload reads the image dimensions with sharp; an undecodable image fails.
 * JPG/PNG are allowed for the quiz sketch only.
 */

/** Bytes kept from the start of the stream for the signature check. */
export const SIGNATURE_HEAD_LENGTH = 1024;
/** Bytes kept from the end of the stream: the window of Payload's PDF trailer check. */
export const SIGNATURE_TAIL_LENGTH = 1024;

export const ALLOWED_EXTENSIONS = {
  quiz: ["dwg", "dxf", "pdf", "jpg", "jpeg", "png"],
  form: ["dwg", "dxf", "pdf"],
} as const satisfies Record<UploadPurpose, readonly string[]>;

export type FileKind = "pdf" | "png" | "jpeg" | "dwg" | "dxf";

const KIND_BY_EXTENSION: Readonly<Record<string, FileKind>> = {
  pdf: "pdf",
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
  dwg: "dwg",
  dxf: "dxf",
};

export type FileValidation = { ok: true; kind: FileKind } | { ok: false; reason: "format" };

/** Payload's `validatePDF`: the end of the file holds the EOF marker and the xref pointer. */
function hasPdfTrailer(tail: Uint8Array): boolean {
  const text = Buffer.from(tail.buffer, tail.byteOffset, tail.byteLength).toString("latin1");
  return text.includes("%%EOF") && text.includes("xref");
}

/**
 * Validates a file by its (case-insensitive) extension and its first bytes. The extension and the
 * content must agree: a `.pdf` with PNG bytes is rejected, as is a JPG for a non-quiz form.
 * `tail` — the last `SIGNATURE_TAIL_LENGTH` bytes (the whole file when smaller); when given, a
 * PDF must also have a trailer.
 */
export function validateFile(
  ext: string,
  head: Uint8Array,
  purpose: UploadPurpose,
  tail?: Uint8Array
): FileValidation {
  const extension = ext.trim().replace(/^\./, "").toLowerCase();
  const allowed: readonly string[] = ALLOWED_EXTENSIONS[purpose];
  const kind = KIND_BY_EXTENSION[extension];
  if (!kind || !allowed.includes(extension)) return { ok: false, reason: "format" };

  // `mimeType: null` — the browser-reported type is untrusted and not used for the decision.
  const result = checkUpload(LEAD_FILE_POLICY, {
    filename: `file.${extension}`,
    mimeType: null,
    head,
  });
  if (!result.ok) return { ok: false, reason: "format" };
  if (kind === "pdf" && tail && !hasPdfTrailer(tail)) return { ok: false, reason: "format" };
  return { ok: true, kind };
}

/**
 * `true` when sharp can read the image header (format and dimensions) — what Payload needs to
 * store a PNG/JPEG. Reads only the header, not the pixels. Other kinds → `true`.
 */
export async function isReadableImage(kind: FileKind, filePath: string): Promise<boolean> {
  if (kind !== "png" && kind !== "jpeg") return true;
  try {
    const meta = await sharp(filePath).metadata();
    return Boolean(meta.width && meta.height) && (meta.format === "png") === (kind === "png");
  } catch {
    return false;
  }
}
