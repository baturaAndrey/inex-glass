/**
 * Technological limits (SSoT 4.5, ТЗ 4.5), mm. «long/short» are the larger/smaller side of the
 * glass regardless of the W × H order the user typed.
 *
 * The CMS global `tech-params` is the source of truth; the adapter global → `TechLimits` lives
 * in task 15. Domain functions fall back to `DEFAULT_TECH_LIMITS` when no limits are passed.
 */
export interface TechLimits {
  flat: { longMin: number; shortMin: number; longMax: number; shortMax: number };
  painted: {
    thickMin: number;
    thickMax: number;
    longMin: number;
    shortMin: number;
    longMax: number;
    shortMax: number;
  };
  bent: {
    thickMin: number;
    thickMax: number;
    longMax: number;
    shortMax: number;
    /** Minimum bend radius by thickness range (inclusive). */
    radiusMin: ReadonlyArray<{ thickFrom: number; thickTo: number; mm: number }>;
  };
  holes: {
    dMin: number;
    dMax: number;
    /** Max diameter when drilled from one side. */
    dMaxOneSide: number;
    glassLongMin: number;
    glassShortMin: number;
    glassLongMax: number;
    glassShortMax: number;
  };
  /** Max printable area. */
  print: { long: number; short: number };
  /** Minimum order, m². */
  minAreaM2: number;
}

export const DEFAULT_TECH_LIMITS: TechLimits = {
  flat: { longMin: 300, shortMin: 150, longMax: 3000, shortMax: 2000 },
  painted: {
    thickMin: 4,
    thickMax: 15,
    longMin: 350,
    shortMin: 150,
    longMax: 3000,
    shortMax: 1600,
  },
  bent: {
    thickMin: 4,
    thickMax: 12,
    longMax: 2000,
    shortMax: 1200,
    radiusMin: [
      { thickFrom: 4, thickTo: 6, mm: 1000 },
      { thickFrom: 8, thickTo: 12, mm: 1500 },
    ],
  },
  holes: {
    dMin: 4,
    dMax: 130,
    dMaxOneSide: 220,
    glassLongMin: 250,
    glassShortMin: 100,
    glassLongMax: 3000,
    glassShortMax: 1600,
  },
  print: { long: 1100, short: 700 },
  minAreaM2: 50,
};

/** Minimum bend radius for a thickness, or `null` when no range covers it. */
export function minBendRadius(
  thickness: number,
  limits: TechLimits = DEFAULT_TECH_LIMITS
): number | null {
  const range = limits.bent.radiusMin.find(
    (r) => thickness >= r.thickFrom && thickness <= r.thickTo
  );
  return range ? range.mm : null;
}
