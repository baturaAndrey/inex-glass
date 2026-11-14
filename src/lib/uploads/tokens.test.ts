import { describe, expect, it } from "vitest";
import { MAX_SHORT_TEXT } from "@/lib/domain/contact-fields";
import {
  MAX_SIGNED_TOKEN_LENGTH,
  MAX_UPLOAD_TOKEN_LENGTH,
  signToken,
  signUploadToken,
  UPLOAD_TOKEN_TTL_MS,
  verifyToken,
  verifyUploadToken,
} from "./tokens";
import type { UploadTokenClaims } from "./tokens";

const SECRET = "test-secret-test-secret-test-secret-0000";
const OTHER_SECRET = "another-secret-another-secret-another-00";
const NOW = 1_760_000_000_000;

const META: UploadTokenClaims = {
  id: "3f2b8c1e-6a4d-4e2f-9b1a-0c5d7e8f9a0b",
  ext: "jpeg",
  size: 52_428_800,
  purpose: "quiz",
};

/** Wire form of the claims (one-letter keys) for tampering tests. */
const wire = (claims: UploadTokenClaims, exp: number) => ({
  i: claims.id,
  e: claims.ext,
  s: claims.size,
  p: claims.purpose,
  x: exp,
});

/** Replaces the payload part of a token, keeping the original signature. */
const withPayload = (token: string, payload: unknown) =>
  `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${token.split(".")[1]}`;

describe("signToken / verifyToken", () => {
  it("round-trips a payload", () => {
    const token = signToken("ctx", { a: 1 }, SECRET);
    expect(verifyToken("ctx", token, SECRET)).toEqual({ a: 1 });
  });

  it("rejects another context, another secret and garbage", () => {
    const token = signToken("ctx", { a: 1 }, SECRET);
    expect(verifyToken("other", token, SECRET)).toBeNull();
    expect(verifyToken("ctx", token, OTHER_SECRET)).toBeNull();
    expect(verifyToken("ctx", "abc", SECRET)).toBeNull();
    expect(verifyToken("ctx", "a.b.c", SECRET)).toBeNull();
    expect(verifyToken("ctx", 42, SECRET)).toBeNull();
    expect(verifyToken("ctx", "a".repeat(MAX_SIGNED_TOKEN_LENGTH + 1), SECRET)).toBeNull();
  });
});

describe("upload tokens", () => {
  it("verifies a fresh token and returns its meta", () => {
    const token = signUploadToken(META, NOW, SECRET);
    expect(verifyUploadToken(token, NOW + 1000, SECRET)).toEqual({
      ...META,
      exp: NOW + UPLOAD_TOKEN_TTL_MS,
    });
  });

  it("fits the 200-character limit of leadSubmitSchema even for the longest claims", () => {
    const token = signUploadToken(META, NOW, SECRET);
    expect(token.length).toBeLessThanOrEqual(MAX_UPLOAD_TOKEN_LENGTH);
    expect(MAX_UPLOAD_TOKEN_LENGTH).toBe(MAX_SHORT_TEXT);
  });

  it("expires after two hours", () => {
    const token = signUploadToken(META, NOW, SECRET);
    expect(verifyUploadToken(token, NOW + UPLOAD_TOKEN_TTL_MS, SECRET)).not.toBeNull();
    expect(verifyUploadToken(token, NOW + UPLOAD_TOKEN_TTL_MS + 1, SECRET)).toBeNull();
  });

  it("rejects a tampered payload or signature", () => {
    const token = signUploadToken(META, NOW, SECRET);
    expect(
      verifyUploadToken(
        withPayload(token, wire({ ...META, size: 1 }, NOW + UPLOAD_TOKEN_TTL_MS)),
        NOW,
        SECRET
      )
    ).toBeNull();
    const [payload, signature = ""] = token.split(".");
    const flipped = `${payload}.${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`;
    expect(verifyUploadToken(flipped, NOW, SECRET)).toBeNull();
    expect(verifyUploadToken(token, NOW, OTHER_SECRET)).toBeNull();
  });

  it("rejects correctly signed but unsafe meta (path traversal, unknown extension)", () => {
    const traversal = signToken(
      "upload-token:v1",
      wire({ ...META, id: "../../etc/passwd" }, NOW + 1),
      SECRET
    );
    expect(verifyUploadToken(traversal, NOW, SECRET)).toBeNull();
    const exe = signToken("upload-token:v1", wire({ ...META, ext: "exe" }, NOW + 1), SECRET);
    expect(verifyUploadToken(exe, NOW, SECRET)).toBeNull();
  });
});
