import { daysBetween, todayKey, tryDateKey } from "./dates";
import { formatDateRu, formatPriceFrom } from "./format";
import { REQUEST_ONLY_THICKNESSES } from "./types";
import type { DateInput } from "./types";

/**
 * Price rules (SSoT §1.1, ТЗ §4): a price «from» is shown only while the price list is fresh
 * (`staleAfterDays`, 45 by default). After that — or for 15/19 mm, or without a price — the site
 * shows «Цена по расчёту» / «по запросу» instead of an outdated number.
 */

/** Local shape of the `prices` global (the Payload → domain adapter lives in task 15). */
export interface PricesInput {
  /** 15 and 19 mm have `price: null`. */
  items: ReadonlyArray<{ thickness: number; price: number | null }>;
  priceDate: DateInput | null;
  /** Freshness threshold in days from the global (45 by default). */
  staleAfterDays: number;
}

export type PriceState = "price" | "calc";

export const DEFAULT_STALE_AFTER_DAYS = 45;

export const PRICE_ON_REQUEST_LABEL = "по запросу";
export const PRICE_BY_CALC_LABEL = "Цена по расчёту";

/** Price list of 15.10.2026, ₽/м² — the seed (task 16) and test fixture. */
export const SEED_PRICES_2026_10_15: PricesInput = {
  items: [
    { thickness: 4, price: 700 },
    { thickness: 5, price: 750 },
    { thickness: 6, price: 800 },
    { thickness: 8, price: 1300 },
    { thickness: 10, price: 1400 },
    { thickness: 12, price: 2000 },
    { thickness: 15, price: null },
    { thickness: 19, price: null },
  ],
  priceDate: "2026-10-15",
  staleAfterDays: DEFAULT_STALE_AFTER_DAYS,
};

/** Raw price «from» of a thickness, ₽/м², regardless of freshness. */
export function getPrice(thickness: number, prices: PricesInput): number | null {
  return prices.items.find((item) => item.thickness === thickness)?.price ?? null;
}

/**
 * `'price'` when the thickness is not request-only, has a positive price and the price date is
 * at most `staleAfterDays` calendar days old (exactly 45 days is still fresh, a future date is
 * fresh). Otherwise `'calc'`.
 */
export function priceState(
  thickness: number,
  prices: PricesInput,
  now: Date = new Date()
): PriceState {
  if (REQUEST_ONLY_THICKNESSES.includes(thickness)) return "calc";
  const price = getPrice(thickness, prices);
  if (price === null || !Number.isFinite(price) || price <= 0) return "calc";
  const priceKey = tryDateKey(prices.priceDate);
  if (priceKey === null) return "calc";
  const age = daysBetween(priceKey, todayKey(now));
  return age <= prices.staleAfterDays ? "price" : "calc";
}

/**
 * Price and its label for templates. `price` is set only in the `'price'` state, so a stale
 * number can never leak into the page.
 */
export function resolvePrice(
  thickness: number,
  prices: PricesInput,
  now: Date = new Date()
): { state: PriceState; price: number | null; label: string } {
  const state = priceState(thickness, prices, now);
  const price = getPrice(thickness, prices);
  if (state === "price" && price !== null) {
    return { state, price, label: formatPriceFrom(price) };
  }
  const label = REQUEST_ONLY_THICKNESSES.includes(thickness)
    ? PRICE_ON_REQUEST_LABEL
    : PRICE_BY_CALC_LABEL;
  return { state: "calc", price: null, label };
}

/** «Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется». */
export function priceCaption(prices: PricesInput): string {
  const priceKey = tryDateKey(prices.priceDate);
  const datePart = priceKey === null ? "" : ` на ${formatDateRu(priceKey)}`;
  return `Ориентировочная цена${datePart}. Точная стоимость — в КП; цена в договоре фиксируется`;
}

/** `round(area × price)` in roubles; `null` when the price is not shown or the area is not positive. */
export function estimateAmount(
  areaM2: number,
  thickness: number,
  prices: PricesInput,
  now: Date = new Date()
): number | null {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return null;
  if (priceState(thickness, prices, now) !== "price") return null;
  const price = getPrice(thickness, prices);
  return price === null ? null : Math.round(areaM2 * price);
}
