/**
 * Upload hardening for the private CRM collections (`lead-files`, `order-files`).
 *
 * Payload's `mimeTypes` check trusts the detected type where `file-type` recognizes the bytes,
 * but falls back to the extension otherwise (every unknown extension maps to `text/plain`),
 * and stores the browser-reported MIME type for non-images. This module adds what Payload
 * lacks: an extension allow-list, a per-extension MIME allow-list (with a canonical type
 * stored instead of vague ones like `application/octet-stream`) and a magic-bytes check.
 *
 * Pure functions only (no `payload` value imports), so Vitest can load it without Payload.
 */

/** One allowed file format of a collection. */
export type UploadFormat = {
  /** Lower-case extensions without the dot. */
  readonly extensions: readonly string[];
  /** MIME type stored for the file, whatever the browser reported. */
  readonly canonicalMimeType: string;
  /** Other reported MIME types accepted for these extensions (replaced by the canonical one). */
  readonly acceptedMimeTypes: readonly string[];
  /** Content check of the first bytes; `null` = no reliable signature. */
  readonly matchesSignature: ((head: Uint8Array) => boolean) | null;
};

export type UploadPolicy = readonly UploadFormat[];

/** Bytes needed by the longest signature check below. */
export const SIGNATURE_HEAD_BYTES = 32;

/** Vague types browsers and `file-type` report for CAD drawings. */
const GENERIC_BINARY = "application/octet-stream";
const GENERIC_TEXT = "text/plain";

const startsWithBytes = (head: Uint8Array, bytes: readonly number[], offset = 0): boolean =>
  head.length >= offset + bytes.length &&
  bytes.every((byte, index) => head[offset + index] === byte);

const asciiBytes = (text: string): number[] => Array.from(text, (char) => char.charCodeAt(0));

const isPdf = (head: Uint8Array) => startsWithBytes(head, asciiBytes("%PDF-"));
const isPng = (head: Uint8Array) =>
  startsWithBytes(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isJpeg = (head: Uint8Array) => startsWithBytes(head, [0xff, 0xd8, 0xff]);
const isWebp = (head: Uint8Array) =>
  startsWithBytes(head, asciiBytes("RIFF")) && startsWithBytes(head, asciiBytes("WEBP"), 8);
/** ISO BMFF container (`....ftyp`): HEIC/HEIF photos from phones. */
const isIsoMedia = (head: Uint8Array) => startsWithBytes(head, asciiBytes("ftyp"), 4);
/** DWG: version string `AC1xxx` (AC1012 … AC1032). */
const isDwg = (head: Uint8Array) => startsWithBytes(head, asciiBytes("AC10"));

const BINARY_DXF_SENTINEL = "AutoCAD Binary DXF";
/** ASCII DXF starts with a group code line: `0` (SECTION) or `999` (comment). */
const ASCII_DXF_START = /^(?:0|999)\r?\n/;

/** UTF-8 byte order mark some CAD tools write before an ASCII DXF. */
const UTF8_BOM = [0xef, 0xbb, 0xbf] as const;

/** DXF is plain text: accept the binary sentinel or a leading group code, never markup. */
const isDxf = (head: Uint8Array) => {
  if (startsWithBytes(head, asciiBytes(BINARY_DXF_SENTINEL))) return true;
  // Strip the BOM as bytes: decoded as latin1 it becomes "ï»¿", never U+FEFF.
  const body = startsWithBytes(head, UTF8_BOM) ? head.subarray(UTF8_BOM.length) : head;
  const text = new TextDecoder("latin1").decode(body).trimStart();
  return ASCII_DXF_START.test(text);
};

const PDF: UploadFormat = {
  extensions: ["pdf"],
  canonicalMimeType: "application/pdf",
  acceptedMimeTypes: [],
  matchesSignature: isPdf,
};
const PNG: UploadFormat = {
  extensions: ["png"],
  canonicalMimeType: "image/png",
  acceptedMimeTypes: [],
  matchesSignature: isPng,
};
const JPEG: UploadFormat = {
  extensions: ["jpg", "jpeg"],
  canonicalMimeType: "image/jpeg",
  acceptedMimeTypes: ["image/pjpeg"],
  matchesSignature: isJpeg,
};

/** Drawings DWG/DXF/PDF and quiz photos (ТЗ §6.1). */
export const LEAD_FILE_POLICY: UploadPolicy = [
  PDF,
  PNG,
  JPEG,
  {
    extensions: ["dwg"],
    canonicalMimeType: "image/vnd.dwg",
    acceptedMimeTypes: [
      "image/x-dwg",
      "application/acad",
      "application/x-acad",
      "application/autocad_dwg",
      "application/dwg",
      "application/x-dwg",
      "application/x-autocad",
      "drawing/dwg",
      GENERIC_BINARY,
    ],
    matchesSignature: isDwg,
  },
  {
    extensions: ["dxf"],
    canonicalMimeType: "image/vnd.dxf",
    acceptedMimeTypes: [
      "image/x-dxf",
      "application/dxf",
      "application/x-dxf",
      "drawing/x-dxf",
      GENERIC_TEXT,
      GENERIC_BINARY,
    ],
    matchesSignature: isDxf,
  },
];

/** Packing photos and order documents (ТЗ §6.2). */
export const ORDER_FILE_POLICY: UploadPolicy = [
  PDF,
  PNG,
  JPEG,
  {
    extensions: ["webp"],
    canonicalMimeType: "image/webp",
    acceptedMimeTypes: [],
    matchesSignature: isWebp,
  },
  {
    extensions: ["heic", "heif"],
    canonicalMimeType: "image/heic",
    acceptedMimeTypes: ["image/heif"],
    matchesSignature: isIsoMedia,
  },
];

/**
 * Value for Payload's `upload.mimeTypes`: the canonical types plus `text/plain`, which Payload
 * derives from the extension for files `file-type` cannot recognize (ASCII DXF). The extension
 * allow-list in `checkUpload` is what keeps other undetectable files out.
 */
export function payloadMimeTypes(policy: UploadPolicy): string[] {
  const types = new Set(policy.map((format) => format.canonicalMimeType));
  if (policy.some((format) => format.acceptedMimeTypes.includes(GENERIC_TEXT))) {
    types.add(GENERIC_TEXT);
  }
  return [...types];
}

/** Lower-case extension of a file name without the dot (`""` when there is none). */
export function fileExtension(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** `type/subtype` without parameters, lower case. */
const mimeEssence = (mimeType: string): string =>
  (mimeType.split(";")[0] ?? "").trim().toLowerCase();

export type UploadCheck = { ok: true; mimeType: string } | { ok: false; message: string };

/**
 * Checks an uploaded file against the policy. `mimeType` is what Payload is about to store
 * (browser-reported or detected; may be empty for files added by path), `head` the first bytes
 * of the content (`null` when the content is not available — the signature is then not checked).
 * On success returns the canonical MIME type to store.
 */
export function checkUpload(
  policy: UploadPolicy,
  file: { filename: string; mimeType: string | null | undefined; head: Uint8Array | null }
): UploadCheck {
  const extension = fileExtension(file.filename);
  const format = policy.find((candidate) => candidate.extensions.includes(extension));
  const allowedExtensions = policy.flatMap((candidate) => candidate.extensions).join(", ");
  if (!format) {
    return { ok: false, message: `Недопустимый тип файла. Разрешены: ${allowedExtensions}.` };
  }

  const reported = file.mimeType ? mimeEssence(file.mimeType) : "";
  const mimeAllowed =
    reported === "" ||
    reported === format.canonicalMimeType ||
    format.acceptedMimeTypes.includes(reported);
  if (!mimeAllowed) {
    return {
      ok: false,
      message: `Тип содержимого «${reported}» не соответствует расширению .${extension}.`,
    };
  }

  if (file.head && format.matchesSignature && !format.matchesSignature(file.head)) {
    return { ok: false, message: `Содержимое файла не похоже на .${extension}.` };
  }

  return { ok: true, mimeType: format.canonicalMimeType };
}

/**
 * Response headers for Payload's file route: always a download, never rendered in the site
 * origin (stored XSS via an uploaded HTML/SVG disguised as an allowed type), no MIME sniffing.
 */
export function setDownloadOnlyHeaders(headers: Headers): Headers {
  headers.set("Content-Disposition", "attachment");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  headers.set("Cache-Control", "private, no-store");
  return headers;
}
