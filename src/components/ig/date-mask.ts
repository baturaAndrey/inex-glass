/**
 * Pure helpers for the Russian date format `дд.мм.гггг` and ISO `YYYY-MM-DD`.
 */

/** Placeholder of the date field (must match the design verbatim). */
export const DATE_PLACEHOLDER = "дд.мм.гггг";

/** Error text for a complete but impossible date (shown via the consumer's `Field.error`). */
export const DATE_FORMAT_ERROR = "Введите дату в формате дд.мм.гггг";

const DATE_DIGITS = 8;
const RU_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days in a month of the proleptic Gregorian calendar (`month` is 1..12). */
function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this month; UTC avoids DST surprises.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidDate(year: number, month: number, day: number): boolean {
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/**
 * Progressive mask while typing: `'25'` → `'25'`, `'251'` → `'25.1'`,
 * `'25122026'` → `'25.12.2026'`. Non-digits are ignored, at most 8 digits are kept.
 * Dots appear only once the next digit exists, so Backspace never gets stuck on a dot.
 */
export function maskRuDate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, DATE_DIGITS);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];
  return parts.filter(Boolean).join(".");
}

/** `'25.12.2026'` → `'2026-12-25'`; incomplete or impossible dates (`31.02.2026`) → `null`. */
export function parseRuDate(input: string): string | null {
  const match = RU_DATE.exec(input.trim());
  if (!match) return null;

  const [, dd = "", mm = "", yyyy = ""] = match;
  if (!isValidDate(Number(yyyy), Number(mm), Number(dd))) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** `'2026-12-25'` → `'25.12.2026'`; anything that is not a valid ISO date → `''`. */
export function formatRuDateFromIso(iso: string): string {
  const match = ISO_DATE.exec(iso.trim());
  if (!match) return "";

  const [, yyyy = "", mm = "", dd = ""] = match;
  if (!isValidDate(Number(yyyy), Number(mm), Number(dd))) return "";
  return `${dd}.${mm}.${yyyy}`;
}
