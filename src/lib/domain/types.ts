/**
 * Shared types and constants of the domain library.
 *
 * Everything in `src/lib/domain` is pure TypeScript: no `payload`, `react`, `next` or
 * `@/payload-types` imports, so the same rules run in Server Components, client components
 * (quiz, calculators), route handlers, the seed and unit tests.
 */

/** Glass thicknesses sold by Inex Glass, mm (SSoT §2). */
export const THICKNESSES = [4, 5, 6, 8, 10, 12, 15, 19] as const;
export type Thickness = (typeof THICKNESSES)[number];

/** Thicknesses that never show a price: always «по запросу» (SSoT §1.1). */
export const REQUEST_ONLY_THICKNESSES: readonly number[] = [15, 19];

/** Company time zone (Chelyabinsk, UTC+5). «Today» is always the calendar date in this zone. */
export const COMPANY_TZ = "Asia/Yekaterinburg";

/** U+00A0 NO-BREAK SPACE: thousands separator and the space before units (₽, мм). */
export const NBSP = " ";

/** `YYYY-MM-DD`, an ISO datetime string (as Payload returns dates) or a `Date`. */
export type DateInput = string | Date;

/** Type guard for the thickness list. */
export function isThickness(value: unknown): value is Thickness {
  return typeof value === "number" && (THICKNESSES as readonly number[]).includes(value);
}
