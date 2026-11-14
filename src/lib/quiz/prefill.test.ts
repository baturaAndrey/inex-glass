import { describe, expect, it } from "vitest";
import { MAX_SRC_LENGTH, parseQuizSearchParams, sanitizeEntryPath } from "./prefill";

describe("parseQuizSearchParams", () => {
  it("empty query: no pre-fill, no entry page, no resume", () => {
    expect(parseQuizSearchParams({})).toEqual({ prefill: {}, entryPage: "", resume: false });
  });

  it("card context: type, thick, vid, src", () => {
    expect(
      parseQuizSearchParams({
        type: "tempered",
        thick: "10",
        vid: "clear",
        src: "/zakalennoe-steklo/10-mm/",
      })
    ).toEqual({
      prefill: { type: "tempered", thickness: 10, kind: "clear" },
      entryPage: "/zakalennoe-steklo/10-mm/",
      resume: false,
    });
  });

  it("accepts 15 and 19 mm (request-only thicknesses are still valid ids)", () => {
    expect(parseQuizSearchParams({ thick: "15" }).prefill.thickness).toBe(15);
    expect(parseQuizSearchParams({ thick: "19" }).prefill.thickness).toBe(19);
  });

  it("ignores a thickness outside the list or not an integer", () => {
    for (const thick of ["7", "0", "-10", "10.5", "10mm", "1e1", ""]) {
      expect(parseQuizSearchParams({ thick }).prefill.thickness).toBeUndefined();
    }
  });

  it("ignores an unknown type and kind", () => {
    expect(parseQuizSearchParams({ type: "glass", vid: "pink" }).prefill).toEqual({});
    // Ids are case-sensitive: the canonical dictionary has no mapping layer.
    expect(parseQuizSearchParams({ type: "Tempered" }).prefill.type).toBeUndefined();
  });

  it("every canonical kind id is accepted", () => {
    for (const vid of ["clear", "low-iron", "matte", "tinted", "painted", "ribbed", "bent"]) {
      expect(parseQuizSearchParams({ vid }).prefill.kind).toBe(vid);
    }
  });

  it("repeated parameters: the first value wins", () => {
    const parsed = parseQuizSearchParams({
      type: ["triplex", "tempered"],
      src: ["/tripleks/", "/zerkala/"],
    });
    expect(parsed.prefill.type).toBe("triplex");
    expect(parsed.entryPage).toBe("/tripleks/");
  });

  it("sizes accept a decimal comma; zero, negatives and huge values are ignored", () => {
    expect(parseQuizSearchParams({ w: "1200,5", h: "2000" }).prefill).toEqual({
      maxW: 1200.5,
      maxH: 2000,
    });
    expect(parseQuizSearchParams({ w: "0", h: "-5" }).prefill).toEqual({});
    expect(parseQuizSearchParams({ w: "100001", h: "abc" }).prefill).toEqual({});
    expect(parseQuizSearchParams({ w: "100000" }).prefill.maxW).toBe(100000);
  });

  it("quantity is rounded and must be at least 1", () => {
    expect(parseQuizSearchParams({ q: "10" }).prefill.positions).toBe(10);
    expect(parseQuizSearchParams({ q: "2,6" }).prefill.positions).toBe(3);
    expect(parseQuizSearchParams({ q: "0,4" }).prefill.positions).toBeUndefined();
    expect(parseQuizSearchParams({ q: "100001" }).prefill.positions).toBeUndefined();
  });

  it("triplex: layers and film are used, thick is ignored", () => {
    expect(
      parseQuizSearchParams({ type: "triplex", thick: "10", t1: "8", t2: "6", film: "0,76" })
        .prefill
    ).toEqual({ type: "triplex", triplex: { glass1: 8, glass2: 6, film: 0.76 } });
  });

  it("triplex: invalid layers and film are dropped one by one", () => {
    expect(
      parseQuizSearchParams({ type: "triplex", t1: "7", t2: "5", film: "0.5" }).prefill
    ).toEqual({ type: "triplex", triplex: { glass2: 5 } });
    expect(parseQuizSearchParams({ type: "triplex", t1: "x" }).prefill).toEqual({
      type: "triplex",
    });
  });

  it("layer parameters without type=triplex are ignored", () => {
    expect(parseQuizSearchParams({ type: "tempered", t1: "8", film: "0.38" }).prefill).toEqual({
      type: "tempered",
    });
  });

  it("weight calculator hand-off (full set)", () => {
    expect(
      parseQuizSearchParams({
        type: "tempered",
        thick: "8",
        src: "/instrumenty/kalkulyator-vesa-stekla/",
        w: "1000",
        h: "2000",
        q: "10",
      })
    ).toEqual({
      prefill: { type: "tempered", thickness: 8, maxW: 1000, maxH: 2000, positions: 10 },
      entryPage: "/instrumenty/kalkulyator-vesa-stekla/",
      resume: false,
    });
  });

  it("resume only for the value 1", () => {
    expect(parseQuizSearchParams({ resume: "1" }).resume).toBe(true);
    expect(parseQuizSearchParams({ resume: "true" }).resume).toBe(false);
    expect(parseQuizSearchParams({ resume: ["1", "0"] }).resume).toBe(true);
  });

  it("an invalid src gives an empty entry page", () => {
    expect(parseQuizSearchParams({ src: "//evil.com", thick: "7" })).toEqual({
      prefill: {},
      entryPage: "",
      resume: false,
    });
  });
});

describe("sanitizeEntryPath", () => {
  it("keeps a site path", () => {
    expect(sanitizeEntryPath("/zakalennoe-steklo/")).toBe("/zakalennoe-steklo/");
    expect(sanitizeEntryPath("/")).toBe("/");
  });

  it("cuts query and hash", () => {
    expect(sanitizeEntryPath("/blog/?page=2#top")).toBe("/blog/");
    expect(sanitizeEntryPath("/obekty/#map")).toBe("/obekty/");
  });

  it("rejects protocol-relative, absolute, backslash and scheme values", () => {
    for (const value of [
      "//evil.com",
      "//evil.com/path",
      "https://evil.com/",
      "javascript:alert(1)",
      "/\\evil.com",
      "/foo:bar/",
      "evil.com",
      "zakalennoe-steklo/",
    ]) {
      expect(sanitizeEntryPath(value), value).toBe("");
    }
  });

  it("rejects whitespace and control characters", () => {
    expect(sanitizeEntryPath("/a b/")).toBe("");
    expect(sanitizeEntryPath("/a\nb/")).toBe("");
    expect(sanitizeEntryPath("/a\u0000/")).toBe("");
  });

  it("accepts only path characters (allow-list)", () => {
    for (const ok of [
      "/zakalennoe-steklo/10-mm/",
      "/blog/kak_zakazat/",
      "/Zakalennoe-Steklo/",
      "/obekty/page/2/",
    ]) {
      expect(sanitizeEntryPath(ok), ok).toBe(ok);
    }
    for (const bad of [
      "/../admin/",
      "/blog/a.b/",
      "/%2F%2Fevil.com/",
      "/blog/%D0%B0/",
      "/стекло/",
      '/a"onmouseover=1/',
      "/a'b/",
      "/<script>/",
      "/a;b/",
      "/a@b/",
      "/a~b/",
      "/a+b/",
      "/a​b/",
    ]) {
      expect(sanitizeEntryPath(bad), bad).toBe("");
    }
  });

  it("applies the allow-list after cutting query and hash", () => {
    expect(sanitizeEntryPath("/blog/?q=a.b&x=%20#a.b")).toBe("/blog/");
  });

  it("limits the length", () => {
    const ok = `/${"a".repeat(MAX_SRC_LENGTH - 1)}`;
    expect(sanitizeEntryPath(ok)).toBe(ok);
    expect(sanitizeEntryPath(`${ok}a`)).toBe("");
  });

  it("masks the order token and drops the quiz page itself", () => {
    expect(sanitizeEntryPath("/zakaz/abc123secret/")).toBe("/zakaz/");
    expect(sanitizeEntryPath("/raschet-stoimosti/")).toBe("");
    expect(sanitizeEntryPath("/raschet-stoimosti")).toBe("");
  });

  it("empty input", () => {
    expect(sanitizeEntryPath(undefined)).toBe("");
    expect(sanitizeEntryPath(null)).toBe("");
    expect(sanitizeEntryPath("   ")).toBe("");
  });
});
