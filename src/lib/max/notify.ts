import { JOB_WRITE_CONTEXT } from "@/jobs/shared";
import type { NotificationLog } from "@/payload-types";
import { MAX_UNCONFIRMED_CODE, MaxApiError, maxSendMessage } from "./client";
import { decorateMaxText, resolveMaxTarget } from "./target";
import type { MaxMessage } from "./messages";
import type { MaxTarget } from "./target";
import type { Payload } from "payload";

/**
 * Idempotent delivery of one MAX notification to one recipient (task 10).
 *
 * One `notification-log.key` = one message to one recipient. The row is reserved as `pending`
 * BEFORE sending and turned into `sent` / `failed` after, so a retried job (or a second job for
 * the same event) never sends twice:
 *  - `sent` → `duplicate`;
 *  - `pending` → `duplicate` too: the outcome of that attempt is unknown (a parallel run, or a
 *    crash between the API call and the bookkeeping), and a double message is worse than a lost
 *    one for a shared bot;
 *  - `failed` with `MAX_UNCONFIRMED_CODE` → `duplicate`: the API took the message but did not
 *    confirm it, a resend could deliver it twice;
 *  - any other `failed` / `skipped` → the row is reused and the message is sent again.
 *
 * Only `maxSendMessage` is retryable: when it succeeded but the `sent` mark cannot be written,
 * the result is still `sent` (the row stays `pending` and is never sent again).
 *
 * Journal writes deliberately go WITHOUT the job's `req`: they must survive a rollback of the
 * job transaction (a retried job that lost the `sent` mark would send a duplicate).
 *
 * The recipient always passes `resolveMaxTarget` (outside production: only the intercept chat or
 * nothing) and the text always passes `decorateMaxText` (source line «[ТЕСТ] Inex Glass» outside
 * production): the bot is shared with another site.
 *
 * Logs carry ids, statuses and error codes only — never texts, names or phones.
 */

export type MaxDeliveryEvent = NotificationLog["event"];
export type MaxDeliveryChannel = NotificationLog["channel"];

export type MaxDelivery = {
  key: string;
  event: MaxDeliveryEvent;
  channel: MaxDeliveryChannel;
  leadId?: string;
  orderId?: string;
  /** `users.id` of the recipient for `channel = user`. */
  recipientId?: string;
  target: { chatId?: string; userId?: string };
  message: MaxMessage;
};

export type DeliveryResult = "sent" | "duplicate" | "skipped" | "failed" | "disabled";

/** A retryable failure (429, 5xx, network): the job handler rethrows it so the queue retries. */
export class MaxTransientError extends Error {
  override name = "MaxTransientError";
}

/** MAX allows 2 messages per second into one chat; a little headroom on top. */
export const MAX_CHAT_INTERVAL_MS = 550;

const COLLECTION = "notification-log" as const;

/** `notification-log.error` prefix of a retryable failure («retry: 429»). */
export const RETRY_ERROR_PREFIX = "retry: ";

// ---------------------------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------------------------

const groupKey = (base: string) => `${base}:group`;
const userKey = (base: string, userId: string) => `${base}:user:${userId}`;

/** Normalized ISO time (the same instant always gives the same key). */
function isoKey(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/**
 * `notification-log.key` builders: `max:<event>:<id>[:<suffix>]` + channel (`:group` or
 * `:user:<userId>`). An assignment carries the job id: retries of one job share the key, a later
 * re-assignment of the same person is a new message.
 */
export const maxKeys = {
  newLead: (leadId: string) => groupKey(`max:new-lead:${leadId}`),
  assigned: (leadId: string, jobId: string, userId: string) =>
    userKey(`max:assigned:${leadId}:${jobId}`, userId),
  statusGroup: (leadId: string, changedAt: string) =>
    groupKey(`max:status:${leadId}:${isoKey(changedAt)}`),
  statusUser: (leadId: string, changedAt: string, userId: string) =>
    userKey(`max:status:${leadId}:${isoKey(changedAt)}`, userId),
  orderGroup: (orderId: string, status: string) => groupKey(`max:order:${orderId}:${status}`),
  orderUser: (orderId: string, status: string, userId: string) =>
    userKey(`max:order:${orderId}:${status}`, userId),
  unassigned: (leadId: string) => groupKey(`max:unassigned:${leadId}`),
} as const;

// ---------------------------------------------------------------------------------------------
// Throttling
// ---------------------------------------------------------------------------------------------

/** Earliest time of the next message per chat/user (this process only; a safety net). */
const nextSlotAt = new Map<string, number>();

const chatKey = (target: MaxTarget): string =>
  "chatId" in target ? `chat:${target.chatId}` : `user:${target.userId}`;

/**
 * Reserves the next free slot of the chat synchronously (so parallel calls queue up behind each
 * other) and resolves when it comes.
 */
async function waitForSlot(key: string): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlotAt.get(key) ?? 0);
  nextSlotAt.set(key, slot + MAX_CHAT_INTERVAL_MS);
  const delay = slot - now;
  if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay));
}

/** After a 429 the chat stays quiet for as long as the server asked. */
function postpone(key: string, delayMs: number | undefined): void {
  if (!delayMs || delayMs <= 0) return;
  nextSlotAt.set(key, Math.max(nextSlotAt.get(key) ?? 0, Date.now() + delayMs));
}

/** Test hook: forget the throttling state. */
export function resetMaxThrottle(): void {
  nextSlotAt.clear();
}

// ---------------------------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------------------------

type LogRow = Pick<NotificationLog, "id" | "status" | "error">;

async function findRow(payload: Payload, key: string): Promise<LogRow | null> {
  const { docs } = await payload.find({
    collection: COLLECTION,
    where: { key: { equals: key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { status: true, error: true },
  });
  const row = docs[0];
  return row ? { id: row.id, status: row.status, error: row.error ?? null } : null;
}

/**
 * The API accepted the request but confirmed no message id (`MAX_UNCONFIRMED_CODE`): the message
 * may well be delivered, so such a row counts as sent and is never sent again.
 */
const isUnconfirmed = (row: LogRow): boolean =>
  row.status === "failed" && (row.error ?? "").includes(MAX_UNCONFIRMED_CODE);

function rowData(d: Omit<MaxDelivery, "target" | "message">) {
  return {
    key: d.key,
    event: d.event,
    channel: d.channel,
    lead: d.leadId ?? null,
    order: d.orderId ?? null,
    recipient: d.recipientId ?? null,
  };
}

async function updateRow(
  payload: Payload,
  id: string,
  data: Partial<Omit<NotificationLog, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  await payload.update({ collection: COLLECTION, id, data, depth: 0, overrideAccess: true });
}

/**
 * Reserves the key: an existing `failed`/`skipped` row is reused, otherwise a new `pending` row
 * is created. `null` = someone else owns the key (already sent, in flight, or a parallel insert
 * won the unique index).
 */
async function reserve(
  payload: Payload,
  d: MaxDelivery,
  target: MaxTarget
): Promise<string | null> {
  const chatId = "chatId" in target ? target.chatId : null;
  const existing = await findRow(payload, d.key);
  if (existing) {
    if (existing.status === "sent" || existing.status === "pending" || isUnconfirmed(existing)) {
      return null;
    }
    await updateRow(payload, existing.id, { status: "pending", error: null, chatId });
    return existing.id;
  }
  try {
    const created = await payload.create({
      collection: COLLECTION,
      data: { ...rowData(d), chatId, status: "pending" },
      depth: 0,
      overrideAccess: true,
    });
    return created.id;
  } catch (error) {
    // Unique `key`: a parallel delivery inserted it first. Anything else is a real failure.
    if (await findRow(payload, d.key)) return null;
    throw new MaxTransientError(`notification-log reserve failed: ${errorName(error)}`);
  }
}

// ---------------------------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------------------------

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

/** «403 chat.denied» — what the journal and the logs keep about an API error. */
function apiErrorText(error: MaxApiError): string {
  return `${error.status}${error.code ? ` ${error.code}` : ""}`;
}

/**
 * Non-API errors that a retry cannot fix: the client's own input checks (`TypeError`: no
 * recipient, a non-https button URL).
 */
const isPermanentLocalError = (error: unknown): boolean => error instanceof TypeError;

async function markBotStopped(payload: Payload, userId: string): Promise<void> {
  try {
    await payload.update({
      collection: "users",
      id: userId,
      data: { maxBotStopped: true },
      depth: 0,
      overrideAccess: true,
      context: JOB_WRITE_CONTEXT,
    });
  } catch (error) {
    payload.logger.error({
      msg: "max: failed to mark the bot as stopped",
      userId,
      error: errorName(error),
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

export async function deliverMaxNotification(
  payload: Payload,
  d: MaxDelivery
): Promise<DeliveryResult> {
  const target = resolveMaxTarget(d.target);
  if (!target) return "disabled";

  const rowId = await reserve(payload, d, target);
  if (rowId === null) return "duplicate";

  const slotKey = chatKey(target);
  await waitForSlot(slotKey);

  // Only the API call itself is retryable. Once it succeeded nothing below may turn the delivery
  // into a retry: a retried job would send the message twice.
  let messageId: string;
  try {
    ({ messageId } = await maxSendMessage({
      ...target,
      text: decorateMaxText(d.message.text),
      ...(d.message.buttons ? { buttons: d.message.buttons } : {}),
      notify: true,
    }));
  } catch (error) {
    return handleSendError(payload, d, target, rowId, slotKey, error);
  }

  try {
    await updateRow(payload, rowId, {
      status: "sent",
      messageId,
      chatId: "chatId" in target ? target.chatId : target.userId,
      sentAt: new Date().toISOString(),
      error: null,
    });
  } catch (error) {
    // The message is delivered; the row stays `pending`, which `reserve` never sends again.
    payload.logger.error({
      msg: "max: sent, but failed to journal it",
      key: d.key,
      rowId,
      error: errorName(error),
    });
  }
  return "sent";
}

/**
 * Journals a failed `maxSendMessage`: a permanent error → `failed` (no retry); anything else →
 * a retryable row + `MaxTransientError` for the queue.
 */
async function handleSendError(
  payload: Payload,
  d: MaxDelivery,
  target: MaxTarget,
  rowId: string,
  slotKey: string,
  error: unknown
): Promise<DeliveryResult> {
  if (error instanceof MaxApiError && error.permanent) {
    await updateRow(payload, rowId, { status: "failed", error: apiErrorText(error) });
    payload.logger.warn({
      msg: "max: notification failed",
      key: d.key,
      status: error.status,
      code: error.code,
    });
    // Only a real direct chat says something about the user; outside production the target
    // is the intercept chat, and its 403 is not the user's doing.
    if (d.channel === "user" && error.status === 403 && "userId" in target && d.recipientId) {
      await markBotStopped(payload, d.recipientId);
    }
    if (d.channel === "group" && error.status === 404) {
      payload.logger.error({ msg: "max: group chat not found", key: d.key });
    }
    return "failed";
  }
  if (!(error instanceof MaxApiError) && isPermanentLocalError(error)) {
    await updateRow(payload, rowId, { status: "failed", error: errorName(error) });
    payload.logger.error({ msg: "max: notification rejected locally", key: d.key });
    return "failed";
  }

  const reason = error instanceof MaxApiError ? String(error.status) : errorName(error);
  if (error instanceof MaxApiError) postpone(slotKey, error.retryAfterMs);
  await updateRow(payload, rowId, { status: "failed", error: `${RETRY_ERROR_PREFIX}${reason}` });
  payload.logger.warn({ msg: "max: notification will be retried", key: d.key, reason });
  throw new MaxTransientError(`max: ${reason}`);
}

/**
 * Journals a notification that was not sent on purpose («не подключил MAX», «бот остановлен»):
 * the lead history (task 09) shows it. An existing row of the key is left as is.
 */
export async function recordSkipped(
  payload: Payload,
  d: Omit<MaxDelivery, "target" | "message">,
  reason: string
): Promise<void> {
  if (await findRow(payload, d.key)) return;
  try {
    await payload.create({
      collection: COLLECTION,
      data: { ...rowData(d), status: "skipped", error: reason },
      depth: 0,
      overrideAccess: true,
    });
  } catch (error) {
    // A parallel insert of the same key is fine; anything else is only worth a log line.
    if (await findRow(payload, d.key)) return;
    payload.logger.warn({
      msg: "max: failed to journal a skip",
      key: d.key,
      error: errorName(error),
    });
  }
}
