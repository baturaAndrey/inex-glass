import { describe, expect, it } from "vitest";
import { DEFAULT_TECH_LIMITS, SEED_PRICES_2026_10_15 } from "@/lib/domain";
import type { QuizAnswersDraft } from "@/lib/domain";
import {
  deriveQuiz,
  prefillBadgeText,
  quizContext,
  splitEstimate,
  submitFlags,
  thicknessWeightLabel,
  triplexSummary,
  triplexThickness,
} from "./derive";
import type { QuizConfig } from "./types";

/** Tuesday 20.10.2026 10:00 Chelyabinsk; prices of 15.10.2026 are fresh (5 days). */
const NOW_ISO = "2026-10-20T05:00:00.000Z";

function config(overrides: Partial<QuizConfig> = {}): QuizConfig {
  return {
    nowIso: NOW_ISO,
    prices: SEED_PRICES_2026_10_15,
    promo: {
      active: true,
      text: "−5% на закалённое стекло при заказе от 100 м²",
      startDate: null,
      endDate: null,
      thresholdArea: 100,
    },
    limits: DEFAULT_TECH_LIMITS,
    holidays: ["2026-11-04"],
    cities: [],
    films: [0.38, 0.76, 1.14, 1.52],
    phone: "+7 (351) 247-05-57",
    minOrderArea: 50,
    forms: { thankYouTitle: "", thankYouText: "", submitErrorText: "" },
    ...overrides,
  };
}

/** NBSP (thousands, units) → plain spaces for readable expectations. */
const plain = (text: string | null | undefined) => text?.replace(/ /g, " ");

const derive = (answers: QuizAnswersDraft, cfg = config()) => deriveQuiz(answers, quizContext(cfg));
const hintIds = (answers: QuizAnswersDraft, cfg = config()) =>
  derive(answers, cfg).hints.map((hint) => hint.id);

describe("deriveQuiz — hints", () => {
  it("warns about small volumes below 50 m²", () => {
    expect(hintIds({ area: 49 })).toContain("small_volume");
    expect(hintIds({ area: 86 })).not.toContain("small_volume");
  });

  it("shows the promo from its threshold only while it is active", () => {
    expect(hintIds({ area: 120 })).toContain("promo");
    expect(hintIds({ area: 99 })).not.toContain("promo");
    const ended = config({
      promo: { ...config().promo!, endDate: "2026-10-19" },
    });
    expect(hintIds({ area: 120 }, ended)).not.toContain("promo");
  });

  it("flags sizes outside 150 × 300 — 3000 × 2000 mm", () => {
    expect(hintIds({ maxW: 3500, maxH: 1200 })).toContain("nonstandard_size");
    expect(hintIds({ maxW: 3000, maxH: 1200 })).not.toContain("nonstandard_size");
  });

  it("gives the GOST hole hint for the chosen thickness and the diameter warning", () => {
    const hints = derive({ thickness: 10, holes: { has: true, diameters: [12, 16] } }).hints;
    expect(hints.find((hint) => hint.id === "holes")?.text).toBe(
      "Для стекла 10 мм отверстие — не ближе 20 мм к кромке и 60 мм к углу (ГОСТ 30698-2014)"
    );
    expect(hints.some((hint) => hint.id === "hole_diameter")).toBe(false);
    expect(hintIds({ thickness: 10, holes: { has: true, diameters: [12, 200] } })).toContain(
      "hole_diameter"
    );
  });

  it("uses the general hole hint for triplex (layers, not the hidden single thickness)", () => {
    const hints = derive({
      type: "triplex",
      thickness: 10,
      triplex: { glass1: 6, glass2: 6, film: 0.76 },
      holes: { has: true },
    }).hints;
    expect(hints.find((hint) => hint.id === "holes")?.text).toContain("двух толщин");
  });

  it("counts urgency in WORKING days with the CMS holidays", () => {
    // From 20.10.2026: 10 working days → 03.11.2026; 04.11 is a holiday (not in the count here).
    expect(derive({ desiredDate: "2026-11-02" }).urgent).toBe(true);
    expect(derive({ desiredDate: "2026-11-03" }).urgent).toBe(false);
    // Calendar days would say «not urgent» for 31.10 (11 days later) — working days say urgent.
    expect(derive({ desiredDate: "2026-10-31" }).urgent).toBe(true);
    // Triplex needs 14 working days: 04.11 holiday shifts the date to 10.11.
    expect(derive({ type: "triplex", desiredDate: "2026-11-09" }).urgent).toBe(true);
    expect(derive({ type: "triplex", desiredDate: "2026-11-10" }).urgent).toBe(false);
    expect(hintIds({ desiredDate: "2026-10-21" })).toContain("urgent");
  });
});

describe("deriveQuiz — estimate", () => {
  it("multiplies area by the fresh price and splits the text", () => {
    const { estimate, priceState } = derive({ thickness: 10, area: 86 });
    expect(priceState).toBe("price");
    expect(estimate?.amount).toBe(120400);
    expect(plain(estimate?.lead)).toBe("Ориентировочно от 120 400 ₽");
    expect(plain(estimate?.rest)).toBe(
      "за стекло без обработки и доставки. Ориентировочная цена на 15.10.2026. Точная стоимость — в КП; цена в договоре фиксируется"
    );
  });

  it("is hidden for 15/19 mm, triplex, a stale price and without area", () => {
    expect(derive({ thickness: 15, area: 86 }).estimate).toBeNull();
    expect(derive({ thickness: 19, area: 86 }).estimate).toBeNull();
    expect(
      derive({ type: "triplex", thickness: 10, triplex: { glass1: 6, glass2: 6 }, area: 86 })
        .estimate
    ).toBeNull();
    expect(derive({ thickness: 10 }).estimate).toBeNull();
    const stale = config({ nowIso: "2026-12-31T05:00:00.000Z" });
    const result = derive({ thickness: 10, area: 86 }, stale);
    expect(result.estimate).toBeNull();
    expect(result.priceState).toBe("calc");
  });

  it("keeps the whole text when the format differs", () => {
    expect(splitEstimate(1, "other")).toEqual({ lead: "", rest: "other" });
  });
});

describe("flags", () => {
  it("computes the lead flags for Metrika at submit", () => {
    expect(
      submitFlags(
        { area: 30, maxW: 3500, maxH: 1000, desiredDate: "2026-10-22", needDocs: true },
        config()
      )
    ).toEqual(["small_volume", "nonstandard_size", "urgent", "no_file", "needs_docs"]);
    expect(
      submitFlags({ area: 86, file: { uploadToken: "t", name: "a.pdf", size: 1 } }, config())
    ).toEqual([]);
  });
});

describe("display helpers", () => {
  it("formats card weights and the triplex summary", () => {
    expect(plain(thicknessWeightLabel(10))).toBe("25 кг/м²");
    expect(plain(thicknessWeightLabel(5))).toBe("12,5 кг/м²");
    expect(plain(triplexSummary({ glass1: 8, glass2: 8, film: 0.76 }))).toBe(
      "Схема 8+8, плёнка 0,76 мм · вес ≈ 40,7 кг/м²"
    );
    expect(triplexSummary({ glass1: 6 })).toBeNull();
  });

  it("derives the triplex thickness from the layers", () => {
    expect(triplexThickness({ type: "triplex", triplex: { glass1: 6, glass2: 8 } })).toBe(8);
    expect(triplexThickness({ type: "triplex", thickness: "custom" })).toBe("custom");
    expect(triplexThickness({ type: "triplex", thickness: 10 })).toBeUndefined();
  });

  it("builds the «Из карточки» badge", () => {
    expect(plain(prefillBadgeText({ type: "tempered", thickness: 10 }))).toBe(
      "Из карточки: Закалённое стекло, 10 мм"
    );
    expect(plain(prefillBadgeText({ type: "tempered", thickness: 10, kind: "matte" }))).toBe(
      "Из карточки: Закалённое стекло, 10 мм, матовое"
    );
    expect(prefillBadgeText({})).toBeNull();
  });
});
