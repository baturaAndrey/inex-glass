import { parseNumber } from "./format";
import { DEFAULT_TECH_LIMITS } from "./limits";

/**
 * Hole rules for tempered glass (ГОСТ 30698-2014, SSoT §11, ТЗ 7.2). `t` is the glass
 * thickness, all values in mm.
 */

const HOLES = DEFAULT_TECH_LIMITS.holes;

const EDGE_FACTOR = 2;
const BETWEEN_FACTOR = 2;
const CORNER_FACTOR = 6;
const MIN_DIAMETER_FACTOR = 1;

/** Diameter tolerance ranges: `d ≤ upTo` → ± tolerance. Above the last range — by agreement. */
const TOLERANCE_RANGES: ReadonlyArray<{ upTo: number; tolerance: number }> = [
  { upTo: 20, tolerance: 1 },
  { upTo: 100, tolerance: 2 },
];

/** Shown when ANY diameter is outside 4–130 mm. */
export const HOLE_DIAMETER_HINT = "До 220 мм — при сверлении с одной стороны. Уточним по чертежу";

/** Distances from a hole: to the edge, between holes, to a corner; and the minimum diameter. */
export function holeRules(t: number): {
  edge: number;
  between: number;
  corner: number;
  minDiameter: number;
} {
  return {
    edge: EDGE_FACTOR * t,
    between: BETWEEN_FACTOR * t,
    corner: CORNER_FACTOR * t,
    minDiameter: MIN_DIAMETER_FACTOR * t,
  };
}

/** Hole placement hint for the quiz and the holes calculator. */
export function holeHint(t?: number | null): string {
  if (t == null || !Number.isFinite(t) || t <= 0) {
    return "Отверстие — не ближе двух толщин стекла к кромке и шести — к углу (ГОСТ 30698-2014)";
  }
  const { edge, corner } = holeRules(t);
  return `Для стекла ${t} мм отверстие — не ближе ${edge} мм к кромке и ${corner} мм к углу (ГОСТ 30698-2014)`;
}

/** Diameter tolerance, ± mm; `null` below 4 mm and above 100 mm («по согласованию»). */
export function holeToleranceMm(d: number): number | null {
  if (!Number.isFinite(d) || d < HOLES.dMin) return null;
  return TOLERANCE_RANGES.find((range) => d <= range.upTo)?.tolerance ?? null;
}

export type HoleDiameterStatus = "ok" | "by_agreement" | "out_of_range";

/**
 * - `< 4` or `> 130` (`> 220` when drilled from one side) → `out_of_range`;
 * - smaller than the glass thickness → `by_agreement`;
 * - otherwise `ok`.
 */
export function holeDiameterStatus(
  d: number,
  t?: number | null,
  opts: { oneSide?: boolean } = {}
): HoleDiameterStatus {
  if (!Number.isFinite(d) || d < HOLES.dMin) return "out_of_range";
  const max = opts.oneSide ? HOLES.dMaxOneSide : HOLES.dMax;
  if (d > max) return "out_of_range";
  if (t != null && Number.isFinite(t) && d < t * MIN_DIAMETER_FACTOR) return "by_agreement";
  return "ok";
}

/** Whether a diameter needs `HOLE_DIAMETER_HINT` (outside the two-side drilling range). */
export function isDiameterOutsideStandard(d: number): boolean {
  return !(d >= HOLES.dMin && d <= HOLES.dMax);
}

/** Holes are drilled in glass from 4 mm. */
export function holesAllowed(t: number): boolean {
  return Number.isFinite(t) && t >= HOLES.dMin;
}

/** Glass with holes: from 250 × 100 to 3000 × 1600 mm, in either orientation. */
export function glassWithHolesSizeOk(w: number, h: number): boolean {
  if (!Number.isFinite(w) || !Number.isFinite(h)) return false;
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  return (
    long >= HOLES.glassLongMin &&
    long <= HOLES.glassLongMax &&
    short >= HOLES.glassShortMin &&
    short <= HOLES.glassShortMax
  );
}

/**
 * Parses a free-text list of diameters. Separators: «;», whitespace, «/», and a comma ONLY when
 * followed by whitespace («10, 12»); «12,5» is a decimal comma. «Ø», «ø», «⌀» and «мм» are
 * dropped. Non-positive and unparsable items are skipped.
 * «10, 12,5; 20» → [10, 12.5, 20].
 */
export function parseDiameters(input: string): number[] {
  return input
    .replace(/[Øø⌀]/g, " ")
    .replace(/мм\.?/giu, " ")
    .replace(/,(?=\s)/g, " ")
    .split(/[\s;/]+/)
    .map((part) => parseNumber(part))
    .filter((d): d is number => d !== null && d > 0);
}
