import { SPARKLINE_BOX, sparklinePoints } from "@/lib/admin-dashboard/sparkline";

/**
 * «Пульс» sparkline: a plain inline SVG (no chart library). The colour comes from the class
 * (`--primary` / `--danger`, `_dashboard.scss`), the shape is decorative (`aria-hidden`): the
 * value and the delta are given as text next to it.
 */
export function Sparkline({
  values,
  tone,
}: {
  values: readonly number[];
  tone: "primary" | "danger";
}) {
  const { line, area } = sparklinePoints(values);
  return (
    <svg
      className={`iga-spark iga-spark--${tone}`}
      viewBox={`0 0 ${SPARKLINE_BOX.width} ${SPARKLINE_BOX.height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polygon className="iga-spark__area" points={area} />
      <polyline className="iga-spark__line" points={line} />
    </svg>
  );
}
