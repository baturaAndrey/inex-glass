import { fetchFormToken, SubmitError } from "./submit-lead";

/**
 * Client upload of one drawing/sketch to `POST /api/upload/` (task-17) with progress.
 * `XMLHttpRequest` instead of `fetch` because only XHR reports upload progress. Not a Server
 * Action (1 MB body limit). Shared by the quiz (task-20) and the site forms (task-21).
 *
 * Server contract: multipart field `file` + text field `purpose` (`quiz` | `form`), header
 * `X-Form-Token`; success `{ ok: true, token, name, size, ext }`; errors
 * `{ ok: false, code: 'format' | 'size' | 'rate' | 'token' | 'expired' | 'bad_request' | 'server' }`
 * (statuses 400 / 413 / 429 / 500).
 */

export type UploadErrorCode = "format" | "size" | "rate_limit" | "network" | "server";

export class UploadFailure extends Error {
  readonly code: UploadErrorCode;

  constructor(code: UploadErrorCode, message = "") {
    super(message);
    this.name = "UploadFailure";
    this.code = code;
  }
}

export interface UploadedFile {
  /** Signed upload token for `uploadTokens` (and `answers.file.uploadToken` in the quiz). */
  token: string;
  name: string;
  size: number;
  ext: string;
}

/** Quiz: drawings plus photos of a sketch. */
export const ALLOWED_QUIZ_EXT = ["dwg", "dxf", "pdf", "jpg", "jpeg", "png"] as const;
/** Site forms: drawings only (JPG/PNG are accepted by the quiz only). */
export const ALLOWED_DRAWING_EXT = ["dwg", "dxf", "pdf"] as const;
/** 50 МБ — the limit promised to the user (the server enforces the same). */
export const MAX_UPLOAD_BYTES = 52428800;

export const UPLOAD_URL = "/api/upload/";
const FORM_TOKEN_HEADER = "X-Form-Token";

/** Server codes after which a fresh form token is requested and the upload retried once. */
const RETRY_WITH_NEW_TOKEN: ReadonlySet<string> = new Set(["token", "expired"]);

/** Lower-case extension without the dot (`Plan.DWG` → `dwg`), `''` when there is none. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Local pre-check before uploading: extension (case-insensitive) first, then the size. */
export function validateClientFile(
  file: Pick<File, "name" | "size">,
  allowed: readonly string[]
): "ok" | "format" | "size" {
  const accepted = new Set(allowed.map((ext) => ext.replace(/^\./, "").toLowerCase()));
  if (!accepted.has(extensionOf(file.name))) return "format";
  if (file.size > MAX_UPLOAD_BYTES) return "size";
  return "ok";
}

export interface UploadOptions {
  signal?: AbortSignal | undefined;
  /** Upload progress 0…1 (only when the browser knows the total size). */
  onProgress?: ((fraction: number) => void) | undefined;
  /**
   * Form token for `X-Form-Token`. When omitted a fresh token is requested from
   * `/api/form-token/` (the upload endpoint checks only its signature and max age).
   */
  formToken?: string | null | undefined;
  /** `quiz` accepts JPG/PNG in addition to drawings. Default `form`. */
  purpose?: "quiz" | "form" | undefined;
}

type XhrResult = { status: number; body: unknown };

function abortError(): DOMException {
  return new DOMException("Upload aborted", "AbortError");
}

function sendXhr(file: File, token: string, opts: UploadOptions): Promise<XhrResult> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(abortError());
      return;
    }
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();

    xhr.open("POST", UPLOAD_URL);
    xhr.responseType = "text";
    xhr.setRequestHeader(FORM_TOKEN_HEADER, token);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        opts.onProgress?.(Math.min(1, event.loaded / event.total));
      }
    };
    xhr.onload = () => {
      opts.signal?.removeEventListener("abort", onAbort);
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => {
      opts.signal?.removeEventListener("abort", onAbort);
      reject(new UploadFailure("network"));
    };
    xhr.onabort = () => {
      opts.signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    const form = new FormData();
    // `purpose` precedes the file so the server knows the allowed formats while streaming.
    form.append("purpose", opts.purpose ?? "form");
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

function serverCodeOf(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const code = (body as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function uploadedFrom(body: unknown, file: File): UploadedFile | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  if (record.ok !== true || typeof record.token !== "string" || !record.token) return null;
  return {
    token: record.token,
    name: typeof record.name === "string" && record.name ? record.name : file.name,
    size: typeof record.size === "number" ? record.size : file.size,
    ext: typeof record.ext === "string" && record.ext ? record.ext : extensionOf(file.name),
  };
}

/** Maps an error response to an `UploadFailure` code. */
export function uploadErrorCode(status: number, serverCode: string | undefined): UploadErrorCode {
  if (serverCode === "format") return "format";
  if (serverCode === "size" || status === 413) return "size";
  if (serverCode === "rate" || status === 429) return "rate_limit";
  return "server";
}

async function obtainToken(signal: AbortSignal | undefined): Promise<string> {
  try {
    return await fetchFormToken(signal);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    if (error instanceof SubmitError) {
      throw new UploadFailure(
        error.code === "network" ? "network" : error.code === "rate_limit" ? "rate_limit" : "server"
      );
    }
    throw new UploadFailure("server");
  }
}

/**
 * Uploads one file. Resolves with the signed token and the stored name/size/ext; rejects with
 * `UploadFailure` (`format` | `size` | `rate_limit` | `network` | `server`) or, when `signal`
 * aborts, a `DOMException` named `AbortError`. The local format/size check is the caller's job
 * (`validateClientFile`), the server re-checks both.
 */
export async function uploadFile(file: File, opts: UploadOptions = {}): Promise<UploadedFile> {
  let token = opts.formToken || (await obtainToken(opts.signal));
  let result = await sendXhr(file, token, opts);
  let serverCode = serverCodeOf(result.body);

  // An expired/invalid form token (e.g. the page stayed open for hours): one retry with a new one.
  if (result.status >= 400 && serverCode !== undefined && RETRY_WITH_NEW_TOKEN.has(serverCode)) {
    token = await obtainToken(opts.signal);
    result = await sendXhr(file, token, opts);
    serverCode = serverCodeOf(result.body);
  }

  if (result.status >= 200 && result.status < 300) {
    const uploaded = uploadedFrom(result.body, file);
    if (uploaded) return uploaded;
    throw new UploadFailure("server");
  }
  throw new UploadFailure(uploadErrorCode(result.status, serverCode));
}
