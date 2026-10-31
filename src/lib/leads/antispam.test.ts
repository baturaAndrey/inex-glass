import { describe, expect, it } from "vitest";
import { isHoneypotTripped, issueFormToken, verifyFormToken } from "./antispam";

const secret = "test-secret-test-secret-test-secret-0000";
const T0 = 1_760_000_000_000;
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;

describe("form token", () => {
  const token = issueFormToken(T0, secret);

  it("accepts a token after 3.1 s", () => {
    expect(verifyFormToken(token, T0 + 3.1 * SECOND, { secret })).toEqual({ ok: true });
  });

  it("rejects a token after 2 s as too fast", () => {
    expect(verifyFormToken(token, T0 + 2 * SECOND, { secret })).toEqual({
      ok: false,
      reason: "too_fast",
    });
  });

  it("skips the minimum age when asked (uploads)", () => {
    expect(verifyFormToken(token, T0 + 1, { secret, checkMinAge: false })).toEqual({ ok: true });
  });

  it("expires after 2 h 1 s", () => {
    expect(verifyFormToken(token, T0 + 2 * HOUR + SECOND, { secret })).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("rejects a forged signature, another secret and garbage", () => {
    const [payload, signature = ""] = token.split(".");
    const forged = `${payload}.${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`;
    const later = T0 + 10 * SECOND;
    expect(verifyFormToken(forged, later, { secret })).toEqual({ ok: false, reason: "bad" });
    expect(verifyFormToken(token, later, { secret: `${secret}x` })).toEqual({
      ok: false,
      reason: "bad",
    });
    expect(verifyFormToken("", later, { secret })).toEqual({ ok: false, reason: "bad" });
    expect(verifyFormToken(undefined, later, { secret })).toEqual({ ok: false, reason: "bad" });
  });

  it("rejects a token issued in the future", () => {
    const future = issueFormToken(T0 + 5 * 60 * SECOND, secret);
    expect(verifyFormToken(future, T0, { secret })).toEqual({ ok: false, reason: "bad" });
  });

  it("issues unique tokens for the same instant", () => {
    expect(issueFormToken(T0, secret)).not.toBe(issueFormToken(T0, secret));
  });
});

describe("isHoneypotTripped", () => {
  it("is tripped by any non-empty value", () => {
    expect(isHoneypotTripped({ company_website: "http://spam.example" })).toBe(true);
    expect(isHoneypotTripped({ company_website: 1 })).toBe(true);
  });

  it("is not tripped by an empty or missing field", () => {
    expect(isHoneypotTripped({ company_website: "" })).toBe(false);
    expect(isHoneypotTripped({ company_website: "   " })).toBe(false);
    expect(isHoneypotTripped({})).toBe(false);
    expect(isHoneypotTripped(null)).toBe(false);
  });
});
