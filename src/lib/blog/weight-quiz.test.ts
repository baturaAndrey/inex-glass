import { describe, expect, it } from "vitest";
import { buildQuizHref, QUIZ_PATH } from "@/components/page/quiz-cta";
import {
  WEIGHT_QUIZ_PATH,
  buildWeightQuizHref,
  weightQuizParams,
  type WeightQuizState,
} from "./weight-quiz";

const DEFAULTS: WeightQuizState = {
  mode: "single",
  t: 10,
  t1: 8,
  t2: 8,
  film: 0.76,
  w: 1000,
  h: 2000,
  q: 10,
};

const SRC = "src=%2Finstrumenty%2Fkalkulyator-vesa-stekla%2F";

describe("buildWeightQuizHref", () => {
  it("single glass: tempered + thickness + sizes", () => {
    expect(buildWeightQuizHref(DEFAULTS)).toBe(
      `/raschet-stoimosti/?type=tempered&thick=10&${SRC}&w=1000&h=2000&q=10`
    );
  });

  it("triplex: layers and film with a dot", () => {
    const href = buildWeightQuizHref({ ...DEFAULTS, mode: "triplex" });
    expect(href).toBe(
      `/raschet-stoimosti/?type=triplex&${SRC}&w=1000&h=2000&q=10&t1=8&t2=8&film=0.76`
    );
    expect(href).not.toContain("thick=");
  });

  it("drops empty / zero / negative sizes and quantity", () => {
    expect(buildWeightQuizHref({ ...DEFAULTS, w: null, h: 0, q: -3 })).toBe(
      `/raschet-stoimosti/?type=tempered&thick=10&${SRC}`
    );
  });

  it("keeps decimal sizes", () => {
    expect(buildWeightQuizHref({ ...DEFAULTS, w: 1.5 })).toContain("&w=1.5&");
  });

  it("masks a secret src like buildQuizHref", () => {
    expect(buildWeightQuizHref({ ...DEFAULTS, src: "/zakaz/abc/" })).toContain("src=%2Fzakaz%2F");
  });

  it("is identical to buildQuizHref of the same parameters", () => {
    expect(WEIGHT_QUIZ_PATH).toBe(QUIZ_PATH);
    const states: WeightQuizState[] = [
      DEFAULTS,
      { ...DEFAULTS, mode: "triplex", t1: 6, t2: 10, film: 1.52 },
      { ...DEFAULTS, w: null, q: null },
      { ...DEFAULTS, mode: "triplex", h: null },
    ];
    for (const state of states) {
      expect(buildWeightQuizHref(state)).toBe(buildQuizHref(weightQuizParams(state)));
    }
  });
});
