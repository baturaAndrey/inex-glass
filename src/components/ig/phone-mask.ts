/**
 * Pure helpers for the Russian phone mask `+7 (XXX) XXX-XX-XX`.
 * Everything works on the 10-digit national number (without the country code).
 */

/** Length of a Russian national number (without the `+7` / `8` prefix). */
export const PHONE_NATIONAL_LENGTH = 10;

/** Placeholder of the masked field (must match the design verbatim). */
export const PHONE_PLACEHOLDER = "+7 (___) ___-__-__";

const TRUNK_PREFIX = /^[78]/;

/**
 * National digits of a (possibly formatted or partial) phone number, at most 10.
 *
 * Prefix handling:
 * - a leading `+7` is always the country code and is dropped;
 * - otherwise a leading `7`/`8` is a country/trunk prefix ("the input started with it"):
 *   `8 900 123-45-67`, `79001234567`, `8 (900…` → `900…`;
 * - after `+7` another `7`/`8` is dropped only when ≥10 digits follow it
 *   (`+7 8 900 123 45 67`); `+7 (800) …` keeps its `8`.
 */
export function phoneDigits(input: string): string {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+7")) {
    digits = digits.slice(1);
    if (digits.length > PHONE_NATIONAL_LENGTH && TRUNK_PREFIX.test(digits)) {
      digits = digits.slice(1);
    }
  } else if (TRUNK_PREFIX.test(digits)) {
    digits = digits.slice(1);
  }

  return digits.slice(0, PHONE_NATIONAL_LENGTH);
}

/**
 * Progressive mask: `'900'` → `'+7 (900'`, `'90012'` → `'+7 (900) 12'`,
 * `'9001234567'` → `'+7 (900) 123-45-67'`. Separators appear only once the next digit
 * exists, so Backspace never gets stuck on a trailing `) ` or `-`. Empty input → `''`.
 */
export function formatPhoneMask(input: string): string {
  const digits = phoneDigits(input);
  if (!digits) return "";

  let masked = `+7 (${digits.slice(0, 3)}`;
  if (digits.length > 3) masked += `) ${digits.slice(3, 6)}`;
  if (digits.length > 6) masked += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) masked += `-${digits.slice(8, 10)}`;
  return masked;
}

/** True when the input contains a full 10-digit national number. */
export function isPhoneComplete(input: string): boolean {
  return phoneDigits(input).length === PHONE_NATIONAL_LENGTH;
}

/** `'+79001234567'` for a complete number, otherwise `null`. */
export function toE164(input: string): string | null {
  const digits = phoneDigits(input);
  return digits.length === PHONE_NATIONAL_LENGTH ? `+7${digits}` : null;
}
