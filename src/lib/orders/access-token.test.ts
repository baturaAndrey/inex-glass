import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildOrderUrl,
  deriveOrderToken,
  hashOrderToken,
  isOrderTokenFormat,
  ORDER_TOKEN_LENGTH,
} from "./access-token";

const SECRET = "test-order-token-secret-test-order-token";
const ORDER_ID = "6f1c2c1e-6b8e-4b7a-9d55-0f5d1b2a3c4d";
const ISSUED_AT = "2026-10-20T10:15:00.000Z";

describe("deriveOrderToken", () => {
  it("is deterministic for the same order and issue time", () => {
    expect(deriveOrderToken(ORDER_ID, ISSUED_AT, SECRET)).toBe(
      deriveOrderToken(ORDER_ID, ISSUED_AT, SECRET)
    );
  });

  it("treats a Date and its ISO string as the same issue time", () => {
    expect(deriveOrderToken(ORDER_ID, new Date(ISSUED_AT), SECRET)).toBe(
      deriveOrderToken(ORDER_ID, ISSUED_AT, SECRET)
    );
  });

  it("changes when the link is reissued (new tokenCreatedAt)", () => {
    const reissued = "2026-10-20T10:15:00.001Z";
    expect(deriveOrderToken(ORDER_ID, reissued, SECRET)).not.toBe(
      deriveOrderToken(ORDER_ID, ISSUED_AT, SECRET)
    );
  });

  it("depends on the order id and on the secret", () => {
    const base = deriveOrderToken(ORDER_ID, ISSUED_AT, SECRET);
    expect(deriveOrderToken(`${ORDER_ID}x`, ISSUED_AT, SECRET)).not.toBe(base);
    expect(deriveOrderToken(ORDER_ID, ISSUED_AT, `${SECRET}x`)).not.toBe(base);
  });

  it("is 128-bit base64url (22 characters)", () => {
    const token = deriveOrderToken(ORDER_ID, ISSUED_AT, SECRET);
    expect(token).toHaveLength(ORDER_TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(16);
    expect(isOrderTokenFormat(token)).toBe(true);
  });

  it("rejects an invalid issue date and an empty order id", () => {
    expect(() => deriveOrderToken(ORDER_ID, "not-a-date", SECRET)).toThrow(RangeError);
    expect(() => deriveOrderToken("", ISSUED_AT, SECRET)).toThrow(TypeError);
  });
});

describe("hashOrderToken", () => {
  it("is the hex SHA-256 of the token", () => {
    const token = deriveOrderToken(ORDER_ID, ISSUED_AT, SECRET);
    expect(hashOrderToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hashOrderToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("isOrderTokenFormat", () => {
  it.each(["", "short", "a".repeat(23), "a".repeat(21) + "!", "../../etc/passwd"])(
    "rejects %j",
    (value) => {
      expect(isOrderTokenFormat(value)).toBe(false);
    }
  );
});

describe("buildOrderUrl", () => {
  it("builds the absolute URL with a trailing slash", () => {
    expect(buildOrderUrl("AbC_-123", "https://inexglass.ru")).toBe(
      "https://inexglass.ru/zakaz/AbC_-123/"
    );
  });

  it("tolerates a trailing slash in SITE_URL", () => {
    expect(buildOrderUrl("tok", "http://localhost:3000/")).toBe("http://localhost:3000/zakaz/tok/");
  });
});
