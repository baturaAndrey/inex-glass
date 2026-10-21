import { describe, expect, it } from "vitest";
import {
  isClosedDocument,
  isExcludedFromSearch,
  isIndexable,
  isPublished,
  isServicePath,
} from "./indexable";

const published = { _status: "published" } as const;

describe("isIndexable", () => {
  it("thicknesses: only `indexable: true` (5/15/19 mm are noindex)", () => {
    for (const n of [4, 6, 8, 10, 12]) {
      expect(isIndexable("thicknesses", { n, indexable: true })).toBe(true);
    }
    for (const n of [5, 15, 19]) {
      expect(isIndexable("thicknesses", { n, indexable: false })).toBe(false);
    }
    expect(isIndexable("thicknesses", { n: 8 })).toBe(false);
  });

  it("a page closed with seo.noindex is not indexable", () => {
    expect(isIndexable("pages", { ...published, path: "/kontakty/", seo: { noindex: true } })).toBe(
      false
    );
    expect(
      isIndexable("pages", { ...published, path: "/kontakty/", seo: { noindex: false } })
    ).toBe(true);
  });

  it("drafts are not indexable", () => {
    expect(isIndexable("pages", { _status: "draft", path: "/kontakty/" })).toBe(false);
    expect(isIndexable("articles", { _status: "draft", slug: "statya" })).toBe(false);
    expect(isIndexable("glass-types", { slug: "matovoe" })).toBe(false);
  });

  it("an object draft (import) is not indexable; a published one is", () => {
    expect(isIndexable("objects", { _status: "draft", slug: "tc-almaz" })).toBe(false);
    expect(isIndexable("objects", { ...published, slug: "tc-almaz" })).toBe(true);
    expect(isIndexable("objects", { ...published, slug: "tc-almaz", seo: { noindex: true } })).toBe(
      false
    );
  });

  it("processing services have no drafts and are indexable unless noindex", () => {
    expect(isIndexable("processing-services", { slug: "facet" })).toBe(true);
    expect(isIndexable("processing-services", { slug: "facet", seo: { noindex: true } })).toBe(
      false
    );
  });

  it("service paths and private collections are never indexable", () => {
    for (const path of [
      "/poisk/",
      "/politika-konfidencialnosti/",
      "/soglasie-na-obrabotku-personalnyh-dannyh/",
      "/zakaz/abc/",
    ]) {
      expect(isIndexable("pages", { ...published, path })).toBe(false);
    }
    expect(isIndexable("leads", { ...published, slug: "x" })).toBe(false);
    expect(isIndexable("pages", null)).toBe(false);
    expect(isIndexable("pages", { ...published })).toBe(false);
  });

  it("helpers", () => {
    expect(isServicePath("/zakaz/token/")).toBe(true);
    expect(isServicePath("/kontakty/")).toBe(false);
    expect(isPublished("thicknesses", {})).toBe(true);
    expect(isPublished("pages", { _status: "draft" })).toBe(false);
  });
});

describe("isClosedDocument / isExcludedFromSearch — the shared exclusion rule", () => {
  it("closes noindex documents of any public collection, legal pages and service paths", () => {
    expect(isClosedDocument("pages", { path: "/kontakty/", seo: { noindex: true } })).toBe(true);
    expect(isClosedDocument("thicknesses", { n: 10, seo: { noindex: true } })).toBe(true);
    expect(isClosedDocument("pages", { path: "/rekvizity/", template: "legal" })).toBe(true);
    expect(isClosedDocument("pages", { path: "/zakaz/abc/" })).toBe(true);
    expect(isClosedDocument("pages", { path: "/poisk/" })).toBe(true);
  });

  it("keeps ordinary documents, ignores publication and thickness indexability", () => {
    expect(isClosedDocument("pages", { path: "/kontakty/" })).toBe(false);
    expect(isClosedDocument("pages", { _status: "draft", path: "/kontakty/" })).toBe(false);
    expect(isClosedDocument("thicknesses", { n: 15, indexable: false })).toBe(false);
    expect(isClosedDocument("leads", { seo: { noindex: true } })).toBe(false);
    expect(isClosedDocument("pages", null)).toBe(false);
  });

  it("search exclusion is the same rule; every closed document is non-indexable", () => {
    const docs: [string, Record<string, unknown>][] = [
      ["pages", { ...published, path: "/kontakty/", seo: { noindex: true } }],
      ["pages", { ...published, path: "/rekvizity/", template: "legal" }],
      ["pages", { ...published, path: "/zakaz/abc/" }],
      ["articles", { ...published, slug: "statya", seo: { noindex: true } }],
      ["pages", { ...published, path: "/kontakty/" }],
    ];
    for (const [collection, doc] of docs) {
      expect(isExcludedFromSearch(collection, doc)).toBe(isClosedDocument(collection, doc));
      if (isClosedDocument(collection, doc)) expect(isIndexable(collection, doc)).toBe(false);
    }
  });
});
