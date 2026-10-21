import { describe, expect, it } from "vitest";
import {
  listingSeo,
  OBJECT_DESCRIPTION_MAX,
  OBJECT_DESCRIPTION_MIN,
  OBJECT_TITLE_MAX,
  objectFallbackDescription,
  objectFallbackTitle,
  truncateByWord,
} from "./seo";

describe("objectFallbackTitle", () => {
  it("wraps a short name in quotes and adds the tail", () => {
    expect(objectFallbackTitle("Аэропорт Челябинск")).toBe(
      "«Аэропорт Челябинск» — спецификация стекла | Inex Glass"
    );
  });

  it("does not double the quotes of a name that already has them", () => {
    expect(objectFallbackTitle("«РМК-Арена»")).toBe(
      "«РМК-Арена» — спецификация стекла | Inex Glass"
    );
  });

  it("shortens long names with «…» to at most 65 characters", () => {
    const long = objectFallbackTitle(
      "Главное управление публичного акционерного общества Сургутнефтегаз"
    );
    expect(long.length).toBeLessThanOrEqual(OBJECT_TITLE_MAX);
    expect(long).toMatch(/^«Главное управление.*…» — спецификация стекла \| Inex Glass$/);

    const quoted = objectFallbackTitle(
      "Главное управление «Сургутнефтегаз» и ещё очень длинное название"
    );
    expect(quoted.length).toBeLessThanOrEqual(OBJECT_TITLE_MAX);
    expect(quoted).toMatch(/…\s—\sспецификация стекла \| Inex Glass$/);
  });
});

describe("objectFallbackDescription", () => {
  const full = {
    name: "«РМК-Арена»",
    type: "Арена",
    city: "Челябинск",
    products: ["Ограждения", "Перегородки"],
    spec: { kind: "закалённый триплекс", thickness: "8+8" },
  };

  it("builds «Тип, Город: изделия. Спецификация стекла: вид, толщина мм.» within 120–160", () => {
    const text = objectFallbackDescription(full);
    expect(
      text.startsWith(
        "Арена, Челябинск: Ограждения, Перегородки. Спецификация стекла: закалённый триплекс, 8+8 мм."
      )
    ).toBe(true);
    expect(text.length).toBeGreaterThanOrEqual(OBJECT_DESCRIPTION_MIN);
    expect(text.length).toBeLessThanOrEqual(OBJECT_DESCRIPTION_MAX);
  });

  it("skips missing parts", () => {
    const text = objectFallbackDescription({
      name: "Объект",
      city: "Омск",
      spec: { thickness: "10" },
    });
    expect(text.startsWith("Омск. Спецификация стекла: 10 мм.")).toBe(true);
    expect(text).not.toMatch(/, ,|: \.|undefined|null/);
    const noSpec = objectFallbackDescription({
      name: "Объект",
      type: "Банк",
      products: ["Фасады"],
    });
    expect(noSpec.startsWith("Банк: Фасады.")).toBe(true);
    expect(noSpec).not.toContain("Спецификация стекла:");
  });

  it("cuts long descriptions at a word boundary (≤ 160)", () => {
    const text = objectFallbackDescription({
      ...full,
      products: Array.from({ length: 12 }, (_, index) => `Изделие номер ${index + 1}`),
    });
    expect(text.length).toBeLessThanOrEqual(OBJECT_DESCRIPTION_MAX);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toMatch(/\s…$/);
  });

  it("has a text even without data", () => {
    expect(objectFallbackDescription({ name: "Объект" })).toContain("«Объект»");
  });
});

describe("truncateByWord", () => {
  it("keeps short text and cuts long text at a space", () => {
    expect(truncateByWord("один два", 20)).toBe("один два");
    expect(truncateByWord("один два три четыре", 12)).toBe("один два…");
    expect(truncateByWord("одинслово", 5)).toBe("один…");
  });
});

describe("listingSeo", () => {
  it("page 1: indexable, self canonical, next page link", () => {
    expect(listingSeo({ page: 1, totalPages: 3, filtered: false })).toEqual({
      path: "/obekty/",
      canonical: "/obekty/",
      noindex: false,
      titlePage: undefined,
      previous: null,
      next: "/obekty/page/2/",
    });
  });

  it("page N: indexable, self canonical, «— страница N», prev/next", () => {
    expect(listingSeo({ page: 2, totalPages: 3, filtered: false })).toEqual({
      path: "/obekty/page/2/",
      canonical: "/obekty/page/2/",
      noindex: false,
      titlePage: 2,
      previous: "/obekty/",
      next: "/obekty/page/3/",
    });
    expect(listingSeo({ page: 3, totalPages: 3, filtered: false }).next).toBeNull();
  });

  it("filters: noindex with the canonical /obekty/, even on page N", () => {
    for (const page of [1, 2]) {
      const rules = listingSeo({ page, totalPages: 3, filtered: true });
      expect(rules.noindex).toBe(true);
      expect(rules.canonical).toBe("/obekty/");
      expect(rules.previous).toBeNull();
      expect(rules.next).toBeNull();
      expect(rules.titlePage).toBeUndefined();
    }
  });
});
