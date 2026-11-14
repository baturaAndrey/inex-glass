import type { QuizHrefParams } from "@/components/page/quiz-cta";
import { quizSrc } from "@/lib/domain/quiz-src";

/**
 * Quiz link of the glass weight calculator («Посчитать стоимость этого стекла»).
 *
 * Pure and client-safe: `buildQuizHref` lives in `@/components/page/quiz-cta`, a server module
 * (it lazily imports the CMS loaders), so the client calculator cannot import it. This module
 * produces the same URL for the calculator's subset of keys — same path, same fixed key order
 * (`type, thick, src, w, h, q, t1, t2, film` ⊂ `QUIZ_PARAM_ORDER`), same `src` masking; the unit
 * test checks the parity against `buildQuizHref`.
 */

/** Quiz page path (same value as `QUIZ_PATH` of `@/components/page/quiz-cta`). */
export const WEIGHT_QUIZ_PATH = "/raschet-stoimosti/";

/** Page of the calculator, sent as the quiz `src`. */
export const WEIGHT_CALCULATOR_PATH = "/instrumenty/kalkulyator-vesa-stekla/";

export type WeightMode = "single" | "triplex";

/** Calculator state relevant for the quiz. Sizes / quantity are `null` when empty or invalid. */
export interface WeightQuizState {
  mode: WeightMode;
  /** Single glass thickness, mm. */
  t: number;
  /** Triplex layers, mm. */
  t1: number;
  t2: number;
  /** EVA film thickness, mm (0.38 / 0.76 / 1.14 / 1.52). */
  film: number;
  w: number | null;
  h: number | null;
  q: number | null;
  /** Page path for `src`; the calculator page by default. */
  src?: string | undefined;
}

/** Fixed key order: a subset of `QUIZ_PARAM_ORDER` of `buildQuizHref`. */
const KEY_ORDER = ["type", "thick", "src", "w", "h", "q", "t1", "t2", "film"] as const;

const positive = (value: number | null): number | undefined =>
  value !== null && Number.isFinite(value) && value > 0 ? value : undefined;

/** Quiz parameters of the calculator state (w / h / q only when > 0). */
export function weightQuizParams(state: WeightQuizState): QuizHrefParams {
  const common = {
    src: quizSrc(state.src ?? WEIGHT_CALCULATOR_PATH),
    w: positive(state.w),
    h: positive(state.h),
    q: positive(state.q),
  };
  return state.mode === "single"
    ? { type: "tempered", thick: state.t, ...common }
    : { type: "triplex", t1: state.t1, t2: state.t2, film: state.film, ...common };
}

/**
 * `/raschet-stoimosti/?type=tempered&thick=10&src=…&w=1000&h=2000&q=10` (single) or
 * `…?type=triplex&src=…&w=…&h=…&q=…&t1=8&t2=8&film=0.76` (triplex).
 */
export function buildWeightQuizHref(state: WeightQuizState): string {
  const params = weightQuizParams(state);
  const search = new URLSearchParams();
  for (const key of KEY_ORDER) {
    const value = params[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${WEIGHT_QUIZ_PATH}?${query}` : WEIGHT_QUIZ_PATH;
}
