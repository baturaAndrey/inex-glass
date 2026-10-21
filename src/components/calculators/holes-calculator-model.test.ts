import { describe, expect, it } from "vitest";
import { HOLE_DIAMETER_HINT } from "@/lib/domain/holes";
import {
  DIAMETER_BELOW_THICKNESS_MESSAGE,
  buildHolesView,
  parseSingleDiameter,
} from "./holes-calculator-model";

describe("buildHolesView — distances (ГОСТ 30698-2014: 2t / 2t / 6t, Ø ≥ t)", () => {
  it.each([
    [10, 20, 20, 60],
    [4, 8, 8, 24],
    [19, 38, 38, 114],
    [8, 16, 16, 48],
  ])("t = %i → %i / %i / %i", (t, edge, between, corner) => {
    const view = buildHolesView(t);
    expect(view).toMatchObject({ thickness: t, edge, between, corner, minDiameter: t });
    expect(view.text).toEqual({
      thickness: String(t),
      edge: String(edge),
      between: String(between),
      corner: String(corner),
      minDiameter: String(t),
    });
    expect(view.diameter).toBeUndefined();
  });
});

describe("buildHolesView — diameter", () => {
  it.each([
    ["12", "Допуск диаметра: ±1,0 мм", "±1,0 мм"],
    ["20", "Допуск диаметра: ±1,0 мм", "±1,0 мм"],
    ["25", "Допуск диаметра: ±2,0 мм", "±2,0 мм"],
    ["100", "Допуск диаметра: ±2,0 мм", "±2,0 мм"],
    ["120", "Допуск диаметра: по согласованию", "по согласованию"],
    ["130", "Допуск диаметра: по согласованию", "по согласованию"],
  ])("Ø %s at t = 10 → «%s»", (input, message, toleranceText) => {
    expect(buildHolesView(10, input).diameter).toEqual({
      value: Number(input),
      status: "ok",
      toleranceText,
      message,
      tone: "ok",
    });
  });

  it.each(["3", "131", "150"])("Ø %s → the out-of-range hint", (input) => {
    expect(buildHolesView(10, input).diameter).toMatchObject({
      status: "out_of_range",
      message: HOLE_DIAMETER_HINT,
      toleranceText: null,
      tone: "warn",
    });
  });

  it("Ø 8 at t = 10 → only by agreement", () => {
    expect(buildHolesView(10, "8").diameter).toMatchObject({
      status: "by_agreement",
      message: DIAMETER_BELOW_THICKNESS_MESSAGE,
      tone: "warn",
    });
    // The same diameter is fine for thinner glass.
    expect(buildHolesView(8, "8").diameter?.status).toBe("ok");
  });

  it("accepts a decimal comma «12,5»", () => {
    expect(buildHolesView(10, "12,5").diameter).toMatchObject({
      value: 12.5,
      message: "Допуск диаметра: ±1,0 мм",
    });
  });

  it.each(["", "   ", "abc", "-5", "0", "10 12"])("«%s» → no diameter message", (input) => {
    expect(buildHolesView(10, input).diameter).toBeUndefined();
  });

  it("parseSingleDiameter strips Ø and мм", () => {
    expect(parseSingleDiameter("Ø 12 мм")).toBe(12);
    expect(parseSingleDiameter(undefined)).toBeNull();
  });
});
