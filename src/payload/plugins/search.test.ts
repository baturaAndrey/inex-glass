import { describe, expect, it } from "vitest";
import { buildSearchFields, isExcludedFromSearch, searchTitle } from "./search";

describe("isExcludedFromSearch", () => {
  it("excludes legal, order and noindex pages", () => {
    expect(isExcludedFromSearch("pages", { template: "legal", path: "/politika/" })).toBe(true);
    expect(isExcludedFromSearch("pages", { path: "/zakaz/abc/" })).toBe(true);
    expect(isExcludedFromSearch("pages", { path: "/x/", seo: { noindex: true } })).toBe(true);
  });

  it("keeps other pages and the 5/15/19 mm thicknesses", () => {
    expect(isExcludedFromSearch("pages", { template: "hub", path: "/obrabotka-stekla/" })).toBe(
      false
    );
    // 5/15/19 mm are noindex for search engines (`indexable: false`) but searchable on the site.
    expect(isExcludedFromSearch("thicknesses", { n: 15, indexable: false })).toBe(false);
  });

  it("applies seo.noindex and service paths to every collection (same rule as the sitemap)", () => {
    expect(isExcludedFromSearch("thicknesses", { n: 10, seo: { noindex: true } })).toBe(true);
    expect(isExcludedFromSearch("articles", { slug: "x", seo: { noindex: true } })).toBe(true);
    expect(isExcludedFromSearch("constructions", { path: "/zakaz/x/" })).toBe(true);
    expect(isExcludedFromSearch("pages", { path: "/politika-konfidencialnosti/" })).toBe(true);
    expect(isExcludedFromSearch("pages", { path: "/poisk/" })).toBe(true);
    expect(isExcludedFromSearch("leads", { seo: { noindex: true } })).toBe(false);
  });
});

describe("searchTitle", () => {
  it("prefers the H1, then title / name", () => {
    expect(searchTitle("pages", { title: "Т", seo: { h1: "Заголовок H1" } })).toBe("Заголовок H1");
    expect(searchTitle("articles", { title: "Статья" })).toBe("Статья");
    expect(searchTitle("objects", { name: "ЖК «Высота»" })).toBe("ЖК «Высота»");
  });

  it("fills {N} of a thickness and drops other placeholders", () => {
    expect(searchTitle("thicknesses", { n: 10, seo: { h1: "Закалённое стекло {N} мм" } })).toBe(
      "Закалённое стекло 10 мм"
    );
    expect(searchTitle("thicknesses", { n: 8 })).toBe("Закалённое стекло 8 мм");
    expect(searchTitle("pages", { seo: { h1: "Стекло от {цена} ₽" } })).toBe("Стекло от ₽");
  });
});

describe("buildSearchFields", () => {
  it("builds url, kind and the normalized texts", () => {
    const fields = buildSearchFields("glass-types", {
      slug: "matovoe",
      path: "/zakalennoe-steklo/matovoe/",
      title: "Матовое",
      seo: { h1: "Матовое закалённое стекло", description: "Цена {цена} за м²." },
      intro: { root: { type: "root", children: [{ type: "text", text: "Ёмкое описание." }] } },
    });
    expect(fields).toEqual({
      title: "Матовое закалённое стекло",
      url: "/zakalennoe-steklo/matovoe/",
      kind: "glass-types",
      titleNorm: "матовое закаленное стекло",
      bodyText: "Матовое закаленное стекло Матовое Емкое описание. Цена за м².",
    });
  });

  it("adds «Толщина N мм» to a thickness and fills its {N}", () => {
    const fields = buildSearchFields("thicknesses", {
      n: 10,
      path: "/zakalennoe-steklo/10-mm/",
      seo: { h1: "Закалённое стекло {N} мм", description: "{N} мм: вес {вес} кг/м²." },
    });
    expect(fields.title).toBe("Закалённое стекло 10 мм");
    expect(fields.bodyText).toBe("Закаленное стекло 10 мм. Толщина 10 мм. 10 мм: вес кг/м².");
  });

  it("routes triplex to its root section", () => {
    expect(buildSearchFields("glass-types", { slug: "tripleks", title: "Триплекс" }).url).toBe(
      "/tripleks/"
    );
  });
});
