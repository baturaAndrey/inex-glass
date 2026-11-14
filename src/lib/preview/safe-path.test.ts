import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-path";

describe("safeInternalPath", () => {
  it.each([
    ["/", "/"],
    ["/o-kompanii/", "/o-kompanii/"],
    ["/o-kompanii", "/o-kompanii/"],
    ["/zakalennoe-steklo/10-mm", "/zakalennoe-steklo/10-mm/"],
    ["/o-kompanii/?a=1#x", "/o-kompanii/"],
    ["/o-kompanii#x", "/o-kompanii/"],
    ["/administrirovanie/", "/administrirovanie/"],
  ])("accepts %j as %j", (raw, expected) => {
    expect(safeInternalPath(raw)).toBe(expected);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["a protocol-relative URL", "//evil.com"],
    ["a protocol-relative URL with a path", "//evil.com/o-kompanii/"],
    ["a backslash authority", "/\\evil.com"],
    ["a backslash inside", "/o-kompanii\\..\\evil"],
    ["an absolute URL", "https://evil.com"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a relative path", "o-kompanii/"],
    ["CR/LF (header injection)", "/\r\nSet-Cookie:x"],
    ["encoded CR/LF", "/%0d%0aSet-Cookie:x"],
    ["a tab before the authority", "/\t//evil.com"],
    ["encoded slashes", "/%2F%2Fevil.com"],
    ["an encoded backslash", "/%5Cevil.com"],
    ["the admin", "/admin/"],
    ["the admin without a slash", "/admin"],
    ["an admin subpage", "/admin/collections/pages/"],
    ["the admin in upper case", "/ADMIN/"],
    ["an API route", "/api/preview/"],
    ["Next internals", "/_next/static/x.js"],
    ["600 characters", `/${"a".repeat(599)}`],
  ])("refuses %s", (_label, raw) => {
    expect(safeInternalPath(raw)).toBeNull();
  });
});
