import { describe, expect, it } from "vitest";
import { pathFromSegments } from "./path";

describe("pathFromSegments", () => {
  it("joins segments with leading and trailing slashes", () => {
    expect(pathFromSegments(["kak-zakazat", "sroki"])).toBe("/kak-zakazat/sroki/");
  });

  it("decodes percent-encoded segments", () => {
    expect(pathFromSegments(["%D1%81%D1%82%D0%B5%D0%BA%D0%BB%D0%BE"])).toBe("/стекло/");
  });

  it("rejects an encoded slash or backslash inside a segment (no duplicate URL)", () => {
    expect(pathFromSegments(["kak-zakazat%2Fsroki"])).toBeNull();
    expect(pathFromSegments(["kak-zakazat%2fsroki"])).toBeNull();
    expect(pathFromSegments(["a%5Cb"])).toBeNull();
  });

  it("keeps a malformed segment as is", () => {
    expect(pathFromSegments(["%E0%A4%A"])).toBe("/%E0%A4%A/");
  });

  it("rejects empty input", () => {
    expect(pathFromSegments([])).toBeNull();
    expect(pathFromSegments([""])).toBeNull();
  });
});
