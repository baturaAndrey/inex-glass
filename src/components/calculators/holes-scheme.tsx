import type { HolesView } from "./holes-calculator-model";

/**
 * Scheme of the holes calculator (`Holes.dc.html`, `.p5-scheme`): glass 560 × 320 with three
 * holes and the minimum distances 2t / 2t / 6t. Geometry is copied 1:1 from the prototype; only
 * the labels change with the thickness. Colours are design tokens: outlines `--ig-text-2`,
 * dimensions `--ig-primary-pressed` (600 / 15 px), glass `--ig-primary-light`.
 *
 * A plain component without hooks: rendered by the client calculator, it SSRs with the default
 * thickness and re-renders on change.
 */

export const HOLES_SCHEME_LABEL =
  "Схема: стекло с тремя отверстиями и минимальными расстояниями по ГОСТ 30698-2014";

const LINE = "var(--ig-text-2)";
const GLASS = "var(--ig-primary-light)";
const HOLE = "var(--ig-surface)";

/** Dimension label (`.p5-dim`). */
const DIM_CLASS = "fill-primary-pressed text-[15px] font-semibold";
/** Small grey caption inside the glass / holes. */
const CAPTION_CLASS = "fill-text-2 text-[13px] font-medium";

export interface HolesSchemeProps {
  view: Pick<HolesView, "text">;
  className?: string | undefined;
}

export function HolesScheme({ view, className }: HolesSchemeProps) {
  const { thickness, edge, between, corner } = view.text;
  return (
    <svg
      viewBox="0 0 640 400"
      role="img"
      aria-label={HOLES_SCHEME_LABEL}
      className={className ?? "block h-auto w-full"}
      data-testid="holes-scheme"
    >
      <rect
        x="40"
        y="40"
        width="560"
        height="320"
        rx="4"
        fill={GLASS}
        stroke={LINE}
        strokeWidth="2"
      />
      <circle cx="150" cy="230" r="34" fill={HOLE} stroke={LINE} strokeWidth="2" />
      <circle cx="286" cy="230" r="34" fill={HOLE} stroke={LINE} strokeWidth="2" />
      <circle cx="500" cy="140" r="30" fill={HOLE} stroke={LINE} strokeWidth="2" />

      {/* Glass edge → first hole: 2t */}
      <line x1="40" y1="300" x2="40" y2="330" stroke={LINE} strokeWidth="1" />
      <line
        x1="116"
        y1="238"
        x2="116"
        y2="330"
        stroke={LINE}
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line x1="40" y1="320" x2="116" y2="320" stroke={LINE} strokeWidth="1.5" />
      <path d="M40 320l8 -4v8z M116 320l-8 -4v8z" fill={LINE} />
      <text className={DIM_CLASS} x="78" y="310" textAnchor="middle">
        2t
      </text>
      <text className={DIM_CLASS} x="78" y="350" textAnchor="middle">
        {edge} мм
      </text>

      {/* Between the holes: 2t */}
      <line
        x1="184"
        y1="238"
        x2="184"
        y2="330"
        stroke={LINE}
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line
        x1="252"
        y1="238"
        x2="252"
        y2="330"
        stroke={LINE}
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <line x1="184" y1="320" x2="252" y2="320" stroke={LINE} strokeWidth="1.5" />
      <path d="M184 320l8 -4v8z M252 320l-8 -4v8z" fill={LINE} />
      <text className={DIM_CLASS} x="218" y="310" textAnchor="middle">
        2t
      </text>
      <text className={DIM_CLASS} x="218" y="350" textAnchor="middle">
        {between} мм
      </text>

      {/* Corner → third hole: 6t */}
      <line x1="600" y1="40" x2="521" y2="119" stroke={LINE} strokeWidth="1.5" />
      <path d="M600 40l-3 9 -6 -6z M521 119l3 -9 6 6z" fill={LINE} />
      <text className={DIM_CLASS} x="574" y="104">
        6t
      </text>
      <text className={DIM_CLASS} x="574" y="124">
        {corner} мм
      </text>

      <text className={CAPTION_CLASS} x="150" y="235" textAnchor="middle">
        Ø ≥ {thickness}
      </text>
      <text className={CAPTION_CLASS} x="286" y="235" textAnchor="middle">
        Ø ≥ {thickness}
      </text>
      <text className={CAPTION_CLASS} x="56" y="66">
        Стекло {thickness} мм
      </text>
    </svg>
  );
}
