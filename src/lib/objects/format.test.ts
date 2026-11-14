import { describe, expect, it } from "vitest";
import { cardChips, formatThickness, joinMeta, mediaPath, specRows } from "./format";

describe("formatThickness", () => {
  it("adds the unit once", () => {
    expect(formatThickness("10")).toBe("10 мм");
    expect(formatThickness(" 8+8 ")).toBe("8+8 мм");
    expect(formatThickness("12 мм")).toBe("12 мм");
    expect(formatThickness("")).toBe("");
    expect(formatThickness(null)).toBe("");
  });
});

describe("cardChips", () => {
  it("uses the editor chips first (max 3, no blanks / duplicates)", () => {
    expect(
      cardChips(
        [{ text: "a" }, { text: " " }, { text: "a" }, { text: "b" }, { text: "c" }, { text: "d" }],
        [{ kind: "x", thickness: "10" }]
      )
    ).toEqual(["a", "b", "c"]);
  });

  it("generates «<вид> <толщина> мм» and «триплекс <формула>» from the first two spec rows", () => {
    expect(
      cardChips(
        [],
        [
          { kind: "закалённое", thickness: "10" },
          { kind: "триплекс", thickness: "8+8", triplexFormula: "4.4.2" },
          { kind: "лишнее", thickness: "6" },
        ]
      )
    ).toEqual(["закалённое 10 мм", "триплекс 8+8 мм", "триплекс 4.4.2"]);
    expect(cardChips(null, null)).toEqual([]);
  });
});

describe("joinMeta / mediaPath / specRows", () => {
  it("joins non-empty parts with a middle dot", () => {
    expect(joinMeta(["Челябинск", null, "", 2024])).toBe("Челябинск · 2024");
    expect(joinMeta([null, undefined])).toBe("");
  });

  it("strips the origin of upload URLs", () => {
    expect(mediaPath("http://localhost:3000/api/media/file/a.jpg?2")).toBe(
      "/api/media/file/a.jpg?2"
    );
    expect(mediaPath("/api/media/file/a.jpg")).toBe("/api/media/file/a.jpg");
    expect(mediaPath(null)).toBeNull();
  });

  it("keeps rows with at least one value", () => {
    expect(specRows([{ product: " Перегородки " }, { kind: "" }])).toEqual([
      { product: "Перегородки", thickness: "", kind: "", triplexFormula: "", processing: "" },
    ]);
  });
});
