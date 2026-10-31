import { describe, expect, it } from "vitest";
import { NBSP, SEED_PRICES_2026_10_15 } from "@/lib/domain";
import type { PricesInput, PromoInput } from "@/lib/domain";
import {
  buildPricesCaption,
  buildThicknessView,
  isPriceListFresh,
  tablePriceLabel,
} from "./thickness-view";
import type { ThicknessViewInput } from "./thickness-view";

const prices = SEED_PRICES_2026_10_15;
/** Noon in Chelyabinsk, so the UTC and local calendar dates coincide. */
const at = (key: string) => new Date(`${key}T07:00:00Z`);
/** 15.10.2026 + 45 days — the last fresh day. */
const DAY_45 = at("2026-11-29");
const DAY_46 = at("2026-11-30");
const FRESH = at("2026-10-20");

const promo: PromoInput = {
  active: true,
  text: "−5% на закалённое стекло при заказе от 100 м²",
  startDate: "2026-10-15",
  endDate: "2026-12-31",
  thresholdArea: 100,
};

const CAPTION =
  "Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется";

function view(n: number, now: Date, overrides: Partial<ThicknessViewInput> = {}) {
  return buildThicknessView({
    n,
    doc: { kindsText: "все, включая крашеное и гнутое" },
    prices,
    promo,
    conditions: { leadTimeDays: 10 },
    now,
    captionTemplate: CAPTION,
    ...overrides,
  });
}

describe("buildThicknessView — 45-day rule", () => {
  it("shows the price on day 45", () => {
    const v = view(10, DAY_45);
    expect(v.priceState).toBe("price");
    expect(v.priceLabel).toBe(`от 1${NBSP}400${NBSP}₽/м²`);
    expect(v.price).toBe(1400);
    expect(v.priceNote).toBe("ориентир на 15.10.2026");
    expect(v.metaTitleKey).toBe("title");
    expect(v.showProductJsonLd).toBe(true);
    expect(v.caption).toBe(
      "Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется"
    );
  });

  it("switches to «Цена по расчёту» on day 46", () => {
    const v = view(10, DAY_46);
    expect(v.priceState).toBe("calc");
    expect(v.priceLabel).toBe("Цена по расчёту");
    expect(v.price).toBeNull();
    expect(v.priceNote).toBe("пришлите чертёж — назовём цену в КП");
    expect(v.caption).toBeNull();
    expect(v.metaTitleKey).toBe("titleNoPrice");
    expect(v.showProductJsonLd).toBe(false);
  });

  it.each([15, 19])("is always 'calc' for %i mm, even with a fresh price list", (n) => {
    const withPrice: PricesInput = {
      ...prices,
      items: prices.items.map((item) => ({ ...item, price: item.price ?? 3000 })),
    };
    const v = view(n, FRESH, { prices: withPrice });
    expect(v.priceState).toBe("calc");
    expect(v.priceLabel).toBe("Цена по расчёту");
    expect(v.showProductJsonLd).toBe(false);
    expect(v.metaTitleKey).toBe("titleNoPrice");
  });

  it("hides every neighbour price when the list is stale", () => {
    const v = view(10, DAY_46);
    expect(v.neighborsTable.map((c) => c.priceLabel)).toEqual([
      "Цена по расчёту",
      "Цена по расчёту",
      "Цена по расчёту",
    ]);
    expect(view(12, DAY_46).neighborsTable.map((c) => c.priceLabel)).toEqual([
      "Цена по расчёту",
      "Цена по расчёту",
      "по запросу",
    ]);
  });
});

describe("buildThicknessView — neighbours", () => {
  const neighbours = (n: number) => {
    const { prev, next } = view(n, FRESH).neighbors;
    return [prev?.n ?? null, next?.n ?? null];
  };

  it("finds the previous and next thickness", () => {
    expect(neighbours(4)).toEqual([null, 5]);
    expect(neighbours(10)).toEqual([8, 12]);
    expect(neighbours(12)).toEqual([10, 15]);
    expect(neighbours(19)).toEqual([15, null]);
  });

  it("builds two columns at the ends and three in the middle", () => {
    expect(view(4, FRESH).neighborsTable.map((c) => c.n)).toEqual([4, 5]);
    expect(view(10, FRESH).neighborsTable.map((c) => c.n)).toEqual([8, 10, 12]);
    expect(view(19, FRESH).neighborsTable.map((c) => c.n)).toEqual([15, 19]);
    expect(view(10, FRESH).neighborsTable.map((c) => c.current)).toEqual([false, true, false]);
  });

  it("labels neighbour prices for the table", () => {
    expect(view(10, FRESH).neighborsTable.map((c) => c.priceLabel)).toEqual([
      `от 1${NBSP}300`,
      `от 1${NBSP}400`,
      `от 2${NBSP}000`,
    ]);
    expect(view(12, FRESH).neighborsTable.at(-1)?.priceLabel).toBe("по запросу");
    expect(view(19, FRESH).neighborsTable.map((c) => c.priceLabel)).toEqual([
      "по запросу",
      "по запросу",
    ]);
    expect(view(10, FRESH).neighborsTable.map((c) => c.href)).toEqual([
      "/zakalennoe-steklo/8-mm/",
      "/zakalennoe-steklo/10-mm/",
      "/zakalennoe-steklo/12-mm/",
    ]);
  });
});

describe("buildThicknessView — passport values", () => {
  it("computes weight and hole distances with the domain library", () => {
    expect(view(5, FRESH).weight).toEqual({ value: "12,5", label: "12,5 кг/м²" });
    expect(view(19, FRESH).weight.value).toBe("47,5");
    expect(view(4, FRESH).holeRules).toMatchObject({ edge: 8, between: 8, corner: 24 });
    expect(view(10, FRESH).holeRules).toMatchObject({ edge: 20, between: 20, corner: 60 });
    expect(view(19, FRESH).holeRules).toMatchObject({ edge: 38, between: 38, corner: 114 });
  });

  it("uses the default size and lead time unless the document overrides them", () => {
    const v = view(10, FRESH);
    expect(v.sizeText).toBe("от 150 × 300 до 3000 × 2000 мм");
    expect(v.leadTimeText).toBe("от 10 рабочих дней с даты договора");
    const custom = view(19, FRESH, {
      doc: {
        kindsText: "по запросу; крашеное и гнутое — нет",
        sizeText: "до 3000 × 2000 мм; точнее — после согласования с заводом",
        leadTimeText: "от 15 рабочих дней",
      },
    });
    expect(custom.sizeText).toBe("до 3000 × 2000 мм; точнее — после согласования с заводом");
    expect(custom.leadTimeText).toBe("от 15 рабочих дней");
    expect(custom.kindsText).toBe("по запросу; крашеное и гнутое — нет");
  });

  it("shows the promo only while it is active", () => {
    expect(view(10, FRESH).promoText).toBe(promo.text);
    expect(view(10, at("2027-01-10")).promoText).toBeNull();
    expect(view(10, FRESH, { promo: { ...promo, active: false } }).promoText).toBeNull();
  });
});

describe("tablePriceLabel / isPriceListFresh", () => {
  it("drops the unit in table cells", () => {
    expect(tablePriceLabel(4, prices, FRESH)).toEqual({ state: "price", label: "от 700" });
    expect(tablePriceLabel(15, prices, FRESH)).toEqual({ state: "calc", label: "по запросу" });
    expect(tablePriceLabel(4, prices, DAY_46)).toEqual({
      state: "calc",
      label: "Цена по расчёту",
    });
  });

  it("tracks the freshness of the whole list", () => {
    expect(isPriceListFresh(prices, DAY_45)).toBe(true);
    expect(isPriceListFresh(prices, DAY_46)).toBe(false);
    expect(isPriceListFresh({ ...prices, priceDate: null }, FRESH)).toBe(false);
  });
});

describe("buildPricesCaption (hub)", () => {
  const HUB =
    "Ориентировочные цены на {дата_цен}. Точная стоимость — в КП после расчёта; цена в договоре фиксируется. {акция_текст}";

  it("fills the date and the active promo", () => {
    expect(buildPricesCaption({ template: HUB, prices, promo, now: FRESH, showPromo: true })).toBe(
      "Ориентировочные цены на 15.10.2026. Точная стоимость — в КП после расчёта; цена в договоре фиксируется. −5% на закалённое стекло при заказе от 100 м²"
    );
  });

  it("omits an inactive or switched-off promo", () => {
    const expected =
      "Ориентировочные цены на 15.10.2026. Точная стоимость — в КП после расчёта; цена в договоре фиксируется.";
    expect(
      buildPricesCaption({
        template: HUB,
        prices,
        promo: { ...promo, active: false },
        now: FRESH,
        showPromo: true,
      })
    ).toBe(expected);
    expect(buildPricesCaption({ template: HUB, prices, promo, now: FRESH, showPromo: false })).toBe(
      expected
    );
  });

  it("replaces the date sentence with «Цена по расчёту» when the list is stale", () => {
    expect(
      buildPricesCaption({
        template: HUB,
        prices,
        promo: null,
        now: DAY_46,
        showPromo: true,
        staleLabel: "Цена по расчёту",
      })
    ).toBe("Цена по расчёту. Точная стоимость — в КП после расчёта; цена в договоре фиксируется.");
  });

  it("appends the promo to a template without the placeholder", () => {
    expect(
      buildPricesCaption({ template: CAPTION, prices, promo, now: FRESH, showPromo: true })
    ).toBe(
      "Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется. −5% на закалённое стекло при заказе от 100 м²"
    );
  });

  it("falls back to the domain caption", () => {
    expect(buildPricesCaption({ prices, promo: null, now: FRESH, showPromo: false })).toBe(
      "Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется"
    );
  });
});
