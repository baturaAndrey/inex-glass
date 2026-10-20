import { describe, expect, it } from "vitest";
import { docUrl, isPublicCollection } from "./doc-url";

describe("docUrl", () => {
  it("returns the stored path of pages, home included", () => {
    expect(docUrl("pages", { path: "/o-kompanii/", slug: "o-kompanii" })).toBe("/o-kompanii/");
    expect(docUrl("pages", { path: "/kak-zakazat/sroki/", slug: "sroki" })).toBe(
      "/kak-zakazat/sroki/"
    );
    expect(docUrl("pages", { path: "/", isHome: true, slug: "glavnaya" })).toBe("/");
    expect(docUrl("pages", { isHome: true, slug: "glavnaya" })).toBe("/");
  });

  it("thicknesses → /zakalennoe-steklo/{n}-mm/", () => {
    expect(docUrl("thicknesses", { path: "/zakalennoe-steklo/10-mm/", n: 10 })).toBe(
      "/zakalennoe-steklo/10-mm/"
    );
    expect(docUrl("thicknesses", { n: 8 })).toBe("/zakalennoe-steklo/8-mm/");
    expect(docUrl("thicknesses", { n: "12" })).toBe("/zakalennoe-steklo/12-mm/");
  });

  it("glass-types → hub path; tripleks always at the root", () => {
    expect(docUrl("glass-types", { slug: "riflenoe" })).toBe("/zakalennoe-steklo/riflenoe/");
    expect(docUrl("glass-types", { path: "/zakalennoe-steklo/matovoe/", slug: "matovoe" })).toBe(
      "/zakalennoe-steklo/matovoe/"
    );
    expect(docUrl("glass-types", { slug: "tripleks" })).toBe("/tripleks/");
    expect(docUrl("glass-types", { slug: "tripleks", path: "/zakalennoe-steklo/tripleks/" })).toBe(
      "/tripleks/"
    );
    expect(docUrl("glass-types", { slug: "novoe", urlBase: "root" })).toBe("/novoe/");
  });

  it("processing-services → /obrabotka-stekla/{slug}/", () => {
    expect(docUrl("processing-services", { slug: "kromka" })).toBe("/obrabotka-stekla/kromka/");
  });

  it("constructions → stored path (root or nested)", () => {
    expect(
      docUrl("constructions", {
        slug: "steklyannye-peregorodki",
        path: "/steklyannye-peregorodki/",
      })
    ).toBe("/steklyannye-peregorodki/");
    expect(docUrl("constructions", { slug: "fasadov", path: "/osteklenie/fasadov/" })).toBe(
      "/osteklenie/fasadov/"
    );
    expect(docUrl("constructions", { slug: "torgovye-vitriny" })).toBe("/torgovye-vitriny/");
  });

  it("articles → /blog/{slug}/, objects → /obekty/{slug}/", () => {
    expect(docUrl("articles", { slug: "mozhno-li-rezat-zakalennoe-steklo" })).toBe(
      "/blog/mozhno-li-rezat-zakalennoe-steklo/"
    );
    expect(docUrl("objects", { slug: "tc-rodnik", path: "/obekty/tc-rodnik/" })).toBe(
      "/obekty/tc-rodnik/"
    );
    expect(docUrl("objects", { slug: "tc-rodnik" })).toBe("/obekty/tc-rodnik/");
  });

  it("returns null for bare ids, private collections and unusable documents", () => {
    expect(docUrl("pages", "6f1c0d1e-0000-4000-8000-000000000000")).toBeNull();
    expect(docUrl("pages", null)).toBeNull();
    expect(docUrl("leads", { path: "/x/" })).toBeNull();
    expect(docUrl("users", { slug: "admin" })).toBeNull();
    expect(docUrl("articles", {})).toBeNull();
    expect(docUrl("articles", { slug: "Bad Slug" })).toBeNull();
    expect(docUrl("thicknesses", { n: "abc" })).toBeNull();
  });

  it("ignores a malformed stored path and falls back to the slug", () => {
    expect(docUrl("articles", { slug: "zametka", path: "blog/zametka" })).toBe("/blog/zametka/");
  });

  it("isPublicCollection narrows to collections with public URLs", () => {
    expect(isPublicCollection("objects")).toBe(true);
    expect(isPublicCollection("media")).toBe(false);
  });
});
