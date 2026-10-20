import { describe, expect, it } from "vitest";
import { listPlaceholders, replacePlaceholders } from "./placeholders";
import { SEED_PRICES_2026_10_15 } from "./prices";
import type { PlaceholderContext } from "./placeholders";

const CONDITIONS =
  "Заказы от 50 м² · срок от 10 рабочих дней с даты договора · КП в среднем за 2–3 рабочих дня";
const PROMO_TEXT = "−5% на закалённое стекло при заказе от 100 м²";

const ctx = (overrides: Partial<PlaceholderContext> = {}): PlaceholderContext => ({
  prices: SEED_PRICES_2026_10_15,
  promo: {
    active: true,
    text: PROMO_TEXT,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    thresholdArea: 100,
  },
  now: new Date("2026-10-20T07:00:00Z"),
  conditions: CONDITIONS,
  contacts: "Челябинск, ул. Примерная, 1",
  requisites: "ООО «Инекс»",
  phone: "+7 (351) 247-05-57",
  ...overrides,
});
const STALE_NOW = new Date("2026-12-31T07:00:00Z");
const INACTIVE_PROMO = { promo: null } as const;

describe("replacePlaceholders — prices", () => {
  it("formats {цена_Nмм} with NBSP and no currency", () => {
    expect(replacePlaceholders("{цена_10мм}", ctx())).toBe("1 400");
    expect(replacePlaceholders("от {цена_4мм} ₽", ctx())).toBe("от 700 ₽");
  });

  it("uses «по запросу» for 15/19 and «по расчёту» for stale prices", () => {
    expect(replacePlaceholders("{цена_19мм}", ctx())).toBe("по запросу");
    expect(replacePlaceholders("{цена_10мм}", ctx({ now: STALE_NOW }))).toBe("по расчёту");
    expect(replacePlaceholders("{цена}", ctx({ thickness: 8, now: STALE_NOW }))).toBe("по расчёту");
  });

  it("resolves {цена} and {дата_цен}", () => {
    expect(replacePlaceholders("{цена}", ctx({ thickness: 12 }))).toBe("2 000");
    expect(replacePlaceholders("Цены на {дата_цен}", ctx())).toBe("Цены на 15.10.2026");
  });
});

describe("replacePlaceholders — thickness", () => {
  it("resolves {N}, {2N}, {6N}", () => {
    expect(replacePlaceholders("{N} / {2N} / {6N}", ctx({ thickness: 10 }))).toBe("10 / 20 / 60");
  });

  it("resolves weights", () => {
    expect(replacePlaceholders("{вес}", ctx({ thickness: 5 }))).toBe("12,5");
    expect(replacePlaceholders("{вес×2}", ctx({ thickness: 10 }))).toBe("50");
  });

  it("resolves neighbours with «-» and «−»", () => {
    expect(replacePlaceholders("{N-}", ctx({ thickness: 4 }))).toBe("—");
    expect(replacePlaceholders("{N+}", ctx({ thickness: 12 }))).toBe("15");
    expect(replacePlaceholders("{N−}", ctx({ thickness: 12 }))).toBe("10");
    expect(replacePlaceholders("{N+}", ctx({ thickness: 19 }))).toBe("—");
    expect(replacePlaceholders("{цена+}", ctx({ thickness: 12 }))).toBe("по запросу");
    expect(replacePlaceholders("{цена-}", ctx({ thickness: 12 }))).toBe("1 400");
    expect(replacePlaceholders("{вес+}", ctx({ thickness: 4 }))).toBe("12,5");
    expect(replacePlaceholders("{вес−}", ctx({ thickness: 4 }))).toBe("—");
  });

  it("leaves thickness placeholders when the page has no thickness", () => {
    expect(replacePlaceholders("{N} мм, {цена}", ctx())).toBe("{N} мм, {цена}");
  });
});

describe("replacePlaceholders — strings and promo", () => {
  it("substitutes context strings", () => {
    expect(replacePlaceholders("{условия}", ctx())).toBe(CONDITIONS);
    expect(replacePlaceholders("Звоните: {телефон}", ctx())).toBe("Звоните: +7 (351) 247-05-57");
    expect(replacePlaceholders("{реквизиты}. {контакты}", ctx())).toBe(
      "ООО «Инекс». Челябинск, ул. Примерная, 1"
    );
  });

  it("shows the promo only while it is active", () => {
    expect(replacePlaceholders("{акция_текст}", ctx())).toBe(PROMO_TEXT);
    expect(replacePlaceholders("{условия} · {акция_текст}", ctx(INACTIVE_PROMO))).toBe(CONDITIONS);
  });

  it("cleans separators left by an empty substitution", () => {
    const inactive = ctx(INACTIVE_PROMO);
    expect(replacePlaceholders("{акция_текст} · {условия}", inactive)).toBe(CONDITIONS);
    expect(replacePlaceholders("Условия {акция_текст}.", inactive)).toBe("Условия.");
    expect(replacePlaceholders("{условия}, {акция_текст}", inactive)).toBe(CONDITIONS);
    expect(replacePlaceholders("До {акция_текст} после", inactive)).toBe("До после");
    expect(replacePlaceholders("А · {акция_текст}\nБ", inactive)).toBe("А\nБ");
  });

  it("does not touch the author's own separators", () => {
    expect(replacePlaceholders("А · Б ·  В", ctx())).toBe("А · Б ·  В");
  });

  it("keeps unknown placeholders", () => {
    const text = "{виды} {faq} {блок «Цены»} {площадь × цена}";
    expect(replacePlaceholders(text, ctx({ thickness: 10 }))).toBe(text);
  });
});

describe("listPlaceholders", () => {
  it("lists distinct placeholders in order", () => {
    expect(listPlaceholders("{N} мм — {цена} ₽, {N} мм; {виды}")).toEqual([
      "{N}",
      "{цена}",
      "{виды}",
    ]);
    expect(listPlaceholders("без меток")).toEqual([]);
  });
});
