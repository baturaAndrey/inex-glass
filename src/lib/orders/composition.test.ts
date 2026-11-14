import { describe, expect, it } from "vitest";
import { buildComposition } from "./composition";

const NBSP = " ";

describe("buildComposition", () => {
  it("builds the full phrase: type + thickness, area, positions", () => {
    expect(
      buildComposition({
        productType: "tempered",
        area: 86,
        answers: { type: "tempered", thickness: 10, positions: 42, kind: "clear" },
      })
    ).toBe(`Закалённое стекло 10${NBSP}мм, 86${NBSP}м², 42 позиции`);
  });

  it("uses Russian plural forms and number formatting", () => {
    expect(buildComposition({ answers: { positions: 1 } })).toBe("1 позиция");
    expect(buildComposition({ answers: { positions: 5 } })).toBe("5 позиций");
    expect(buildComposition({ area: 1250.5 })).toBe(`1${NBSP}250,5${NBSP}м²`);
  });

  it("works with the area only", () => {
    expect(buildComposition({ area: 12 })).toBe(`12${NBSP}м²`);
  });

  it("takes the type from the answers when the lead has none, thickness from strings", () => {
    expect(buildComposition({ answers: { type: "mirrors", thickness: "6" } })).toBe(
      `Зеркала 6${NBSP}мм`
    );
  });

  it("prints a triplex as «N+M мм»", () => {
    expect(
      buildComposition({
        productType: "triplex",
        area: 20,
        answers: { type: "triplex", thickness: 8, triplex: { glass1: 4, glass2: 4, film: 0.38 } },
      })
    ).toBe(`Триплекс 4+4${NBSP}мм, 20${NBSP}м²`);
  });

  it("skips «custom» thickness and the uninformative «Другое» type", () => {
    expect(buildComposition({ productType: "tempered", answers: { thickness: "custom" } })).toBe(
      "Закалённое стекло"
    );
    expect(buildComposition({ productType: "other", area: 5 })).toBe(`5${NBSP}м²`);
  });

  it("ignores garbage in the answers instead of failing", () => {
    expect(buildComposition({ answers: "free text" })).toBe("");
    expect(buildComposition({ answers: [1, 2, 3] })).toBe("");
    expect(
      buildComposition({
        productType: "tempered",
        answers: { thickness: 7.3, positions: "много", area: -4, type: "spaceship" },
      })
    ).toBe("Закалённое стекло");
  });

  it("drops zero and missing values, returns an empty string when nothing is known", () => {
    expect(buildComposition({ area: 0, answers: { positions: 0, thickness: 0 } })).toBe("");
    expect(buildComposition({})).toBe("");
    expect(buildComposition({ productType: null, area: null, answers: null })).toBe("");
  });
});
