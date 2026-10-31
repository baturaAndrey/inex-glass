import { todayKey, tryDateKey } from "./dates";
import type { DateInput } from "./types";

/** Local shape of the `promo` global (field names match the schema). */
export interface PromoInput {
  active: boolean;
  /** «−5% на закалённое стекло при заказе от 100 м²» */
  text: string;
  startDate: DateInput | null;
  endDate: DateInput | null;
  /** Area from which the quiz shows the promo hint, m² (100). */
  thresholdArea: number;
}

/**
 * The promo is active when it is switched on and today (company time zone) lies within
 * `[startDate, endDate]`, both inclusive. A missing bound means «unbounded»; an unparsable
 * date is treated as missing. The promo disappears by itself after the end date.
 */
export function promoActive(promo: PromoInput | null | undefined, now: Date = new Date()): boolean {
  if (!promo?.active) return false;
  const today = todayKey(now);
  const start = tryDateKey(promo.startDate);
  const end = tryDateKey(promo.endDate);
  // `YYYY-MM-DD` keys compare correctly as strings.
  if (start !== null && today < start) return false;
  if (end !== null && today > end) return false;
  return true;
}

/** Promo text for the quiz when `area ≥ thresholdArea` and the promo is active, else `null`. */
export function promoHint(
  areaM2: number | null | undefined,
  promo: PromoInput | null | undefined,
  now: Date = new Date()
): string | null {
  if (promo == null || areaM2 == null || !Number.isFinite(areaM2)) return null;
  if (areaM2 < promo.thresholdArea || !promoActive(promo, now)) return null;
  return promo.text;
}
