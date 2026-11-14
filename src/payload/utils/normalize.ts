import { createHmac } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Contact normalization shared by lead intake (task 17), duplicate detection and the consent
 * log contact hashes. Pure functions (the HMAC secret is read from the env only when not passed):
 * safe to use in tests and outside Payload.
 */

/** Russian mobile/landline number in E.164: `+7` and exactly 10 digits. */
export const NORMALIZED_PHONE_PATTERN = /^\+7\d{10}$/;

const RU_NATIONAL_DIGITS = 10;
const RU_FULL_DIGITS = RU_NATIONAL_DIGITS + 1;
/** Leading digits accepted as the Russian country/trunk prefix (`+7…`, `7…`, `8…`). */
const RU_PREFIXES: ReadonlySet<string> = new Set(["7", "8"]);
/** First digit of a Russian mobile number typed without a prefix (`9001234567`). */
const RU_MOBILE_PREFIX = "9";

/**
 * Normalizes a Russian phone number to `+7XXXXXXXXXX` (same rules as the domain normalizer of
 * task 11).
 *
 * Accepts any formatting (spaces, dashes, parentheses, `+`) as long as the digits are either
 * 11 starting with `7`/`8`, or 10 starting with `9` (a mobile number typed without the prefix).
 * Anything else (extensions, foreign numbers, garbage) → `null`, so callers can reject the value
 * instead of storing an unsearchable phone.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === RU_NATIONAL_DIGITS && digits.startsWith(RU_MOBILE_PREFIX)) {
    return `+7${digits}`;
  }
  if (digits.length !== RU_FULL_DIGITS) return null;
  if (!RU_PREFIXES.has(digits.charAt(0))) return null;
  return `+7${digits.slice(1)}`;
}

/** Trims and lower-cases an e-mail; empty or non-string input → `null`. Format is not validated. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email === "" ? null : email;
}

/**
 * Keeps only the digits of an INN; empty or non-string input → `null`. Input without any digit
 * also gives `null` — callers holding user input keep the raw value then, so validation fails.
 */
export function normalizeInn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? null : digits;
}

/**
 * Domain separators of the consent contact hashes, one per contact kind, so the same string
 * hashed as a phone and as an e-mail never collides. Bump the version if the input format of a
 * kind ever changes (old records then need a re-hash or a dual lookup).
 */
const CONSENT_HASH_CONTEXT = {
  phone: "consent-phone:v1",
  email: "consent-email:v1",
} as const;

type ConsentContactKind = keyof typeof CONSENT_HASH_CONTEXT;

/** HMAC-SHA256 (hex) of an already normalized contact under its kind's domain separator. */
function consentContactHmac(kind: ConsentContactKind, normalized: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${CONSENT_HASH_CONTEXT[kind]}\n${normalized}`)
    .digest("hex");
}

/*
 * `consent-log.phoneHash` / `consent-log.emailHash`: one keyed hash PER CONTACT, so an erasure
 * request (task 32) that names only a phone or only an e-mail still finds every journal record
 * of a deleted lead. HMAC-SHA256 with `FORM_HMAC_SECRET`: unlike plain SHA-256 it cannot be
 * reversed by enumerating the small space of Russian phone numbers if the table leaks.
 *
 * Input is normalized here, so raw form values are fine; `null` when the value is unusable
 * (store nothing then — an empty field simply never matches).
 */

/** `consent-log.phoneHash`: HMAC of the normalized phone (`+7XXXXXXXXXX`), or `null`. */
export function consentPhoneHash(
  phone: unknown,
  secret: string = getEnv().FORM_HMAC_SECRET
): string | null {
  const normalized = normalizePhone(phone);
  return normalized === null ? null : consentContactHmac("phone", normalized, secret);
}

/** `consent-log.emailHash`: HMAC of the normalized (trimmed, lower-cased) e-mail, or `null`. */
export function consentEmailHash(
  email: unknown,
  secret: string = getEnv().FORM_HMAC_SECRET
): string | null {
  const normalized = normalizeEmail(email);
  return normalized === null ? null : consentContactHmac("email", normalized, secret);
}
