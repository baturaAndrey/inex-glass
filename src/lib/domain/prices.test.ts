import { describe, expect, it } from "vitest";
import {
  estimateAmount,
  getPrice,
  priceCaption,
  priceState,
  resolvePrice,
  SEED_PRICES_2026_10_15,
} from "./prices";
import type { PricesInput } from "./prices";

const prices = SEED_PRICES_2026_10_15;
/** Noon in Chelyabinsk, so the UTC and local calendar dates coincide. */
const at = (key: string) => new Date(`${key}T07:00:00Z`);
const FRESH = at("2026-10-20");
const STALE = at("2026-11-30");

describe("priceState — 45-day rule", () => {
  it("is 'price' on day 45 and 'calc' on day 46", () => {
    expect(priceState(10, prices, at("2026-11-29"))).toBe("price");
    expect(priceState(10, prices, STALE)).toBe("calc");
  });

  it("treats a future price date as fresh", () => {
    expect(priceState(10, prices, at("2026-10-01"))).toBe("price");
  });

  it("uses the company calendar date, not the UTC one", () => {
    // 2026-11-29T20:00Z is already 30.11 (day 46) in Chelyabinsk.
    expect(priceState(10, prices, new Date("2026-11-29T20:00:00Z"))).toBe("calc");
  });

  it("accepts the ISO datetime Payload returns", () => {
    const iso: PricesInput = { ...prices, priceDate: "2026-10-15T00:00:00.000Z" };
    expect(priceState(10, iso, at("2026-11-29"))).toBe("price");
  });

  it("is always 'calc' for 15 and 19 mm", () => {
    const withPrices: PricesInput = {
      ...prices,
      items: [
        { thickness: 15, price: 3000 },
        { thickness: 19, price: 4000 },
      ],
    };
    expect(priceState(15, withPrices, FRESH)).toBe("calc");
    expect(priceState(19, withPrices, FRESH)).toBe("calc");
  });

  it("is 'calc' without a price, with a zero price or without a date", () => {
    expect(priceState(15, prices, FRESH)).toBe("calc");
    expect(priceState(3, prices, FRESH)).toBe("calc");
    const zero: PricesInput = { ...prices, items: [{ thickness: 10, price: 0 }] };
    expect(priceState(10, zero, FRESH)).toBe("calc");
    expect(priceState(10, { ...prices, priceDate: null }, FRESH)).toBe("calc");
    expect(priceState(10, { ...prices, priceDate: "not a date" }, FRESH)).toBe("calc");
  });

  it("honours a custom threshold", () => {
    expect(priceState(10, { ...prices, staleAfterDays: 5 }, at("2026-10-21"))).toBe("calc");
  });
});

describe("prices of 15.10.2026", () => {
  it("matches the seed list", () => {
    expect([4, 5, 6, 8, 10, 12].map((t) => getPrice(t, prices))).toEqual([
      700, 750, 800, 1300, 1400, 2000,
    ]);
    expect(getPrice(15, prices)).toBeNull();
    expect(getPrice(19, prices)).toBeNull();
  });
});

describe("resolvePrice", () => {
  it("labels a fresh price «от 1 400 ₽/м²»", () => {
    expect(resolvePrice(10, prices, FRESH)).toEqual({
      state: "price",
      price: 1400,
      label: "от 1 400 ₽/м²",
    });
  });

  it("labels 19 mm «по запросу»", () => {
    expect(resolvePrice(19, prices, FRESH)).toEqual({
      state: "calc",
      price: null,
      label: "по запросу",
    });
  });

  it("labels a stale price «Цена по расчёту» and hides the number", () => {
    expect(resolvePrice(10, prices, STALE)).toEqual({
      state: "calc",
      price: null,
      label: "Цена по расчёту",
    });
  });
});

describe("priceCaption", () => {
  it("matches the reference text", () => {
    expect(priceCaption(prices)).toBe(
      "Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется"
    );
  });
});

describe("estimateAmount", () => {
  it("multiplies area by the price", () => {
    expect(estimateAmount(100, 10, prices, FRESH)).toBe(140000);
    expect(estimateAmount(1.25, 4, prices, FRESH)).toBe(875);
  });

  it("is null for a stale price, request-only thickness or non-positive area", () => {
    expect(estimateAmount(100, 10, prices, STALE)).toBeNull();
    expect(estimateAmount(100, 15, prices, FRESH)).toBeNull();
    expect(estimateAmount(0, 10, prices, FRESH)).toBeNull();
    expect(estimateAmount(-5, 10, prices, FRESH)).toBeNull();
  });
});
