import type { CSSProperties } from "react";

/**
 * CSS «photos» of the ribbed-glass patterns until real sample photos exist: a port of the
 * `.vd-sw--moru | fluts | shin | delta | kriz` classes of `Riflenoe.dc.html`. Keys are the
 * `patternKey` values stored in `glass-types.variants[]` (editors type them in the admin).
 *
 * Inline styles (not Tailwind classes) because the keys come from the CMS at runtime and the
 * gradients are too long for readable arbitrary-value utilities.
 */

/** Base tint of every swatch (`.vd-sw`). */
export const SWATCH_BASE_COLOR = "#DCE7E4";

export const SWATCH_PATTERN_KEYS = ["moru", "fluts", "shinshilla", "delta", "krizet"] as const;

export type SwatchPatternKey = (typeof SWATCH_PATTERN_KEYS)[number];

const PATTERNS: Readonly<Record<SwatchPatternKey, CSSProperties>> = {
  // Even parallel ribs.
  moru: {
    backgroundImage:
      "repeating-linear-gradient(90deg,#C3D4D0 0 6px,#EEF3F1 6px 10px,#B4C8C3 10px 14px)",
  },
  // Wider linear ribs.
  fluts: {
    backgroundImage:
      "repeating-linear-gradient(90deg,#B9CCC7 0 3px,#E9F0EE 3px 13px,#CAD9D5 13px 16px)",
  },
  // Soft fine relief («мех или рябь»): three dot layers of different pitch.
  shinshilla: {
    backgroundImage: [
      "radial-gradient(circle at 20% 30%,rgba(255,255,255,.7) 0 2px,transparent 3px)",
      "radial-gradient(circle at 70% 60%,rgba(160,185,179,.6) 0 2px,transparent 3px)",
      "radial-gradient(circle at 45% 80%,rgba(255,255,255,.6) 0 1.5px,transparent 2.5px)",
    ].join(","),
    backgroundSize: "9px 9px,11px 11px,7px 7px",
  },
  // Chaotic «bark / frost» lines.
  delta: {
    backgroundImage: [
      "repeating-linear-gradient(35deg,rgba(176,199,193,.8) 0 2px,transparent 2px 11px)",
      "repeating-linear-gradient(-55deg,rgba(255,255,255,.7) 0 3px,transparent 3px 17px)",
      "repeating-linear-gradient(80deg,rgba(150,176,170,.5) 0 1px,transparent 1px 23px)",
    ].join(","),
  },
  // Fine relief grid («плотная ткань»).
  krizet: {
    backgroundImage: [
      "repeating-linear-gradient(0deg,rgba(166,190,184,.75) 0 2px,transparent 2px 6px)",
      "repeating-linear-gradient(90deg,rgba(166,190,184,.75) 0 2px,transparent 2px 6px)",
    ].join(","),
  },
};

/**
 * Prototype class suffixes (`shin`, `kriz`) and Latin spellings an editor may type are accepted
 * as aliases of the canonical keys.
 */
const ALIASES: Readonly<Record<string, SwatchPatternKey>> = {
  shin: "shinshilla",
  chinchilla: "shinshilla",
  kriz: "krizet",
  fluted: "fluts",
};

/** Canonical pattern key for a CMS value (case-insensitive, aliases resolved), or `null`. */
export function toSwatchPatternKey(value: string | null | undefined): SwatchPatternKey | null {
  const key = value?.trim().toLowerCase();
  if (!key) return null;
  if ((SWATCH_PATTERN_KEYS as readonly string[]).includes(key)) return key as SwatchPatternKey;
  return ALIASES[key] ?? null;
}

/** Inline style of a pattern swatch (base tint + gradients). */
export function swatchPatternStyle(key: SwatchPatternKey): CSSProperties {
  return { backgroundColor: SWATCH_BASE_COLOR, ...PATTERNS[key] };
}

/** `#RGB` / `#RRGGBB` only: the value goes into an inline style. */
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A safe CSS colour from the CMS `swatchColor` field, or `null`. */
export function toSwatchColor(value: string | null | undefined): string | null {
  const color = value?.trim();
  return color && HEX_COLOR.test(color) ? color : null;
}
