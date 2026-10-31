import { COMPANY_TZ } from "./types";
import type { DateInput } from "./types";

/**
 * Calendar-date helpers. All business rules (45-day price rule, promo dates, working days)
 * compare calendar dates in the company time zone as `YYYY-MM-DD` keys, never milliseconds:
 * a difference in hours must not move a price from «price» to «calc».
 */

const MS_PER_DAY = 86_400_000;
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

/** `en-CA` formats as `YYYY-MM-DD`; created once, formatters are expensive. */
const companyDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: COMPANY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Like `toDateKey`, but returns `null` for unusable input instead of throwing. Use it on CMS
 * data, where an empty or broken date must degrade gracefully (e.g. price → «по расчёту»).
 */
export function tryDateKey(input: DateInput | null | undefined): string | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : companyDateFormatter.format(input);
  }
  if (typeof input !== "string") return null;
  const match = DATE_KEY_PATTERN.exec(input.trim());
  if (!match) return null;
  if (!isValidDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) return null;
  return match[0];
}

/**
 * Normalizes a date to a `YYYY-MM-DD` key: strings keep their first 10 characters (Payload
 * returns `2026-10-15T00:00:00.000Z` for a calendar date), `Date` values are formatted in the
 * company time zone. Throws `RangeError` on invalid input.
 */
export function toDateKey(input: DateInput): string {
  const key = tryDateKey(input);
  if (key === null) throw new RangeError(`Invalid date: ${String(input)}`);
  return key;
}

/** Today's calendar date in the company time zone. */
export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

function keyToUtcMs(key: string): number {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) throw new RangeError(`Invalid date key: ${key}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole days from `aKey` to `bKey` (negative when `b` is earlier). */
export function daysBetween(aKey: string, bKey: string): number {
  return Math.round((keyToUtcMs(bKey) - keyToUtcMs(aKey)) / MS_PER_DAY);
}

/** Shifts a date key by `days` calendar days. */
export function addDays(key: string, days: number): string {
  return new Date(keyToUtcMs(key) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Day of week of a date key: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(key: string): number {
  return new Date(keyToUtcMs(key)).getUTCDay();
}
