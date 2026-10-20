import { formatDateRu, formatRub } from "./format";
import { HOLE_DIAMETER_HINT, holeHint } from "./holes";
import { DEFAULT_TECH_LIMITS, minBendRadius } from "./limits";
import { estimateAmount } from "./prices";
import { promoHint } from "./promo";
import { isUrgent, URGENT_MESSAGE } from "./working-days";
import type { TechLimits } from "./limits";
import type { PricesInput } from "./prices";
import type { PromoInput } from "./promo";
import type { QuizAnswersDraft } from "./quiz-schema";

/**
 * Lead flags, live hints and the price estimate of the quiz (teksty/05-kviz.md, ТЗ p0 §4).
 * Flags never block a lead: they tag it for the manager («малый объём», «срочно», …).
 */

export type QuizFlag = "small_volume" | "nonstandard_size" | "urgent" | "no_file" | "needs_docs";

/** Ids equal `LEAD_FLAGS` of the CRM schema (`leads.flags`). */
export const QUIZ_FLAGS: readonly QuizFlag[] = [
  "small_volume",
  "nonstandard_size",
  "urgent",
  "no_file",
  "needs_docs",
];

export const QUIZ_FLAG_LABELS: Record<QuizFlag, string> = {
  small_volume: "Малый объём",
  nonstandard_size: "Нестандартный размер",
  urgent: "Срочно",
  no_file: "Без файла",
  needs_docs: "Нужны документы",
};

export interface QuizContext {
  now: Date;
  holidays: readonly string[];
  /** Weekend days made working by a transfer (optional, see `working-days.ts`). */
  workdays?: readonly string[];
  prices: PricesInput;
  promo: PromoInput | null;
  limits?: TechLimits;
  /**
   * `true` when flags are computed for the submitted lead: a missing file then sets `no_file`.
   * In a draft only an explicit «Нет чертежа» (`noFile`) does.
   */
  atSubmit?: boolean;
}

export type QuizHintStep = 2 | 3 | 4 | 6;

export interface QuizHint {
  id: string;
  severity: "info" | "warn";
  text: string;
  step: QuizHintStep;
}

/** Hint texts, verbatim from teksty/05-kviz.md. */
export const QUIZ_HINT_TEXTS = {
  smallVolume:
    "Мы работаем с заказами от 50 м². Если это часть большого проекта — оставьте контакты, объединим позиции в один заказ",
  nonstandardSize: "Нестандартный размер — менеджер уточнит возможность изготовления",
  painted: "Крашеное стекло — толщина 4–15 мм, размер до 3000 × 1600 мм",
  bent: "Гнутое — до 1200 × 2000 мм; радиус от 1000 мм для 4–6 мм и от 1500 мм для 8–12 мм",
  print: "Печать — до 1100 × 700 мм",
} as const;

const isPositive = (n: number | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

/** Numeric thickness of the answers, or `undefined` for «custom» / not chosen. */
const thicknessOf = (a: QuizAnswersDraft): number | undefined =>
  typeof a.thickness === "number" ? a.thickness : undefined;

/** Largest glass as long/short side, independent of the W × H order; `null` without both sizes. */
function glassSides(a: QuizAnswersDraft): { long: number; short: number } | null {
  if (!isPositive(a.maxW) || !isPositive(a.maxH)) return null;
  return { long: Math.max(a.maxW, a.maxH), short: Math.min(a.maxW, a.maxH) };
}

const outside = (t: number, min: number, max: number) => t < min || t > max;

function isFlatSizeNonstandard(
  sides: { long: number; short: number },
  limits: TechLimits
): boolean {
  const { flat } = limits;
  return (
    sides.short < flat.shortMin ||
    sides.long < flat.longMin ||
    sides.long > flat.longMax ||
    sides.short > flat.shortMax
  );
}

function isPaintedNonstandard(a: QuizAnswersDraft, limits: TechLimits): boolean {
  const { painted } = limits;
  const t = thicknessOf(a);
  if (t !== undefined && outside(t, painted.thickMin, painted.thickMax)) return true;
  const sides = glassSides(a);
  return (
    sides !== null &&
    (sides.short < painted.shortMin ||
      sides.long < painted.longMin ||
      sides.long > painted.longMax ||
      sides.short > painted.shortMax)
  );
}

function isBentNonstandard(a: QuizAnswersDraft, limits: TechLimits): boolean {
  const { bent } = limits;
  const t = thicknessOf(a);
  if (t !== undefined && outside(t, bent.thickMin, bent.thickMax)) return true;
  const sides = glassSides(a);
  if (sides !== null && (sides.long > bent.longMax || sides.short > bent.shortMax)) return true;
  if (t !== undefined && isPositive(a.bendRadius)) {
    const min = minBendRadius(t, limits);
    if (min !== null && a.bendRadius < min) return true;
  }
  return false;
}

function isHolesNonstandard(a: QuizAnswersDraft, limits: TechLimits): boolean {
  const { holes } = limits;
  const sides = glassSides(a);
  if (
    sides !== null &&
    (sides.long < holes.glassLongMin ||
      sides.long > holes.glassLongMax ||
      sides.short < holes.glassShortMin ||
      sides.short > holes.glassShortMax)
  ) {
    return true;
  }
  const t = thicknessOf(a);
  return (a.holes?.diameters ?? []).some(
    (d) => d < holes.dMin || d > holes.dMax || (t !== undefined && d < t)
  );
}

function isPrintNonstandard(a: QuizAnswersDraft, limits: TechLimits): boolean {
  const sides = glassSides(a);
  // Conservative: any glass larger than the print area is flagged, the manager clarifies.
  return sides !== null && (sides.long > limits.print.long || sides.short > limits.print.short);
}

/**
 * «Нестандартный размер». Size checks need both `maxW` and `maxH`; thickness, bend radius and
 * hole diameter checks apply on their own.
 */
export function isNonstandardSize(
  a: QuizAnswersDraft,
  limits: TechLimits = DEFAULT_TECH_LIMITS
): boolean {
  const sides = glassSides(a);
  if (sides !== null && isFlatSizeNonstandard(sides, limits)) return true;
  if (a.kind === "painted" && isPaintedNonstandard(a, limits)) return true;
  if (a.kind === "bent" && isBentNonstandard(a, limits)) return true;
  if (a.holes?.has && isHolesNonstandard(a, limits)) return true;
  if (a.decor?.includes("print") && isPrintNonstandard(a, limits)) return true;
  return false;
}

function isSmallVolume(a: QuizAnswersDraft, limits: TechLimits): boolean {
  return isPositive(a.area) && a.area < limits.minAreaM2;
}

function isQuizUrgent(a: QuizAnswersDraft, ctx: QuizContext): boolean {
  return isUrgent(a.desiredDate, ctx.now, a.type === "triplex", ctx.holidays, ctx.workdays ?? []);
}

export function computeQuizFlags(a: QuizAnswersDraft, ctx: QuizContext): QuizFlag[] {
  const limits = ctx.limits ?? DEFAULT_TECH_LIMITS;
  const flags: QuizFlag[] = [];
  if (isSmallVolume(a, limits)) flags.push("small_volume");
  if (isNonstandardSize(a, limits)) flags.push("nonstandard_size");
  if (isQuizUrgent(a, ctx)) flags.push("urgent");
  if (a.noFile === true || (ctx.atSubmit === true && !a.file)) flags.push("no_file");
  if (a.needDocs === true) flags.push("needs_docs");
  return flags;
}

/** Live hints of the quiz steps, in step order. */
export function getQuizHints(a: QuizAnswersDraft, ctx: QuizContext): QuizHint[] {
  const limits = ctx.limits ?? DEFAULT_TECH_LIMITS;
  const hints: QuizHint[] = [];

  if (a.kind === "painted") {
    hints.push({ id: "painted", severity: "info", text: QUIZ_HINT_TEXTS.painted, step: 2 });
  }
  if (a.kind === "bent") {
    hints.push({ id: "bent", severity: "info", text: QUIZ_HINT_TEXTS.bent, step: 2 });
  }

  if (isSmallVolume(a, limits)) {
    hints.push({
      id: "small_volume",
      severity: "warn",
      text: QUIZ_HINT_TEXTS.smallVolume,
      step: 3,
    });
  }
  const promo = promoHint(a.area, ctx.promo, ctx.now);
  if (promo !== null) hints.push({ id: "promo", severity: "info", text: promo, step: 3 });
  if (isNonstandardSize(a, limits)) {
    hints.push({
      id: "nonstandard_size",
      severity: "warn",
      text: QUIZ_HINT_TEXTS.nonstandardSize,
      step: 3,
    });
  }

  if (a.holes?.has) {
    hints.push({ id: "holes", severity: "info", text: holeHint(thicknessOf(a)), step: 4 });
    const diameters = a.holes.diameters ?? [];
    if (diameters.some((d) => d < limits.holes.dMin || d > limits.holes.dMax)) {
      hints.push({ id: "hole_diameter", severity: "warn", text: HOLE_DIAMETER_HINT, step: 4 });
    }
  }
  if (a.decor?.includes("print")) {
    hints.push({ id: "print", severity: "info", text: QUIZ_HINT_TEXTS.print, step: 4 });
  }

  if (isQuizUrgent(a, ctx)) {
    hints.push({ id: "urgent", severity: "warn", text: URGENT_MESSAGE, step: 6 });
  }
  return hints;
}

/**
 * Price estimate after step 3: area × price «from». Only for a fresh price, a positive area,
 * a numeric thickness and non-triplex orders (15/19 mm and stale prices give `null`).
 */
export function quizEstimate(
  a: QuizAnswersDraft,
  ctx: QuizContext
): { amount: number; text: string } | null {
  const t = thicknessOf(a);
  if (t === undefined || a.type === "triplex" || !isPositive(a.area)) return null;
  const amount = estimateAmount(a.area, t, ctx.prices, ctx.now);
  if (amount === null || ctx.prices.priceDate === null) return null;
  const text = `Ориентировочно от ${formatRub(amount)} за стекло без обработки и доставки. Цены на ${formatDateRu(ctx.prices.priceDate)}. Точная стоимость — в КП`;
  return { amount, text };
}
