import { randomBytes } from "node:crypto";
import { defaultTokenSecret, signToken, verifyToken } from "@/lib/uploads/tokens";

/**
 * Anti-spam of the public forms (task 17): a honeypot field and a signed issue-time token.
 *
 * The form token is `base64url(JSON{ t, n })` + `.` + HMAC-SHA256 (`FORM_HMAC_SECRET`), where
 * `t` is the issue time (epoch ms) and `n` an 8-byte random nonce. Bots that post a form right
 * after loading it (< 3 s) or replay an old token (> 2 h) are rejected; humans get a fresh token
 * from `POST /api/form-token/` and retry transparently.
 */

const FORM_TOKEN_CONTEXT = "form-token:v1";
const NONCE_BYTES = 8;

/** A human needs at least this long to fill a form. */
export const FORM_TOKEN_MIN_AGE_MS = 3_000;
/** Token lifetime. */
export const FORM_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000;
/** Tolerated clock skew between app containers before a token counts as issued in the future. */
export const FORM_TOKEN_FUTURE_SKEW_MS = 60_000;

/** Hidden field that humans never fill. */
export const HONEYPOT_FIELD = "company_website";

export function issueFormToken(
  now: number = Date.now(),
  secret: string = defaultTokenSecret()
): string {
  return signToken(
    FORM_TOKEN_CONTEXT,
    { t: now, n: randomBytes(NONCE_BYTES).toString("base64url") },
    secret
  );
}

export type FormTokenFailure = "bad" | "too_fast" | "expired";
export type FormTokenCheck = { ok: true } | { ok: false; reason: FormTokenFailure };

export interface VerifyFormTokenOptions {
  /**
   * Enforce the 3-second minimum age (default `true`). File uploads start right after the form
   * opens, so `POST /api/upload/` checks only the signature and the maximum age.
   */
  checkMinAge?: boolean;
  secret?: string;
}

export function verifyFormToken(
  token: unknown,
  now: number = Date.now(),
  { checkMinAge = true, secret = defaultTokenSecret() }: VerifyFormTokenOptions = {}
): FormTokenCheck {
  const payload = verifyToken(FORM_TOKEN_CONTEXT, token, secret);
  if (typeof payload !== "object" || payload === null) return { ok: false, reason: "bad" };

  const issuedAt = (payload as { t?: unknown }).t;
  if (typeof issuedAt !== "number" || !Number.isSafeInteger(issuedAt)) {
    return { ok: false, reason: "bad" };
  }
  if (issuedAt > now + FORM_TOKEN_FUTURE_SKEW_MS) return { ok: false, reason: "bad" };

  const age = now - issuedAt;
  if (checkMinAge && age < FORM_TOKEN_MIN_AGE_MS) return { ok: false, reason: "too_fast" };
  if (age > FORM_TOKEN_MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}

/**
 * `true` when the honeypot is filled. The caller then answers `200 { ok: true }` without
 * creating anything, so the bot never learns about the trap.
 */
export function isHoneypotTripped(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const value = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  // Any non-string value is something a real form never sends.
  return true;
}
