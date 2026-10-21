import { describe, expect, it } from "vitest";
import { canonicalPathname } from "./proxy";

describe("canonicalPathname", () => {
  it("returns null for an already lowercase path", () => {
    expect(canonicalPathname("/")).toBeNull();
    expect(canonicalPathname("/vidy-stekla/triplex/")).toBeNull();
  });

  it("lowercases ordinary paths", () => {
    expect(canonicalPathname("/Vidy-Stekla/TRIPLEX/")).toBe("/vidy-stekla/triplex/");
  });

  it("lowercases percent-encoded Cyrillic by its decoded form", () => {
    expect(canonicalPathname("/%D0%A1%D1%82%D0%B5%D0%BA%D0%BB%D0%BE/")).toBe("/стекло/");
  });

  it("does not loop on uppercase hex digits of an already lowercase path", () => {
    expect(canonicalPathname("/%D1%81%D1%82%D0%B5%D0%BA%D0%BB%D0%BE/")).toBeNull();
  });

  it("returns null for malformed percent-encoding", () => {
    expect(canonicalPathname("/%E0%A4%A/")).toBeNull();
  });

  it("keeps the case of an order token", () => {
    expect(canonicalPathname("/zakaz/AbC-dE_9xYz/")).toBeNull();
  });

  it.each([
    ["/ZAKAZ/AbC-dE_9xYz/", "/zakaz/AbC-dE_9xYz/"],
    ["/Zakaz/AbC-dE_9xYz/", "/zakaz/AbC-dE_9xYz/"],
    ["/ZaKaZ/abc/", "/zakaz/abc/"],
  ])("lowercases only the prefix of %j", (input, expected) => {
    expect(canonicalPathname(input)).toBe(expected);
  });

  it("lowercases a bare /ZAKAZ/ without a token", () => {
    expect(canonicalPathname("/ZAKAZ/")).toBe("/zakaz/");
  });

  it("treats /ZAKAZ without the slash as an ordinary path", () => {
    expect(canonicalPathname("/ZAKAZ")).toBe("/zakaz");
  });

  it("does not treat a longer segment as the order prefix", () => {
    expect(canonicalPathname("/ZAKAZY/AbC/")).toBe("/zakazy/abc/");
  });
});
