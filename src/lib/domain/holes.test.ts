import { describe, expect, it } from "vitest";
import {
  glassWithHolesSizeOk,
  HOLE_DIAMETER_HINT,
  holeDiameterStatus,
  holeHint,
  holeRules,
  holesAllowed,
  holeToleranceMm,
  parseDiameters,
} from "./holes";

describe("holeRules", () => {
  it("applies 2t / 2t / 6t / t", () => {
    expect(holeRules(10)).toEqual({ edge: 20, between: 20, corner: 60, minDiameter: 10 });
    expect(holeRules(4)).toEqual({ edge: 8, between: 8, corner: 24, minDiameter: 4 });
  });
});

describe("holeHint", () => {
  it("names the distances for a thickness", () => {
    expect(holeHint(10)).toBe(
      "Для стекла 10 мм отверстие — не ближе 20 мм к кромке и 60 мм к углу (ГОСТ 30698-2014)"
    );
  });

  it("falls back to the general rule", () => {
    const general =
      "Отверстие — не ближе двух толщин стекла к кромке и шести — к углу (ГОСТ 30698-2014)";
    expect(holeHint()).toBe(general);
    expect(holeHint(null)).toBe(general);
  });

  it("exports the diameter hint verbatim", () => {
    expect(HOLE_DIAMETER_HINT).toBe(
      "До 220 мм — при сверлении с одной стороны. Уточним по чертежу"
    );
  });
});

describe("holeToleranceMm", () => {
  it.each([
    [4, 1],
    [20, 1],
    [20.1, 2],
    [100, 2],
    [101, null],
    [3, null],
  ])("Ø %s → %s", (d, expected) => {
    expect(holeToleranceMm(d)).toBe(expected);
  });
});

describe("holeDiameterStatus", () => {
  it("rejects diameters outside 4–130", () => {
    expect(holeDiameterStatus(3)).toBe("out_of_range");
    expect(holeDiameterStatus(131)).toBe("out_of_range");
    expect(holeDiameterStatus(130)).toBe("ok");
  });

  it("allows up to 220 when drilled from one side", () => {
    expect(holeDiameterStatus(150, null, { oneSide: true })).toBe("ok");
    expect(holeDiameterStatus(220, 10, { oneSide: true })).toBe("ok");
    expect(holeDiameterStatus(221, null, { oneSide: true })).toBe("out_of_range");
  });

  it("needs agreement when the diameter is below the thickness", () => {
    expect(holeDiameterStatus(8, 10)).toBe("by_agreement");
    expect(holeDiameterStatus(10, 10)).toBe("ok");
  });
});

describe("holesAllowed / glassWithHolesSizeOk", () => {
  it("allows holes from 4 mm", () => {
    expect(holesAllowed(4)).toBe(true);
    expect(holesAllowed(3)).toBe(false);
  });

  it("checks 250 × 100 — 3000 × 1600 in either orientation", () => {
    expect(glassWithHolesSizeOk(3000, 1600)).toBe(true);
    expect(glassWithHolesSizeOk(3001, 1600)).toBe(false);
    expect(glassWithHolesSizeOk(100, 250)).toBe(true);
    expect(glassWithHolesSizeOk(90, 300)).toBe(false);
    expect(glassWithHolesSizeOk(1700, 1700)).toBe(false);
  });
});

describe("parseDiameters", () => {
  it("separates by «, », «;», whitespace and «/», keeping decimal commas", () => {
    expect(parseDiameters("10, 12,5; 20")).toEqual([10, 12.5, 20]);
    expect(parseDiameters("8/10/12")).toEqual([8, 10, 12]);
  });

  it("drops Ø and мм", () => {
    expect(parseDiameters("Ø8 мм 12")).toEqual([8, 12]);
    expect(parseDiameters("ø14мм; ⌀20 мм.")).toEqual([14, 20]);
  });

  it("skips garbage and empty input", () => {
    expect(parseDiameters("")).toEqual([]);
    expect(parseDiameters("abc 10 0")).toEqual([10]);
  });
});
