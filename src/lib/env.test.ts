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

describe("getEnv — MAX", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("PAYLOAD_SECRET", "test-secret-test-secret-test-secret-00");
    for (const name of [
      "MAX_ENABLED",
      "MAX_BOT_TOKEN",
      "MAX_BOT_NAME",
      "MAX_WEBHOOK_SECRET",
      "MAX_INTERCEPT_CHAT_ID",
      "MAX_API_BASE_URL",
      "NEXT_PHASE",
    ]) {
      vi.stubEnv(name, "");
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("everything is optional and MAX is off by default", async () => {
    const env = await loadEnv();
    expect(env.MAX_ENABLED).toBe(false);
    expect(env.MAX_BOT_TOKEN).toBeUndefined();
    expect(env.MAX_WEBHOOK_SECRET).toBeUndefined();
  });

  it("accepts a complete configuration", async () => {
    vi.stubEnv("MAX_ENABLED", "true");
    vi.stubEnv("MAX_BOT_TOKEN", "token-0123456789abcdef");
    vi.stubEnv("MAX_BOT_NAME", "inex_glass_bot");
    vi.stubEnv("MAX_WEBHOOK_SECRET", "a".repeat(64));
    vi.stubEnv("MAX_INTERCEPT_CHAT_ID", "-72057594037927937");
    vi.stubEnv("MAX_API_BASE_URL", "http://127.0.0.1:4010");
    const env = await loadEnv();
    expect(env.MAX_ENABLED).toBe(true);
    expect(env.MAX_INTERCEPT_CHAT_ID).toBe("-72057594037927937");
  });

  it("MAX_ENABLED=true requires the bot token", async () => {
    vi.stubEnv("MAX_ENABLED", "true");
    await expect(loadEnv()).rejects.toThrow(/MAX_BOT_TOKEN: обязательна при MAX_ENABLED=true/);
  });

  it("the token rule is skipped while building the image", async () => {
    vi.stubEnv("MAX_ENABLED", "true");
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    expect((await loadEnv()).MAX_ENABLED).toBe(true);
  });

  it.each([
    ["MAX_WEBHOOK_SECRET", "too-short"],
    ["MAX_WEBHOOK_SECRET", `${"a".repeat(32)}!`],
    ["MAX_BOT_NAME", "бот"],
    ["MAX_INTERCEPT_CHAT_ID", "chat-1"],
    ["MAX_BOT_TOKEN", "short"],
  ])("rejects an invalid %s", async (name, value) => {
    vi.stubEnv(name, value);
    await expect(loadEnv()).rejects.toThrow(new RegExp(name));
  });
});
