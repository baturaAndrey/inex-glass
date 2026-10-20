import { describe, expect, it } from "vitest";
import { HOLE_DIAMETER_HINT } from "./holes";
import { SEED_PRICES_2026_10_15 } from "./prices";
import {
  computeQuizFlags,
  getQuizHints,
  QUIZ_FLAG_LABELS,
  QUIZ_HINT_TEXTS,
  quizEstimate,
} from "./quiz-flags";
import { URGENT_MESSAGE } from "./working-days";
import type { QuizContext } from "./quiz-flags";
import type { QuizAnswersDraft } from "./quiz-schema";

const PROMO_TEXT = "−5% на закалённое стекло при заказе от 100 м²";
const ctx = (overrides: Partial<QuizContext> = {}): QuizContext => ({
  // Monday 19.10.2026, noon in Chelyabinsk.
  now: new Date("2026-10-19T07:00:00Z"),
  holidays: [],
  prices: SEED_PRICES_2026_10_15,
  promo: {
    active: true,
    text: PROMO_TEXT,
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    thresholdArea: 100,
  },
  ...overrides,
});
const flags = (a: QuizAnswersDraft, c: Partial<QuizContext> = {}) => computeQuizFlags(a, ctx(c));
const hintIds = (a: QuizAnswersDraft, c: Partial<QuizContext> = {}) =>
  getQuizHints(a, ctx(c)).map((h) => h.id);

describe("small_volume", () => {
  it("is set below 50 m² only", () => {
    expect(flags({ area: 49.9 })).toContain("small_volume");
    expect(flags({ area: 50 })).not.toContain("small_volume");
    expect(flags({})).not.toContain("small_volume");
    expect(flags({ area: 0 })).not.toContain("small_volume");
  });
});

describe("nonstandard_size", () => {
  it("checks flat limits in either orientation", () => {
    expect(flags({ maxW: 3001, maxH: 100 })).toContain("nonstandard_size");
    expect(flags({ maxW: 150, maxH: 300 })).not.toContain("nonstandard_size");
    expect(flags({ maxW: 300, maxH: 150 })).not.toContain("nonstandard_size");
    expect(flags({ maxW: 2001, maxH: 2500 })).toContain("nonstandard_size");
    expect(flags({ maxW: 3000, maxH: 2000 })).not.toContain("nonstandard_size");
  });

  it("checks painted thickness and size", () => {
    expect(flags({ kind: "painted", thickness: 19, maxW: 1000, maxH: 1000 })).toContain(
      "nonstandard_size"
    );
    expect(flags({ kind: "painted", thickness: 19 })).toContain("nonstandard_size");
    expect(flags({ kind: "painted", thickness: 10, maxW: 3000, maxH: 1700 })).toContain(
      "nonstandard_size"
    );
    expect(flags({ kind: "painted", thickness: 10, maxW: 3000, maxH: 1600 })).not.toContain(
      "nonstandard_size"
    );
  });

  it("checks bent radius, thickness and size", () => {
    const bent: QuizAnswersDraft = { kind: "bent", thickness: 10, maxW: 1000, maxH: 1000 };
    expect(flags({ ...bent, bendRadius: 1200 })).toContain("nonstandard_size");
    expect(flags({ ...bent, bendRadius: 1500 })).not.toContain("nonstandard_size");
    expect(flags({ ...bent, thickness: 6, bendRadius: 1000 })).not.toContain("nonstandard_size");
    expect(flags({ ...bent, thickness: 15 })).toContain("nonstandard_size");
    expect(flags({ ...bent, maxW: 1300, maxH: 1300 })).toContain("nonstandard_size");
  });

  it("checks holes", () => {
    const holes = (diameters: number[]): QuizAnswersDraft => ({
      thickness: 10,
      maxW: 1000,
      maxH: 1000,
      holes: { has: true, diameters },
    });
    expect(flags(holes([140]))).toContain("nonstandard_size");
    expect(flags(holes([3]))).toContain("nonstandard_size");
    expect(flags(holes([8]))).toContain("nonstandard_size");
    expect(flags(holes([12, 20]))).not.toContain("nonstandard_size");
    expect(flags({ ...holes([12]), maxW: 2000, maxH: 1700 })).toContain("nonstandard_size");
    // Holes not selected — diameters are ignored.
    expect(flags({ ...holes([140]), holes: { has: false, diameters: [140] } })).not.toContain(
      "nonstandard_size"
    );
  });

  it("checks print size conservatively", () => {
    expect(flags({ decor: ["print"], maxW: 1100, maxH: 700 })).not.toContain("nonstandard_size");
    expect(flags({ decor: ["print"], maxW: 1200, maxH: 700 })).toContain("nonstandard_size");
  });
});

describe("urgent / no_file / needs_docs", () => {
  it("flags urgent dates with working days, 14 for triplex", () => {
    expect(flags({ desiredDate: "2026-11-01" })).toContain("urgent");
    expect(flags({ desiredDate: "2026-11-02" })).not.toContain("urgent");
    expect(flags({ type: "triplex", desiredDate: "2026-11-05" })).toContain("urgent");
    expect(flags({ type: "triplex", desiredDate: "2026-11-06" })).not.toContain("urgent");
  });

  it("flags a missing file at submit, and an explicit «no file» in drafts", () => {
    expect(flags({})).not.toContain("no_file");
    expect(flags({ noFile: true })).toContain("no_file");
    expect(flags({}, { atSubmit: true })).toContain("no_file");
    expect(
      flags({ file: { uploadToken: "t", name: "a.pdf", size: 10 } }, { atSubmit: true })
    ).not.toContain("no_file");
  });

  it("flags document requests", () => {
    expect(flags({ needDocs: true })).toEqual(["needs_docs"]);
    expect(flags({ needDocs: false })).toEqual([]);
  });

  it("has labels for every flag", () => {
    expect(QUIZ_FLAG_LABELS).toEqual({
      small_volume: "Малый объём",
      nonstandard_size: "Нестандартный размер",
      urgent: "Срочно",
      no_file: "Без файла",
      needs_docs: "Нужны документы",
    });
  });
});

describe("getQuizHints", () => {
  it("uses the reference texts", () => {
    expect(QUIZ_HINT_TEXTS).toEqual({
      smallVolume:
        "Мы работаем с заказами от 50 м². Если это часть большого проекта — оставьте контакты, объединим позиции в один заказ",
      nonstandardSize: "Нестандартный размер — менеджер уточнит возможность изготовления",
      painted: "Крашеное стекло — толщина 4–15 мм, размер до 3000 × 1600 мм",
      bent: "Гнутое — до 1200 × 2000 мм; радиус от 1000 мм для 4–6 мм и от 1500 мм для 8–12 мм",
      print: "Печать — до 1100 × 700 мм",
    });
  });

  it("shows step 2 hints for painted and bent", () => {
    expect(getQuizHints({ kind: "painted" }, ctx())).toEqual([
      { id: "painted", severity: "info", text: QUIZ_HINT_TEXTS.painted, step: 2 },
    ]);
    expect(hintIds({ kind: "bent" })).toEqual(["bent"]);
  });

  it("shows the promo from the threshold area while active", () => {
    const promo = getQuizHints({ area: 100 }, ctx()).find((h) => h.id === "promo");
    expect(promo).toEqual({ id: "promo", severity: "info", text: PROMO_TEXT, step: 3 });
    expect(hintIds({ area: 99 })).not.toContain("promo");
    expect(hintIds({ area: 150 }, { promo: null })).not.toContain("promo");
  });

  it("shows small volume and nonstandard size on step 3", () => {
    expect(hintIds({ area: 10, maxW: 3500, maxH: 1000 })).toEqual([
      "small_volume",
      "nonstandard_size",
    ]);
  });

  it("shows hole hints on step 4", () => {
    const hints = getQuizHints({ thickness: 10, holes: { has: true, diameters: [150] } }, ctx());
    expect(hints.filter((h) => h.step === 4).map((h) => h.text)).toEqual([
      "Для стекла 10 мм отверстие — не ближе 20 мм к кромке и 60 мм к углу (ГОСТ 30698-2014)",
      HOLE_DIAMETER_HINT,
    ]);
    expect(hintIds({ holes: { has: true, diameters: [10] } })).toEqual(["holes"]);
  });

  it("shows print and urgent hints", () => {
    expect(hintIds({ decor: ["print"] })).toEqual(["print"]);
    const urgent = getQuizHints({ desiredDate: "2026-10-25" }, ctx());
    expect(urgent).toEqual([{ id: "urgent", severity: "warn", text: URGENT_MESSAGE, step: 6 }]);
  });
});

describe("quizEstimate", () => {
  it("multiplies the area by the price «from»", () => {
    expect(quizEstimate({ thickness: 10, area: 60 }, ctx())).toEqual({
      amount: 84000,
      text: "Ориентировочно от 84 000 ₽ за стекло без обработки и доставки. Цены на 15.10.2026. Точная стоимость — в КП",
    });
  });

  it("is null for 15/19 mm, stale prices, triplex, custom thickness and no area", () => {
    expect(quizEstimate({ thickness: 15, area: 60 }, ctx())).toBeNull();
    expect(
      quizEstimate({ thickness: 10, area: 60 }, ctx({ now: new Date("2026-12-31T07:00:00Z") }))
    ).toBeNull();
    expect(quizEstimate({ type: "triplex", thickness: 10, area: 60 }, ctx())).toBeNull();
    expect(quizEstimate({ thickness: "custom", area: 60 }, ctx())).toBeNull();
    expect(quizEstimate({ thickness: 10 }, ctx())).toBeNull();
  });
});
