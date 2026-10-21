import { describe, expect, it } from "vitest";
import { SEED_PRICES_2026_10_15 } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import { homePriceFootnote } from "./price-footnote";

const ctx = (overrides: Partial<PlaceholderContext> = {}): PlaceholderContext => ({
  prices: SEED_PRICES_2026_10_15,
  promo: null,
  now: new Date("2026-10-20T07:00:00Z"),
  conditions: "",
  contacts: "",
  requisites: "",
  phone: "",
  ...overrides,
});

const TZ_CAPTION =
  "* Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется";

describe("homePriceFootnote", () => {
  it("renders the prices.caption global with the price date and the footnote mark", () => {
    const template =
      "Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется";
    expect(homePriceFootnote(template, ctx())).toBe(TZ_CAPTION);
  });

  it("falls back to the domain priceCaption() for an empty global", () => {
    expect(homePriceFootnote(null, ctx())).toBe(TZ_CAPTION);
    expect(homePriceFootnote("   ", ctx())).toBe(TZ_CAPTION);
  });

  it("always carries «цена в договоре фиксируется» by default (ТЗ §11)", () => {
    expect(homePriceFootnote(undefined, ctx())).toContain("цена в договоре фиксируется");
  });
});
