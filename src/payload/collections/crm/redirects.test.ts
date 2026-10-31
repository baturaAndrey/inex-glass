import { describe, expect, it } from "vitest";
import { normalizeRedirectPath, validateFrom, validateTo } from "./redirects";

/** Field validation options; the validators only read `siblingData`. */
const withFrom = (from?: string) => ({ siblingData: { from } }) as any;

describe("normalizeRedirectPath", () => {
  it.each([
    ["old-page", "/old-page/"],
    [" /Old/Page?utm=1#top ", "/old/page/"],
    ["https://inexglass.ru/Catalog/Steklo", "/catalog/steklo/"],
    ["/%D0%9A%D0%B0%D1%82%D0%B0%D0%BB%D0%BE%D0%B3/", "/каталог/"],
    ["https://inexglass.ru/Каталог", "/каталог/"],
    ["/bad-%E0%A4%A/", "/bad-%e0%a4%a/"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeRedirectPath(raw)).toBe(expected);
  });
});

describe("validateFrom", () => {
  it("accepts encoded and plain paths alike", () => {
    expect(validateFrom("/%D0%BA%D0%B0%D1%82/", {} as any)).toBe(true);
    expect(validateFrom("/кат/", {} as any)).toBe(true);
  });

  it("rejects a decoded path with whitespace", () => {
    expect(validateFrom("/old%20page/", {} as any)).not.toBe(true);
  });
});

describe("validateTo", () => {
  it("accepts site paths and http(s) links", () => {
    expect(validateTo("/catalog/", withFrom("/old/"))).toBe(true);
    expect(validateTo("https://example.com/a/", withFrom("/a/"))).toBe(true);
  });

  it("rejects a target equal to the source (redirect loop)", () => {
    expect(validateTo("/old/", withFrom("/old/"))).toBe(
      "Адрес назначения совпадает с исходным путём"
    );
    expect(validateTo("/Old", withFrom("/old/"))).not.toBe(true);
    expect(validateTo("/%D0%BA%D0%B0%D1%82/", withFrom("/кат/"))).not.toBe(true);
  });

  it("rejects protocol-relative and non-http targets", () => {
    expect(validateTo("//evil.example/", withFrom("/a/"))).not.toBe(true);
    expect(validateTo("javascript:alert(1)", withFrom("/a/"))).not.toBe(true);
  });
});
