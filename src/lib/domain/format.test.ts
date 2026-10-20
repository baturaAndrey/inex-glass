import { describe, expect, it } from "vitest";
import { daysBetween, toDateKey, todayKey, tryDateKey } from "./dates";
import {
  formatDateRu,
  formatNumber,
  formatPrice,
  formatPriceFrom,
  formatRub,
  formatSizeMm,
  parseNumber,
} from "./format";

describe("parseNumber", () => {
  it("parses a decimal comma", () => {
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber("49,5")).toBe(49.5);
  });

  it("drops regular and no-break spaces", () => {
    expect(parseNumber("1 000")).toBe(1000);
    expect(parseNumber("1 000")).toBe(1000);
    expect(parseNumber(" 2 500,75 ")).toBe(2500.75);
  });

  it("returns null for empty input and garbage", () => {
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("   ")).toBeNull();
    expect(parseNumber("12,5,3")).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
    expect(parseNumber(Number.NaN)).toBeNull();
    expect(parseNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("passes numbers and negative values through", () => {
    expect(parseNumber(7)).toBe(7);
    expect(parseNumber("-3")).toBe(-3);
  });
});

describe("formatNumber", () => {
  it("uses NBSP thousands and a decimal comma, trimming zeros", () => {
    expect(formatNumber(12.5)).toBe("12,5");
    expect(formatNumber(10)).toBe("10");
    expect(formatNumber(1400)).toBe("1 400");
    expect(formatNumber(1234567.891)).toBe("1 234 567,89");
  });

  it("rounds half up without binary drift", () => {
    expect(formatNumber(1.005)).toBe("1,01");
    expect(formatNumber(40.72, { decimals: 1 })).toBe("40,7");
  });

  it("keeps trailing zeros when trim is off", () => {
    expect(formatNumber(10, { decimals: 2, trim: false })).toBe("10,00");
  });

  it("never renders negative zero", () => {
    expect(formatNumber(-0.001)).toBe("0");
  });
});

describe("prices and sizes", () => {
  it("formats prices with NBSP", () => {
    expect(formatPrice(1400)).toBe("1 400");
    expect(formatPrice(700)).toBe("700");
    expect(formatPriceFrom(2000)).toBe("от 2 000 ₽/м²");
    expect(formatRub(125000)).toBe("125 000 ₽");
  });

  it("formats sizes without grouping", () => {
    expect(formatSizeMm(3000, 2000)).toBe("3000 × 2000 мм");
    expect(formatSizeMm(1000.5, 700)).toBe("1000,5 × 700 мм");
  });
});

describe("dates", () => {
  it("formats ISO dates and datetimes as DD.MM.YYYY", () => {
    expect(formatDateRu("2026-10-15T00:00:00.000Z")).toBe("15.10.2026");
    expect(formatDateRu("2026-01-05")).toBe("05.01.2026");
  });

  it("formats Date values in the company time zone", () => {
    // 20:00 UTC on 19.10 is already 01:00 on 20.10 in Chelyabinsk.
    expect(toDateKey(new Date("2026-10-19T20:00:00Z"))).toBe("2026-10-20");
    expect(todayKey(new Date("2026-10-19T18:59:00Z"))).toBe("2026-10-19");
  });

  it("rejects invalid dates", () => {
    expect(tryDateKey("2026-02-30")).toBeNull();
    expect(tryDateKey("15.10.2026")).toBeNull();
    expect(tryDateKey(null)).toBeNull();
    expect(() => toDateKey("garbage")).toThrow(RangeError);
  });

  it("counts calendar days between keys", () => {
    expect(daysBetween("2026-10-15", "2026-11-29")).toBe(45);
    expect(daysBetween("2026-10-15", "2026-10-14")).toBe(-1);
    // DST-free arithmetic across a month boundary.
    expect(daysBetween("2026-03-28", "2026-04-02")).toBe(5);
  });
});
