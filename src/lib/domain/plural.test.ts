import { describe, expect, it } from "vitest";
import { pluralObjects, pluralRu } from "./plural";

describe("pluralObjects", () => {
  it.each([
    [1, "объект"],
    [2, "объекта"],
    [5, "объектов"],
    [11, "объектов"],
    [12, "объектов"],
    [14, "объектов"],
    [21, "объект"],
    [22, "объекта"],
    [25, "объектов"],
    [101, "объект"],
    [111, "объектов"],
    [1.5, "объекта"],
  ])("%s → %s", (n, word) => {
    expect(pluralObjects(n)).toBe(word);
  });
});

describe("pluralRu", () => {
  it("picks forms by CLDR rules", () => {
    const forms = ["год", "года", "лет"] as const;
    expect(pluralRu(21, forms)).toBe("год");
    expect(pluralRu(3, forms)).toBe("года");
    expect(pluralRu(0, forms)).toBe("лет");
  });
});
