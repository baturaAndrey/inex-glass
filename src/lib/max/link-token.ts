import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * One-time secrets that link MAX recipients (task 06).
 *
 * - Personal chat: a token `ig_` + 32 base64url characters travels in the deep link
 *   `https://max.ru/<bot>?start=<token>` and comes back as the `bot_started` payload. The bot is
 *   shared with another site, so the `ig_` prefix marks OUR deep links: a payload without it
 *   belongs to someone else and is ignored silently.
 * - Group chat: a short human-typable code `INEX-XXXXXXXX` (Crockford base32) that the admin
 *   sends into the group with the bot. Only a message that is exactly one code (surrounding
 *   whitespace and letter case aside) is considered.
 *
 * Only the SHA-256 of a token/code is stored; the value itself is shown once. Both live
 * `LINK_TOKEN_TTL_MS` and are cleared after a successful link.
 */

export const LINK_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Marks deep links of this site in the payloads of the shared bot. */
export const LINK_TOKEN_PREFIX = "ig_";
/** 24 random bytes → exactly 32 base64url characters after the prefix. */
const LINK_TOKEN_BYTES = 24;
const LINK_TOKEN_PATTERN = /^ig_[A-Za-z0-9_-]{32}$/;

const GROUP_CODE_PREFIX = "INEX-";
const GROUP_CODE_LENGTH = 8;
/** Crockford base32: no I, L, O, U, so the code survives being read aloud or retyped. */
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUP_CODE_PATTERN = new RegExp(`^INEX-[${CROCKFORD_ALPHABET}]{${GROUP_CODE_LENGTH}}$`);
/** A message longer than this is a conversation, not a pasted code. */
const GROUP_CODE_MAX_INPUT = 64;

export function generateLinkToken(): string {
  return `${LINK_TOKEN_PREFIX}${randomBytes(LINK_TOKEN_BYTES).toString("base64url")}`;
}

/** `true` for a payload that claims to be our deep link (it may still be malformed). */
export function hasLinkTokenPrefix(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(LINK_TOKEN_PREFIX);
}

export function isLinkTokenFormat(value: unknown): value is string {
  return typeof value === "string" && LINK_TOKEN_PATTERN.test(value);
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function tokenExpiresAt(now: Date): string {
  return new Date(now.getTime() + LINK_TOKEN_TTL_MS).toISOString();
}

/** A missing or unparsable date counts as expired. */
export function isExpired(expiresAt: unknown, now: Date): boolean {
  if (typeof expiresAt !== "string" && !(expiresAt instanceof Date)) return true;
  const time = new Date(expiresAt).getTime();
  return Number.isNaN(time) || time <= now.getTime();
}

export function generateGroupLinkCode(): string {
  let code = "";
  for (let index = 0; index < GROUP_CODE_LENGTH; index++) {
    code += CROCKFORD_ALPHABET[randomInt(CROCKFORD_ALPHABET.length)];
  }
  return `${GROUP_CODE_PREFIX}${code}`;
}

/**
 * `"  inex-7f3k9q2m\n"` → `"INEX-7F3K9Q2M"`; anything that is not exactly one code → `null`.
 * Only surrounding whitespace and letter case are tolerated (messengers add trailing newlines,
 * phones capitalize); spaces or extra dashes inside, or any text around the code, mean it is an
 * ordinary message of the chat and the bot must not react to it.
 */
export function normalizeGroupLinkCode(text: unknown): string | null {
  if (typeof text !== "string" || text.length > GROUP_CODE_MAX_INPUT) return null;
  const candidate = text.trim().toUpperCase();
  return GROUP_CODE_PATTERN.test(candidate) ? candidate : null;
}

/** Constant-time comparison of two hex digests (different lengths → `false`). */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
