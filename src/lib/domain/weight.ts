import { formatNumber } from "./format";
import { THICKNESSES } from "./types";

/**
 * Glass weight (teksty/10-blog-kalkulyator.md §1, ТЗ 7.1): 1 m² of 1 mm glass weighs 2.5 kg;
 * laminated (triplex) adds 0.36 kg/m² per 0.38 mm EVA layer.
 */

export const GLASS_KG_PER_M2_PER_MM = 2.5;
export const EVA_KG_PER_M2_PER_LAYER = 0.36;
/** Thickness of one EVA film layer, mm. */
export const EVA_LAYER_MM = 0.38;
export const FILM_THICKNESSES = [0.38, 0.76, 1.14, 1.52] as const;
export type FilmThickness = (typeof FILM_THICKNESSES)[number];

const MM_PER_M = 1000;
/** Batch weight from this value is shown without decimals. */
const BATCH_INTEGER_FROM_KG = 1000;

/** Carry hints by the weight of ONE glass (upper bound inclusive). */
const CARRY_HINTS: ReadonlyArray<{ upToKg: number; text: string }> = [
  { upToKg: 20, text: "можно нести одному, в перчатках с покрытием" },
  { upToKg: 40, text: "один или вдвоём, с ручными присосками" },
  { upToKg: 80, text: "только вдвоём, по одной-две присоски на человека" },
];
const CARRY_HINT_HEAVY = "бригада 3–5 человек или вакуумный подъёмник";

/** EVA weight per m²: 0.38 → 0.36, 0.76 → 0.72, 1.14 → 1.08, 1.52 → 1.44. */
export function filmWeightPerM2(filmMm: number): number {
  return EVA_KG_PER_M2_PER_LAYER * Math.round(filmMm / EVA_LAYER_MM);
}

export function weightPerM2Single(t: number): number {
  return GLASS_KG_PER_M2_PER_MM * t;
}

/** 8 + 8 mm with 0.76 mm film → 40.72 kg/m². */
export function weightPerM2Triplex(t1: number, t2: number, filmMm: number): number {
  return GLASS_KG_PER_M2_PER_MM * (t1 + t2) + filmWeightPerM2(filmMm);
}

export interface WeightInput {
  mode: "single" | "triplex";
  t?: number;
  t1?: number;
  t2?: number;
  /** EVA film thickness for triplex, mm. */
  film?: number;
  widthMm: number;
  heightMm: number;
  qty: number;
}

export interface WeightResult {
  areaM2: number;
  perM2: number;
  perGlass: number;
  batch: number;
  carryHint: string;
}

const isPositive = (n: number | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0;

function perM2Of(input: WeightInput): number | null {
  if (input.mode === "single") {
    return isPositive(input.t) ? weightPerM2Single(input.t) : null;
  }
  const { t1, t2, film } = input;
  if (!isPositive(t1) || !isPositive(t2)) return null;
  if (typeof film !== "number" || !Number.isFinite(film) || film < 0) return null;
  return weightPerM2Triplex(t1, t2, film);
}

/**
 * Weight of one glass and of the batch. `null` for missing/invalid thickness, film or sizes.
 * Quantity is rounded and at least 1.
 */
export function calcWeight(input: WeightInput): WeightResult | null {
  if (!isPositive(input.widthMm) || !isPositive(input.heightMm)) return null;
  const perM2 = perM2Of(input);
  if (perM2 === null) return null;
  const qty = Number.isFinite(input.qty) ? Math.max(1, Math.round(input.qty)) : 1;
  const areaM2 = (input.widthMm / MM_PER_M) * (input.heightMm / MM_PER_M);
  const perGlass = perM2 * areaM2;
  return { areaM2, perM2, perGlass, batch: perGlass * qty, carryHint: carryHint(perGlass) };
}

/** Lower-case carry hint by the weight of one glass; the UI capitalizes when needed. */
export function carryHint(perGlassKg: number): string {
  return CARRY_HINTS.find((hint) => perGlassKg <= hint.upToKg)?.text ?? CARRY_HINT_HEAVY;
}

/** perM2 — 2 decimals, perGlass — 1, batch — 0 from 1000 kg, else 1; trailing zeros trimmed. */
export function formatWeightKg(value: number, kind: "perM2" | "perGlass" | "batch"): string {
  const decimals =
    kind === "perM2" ? 2 : kind === "perGlass" ? 1 : value >= BATCH_INTEGER_FROM_KG ? 0 : 1;
  return formatNumber(value, { decimals });
}

/** «Сколько весит 1 м² стекла» table for 4–19 mm. */
export const WEIGHT_TABLE: ReadonlyArray<{ thickness: number; kgPerM2: number }> = THICKNESSES.map(
  (thickness) => ({ thickness, kgPerM2: weightPerM2Single(thickness) })
);
