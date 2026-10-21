import { formatNumber } from "@/lib/domain/format";
import {
  HOLE_DIAMETER_HINT,
  holeDiameterStatus,
  holeRules,
  holeToleranceMm,
  parseDiameters,
  type HoleDiameterStatus,
} from "@/lib/domain/holes";
import type { Thickness } from "@/lib/domain/types";

/**
 * Pure view model of the holes calculator (ГОСТ 30698-2014, ТЗ §7.2): every number and message
 * the calculator and its SVG scheme show for a glass thickness and an optional diameter.
 * Imports the domain modules directly (not the `@/lib/domain` barrel) to keep the client
 * bundle of the calculator small.
 */

/**
 * Thickness selected before any interaction (SSR state). Lives here, not in the `'use client'`
 * calculator: a server component importing a constant from a client module gets a reference.
 */
export const DEFAULT_HOLES_THICKNESS: Thickness = 10;

/** Message when the diameter is smaller than the glass thickness. */
export const DIAMETER_BELOW_THICKNESS_MESSAGE =
  "Диаметр меньше толщины стекла — только по согласованию";

/** Tolerance text for diameters above 100 mm (table «Допуски диаметра», teksty/07 §2). */
export const TOLERANCE_BY_AGREEMENT = "по согласованию";

const TOLERANCE_PREFIX = "Допуск диаметра: ";

/** `ok` — the tolerance line; `warn` — the diameter needs agreement / is outside the range. */
export type HolesDiameterTone = "ok" | "warn";

export interface HolesDiameterView {
  /** Parsed diameter, mm. */
  value: number;
  status: HoleDiameterStatus;
  /** «±1,0 мм», «±2,0 мм», «по согласованию»; `null` when the status is not `ok`. */
  toleranceText: string | null;
  /** Line shown under the diameter field. */
  message: string;
  tone: HolesDiameterTone;
}

export interface HolesView {
  thickness: number;
  /** Minimum distances, mm: hole edge → glass edge (2t), between holes (2t), corner (6t). */
  edge: number;
  between: number;
  corner: number;
  /** Minimum diameter without agreement (= t), mm. */
  minDiameter: number;
  /** Formatted numbers for the tiles and the scheme («20», «114»). */
  text: { thickness: string; edge: string; between: string; corner: string; minDiameter: string };
  /** Absent for an empty or unparsable diameter input. */
  diameter?: HolesDiameterView;
}

/** «±1,0 мм» — the table writes tolerances with one decimal. */
function toleranceText(diameter: number): string {
  const tolerance = holeToleranceMm(diameter);
  return tolerance === null
    ? TOLERANCE_BY_AGREEMENT
    : `±${formatNumber(tolerance, { decimals: 1, trim: false })} мм`;
}

/**
 * The single diameter typed by the visitor: «12», «12,5», «Ø 12 мм». Anything that is not
 * exactly one positive number (empty, garbage, a list «10 12») gives `null` — no message.
 */
export function parseSingleDiameter(input: string | null | undefined): number | null {
  if (!input) return null;
  const values = parseDiameters(input);
  return values.length === 1 ? (values[0] ?? null) : null;
}

function diameterView(diameter: number, thickness: number): HolesDiameterView {
  const status = holeDiameterStatus(diameter, thickness);
  switch (status) {
    case "out_of_range":
      return {
        value: diameter,
        status,
        toleranceText: null,
        message: HOLE_DIAMETER_HINT,
        tone: "warn",
      };
    case "by_agreement":
      return {
        value: diameter,
        status,
        toleranceText: null,
        message: DIAMETER_BELOW_THICKNESS_MESSAGE,
        tone: "warn",
      };
    case "ok": {
      const text = toleranceText(diameter);
      return {
        value: diameter,
        status,
        toleranceText: text,
        message: `${TOLERANCE_PREFIX}${text}`,
        tone: "ok",
      };
    }
  }
}

/** Everything the calculator renders for thickness `t` and the diameter field text. */
export function buildHolesView(thickness: number, diameterText?: string | null): HolesView {
  const { edge, between, corner, minDiameter } = holeRules(thickness);
  const diameter = parseSingleDiameter(diameterText);
  return {
    thickness,
    edge,
    between,
    corner,
    minDiameter,
    text: {
      thickness: formatNumber(thickness),
      edge: formatNumber(edge),
      between: formatNumber(between),
      corner: formatNumber(corner),
      minDiameter: formatNumber(minDiameter),
    },
    ...(diameter === null ? {} : { diameter: diameterView(diameter, thickness) }),
  };
}
