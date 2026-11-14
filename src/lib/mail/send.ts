import {
  EMAIL_ADAPTER_NAME,
  isMailBlocked,
  MailBlockedError,
  warnMailBlockedOnce,
} from "@/payload/email";
import type { Payload, SendEmailOptions } from "payload";

/**
 * The single entry point for outgoing mail of the site (jobs, admin actions).
 *
 * - Staging interception/blocking is applied by the adapter itself (`src/payload/email.ts`), so it
 *   also covers Payload's own mails; nothing here can bypass it. `sendMail` additionally refuses
 *   up front on a blocked staging (defence in depth, and no SMTP round-trip).
 * - Logs carry no personal data and no message body: only the mail kind, recipient count and the
 *   SMTP message id (ТЗ / 152-ФЗ). Delivery errors are re-thrown as `MailDeliveryError` whose
 *   message holds only the error name and SMTP codes: nodemailer's own messages quote the server
 *   response (`550 5.1.1 <client@…>: user unknown`) and would leak addresses into Payload's job
 *   logs and the `payload-jobs` task log.
 * - Without a configured SMTP adapter it throws: a job then fails and is retried visibly instead
 *   of "sending" into Payload's console adapter.
 */

export type MailKind = "new-lead" | "lead-assigned" | "order-status";

export type MailMessage = {
  /** Used only for logs. */
  kind: MailKind;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export class MailNotConfiguredError extends Error {
  constructor() {
    super("SMTP не настроен (SMTP_HOST): письмо не отправлено");
    this.name = "MailNotConfiguredError";
  }
}

/** SMTP verbs nodemailer reports in `error.command` (`"RCPT TO"`, `"CONN"`, `"AUTH PLAIN"`…). */
const SMTP_COMMAND_PATTERN = /^[A-Z][A-Z ]{0,20}$/;

/**
 * Address-free description of an error: its name plus nodemailer's `code` / `responseCode` /
 * `command`. Never includes `message`, `response`, `rejected` or the stack.
 */
export function describeMailError(error: unknown): string {
  if (typeof error !== "object" || error === null) return "UnknownError";
  const { name, code, responseCode, command } = error as {
    name?: unknown;
    code?: unknown;
    responseCode?: unknown;
    command?: unknown;
  };
  const parts = [typeof name === "string" && name ? name : "Error"];
  if (typeof code === "string" && /^[A-Z0-9_]{1,32}$/.test(code)) parts.push(`code=${code}`);
  if (typeof responseCode === "number") parts.push(`responseCode=${responseCode}`);
  if (typeof command === "string" && SMTP_COMMAND_PATTERN.test(command)) {
    parts.push(`command=${command}`);
  }
  return parts.join(" ");
}

/** Delivery failure without personal data (see `describeMailError`). No `cause` on purpose. */
export class MailDeliveryError extends Error {
  constructor(kind: MailKind, error: unknown) {
    super(`sendMail(${kind}): доставка не удалась — ${describeMailError(error)}`);
    this.name = "MailDeliveryError";
  }
}

const recipientsOf = (to: string | string[]) => (Array.isArray(to) ? to : [to]);

function messageIdOf(info: unknown): string | undefined {
  if (typeof info !== "object" || info === null) return undefined;
  const id = (info as { messageId?: unknown }).messageId;
  return typeof id === "string" ? id : undefined;
}

export async function sendMail(
  payload: Payload,
  message: MailMessage
): Promise<{ sentTo: string[] }> {
  if (payload.email?.name !== EMAIL_ADAPTER_NAME) throw new MailNotConfiguredError();
  if (isMailBlocked()) {
    warnMailBlockedOnce(payload.logger);
    throw new MailBlockedError();
  }

  const sentTo = recipientsOf(message.to).filter((address) => address.trim().length > 0);
  if (sentTo.length === 0) throw new Error(`sendMail(${message.kind}): нет получателей`);

  const options: SendEmailOptions = {
    to: sentTo,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
  };

  let info: unknown;
  try {
    info = await payload.sendEmail(options);
  } catch (error) {
    // Blocked staging stays a `JobCancelledError` (no retries); everything else is sanitized.
    if (error instanceof MailBlockedError) throw error;
    throw new MailDeliveryError(message.kind, error);
  }
  payload.logger.info({
    msg: "mail sent",
    kind: message.kind,
    recipients: sentTo.length,
    messageId: messageIdOf(info),
  });
  return { sentTo };
}
