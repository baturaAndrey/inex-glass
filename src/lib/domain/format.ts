import { toDateKey } from "./dates";
import { NBSP } from "./types";
import type { DateInput } from "./types";

/**
 * Russian number, price, size and date formatting. Thousands are always separated with
 * NBSP (U+00A0) so that «1 400 ₽» never breaks across lines; the decimal separator is a comma.
 */

const DEFAULT_DECIMALS = 2;
/** Any whitespace incl. NBSP (U+00A0), narrow NBSP (U+202F) and thin space (U+2009). */
const SPACES = /[\s   ]/g;
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Parses a user-typed number: «12,5» → 12.5, «1 000» / «1 000» → 1000. Empty input,
 * garbage and non-finite numbers → `null`. Negative values are returned as is: range checks are
 * the caller's business.
 */
export function parseNumber(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const compact = input.replace(SPACES, "").replace(",", ".");
  if (!NUMBER_PATTERN.test(compact)) return null;
  const value = Number(compact);
  return Number.isFinite(value) ? value : null;
}

/** Rounds half away from zero without binary drift (1.005 → 1.01 at 2 decimals). */
function roundTo(n: number, decimals: number): number {
  const sign = n < 0 ? -1 : 1;
  const abs = String(Math.abs(n));
  // Exponent notation (1e-7, 1e21) cannot take the string shift; plain arithmetic is fine there.
  const scaled = abs.includes("e") ? Math.abs(n) * 10 ** decimals : Number(`${abs}e${decimals}`);
  return (sign * Math.round(scaled)) / 10 ** decimals;
}

/**
 * Formats a number the Russian way: NBSP thousands, comma decimals. By default up to two
 * decimals with trailing zeros trimmed: 12.5 → «12,5», 10 → «10», 1400 → «1 400».
 */
export function formatNumber(n: number, opts: { decimals?: number; trim?: boolean } = {}): string {
  const { decimals = DEFAULT_DECIMALS, trim = true } = opts;
  const rounded = roundTo(n, decimals);
  // `|| 0` turns −0 into 0 so that −0.001 never renders as «−0».
  const fixed = Math.abs(rounded || 0).toFixed(decimals);
  const [intPart = "0", fracPart = ""] = fixed.split(".");
  const fraction = trim ? fracPart.replace(/0+$/, "") : fracPart;
  const sign = rounded < 0 ? "-" : "";
  const grouped = intPart.replace(THOUSANDS, NBSP);
  return fraction ? `${sign}${grouped},${fraction}` : `${sign}${grouped}`;
}

/** Price without currency: 1400 → «1 400» (NBSP), 700 → «700». Rounded to whole roubles. */
export function formatPrice(n: number): string {
  return formatNumber(n, { decimals: 0 });
}

/** «от 1 400 ₽/м²» — the price «from» per square metre. */
export function formatPriceFrom(n: number): string {
  return `от ${formatPrice(n)}${NBSP}₽/м²`;
}

/** Roubles: 125000 → «125 000 ₽» (NBSP before ₽). */
export function formatRub(n: number): string {
  return `${formatPrice(n)}${NBSP}₽`;
}

/** Plain size number: no thousands grouping («3000»), comma decimals. */
function formatPlain(n: number): string {
  return formatNumber(n).replace(SPACES, "");
}

/** «3000 × 2000 мм» (U+00D7, regular spaces around ×, NBSP before «мм»). */
export function formatSizeMm(w: number, h: number): string {
  return `${formatPlain(w)} × ${formatPlain(h)}${NBSP}мм`;
}

/** «15.10.2026». Throws `RangeError` on an invalid date. */
export function formatDateRu(input: DateInput): string {
  const [year, month, day] = toDateKey(input).split("-");
  return `${day}.${month}.${year}`;
}
