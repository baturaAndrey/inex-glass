import { describe, expect, it } from "vitest";
import { SPARKLINE_BOX, sparklinePoints } from "./sparkline";

const parse = (points: string) =>
  points.split(" ").map((pair) => pair.split(",").map(Number) as [number, number]);

describe("sparklinePoints", () => {
  it("keeps every point inside the view box", () => {
    const { line, area } = sparklinePoints([3, 0, 7, 2, 9, 4]);
    const points = parse(line);
    expect(points).toHaveLength(6);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(SPARKLINE_BOX.width);
      expect(y).toBeGreaterThanOrEqual(SPARKLINE_BOX.pad);
      expect(y).toBeLessThanOrEqual(SPARKLINE_BOX.height - SPARKLINE_BOX.pad);
    }
    expect(points[0]?.[0]).toBe(0);
    expect(points[5]?.[0]).toBe(130);
    // The maximum is at the top, zero at the bottom.
    expect(points[4]?.[1]).toBe(4);
    expect(points[1]?.[1]).toBe(30);
    // The polygon closes the line down to the bottom edge.
    expect(area).toBe(`${line} 130,34 0,34`);
  });

  it("draws a constant series as a horizontal line through the middle", () => {
    const points = parse(sparklinePoints([5, 5, 5]).line);
    expect(points.map(([, y]) => y)).toEqual([17, 17, 17]);
    expect(parse(sparklinePoints([0, 0]).line).map(([, y]) => y)).toEqual([17, 17]);
  });

  it("draws a single point (or none) as a horizontal line", () => {
    expect(sparklinePoints([4]).line).toBe("0,17 130,17");
    expect(sparklinePoints([]).line).toBe("0,17 130,17");
  });

  it("ignores non-finite values", () => {
    const points = parse(sparklinePoints([Number.NaN, 2]).line);
    expect(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
  });
});
