import { describe, expect, it } from "vitest";
import {
  generateGroupLinkCode,
  generateLinkToken,
  hashToken,
  hasLinkTokenPrefix,
  isExpired,
  isLinkTokenFormat,
  LINK_TOKEN_PREFIX,
  LINK_TOKEN_TTL_MS,
  normalizeGroupLinkCode,
  safeEqualHex,
  tokenExpiresAt,
} from "./link-token";

describe("link tokens", () => {
  it("are ig_ + 32 base64url characters and unique", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateLinkToken()));
    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^ig_[A-Za-z0-9_-]{32}$/);
      expect(token.startsWith(LINK_TOKEN_PREFIX)).toBe(true);
      expect(isLinkTokenFormat(token)).toBe(true);
      expect(hasLinkTokenPrefix(token)).toBe(true);
    }
  });

  it("only payloads with our prefix count as ours", () => {
    expect(hasLinkTokenPrefix("ig_anything")).toBe(true);
    expect(hasLinkTokenPrefix("x".repeat(32))).toBe(false);
    expect(hasLinkTokenPrefix("IG_" + "x".repeat(32))).toBe(false);
    expect(hasLinkTokenPrefix(null)).toBe(false);
  });

  it.each([
    ["short"],
    ["ig_short"],
    ["x".repeat(32)], // the right body without our prefix
    ["ig_" + "x".repeat(33)],
    ["ig_" + "a".repeat(31) + "+"],
    [null],
    [42],
  ])("isLinkTokenFormat rejects %s", (value) => {
    expect(isLinkTokenFormat(value)).toBe(false);
  });

  it("hash is a stable SHA-256 hex", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abd")).not.toBe(hashToken("abc"));
  });

  it("expire after 30 minutes", () => {
    const now = new Date("2026-10-22T10:00:00.000Z");
    const expiresAt = tokenExpiresAt(now);
    expect(expiresAt).toBe("2026-10-22T10:30:00.000Z");
    expect(LINK_TOKEN_TTL_MS).toBe(30 * 60 * 1000);
    expect(isExpired(expiresAt, now)).toBe(false);
    expect(isExpired(expiresAt, new Date("2026-10-22T10:29:59.999Z"))).toBe(false);
    expect(isExpired(expiresAt, new Date("2026-10-22T10:30:00.000Z"))).toBe(true);
  });

  it.each([[null], [undefined], [""], ["not a date"], [123]])(
    "isExpired treats %s as expired",
    (value) => {
      expect(isExpired(value, new Date())).toBe(true);
    }
  );
});

describe("group link codes", () => {
  it("are INEX- + 8 Crockford base32 characters", () => {
    for (let index = 0; index < 50; index++) {
      const code = generateGroupLinkCode();
      expect(code).toMatch(/^INEX-[0-9A-HJKMNP-TV-Z]{8}$/);
      expect(normalizeGroupLinkCode(code)).toBe(code);
    }
  });

  it.each([
    ["  inex-7f3k9q2m ", "INEX-7F3K9Q2M"],
    ["Inex-7F3k9q2M", "INEX-7F3K9Q2M"],
    ["\nINEX-7F3K9Q2M\n", "INEX-7F3K9Q2M"],
  ])("normalizes %j", (input, expected) => {
    expect(normalizeGroupLinkCode(input)).toBe(expected);
  });

  it.each([
    ["Привет всем"],
    ["INEX-7F3K9Q2"], // too short
    ["INEX-7F3K9Q2MM"], // too long
    ["INEX-7F3K9Q2L"], // L is not Crockford
    ["код INEX-7F3K9Q2M"], // text around the code
    ["ABCD-7F3K9Q2M"],
    ["INEX-7F3K 9Q2M"], // only the exact format: no spaces inside
    ["INEX-7F3K-9Q2M"],
    ["inex 7f3k9q2m"],
    ["INEX7F3K9Q2M"],
    [""],
    [null],
    [`INEX-7F3K9Q2M${" ".repeat(100)}`],
  ])("rejects %j", (input) => {
    expect(normalizeGroupLinkCode(input)).toBeNull();
  });
});

describe("safeEqualHex", () => {
  it("compares digests", () => {
    const a = hashToken("one");
    expect(safeEqualHex(a, hashToken("one"))).toBe(true);
    expect(safeEqualHex(a, hashToken("two"))).toBe(false);
    expect(safeEqualHex(a, a.slice(0, 10))).toBe(false);
    expect(safeEqualHex("", "")).toBe(true);
  });
});
