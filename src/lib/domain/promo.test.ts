import { describe, expect, it } from "vitest";
import { promoActive, promoHint } from "./promo";
import type { PromoInput } from "./promo";

const PROMO: PromoInput = {
  active: true,
  text: "−5% на закалённое стекло при заказе от 100 м²",
  startDate: "2026-10-01",
  endDate: "2026-10-31T00:00:00.000Z",
  thresholdArea: 100,
};
const at = (key: string) => new Date(`${key}T07:00:00Z`);

describe("promoActive", () => {
  it("is active inside the interval, inclusive on both ends", () => {
    expect(promoActive(PROMO, at("2026-10-01"))).toBe(true);
    expect(promoActive(PROMO, at("2026-10-15"))).toBe(true);
    expect(promoActive(PROMO, at("2026-10-31"))).toBe(true);
  });

  it("is inactive the day after the end and before the start", () => {
    expect(promoActive(PROMO, at("2026-11-01"))).toBe(false);
    expect(promoActive(PROMO, at("2026-09-30"))).toBe(false);
  });

  it("switches off at local midnight of the company time zone", () => {
    // 2026-10-31T19:30Z is already 01.11 in Chelyabinsk.
    expect(promoActive(PROMO, new Date("2026-10-31T19:30:00Z"))).toBe(false);
  });

  it("is inactive when switched off or missing", () => {
    expect(promoActive({ ...PROMO, active: false }, at("2026-10-15"))).toBe(false);
    expect(promoActive(null, at("2026-10-15"))).toBe(false);
    expect(promoActive(undefined, at("2026-10-15"))).toBe(false);
  });

  it("treats missing dates as open bounds", () => {
    const open: PromoInput = { ...PROMO, startDate: null, endDate: null };
    expect(promoActive(open, at("2030-01-01"))).toBe(true);
  });
});

describe("promoHint", () => {
  const now = at("2026-10-15");

  it("shows the text from the threshold area", () => {
    expect(promoHint(99.9, PROMO, now)).toBeNull();
    expect(promoHint(100, PROMO, now)).toBe(PROMO.text);
  });

  it("is null for an inactive promo or without an area", () => {
    expect(promoHint(100, { ...PROMO, active: false }, now)).toBeNull();
    expect(promoHint(100, PROMO, at("2026-11-01"))).toBeNull();
    expect(promoHint(null, PROMO, now)).toBeNull();
    expect(promoHint(100, null, now)).toBeNull();
  });
});
