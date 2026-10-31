import { describe, expect, it } from "vitest";
import { normalizeRu } from "./normalize";

describe("normalizeRu", () => {
  it("lower-cases and folds ё/Ё into е", () => {
    expect(normalizeRu("Закалённое СТЕКЛО")).toBe("закаленное стекло");
    expect(normalizeRu("ЁЛКА ёлка")).toBe("елка елка");
  });

  it("makes «закалённое» and «закаленное» identical", () => {
    expect(normalizeRu("закалённое")).toBe(normalizeRu("ЗАКАЛЕННОЕ"));
  });

  it("collapses no-break, narrow and regular whitespace, tabs and line breaks", () => {
    expect(normalizeRu("  10 мм и\t12\n\nмм  ")).toBe("10 мм и 12 мм");
  });

  it("removes zero-width characters and soft hyphens inside words", () => {
    expect(normalizeRu("пере­городка​")).toBe("перегородка");
  });

  it("strips HTML tags and entities", () => {
    expect(normalizeRu("<p>Стекло&nbsp;<b>10</b>&#171;мм&raquo;</p>")).toBe("стекло 10 мм");
  });

  it("drops CMS placeholders", () => {
    expect(normalizeRu("от {цена} ₽/м², {N} мм")).toBe("от ₽/м², мм");
  });

  it("gives an empty string for non-strings", () => {
    expect(normalizeRu(undefined)).toBe("");
    expect(normalizeRu(null)).toBe("");
    expect(normalizeRu(42)).toBe("");
  });
});
