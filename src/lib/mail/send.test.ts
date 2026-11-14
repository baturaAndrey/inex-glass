import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeMailError, MailDeliveryError } from "./send";

/** Shape of a nodemailer SMTP rejection: message/response quote the recipient address. */
function smtpRejection(): Error {
  return Object.assign(
    new Error(
      "Can't send mail - all recipients were rejected: 550 5.1.1 <client@example.com>: user unknown"
    ),
    {
      code: "EENVELOPE",
      responseCode: 550,
      command: "RCPT TO",
      response: "550 5.1.1 <client@example.com>: user unknown",
      rejected: ["client@example.com"],
    }
  );
}

describe("describeMailError", () => {
  it("keeps only the name and SMTP codes", () => {
    const summary = describeMailError(smtpRejection());
    expect(summary).toBe("Error code=EENVELOPE responseCode=550 command=RCPT TO");
    expect(summary).not.toContain("@");
  });

  it("drops a code/command that could carry data", () => {
    const error = Object.assign(new TypeError("x"), { code: "a@b.c", command: "RCPT TO:<a@b.c>" });
    expect(describeMailError(error)).toBe("TypeError");
  });

  it("handles non-errors", () => {
    expect(describeMailError("550 <a@b.c>")).toBe("UnknownError");
    expect(describeMailError(null)).toBe("UnknownError");
  });
});

describe("sendMail", () => {
  const message = {
    kind: "order-status" as const,
    to: "client@example.com",
    subject: "S",
    html: "<p>x</p>",
    text: "x",
  };

  function fakePayload(sendEmail: (options: unknown) => Promise<unknown>) {
    return {
      email: { name: "nodemailer" },
      sendEmail: vi.fn(sendEmail),
      logger: { info: vi.fn(), warn: vi.fn() },
    };
  }

  async function load(siteEnv: string, interceptTo = "") {
    vi.stubEnv("SITE_ENV", siteEnv);
    vi.stubEnv("MAIL_INTERCEPT_TO", interceptTo);
    return import("./send");
  }

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:1/test");
    vi.stubEnv("PAYLOAD_SECRET", "test-payload-secret-test-payload-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("production: sends and logs no addresses", async () => {
    const { sendMail } = await load("production");
    const payload = fakePayload(async () => ({ messageId: "<m@x>" }));
    await expect(sendMail(payload as never, message)).resolves.toEqual({
      sentTo: ["client@example.com"],
    });
    expect(payload.sendEmail).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(payload.logger.info.mock.calls)).not.toContain("@example.com");
  });

  it("staging without MAIL_INTERCEPT_TO: refuses before calling the adapter", async () => {
    const { sendMail } = await load("staging");
    const { MailBlockedError } = await import("@/payload/email");
    const payload = fakePayload(async () => ({}));
    await expect(sendMail(payload as never, message)).rejects.toBeInstanceOf(MailBlockedError);
    expect(payload.sendEmail).not.toHaveBeenCalled();
    expect(payload.logger.warn).toHaveBeenCalledTimes(1);
  });

  it("staging with MAIL_INTERCEPT_TO: hands the message to the (intercepting) adapter", async () => {
    const { sendMail } = await load("staging", "qa@example.test");
    const payload = fakePayload(async () => ({}));
    await sendMail(payload as never, message);
    expect(payload.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("re-throws SMTP failures without addresses", async () => {
    const { sendMail, MailDeliveryError: DeliveryError } = await load("development");
    const payload = fakePayload(async () => {
      throw smtpRejection();
    });
    const error: unknown = await sendMail(payload as never, message).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DeliveryError);
    expect((error as Error).message).toBe(
      "sendMail(order-status): доставка не удалась — Error code=EENVELOPE responseCode=550 command=RCPT TO"
    );
    expect((error as Error).message).not.toContain("@");
    expect(error).not.toHaveProperty("cause");
  });

  it("MailDeliveryError never embeds the original message", () => {
    expect(new MailDeliveryError("new-lead", smtpRejection()).message).not.toContain("@");
  });
});
