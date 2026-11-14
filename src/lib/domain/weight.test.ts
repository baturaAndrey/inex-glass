import { describe, expect, it } from "vitest";
import { parseNumber } from "./format";
import {
  calcWeight,
  carryHint,
  filmWeightPerM2,
  formatWeightKg,
  WEIGHT_TABLE,
  weightPerM2Single,
  weightPerM2Triplex,
} from "./weight";

describe("weight per m²", () => {
  it("is 2.5 kg per mm for single glass", () => {
    expect(weightPerM2Single(10)).toBe(25);
  });

  it("adds 0.36 kg per 0.38 mm EVA layer", () => {
    expect(filmWeightPerM2(0.38)).toBeCloseTo(0.36);
    expect(filmWeightPerM2(0.76)).toBeCloseTo(0.72);
    expect(filmWeightPerM2(1.14)).toBeCloseTo(1.08);
    expect(filmWeightPerM2(1.52)).toBeCloseTo(1.44);
  });

  it("computes triplex 8+8 with 0.76 film ≈ 40.72", () => {
    expect(weightPerM2Triplex(8, 8, 0.76)).toBeCloseTo(40.72);
    expect(formatWeightKg(weightPerM2Triplex(8, 8, 0.76), "perM2")).toBe("40,72");
  });
});

describe("calcWeight", () => {
  it("10 mm, 1000 × 2000, 3 pcs → 25 / 50 / 150", () => {
    const result = calcWeight({ mode: "single", t: 10, widthMm: 1000, heightMm: 2000, qty: 3 });
    expect(result).not.toBeNull();
    expect(result?.areaM2).toBeCloseTo(2);
    expect(result?.perM2).toBe(25);
    expect(result?.perGlass).toBeCloseTo(50);
    expect(result?.batch).toBeCloseTo(150);
    expect(result?.carryHint).toBe("только вдвоём, по одной-две присоски на человека");
  });

  it("computes triplex", () => {
    const result = calcWeight({
      mode: "triplex",
      t1: 8,
      t2: 8,
      film: 0.76,
      widthMm: 1000,
      heightMm: 1000,
      qty: 1,
    });
    expect(result?.perGlass).toBeCloseTo(40.72);
  });

  it("returns null for zero or invalid sizes and thicknesses", () => {
    expect(calcWeight({ mode: "single", t: 10, widthMm: 0, heightMm: 2000, qty: 1 })).toBeNull();
    expect(calcWeight({ mode: "single", widthMm: 1000, heightMm: 2000, qty: 1 })).toBeNull();
    expect(
      calcWeight({ mode: "triplex", t1: 8, widthMm: 1000, heightMm: 1000, qty: 1 })
    ).toBeNull();
    expect(
      calcWeight({ mode: "single", t: 10, widthMm: Number.NaN, heightMm: 1000, qty: 1 })
    ).toBeNull();
  });

  it("rounds the quantity and keeps at least one glass", () => {
    const base = { mode: "single", t: 10, widthMm: 1000, heightMm: 1000 } as const;
    expect(calcWeight({ ...base, qty: 2.6 })?.batch).toBeCloseTo(75);
    expect(calcWeight({ ...base, qty: 0 })?.batch).toBeCloseTo(25);
    expect(calcWeight({ ...base, qty: -4 })?.batch).toBeCloseTo(25);
  });

  it("accepts sizes typed with a comma via parseNumber", () => {
    const width = parseNumber("1000,5");
    expect(width).toBe(1000.5);
    const result = calcWeight({
      mode: "single",
      t: 4,
      widthMm: width ?? 0,
      heightMm: 1000,
      qty: 1,
    });
    expect(result?.perGlass).toBeCloseTo(10.005);
  });
});

describe("carryHint", () => {
  it.each([
    [20, "можно нести одному, в перчатках с покрытием"],
    [20.01, "один или вдвоём, с ручными присосками"],
    [40, "один или вдвоём, с ручными присосками"],
    [80, "только вдвоём, по одной-две присоски на человека"],
    [80.01, "бригада 3–5 человек или вакуумный подъёмник"],
  ])("%s kg → %s", (kg, text) => {
    expect(carryHint(kg)).toBe(text);
  });
});

describe("formatWeightKg", () => {
  it("rounds by kind and trims zeros", () => {
    expect(formatWeightKg(12.5, "perGlass")).toBe("12,5");
    expect(formatWeightKg(25, "perM2")).toBe("25");
    expect(formatWeightKg(12.345, "perGlass")).toBe("12,3");
    expect(formatWeightKg(1234.4, "batch")).toBe("1 234");
    expect(formatWeightKg(999.94, "batch")).toBe("999,9");
  });
});

describe("WEIGHT_TABLE", () => {
  it("matches teksty/10-blog-kalkulyator.md", () => {
    expect(WEIGHT_TABLE).toEqual([
      { thickness: 4, kgPerM2: 10 },
      { thickness: 5, kgPerM2: 12.5 },
      { thickness: 6, kgPerM2: 15 },
      { thickness: 8, kgPerM2: 20 },
      { thickness: 10, kgPerM2: 25 },
      { thickness: 12, kgPerM2: 30 },
      { thickness: 15, kgPerM2: 37.5 },
      { thickness: 19, kgPerM2: 47.5 },
    ]);
  });
});
