import { JobCancelledError } from "payload";
import { getEnv } from "@/lib/env";
import type { Env } from "@/lib/env";
import type { EmailAdapter, Payload, SendEmailOptions } from "payload";

/**
 * SMTP e-mail for Payload (`@payloadcms/email-nodemailer`) with staging interception.
 *
 * - dev: Mailpit on `localhost:1025` (UI http://localhost:8025), no TLS;
 * - staging: `MAIL_INTERCEPT_TO` redirects EVERY message (ours and Payload's own, e.g. password
 *   reset) to one mailbox; the subject keeps the original recipients. Staging WITHOUT
 *   `MAIL_INTERCEPT_TO` sends nothing at all (`MailBlockedError`): a staging copy of real data
 *   must never mail real clients or the shared sales mailboxes;
 * - prod: Yandex 360 / Mail.ru SMTP (465 → implicit TLS).
 *
 * Without `SMTP_HOST` no adapter is configured: Payload falls back to its console adapter and
 * `sendMail` (src/lib/mail/send.ts) refuses to "send", so jobs fail visibly instead of silently.
 */

export const EMAIL_ADAPTER_NAME = "nodemailer";
export const DEFAULT_FROM_NAME = "Inex Glass";

const SMTPS_PORT = 465;
/** Hosts of the local Mailpit (docker-compose service name or a port on localhost). */
const PLAIN_SMTP_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "mailpit"]);

type Headers = NonNullable<SendEmailOptions["headers"]>;

/** `"Name <a@b>"` | `"a@b"` → parts. Returns `null` for an empty value. */
export function parseMailbox(value: string | undefined): { address: string; name?: string } | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(trimmed);
  if (!match) return { address: trimmed };
  const name = match[1]?.trim();
  const address = match[2]?.trim() ?? "";
  return name ? { address, name } : { address };
}

/** Address of a nodemailer recipient: a string or `{ name?, address? }`. */
function recipientToString(recipient: unknown): string {
  if (typeof recipient === "string") return recipient;
  if (typeof recipient === "object" && recipient !== null && "address" in recipient) {
    const { address } = recipient as { address?: unknown };
    return typeof address === "string" ? address : "";
  }
  return "";
}

/** Flat list of addresses of a `to`/`cc`/`bcc` value (comma-separated strings are split). */
export function listRecipients(value: SendEmailOptions["to"]): string[] {
  if (value === undefined || value === null) return [];
  const items: readonly unknown[] = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => recipientToString(item).split(","))
    .map((address) => address.trim())
    .filter((address) => address.length > 0);
}

function withHeader(headers: SendEmailOptions["headers"], key: string, value: string): Headers {
  if (Array.isArray(headers)) return [...headers, { key, value }];
  return { ...(headers ?? {}), [key]: value };
}

/**
 * Staging interception (pure). With `interceptTo` set, the message goes ONLY to that address:
 * `cc`/`bcc` are dropped, the subject gets `[STAGING → <original recipients>] ` and the original
 * recipients are kept in `X-Original-To` (and `X-Original-Cc` when present). Without
 * `interceptTo` the message is returned unchanged.
 */
export function applyIntercept(
  message: SendEmailOptions,
  interceptTo: string | null | undefined = getEnv().MAIL_INTERCEPT_TO
): SendEmailOptions {
  const target = interceptTo?.trim();
  if (!target) return message;

  const originalTo = listRecipients(message.to);
  const originalCc = listRecipients(message.cc);
  const shownTo = originalTo.length > 0 ? originalTo.join(", ") : "без получателя";

  let headers = withHeader(message.headers, "X-Original-To", shownTo);
  if (originalCc.length > 0) headers = withHeader(headers, "X-Original-Cc", originalCc.join(", "));

  // `cc`/`bcc` are removed (not emptied): nodemailer treats an empty string as "no address" too,
  // but an absent key is unambiguous.
  const { cc: _cc, bcc: _bcc, ...rest } = message;
  return {
    ...rest,
    to: target,
    subject: `[STAGING → ${shownTo}] ${message.subject ?? ""}`.trimEnd(),
    headers,
  };
}

/** Env values that decide where (and whether) a message may go. */
export type MailRoutingEnv = Pick<Env, "SITE_ENV" | "MAIL_INTERCEPT_TO">;

type WarnLogger = Pick<Payload["logger"], "warn">;

export const MAIL_BLOCKED_MESSAGE =
  "Почта на staging заблокирована: MAIL_INTERCEPT_TO не задан — письмо не отправлено";

/**
 * Thrown instead of sending on staging without `MAIL_INTERCEPT_TO`.
 *
 * Extends Payload's `JobCancelledError` on purpose: a mail job that hits it is cancelled (visible
 * in the admin with this message, `error.cancelled = true`) instead of being retried 5 times —
 * the configuration will not fix itself between retries. Outside jobs (e.g. Payload's
 * password-reset mail) it is an ordinary error and the request fails visibly.
 */
export class MailBlockedError extends JobCancelledError {
  constructor() {
    super(MAIL_BLOCKED_MESSAGE);
    this.name = "MailBlockedError";
  }
}

/** `true` when outgoing mail must be refused: staging without an intercept mailbox. */
export function isMailBlocked(env: MailRoutingEnv = getEnv()): boolean {
  return env.SITE_ENV === "staging" && !env.MAIL_INTERCEPT_TO?.trim();
}

let blockedWarningLogged = false;

/** Logs the "staging mail is blocked" warning once per process (not once per message). */
export function warnMailBlockedOnce(logger: WarnLogger): void {
  if (blockedWarningLogged) return;
  blockedWarningLogged = true;
  logger.warn({
    msg: `${MAIL_BLOCKED_MESSAGE}. Задайте MAIL_INTERCEPT_TO, чтобы получать письма staging.`,
  });
}

/** Test hook: lets each test observe the one-time warning again. */
export function resetMailBlockedWarning(): void {
  blockedWarningLogged = false;
}

/**
 * Routing applied to EVERY outgoing message:
 * - staging without `MAIL_INTERCEPT_TO` → throws `MailBlockedError` (warning logged once);
 * - `MAIL_INTERCEPT_TO` set → redirected via `applyIntercept`;
 * - otherwise (production, development/Mailpit) → unchanged.
 */
export function routeOutgoingMail(
  message: SendEmailOptions,
  env: MailRoutingEnv,
  logger: WarnLogger
): SendEmailOptions {
  if (isMailBlocked(env)) {
    warnMailBlockedOnce(logger);
    throw new MailBlockedError();
  }
  // `?? null`: an explicit "no intercept" (`undefined` would fall back to `getEnv()`).
  return applyIntercept(message, env.MAIL_INTERCEPT_TO ?? null);
}

/** Fallback sender when `SMTP_FROM` is not set: `noreply@<SITE_URL host>`. */
function defaultFromAddress(siteUrl: string): string {
  return `noreply@${new URL(siteUrl).hostname}`;
}

/**
 * `true` when SMTP is configured. Payload's `email` key must then be set; without it Payload
 * uses its console adapter (decided synchronously: a Promise resolving to nothing is invalid).
 */
export const isSmtpConfigured = (): boolean => Boolean(getEnv().SMTP_HOST);

/**
 * Payload `email` config value: a nodemailer adapter whose `sendEmail` applies `applyIntercept`.
 * Call only when `isSmtpConfigured()`.
 */
export async function createEmailAdapter(): Promise<EmailAdapter> {
  const env = getEnv();
  if (!env.SMTP_HOST) throw new Error("createEmailAdapter: SMTP_HOST не задан");

  // Imported lazily: keeps `payload` out of the unit tests that import `applyIntercept`.
  const { nodemailerAdapter } = await import("@payloadcms/email-nodemailer");
  const from = parseMailbox(env.SMTP_FROM);
  const port = env.SMTP_PORT ?? SMTPS_PORT;

  const base = await nodemailerAdapter({
    defaultFromAddress: from?.address ?? defaultFromAddress(env.SITE_URL),
    defaultFromName: from?.name ?? DEFAULT_FROM_NAME,
    // No SMTP handshake on config load: it would run on every `next build` / CLI command (and
    // time out while the event loop is busy). Real delivery errors fail the mail job instead.
    skipVerify: true,
    transportOptions: {
      host: env.SMTP_HOST,
      port,
      secure: port === SMTPS_PORT,
      ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } } : {}),
      // Mailpit speaks plain SMTP; everything else must negotiate TLS.
      ignoreTLS: PLAIN_SMTP_HOSTS.has(env.SMTP_HOST),
    },
  });

  return ({ payload }) => {
    const adapter = base({ payload });
    // Announce a blocked staging at startup, not only when the first mail is attempted.
    if (isMailBlocked(env)) warnMailBlockedOnce(payload.logger);
    return {
      ...adapter,
      // `async`: a `MailBlockedError` becomes a rejected promise, like any delivery error.
      sendEmail: async (message) =>
        adapter.sendEmail(routeOutgoingMail(message, env, payload.logger)),
    };
  };
}
