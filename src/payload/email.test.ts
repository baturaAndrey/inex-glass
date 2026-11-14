import { JobCancelledError } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyIntercept,
  isMailBlocked,
  listRecipients,
  MAIL_BLOCKED_MESSAGE,
  MailBlockedError,
  parseMailbox,
  resetMailBlockedWarning,
  routeOutgoingMail,
} from "./email";

const QA = "qa@example.test";

describe("applyIntercept", () => {
  const message = {
    to: "client@example.com",
    cc: "boss@example.com",
    bcc: ["audit@example.com"],
    subject: "Статус заказа № 2026-0147: Отгружено",
    html: "<p>Hi</p>",
  };

  it("returns the message unchanged without an intercept address", () => {
    expect(applyIntercept(message, "")).toBe(message);
    expect(applyIntercept(message, null)).toBe(message);
    expect(applyIntercept(message, "   ")).toBe(message);
  });

  it("redirects a string recipient and prefixes the subject", () => {
    const result = applyIntercept(message, QA);
    expect(result.to).toBe(QA);
    expect(result.subject).toBe(
      "[STAGING → client@example.com] Статус заказа № 2026-0147: Отгружено"
    );
    expect(result.html).toBe(message.html);
  });

  it("drops cc/bcc and keeps the originals in headers", () => {
    const result = applyIntercept(message, QA);
    expect(result).not.toHaveProperty("cc");
    expect(result).not.toHaveProperty("bcc");
    expect(result.headers).toEqual({
      "X-Original-To": "client@example.com",
      "X-Original-Cc": "boss@example.com",
    });
  });

  it("lists several recipients from an array of strings and addresses", () => {
    const result = applyIntercept(
      {
        to: [
          "a@example.com",
          { name: "Б", address: "b@example.com" },
          "c@example.com, d@example.com",
        ],
        subject: "Новая заявка",
      },
      QA
    );
    expect(result.to).toBe(QA);
    expect(result.subject).toBe(
      "[STAGING → a@example.com, b@example.com, c@example.com, d@example.com] Новая заявка"
    );
  });

  it("appends to array-style headers", () => {
    const result = applyIntercept(
      { to: "x@example.com", subject: "S", headers: [{ key: "X-Job", value: "1" }] },
      QA
    );
    expect(result.headers).toEqual([
      { key: "X-Job", value: "1" },
      { key: "X-Original-To", value: "x@example.com" },
    ]);
  });

  it("does not mutate the input", () => {
    const input = { ...message };
    applyIntercept(input, QA);
    expect(input).toEqual(message);
  });
});

describe("listRecipients", () => {
  it("handles empty values", () => {
    expect(listRecipients(undefined)).toEqual([]);
    expect(listRecipients("")).toEqual([]);
  });
});

describe("parseMailbox", () => {
  it.each([
    ["Inex Glass <noreply@inexglass.ru>", { name: "Inex Glass", address: "noreply@inexglass.ru" }],
    [
      '"Inex Glass" <noreply@inexglass.ru>',
      { name: "Inex Glass", address: "noreply@inexglass.ru" },
    ],
    ["noreply@inexglass.ru", { address: "noreply@inexglass.ru" }],
    ["<noreply@inexglass.ru>", { address: "noreply@inexglass.ru" }],
  ])("parses %j", (value, expected) => {
    expect(parseMailbox(value)).toEqual(expected);
  });

  it("returns null for an empty value", () => {
    expect(parseMailbox(undefined)).toBeNull();
    expect(parseMailbox(" ")).toBeNull();
  });
});

describe("routeOutgoingMail (per SITE_ENV)", () => {
  const message = { to: "sale@example.com", cc: "boss@example.com", subject: "Новая заявка" };
  const logger = { warn: vi.fn() };

  beforeEach(() => {
    logger.warn.mockClear();
    resetMailBlockedWarning();
  });

  it("production: sends to the real recipients unchanged", () => {
    const env = { SITE_ENV: "production", MAIL_INTERCEPT_TO: undefined } as const;
    expect(isMailBlocked(env)).toBe(false);
    expect(routeOutgoingMail(message, env, logger)).toBe(message);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("development (Mailpit): sends unchanged", () => {
    const env = { SITE_ENV: "development", MAIL_INTERCEPT_TO: undefined } as const;
    expect(routeOutgoingMail(message, env, logger)).toBe(message);
  });

  it("staging with MAIL_INTERCEPT_TO: redirects to the intercept mailbox", () => {
    const env = { SITE_ENV: "staging", MAIL_INTERCEPT_TO: QA } as const;
    const result = routeOutgoingMail(message, env, logger);
    expect(result.to).toBe(QA);
    expect(result).not.toHaveProperty("cc");
    expect(result.subject).toBe("[STAGING → sale@example.com] Новая заявка");
  });

  it("staging without MAIL_INTERCEPT_TO: refuses with a non-retryable error, warns once", () => {
    const env = { SITE_ENV: "staging", MAIL_INTERCEPT_TO: undefined } as const;
    expect(isMailBlocked(env)).toBe(true);
    expect(isMailBlocked({ SITE_ENV: "staging", MAIL_INTERCEPT_TO: " " })).toBe(true);
    expect(() => routeOutgoingMail(message, env, logger)).toThrow(MailBlockedError);
    expect(() => routeOutgoingMail(message, env, logger)).toThrow(MAIL_BLOCKED_MESSAGE);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("MailBlockedError is a JobCancelledError (Payload cancels the job, no retries)", () => {
    const error = new MailBlockedError();
    expect(error).toBeInstanceOf(JobCancelledError);
    expect(error.name).toBe("MailBlockedError");
  });
});

describe("createEmailAdapter", () => {
  const baseSend = vi.fn(async (message: unknown) => ({ messageId: "<id@test>", message }));

  beforeEach(() => {
    vi.resetModules();
    baseSend.mockClear();
    vi.doMock("@payloadcms/email-nodemailer", () => ({
      nodemailerAdapter: async () => () => ({
        name: "nodemailer",
        defaultFromAddress: "noreply@example.test",
        defaultFromName: "Inex Glass",
        sendEmail: baseSend,
      }),
    }));
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:1/test");
    vi.stubEnv("PAYLOAD_SECRET", "test-payload-secret-test-payload-secret");
    vi.stubEnv("SMTP_HOST", "localhost");
    vi.stubEnv("SMTP_PORT", "1025");
  });
  afterEach(() => {
    vi.doUnmock("@payloadcms/email-nodemailer");
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function adapterFor(siteEnv: string, interceptTo = "") {
    vi.stubEnv("SITE_ENV", siteEnv);
    vi.stubEnv("MAIL_INTERCEPT_TO", interceptTo);
    const { createEmailAdapter } = await import("./email");
    const logger = { warn: vi.fn() };
    const factory = await createEmailAdapter();
    const adapter = factory({ payload: { logger } as never });
    return { adapter, logger };
  }

  const message = { to: "client@example.com", subject: "Статус заказа" };

  it.each(["production", "development"])("%s: passes the message to SMTP as is", async (env) => {
    const { adapter, logger } = await adapterFor(env);
    await adapter.sendEmail(message);
    expect(baseSend).toHaveBeenCalledWith(message);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("staging + MAIL_INTERCEPT_TO: SMTP receives only the intercepted message", async () => {
    const { adapter } = await adapterFor("staging", QA);
    await adapter.sendEmail(message);
    expect(baseSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: QA, subject: "[STAGING → client@example.com] Статус заказа" })
    );
  });

  it("staging without MAIL_INTERCEPT_TO: nothing reaches SMTP, warned at startup", async () => {
    const { adapter, logger } = await adapterFor("staging");
    expect(logger.warn).toHaveBeenCalledTimes(1);
    await expect(adapter.sendEmail(message)).rejects.toThrow(MAIL_BLOCKED_MESSAGE);
    expect(baseSend).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
