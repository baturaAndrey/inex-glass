import { describe, expect, it } from "vitest";
import {
  consentEmailHash,
  consentPhoneHash,
  normalizeEmail,
  normalizeInn,
  normalizePhone,
} from "./normalize";

describe("normalizePhone", () => {
  it.each([
    ["8 (951) 489-04-09", "+79514890409"],
    ["+7 951 489-04-09", "+79514890409"],
    ["7 951 489 04 09", "+79514890409"],
    ["89514890409", "+79514890409"],
    ["+79514890409", "+79514890409"],
    ["  +7 (351) 200-00-00  ", "+73512000000"],
    ["9514890409", "+79514890409"],
    ["(951) 489-04-09", "+79514890409"],
  ])("normalizes %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each([
    ["garbage", "abc"],
    ["empty", ""],
    ["too short", "951 489-04"],
    ["10 digits not starting with 9", "351 200-00-00"],
    ["10 digits with a trunk prefix", "8 951 489 04 0"],
    ["too long (extension)", "8 951 489-04-09 доб. 12"],
    ["foreign prefix", "+1 951 489-04-09"],
    ["non-string", 79514890409],
    ["null", null],
    ["undefined", undefined],
  ])("returns null for %s", (_label, raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Ivan.Petrov@Example.RU ")).toBe("ivan.petrov@example.ru");
  });

  it("returns null for empty or non-string input", () => {
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });
});

describe("normalizeInn", () => {
  it("keeps digits only", () => {
    expect(normalizeInn(" 7451-234 567 ")).toBe("7451234567");
  });

  it("returns null when no digits remain", () => {
    expect(normalizeInn("—")).toBeNull();
    expect(normalizeInn(null)).toBeNull();
  });
});

describe("consent contact hashes", () => {
  const secret = "test-secret-test-secret-test-secret-00";

  it("hash the normalized phone (HMAC-SHA256 hex)", () => {
    const hash = consentPhoneHash("8 (951) 489-04-09", secret);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(consentPhoneHash("+79514890409", secret));
  });

  it("hash the normalized e-mail", () => {
    const hash = consentEmailHash(" Ivan@Example.RU ", secret);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(consentEmailHash("ivan@example.ru", secret));
  });

  it("are independent per contact: a phone-only lookup matches a phone+e-mail record", () => {
    // The record stores both hashes; an erasure request knowing only the phone recomputes
    // just the phone hash, which must not depend on the e-mail.
    expect(consentPhoneHash("+79514890409", secret)).toBe(
      consentPhoneHash("8 951 489 04 09", secret)
    );
    expect(consentPhoneHash("+79514890409", secret)).not.toBe(
      consentEmailHash("ivan@example.ru", secret)
    );
  });

  it("depend on the secret (a keyed hash, not plain SHA-256)", () => {
    expect(consentPhoneHash("+79514890409", secret)).not.toBe(
      consentPhoneHash("+79514890409", `${secret}-other`)
    );
    expect(consentEmailHash("ivan@example.ru", secret)).not.toBe(
      consentEmailHash("ivan@example.ru", `${secret}-other`)
    );
  });

  it("use separate domains for phone and e-mail", () => {
    // Same normalized string under both kinds must not collide.
    expect(consentPhoneHash("+79514890409", secret)).not.toBe(
      consentEmailHash("+79514890409", secret)
    );
  });

  it("return null for unusable input", () => {
    expect(consentPhoneHash("abc", secret)).toBeNull();
    expect(consentPhoneHash(undefined, secret)).toBeNull();
    expect(consentEmailHash("  ", secret)).toBeNull();
    expect(consentEmailHash(null, secret)).toBeNull();
  });
});
