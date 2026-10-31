import { rename } from "node:fs/promises";
import { getPayload } from "payload";
import { verifyFormToken } from "@/lib/leads/antispam";
import { getClientIp } from "@/lib/leads/client-ip";
import { RATE_LIMITS, rateLimit, rateLimitKeys } from "@/lib/leads/rate-limit";
import {
  FORMAT_MESSAGE_FORM,
  FORMAT_MESSAGE_QUIZ,
  jsonError,
  jsonOk,
  jsonSubmitError,
  SIZE_MESSAGE,
} from "@/lib/leads/responses";
import { isReadableImage, validateFile } from "@/lib/uploads/signature";
import {
  extensionOf,
  receiveUpload,
  removeQuietly,
  sanitizeFilename,
  tmpUploadPath,
  uploadSidecarPath,
  uploadTmpDir,
  writeUploadSidecar,
} from "@/lib/uploads/stream";
import { signUploadToken } from "@/lib/uploads/tokens";
import type { UploadPurpose } from "@/lib/uploads/tokens";
import config from "@payload-config";
import type { Payload } from "payload";

/**
 * `POST /api/upload/` (trailing slash!) — streaming upload of one drawing/sketch (≤ 50 MB).
 *
 * Request: `multipart/form-data` with the part `file` and the text field `purpose`
 * (`quiz` | `form`, default `form`); header `X-Form-Token` (form token, signature and max age
 * only). Response: `{ ok: true, token, name, size, ext }`; `token` goes into the lead's
 * `uploadTokens` (and `answers.file.uploadToken` in the quiz). The file waits in
 * `${UPLOADS_DIR}/tmp` until the lead is created (or the hourly cleanup of task 18).
 *
 * Not a Server Action (1 MB body limit). `src/proxy.ts` skips `/api`, so the body is not cut.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIB = 1024 * 1024;
/** 50 MB — the limit promised to the user. */
const MAX_FILE_BYTES = 50 * MIB;
/** Whole request: the file plus multipart overhead and the `purpose` field. */
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + MIB;
const FORM_TOKEN_HEADER = "x-form-token";

const parsePurpose = (value: string | undefined): UploadPurpose =>
  value === "quiz" ? "quiz" : "form";

/**
 * 413 for a too large file. The request body is left unread (or its stream was torn down), so the
 * connection is closed: a client must not reuse a socket that still carries the rest of the body.
 */
function sizeError(): Response {
  const response = jsonError("size", SIZE_MESSAGE);
  response.headers.set("Connection", "close");
  return response;
}

const formatError = (purpose: UploadPurpose) =>
  jsonError("format", purpose === "quiz" ? FORMAT_MESSAGE_QUIZ : FORMAT_MESSAGE_FORM);

export async function POST(request: Request): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return sizeError();
  }

  let payload: Payload | null = null;
  let partPath: string | null = null;
  let sidecarPath: string | null = null;
  try {
    payload = await getPayload({ config });

    const tokenCheck = verifyFormToken(request.headers.get(FORM_TOKEN_HEADER), Date.now(), {
      checkMinAge: false,
    });
    if (!tokenCheck.ok) {
      return jsonSubmitError(tokenCheck.reason === "expired" ? "expired" : "token", payload);
    }

    const ip = getClientIp(request.headers);
    const limit = await rateLimit(
      { key: rateLimitKeys.uploadIp(ip), ...RATE_LIMITS.upload },
      payload
    );
    if (!limit.allowed) {
      return jsonSubmitError("rate", payload, { retryAfterSec: limit.retryAfterSec });
    }

    const received = await receiveUpload(request, {
      tmpDir: uploadTmpDir(),
      maxFileSize: MAX_FILE_BYTES,
    });
    if (!received.ok) {
      if (received.reason === "size") return sizeError();
      return jsonSubmitError("bad_request", payload);
    }

    const { file } = received;
    partPath = file.partPath;
    const purpose = parsePurpose(file.fields.purpose);
    const ext = extensionOf(file.originalName);
    const check = validateFile(ext, file.head, purpose, file.tail);
    if (!check.ok || !(await isReadableImage(check.kind, file.partPath))) {
      await removeQuietly(file.partPath);
      return formatError(purpose);
    }

    // Metadata first: a finished temp file always has its sidecar.
    sidecarPath = uploadSidecarPath(file.id);
    await writeUploadSidecar(file.id, { originalName: file.originalName, sha256: file.sha256 });
    await rename(file.partPath, tmpUploadPath(file.id, ext));
    partPath = null;
    sidecarPath = null;

    const token = signUploadToken({ id: file.id, ext, size: file.size, purpose });
    const name = sanitizeFilename(file.originalName);
    return jsonOk({ token, name, size: file.size, ext });
  } catch (error) {
    if (partPath) await removeQuietly(partPath).catch(() => undefined);
    if (sidecarPath) await removeQuietly(sidecarPath).catch(() => undefined);
    console.error("[upload] failed:", error instanceof Error ? error.name : "unknown");
    return jsonSubmitError("server", payload);
  }
}
