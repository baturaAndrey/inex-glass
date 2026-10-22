import { describe, expect, it } from "vitest";
import { decorateMaxTextWith, resolveMaxTargetWith } from "./target";

const production = {
  SITE_ENV: "production",
  MAX_ENABLED: true,
  MAX_BOT_TOKEN: "token-0123456789abcdef",
  MAX_INTERCEPT_CHAT_ID: undefined,
} as const;

const staging = { ...production, SITE_ENV: "staging" } as const;

describe("resolveMaxTargetWith", () => {
  it("sends nothing when MAX_ENABLED is off", () => {
    expect(
      resolveMaxTargetWith({ ...production, MAX_ENABLED: false }, { chatId: "-1" })
    ).toBeNull();
  });

  it("sends nothing without a bot token", () => {
    expect(
      resolveMaxTargetWith({ ...production, MAX_BOT_TOKEN: undefined }, { userId: "1" })
    ).toBeNull();
  });

  it("sends nothing without a recipient", () => {
    expect(resolveMaxTargetWith(production, {})).toBeNull();
    expect(resolveMaxTargetWith(production, { chatId: null, userId: "" })).toBeNull();
  });

  it("outside production replaces every recipient by the intercept chat", () => {
    const env = { ...staging, MAX_INTERCEPT_CHAT_ID: "-100" };
    expect(resolveMaxTargetWith(env, { chatId: "-700" })).toEqual({ chatId: "-100" });
    expect(resolveMaxTargetWith(env, { userId: "900" })).toEqual({ chatId: "-100" });
    expect(resolveMaxTargetWith({ ...env, SITE_ENV: "development" }, { userId: "900" })).toEqual({
      chatId: "-100",
    });
  });

  it("outside production without an intercept chat sends nothing", () => {
    expect(resolveMaxTargetWith(staging, { chatId: "-700" })).toBeNull();
    expect(
      resolveMaxTargetWith({ ...staging, SITE_ENV: "development" }, { userId: "9" })
    ).toBeNull();
  });

  it("intercept chat still needs a recipient (nothing to notify → nothing sent)", () => {
    expect(resolveMaxTargetWith({ ...staging, MAX_INTERCEPT_CHAT_ID: "-100" }, {})).toBeNull();
  });

  it("production: chat first, then the user's dialog; intercept is ignored", () => {
    const env = { ...production, MAX_INTERCEPT_CHAT_ID: "-100" };
    expect(resolveMaxTargetWith(env, { chatId: "-700", userId: "900" })).toEqual({
      chatId: "-700",
    });
    expect(resolveMaxTargetWith(env, { userId: "900" })).toEqual({ userId: "900" });
  });
});

describe("decorateMaxTextWith", () => {
  it("marks the source in production", () => {
    expect(decorateMaxTextWith({ SITE_ENV: "production" }, "Новая заявка")).toBe(
      "<b>Inex Glass</b>\nНовая заявка"
    );
  });

  it.each(["staging", "development"] as const)("marks %s messages as a test", (siteEnv) => {
    expect(decorateMaxTextWith({ SITE_ENV: siteEnv }, "Новая заявка")).toBe(
      "<b>[ТЕСТ] Inex Glass</b>\nНовая заявка"
    );
  });
});
