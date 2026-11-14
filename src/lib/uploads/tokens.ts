import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Signed, stateless tokens of the public intake (task 17).
 *
 * Format: `base64url(JSON payload)` + `.` + `base64url(HMAC-SHA256(secret, context + "." + payload))`.
 * The context string is a domain separator: an upload token can never be replayed as a form
 * token (and vice versa) although both are signed with `FORM_HMAC_SECRET`.
 *
 * Pure Node crypto, no Payload imports: unit-tested in the `unit` Vitest project. The secret is
 * read from the env only when the caller does not pass one (tests always pass it).
 */

/** Upper bound of any token we accept; protects JSON.parse from megabyte inputs. */
export const MAX_SIGNED_TOKEN_LENGTH = 2048;

const TOKEN_SEPARATOR = ".";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export const defaultTokenSecret = (): string => getEnv().FORM_HMAC_SECRET;

const hmac = (secret: string, context: string, encodedPayload: string): Buffer =>
  createHmac("sha256", secret).update(`${context}${TOKEN_SEPARATOR}${encodedPayload}`).digest();

/** Signs a JSON-serializable payload under a domain-separation context. */
export function signToken(context: string, payload: unknown, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = hmac(secret, context, encoded).toString("base64url");
  return `${encoded}${TOKEN_SEPARATOR}${signature}`;
}

/**
 * Verifies the signature (constant time) and returns the parsed payload, or `null` for any
 * malformed, oversized or forged token. Callers still validate the payload shape.
 */
export function verifyToken(context: string, token: unknown, secret: string): unknown {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_SIGNED_TOKEN_LENGTH) {
    return null;
  }
  const parts = token.split(TOKEN_SEPARATOR);
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts as [string, string];
  if (!BASE64URL_PATTERN.test(encoded) || !BASE64URL_PATTERN.test(signature)) return null;

  const expected = hmac(secret, context, encoded);
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Upload tokens
// ---------------------------------------------------------------------------------------------

const UPLOAD_TOKEN_CONTEXT = "upload-token:v1";

/** Two hours: the same lifetime as a form token. */
export const UPLOAD_TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Upper bound of an upload token: `leadSubmitSchema` (task 11) accepts tokens of at most
 * `MAX_SHORT_TEXT` = 200 characters. That is why the token carries only the compact claims below;
 * the display name and the hash stay on the server next to the temp file (`stream.ts` sidecar).
 */
export const MAX_UPLOAD_TOKEN_LENGTH = 200;

export const UPLOAD_PURPOSES = ["quiz", "form"] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/** Extensions an upload token may carry (the union of all purposes, lower case). */
const TOKEN_EXTENSIONS: ReadonlySet<string> = new Set(["dwg", "dxf", "pdf", "jpg", "jpeg", "png"]);

/**
 * The temp file is `${UPLOADS_DIR}/tmp/<id>.<ext>`; `id` is a server-generated UUID. Checking the
 * shape here is what makes the path safe even if the secret ever leaked.
 */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface UploadTokenClaims {
  /** UUID of the temp file. */
  id: string;
  /** Lower-case extension without the dot. */
  ext: string;
  /** Bytes. */
  size: number;
  purpose: UploadPurpose;
}

export interface VerifiedUploadToken extends UploadTokenClaims {
  /** Expiry, epoch ms. */
  exp: number;
}

/** Wire form with one-letter keys, to stay well below `MAX_UPLOAD_TOKEN_LENGTH`. */
type WireClaims = { i: string; e: string; s: number; p: UploadPurpose; x: number };

export function signUploadToken(
  claims: UploadTokenClaims,
  now: number = Date.now(),
  secret: string = defaultTokenSecret()
): string {
  const wire: WireClaims = {
    i: claims.id,
    e: claims.ext,
    s: claims.size,
    p: claims.purpose,
    x: now + UPLOAD_TOKEN_TTL_MS,
  };
  return signToken(UPLOAD_TOKEN_CONTEXT, wire, secret);
}

function parseClaims(raw: unknown): VerifiedUploadToken | null {
  if (typeof raw !== "object" || raw === null) return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.i !== "string" || !UUID_PATTERN.test(v.i)) return null;
  if (typeof v.e !== "string" || !TOKEN_EXTENSIONS.has(v.e)) return null;
  if (typeof v.s !== "number" || !Number.isSafeInteger(v.s) || v.s < 0) return null;
  if (!UPLOAD_PURPOSES.includes(v.p as UploadPurpose)) return null;
  if (typeof v.x !== "number" || !Number.isFinite(v.x)) return null;
  return { id: v.i, ext: v.e, size: v.s, purpose: v.p as UploadPurpose, exp: v.x };
}

/** Claims of a valid, unexpired upload token; `null` when forged, malformed or expired. */
export function verifyUploadToken(
  token: unknown,
  now: number = Date.now(),
  secret: string = defaultTokenSecret()
): VerifiedUploadToken | null {
  const claims = parseClaims(verifyToken(UPLOAD_TOKEN_CONTEXT, token, secret));
  if (!claims || now > claims.exp) return null;
  return claims;
}
