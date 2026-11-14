import { describe, expect, it } from "vitest";
import { checkPath, isReservedPath, joinPath, normalizeBasePath, PATH_PATTERN } from "./path-utils";

describe("normalizeBasePath", () => {
  it.each([
    [undefined, "/"],
    ["", "/"],
    ["/", "/"],
    ["instrumenty", "/instrumenty/"],
    ["/instrumenty", "/instrumenty/"],
    ["/osteklenie/fasadov/", "/osteklenie/fasadov/"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeBasePath(input)).toBe(expected);
  });
});

describe("joinPath", () => {
  it("joins a base path and a slug with a trailing slash", () => {
    expect(joinPath("/", "steklyannye-peregorodki")).toBe("/steklyannye-peregorodki/");
    expect(joinPath("/osteklenie/", "fasadov")).toBe("/osteklenie/fasadov/");
    expect(joinPath("/zakalennoe-steklo", "10-mm")).toBe("/zakalennoe-steklo/10-mm/");
    expect(joinPath(null, "blog")).toBe("/blog/");
  });
});

describe("PATH_PATTERN / checkPath", () => {
  it("accepts root and kebab-case segments with trailing slash", () => {
    expect(PATH_PATTERN.test("/")).toBe(true);
    expect(checkPath("/zerkala/dlya-zalov/")).toBe(true);
  });

  it("rejects malformed paths", () => {
    expect(checkPath("/no-trailing")).not.toBe(true);
    expect(checkPath("//double/")).not.toBe(true);
    expect(checkPath("/Upper/")).not.toBe(true);
    expect(checkPath("/a_b/")).not.toBe(true);
  });

  it("rejects reserved prefixes", () => {
    expect(isReservedPath("/admin/")).toBe(true);
    expect(isReservedPath("/api/leads/")).toBe(true);
    expect(isReservedPath("/zakaz/abc/")).toBe(true);
    expect(isReservedPath("/zakazy/")).toBe(false);
    expect(checkPath("/admin/x/")).toMatch(/зарезервирован/);
  });
});
