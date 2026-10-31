/**
 * Points of the «Пульс» sparkline for an inline SVG (`<polyline>` + filled `<polygon>`), no
 * chart library. Values are scaled from 0 (or the minimum, if negative) to the maximum, so a
 * series of counts keeps its zero baseline; a flat series or a single point is drawn as a
 * horizontal line through the middle.
 */

export interface SparklineBox {
  width: number;
  height: number;
  /** Vertical padding that keeps the 2 px stroke inside the view box. */
  pad: number;
}

export const SPARKLINE_BOX: SparklineBox = { width: 130, height: 34, pad: 4 };

export interface SparklinePoints {
  /** `points` of the `<polyline>`. */
  line: string;
  /** `points` of the `<polygon>`: the line closed down to the bottom edge. */
  area: string;
}

/** Two decimals at most, no trailing zeros («12.5», «34»). */
const coord = (value: number) => String(Math.round(value * 100) / 100);

export function sparklinePoints(
  values: readonly number[],
  box: SparklineBox = SPARKLINE_BOX
): SparklinePoints {
  const { width, height, pad } = box;
  const finite = values.map((value) => (Number.isFinite(value) ? value : 0));
  const middle = height / 2;

  let xy: [number, number][];
  if (finite.length < 2) {
    xy = [
      [0, middle],
      [width, middle],
    ];
  } else {
    const hi = Math.max(...finite);
    const flat = Math.min(...finite) === hi;
    const lo = Math.min(0, ...finite);
    const span = flat ? 0 : hi - lo;
    const step = width / (finite.length - 1);
    xy = finite.map((value, index) => [
      index * step,
      span === 0 ? middle : pad + (1 - (value - lo) / span) * (height - 2 * pad),
    ]);
  }

  const line = xy.map(([x, y]) => `${coord(x)},${coord(y)}`).join(" ");
  const lastX = coord(xy[xy.length - 1]?.[0] ?? width);
  const firstX = coord(xy[0]?.[0] ?? 0);
  return { line, area: `${line} ${lastX},${coord(height)} ${firstX},${coord(height)}` };
}
