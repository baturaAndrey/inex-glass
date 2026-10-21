import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getEnv()` memoizes its result, so every case imports a fresh copy of the module after
 * stubbing `process.env`.
 */
async function loadEnv() {
  vi.resetModules();
  const { getEnv } = await import("./env");
  return getEnv();
}

const VALID_KEY = "0123456789abcdef0123456789abcdef";

describe("getEnv — INDEXNOW_KEY", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("PAYLOAD_SECRET", "test-secret-test-secret-test-secret-00");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is optional", async () => {
    vi.stubEnv("INDEXNOW_KEY", "");
    expect((await loadEnv()).INDEXNOW_KEY).toBeUndefined();
  });

  it("accepts the `openssl rand -hex 16` format", async () => {
    vi.stubEnv("INDEXNOW_KEY", VALID_KEY);
    expect((await loadEnv()).INDEXNOW_KEY).toBe(VALID_KEY);
  });

  it("normalizes case and surrounding whitespace", async () => {
    vi.stubEnv("INDEXNOW_KEY", `  ${VALID_KEY.toUpperCase()} `);
    expect((await loadEnv()).INDEXNOW_KEY).toBe(VALID_KEY);
  });

  it.each([
    ["too short", "0123456789abcdef"],
    ["non-hex characters", "0123456789abcdef0123456789abcdeg"],
    ["dashes (allowed by the protocol, not by this project)", "0123-4567-89ab-cdef-0123-4567-89ab"],
  ])("rejects a key with %s", async (_label, key) => {
    vi.stubEnv("INDEXNOW_KEY", key);
    await expect(loadEnv()).rejects.toThrow(/INDEXNOW_KEY/);
  });
});
