import { getEnv } from "@/lib/env";
import { toLeadForMessage, unassignedReminderMessage } from "@/lib/max/messages";
import {
  deliverMaxNotification,
  maxKeys,
  MaxTransientError,
  RETRY_ERROR_PREFIX,
} from "@/lib/max/notify";
import type { DeliveryResult } from "@/lib/max/notify";
import type { Lead } from "@/payload-types";
import { describeError, loadSiteSettings, MAINTENANCE_QUEUE, MAINTENANCE_RETRIES } from "./shared";
import type { PayloadRequest, TaskConfig } from "payload";

/**
 * `max-unassigned-reminder` (every 15 min): reminds the MAX group chat about new leads left
 * without an assignee for more than 2 hours, once per lead (task 10). Slug and schedule are a
 * contract frozen by the `admin_redesign` migration: task 10 changes only the handler body.
 *
 * - only leads in the default status («Новая») without an assignee;
 * - window: created 2…72 hours ago — the first run after a release must not flood the chat with
 *   old leads; at most `REMINDER_BATCH` per run (the rest come 15 minutes later);
 * - «once per lead» is the `notification-log` key `max:unassigned:<leadId>:group`.
 */

export const MAX_UNASSIGNED_REMINDER = "max-unassigned-reminder";

const HOUR_MS = 60 * 60 * 1000;
export const REMINDER_AFTER_HOURS = 2;
export const REMINDER_WINDOW_HOURS = 72;
export const REMINDER_BATCH = 10;

export type ReminderOutcome = { sent: number; skipped?: string };

async function defaultStatusId(req: PayloadRequest): Promise<string | null> {
  const { docs } = await req.payload.find({
    collection: "lead-statuses",
    where: { isDefault: { equals: true } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });
  return docs[0] ? String(docs[0].id) : null;
}

/**
 * Keys that must not be sent again: sent, in flight, skipped or failed permanently. Only a
 * retryable failure (`error: "retry: …"`) is picked up again by the next run.
 */
async function journaledKeys(req: PayloadRequest, keys: readonly string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const { docs } = await req.payload.find({
    collection: "notification-log",
    where: { key: { in: keys } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { key: true, status: true, error: true },
    req,
  });
  const retryable = (doc: { status?: string | null; error?: string | null }) =>
    doc.status === "failed" && (doc.error ?? "").startsWith(RETRY_ERROR_PREFIX);
  return new Set(docs.filter((doc) => !retryable(doc)).map((doc) => doc.key));
}

export async function runUnassignedReminder(
  req: PayloadRequest,
  now: Date = new Date()
): Promise<ReminderOutcome> {
  const env = getEnv();
  if (!env.MAX_ENABLED) return { sent: 0, skipped: "max-disabled" };

  const settings = await loadSiteSettings(req);
  const max = settings?.notifications?.max;
  if (max?.unassignedReminder === false) return { sent: 0, skipped: "disabled" };
  const chatId = max?.groupChatId;
  if (!chatId) return { sent: 0, skipped: "no-group-chat" };

  const statusId = await defaultStatusId(req);
  if (!statusId) return { sent: 0, skipped: "no-default-status" };

  const { docs } = await req.payload.find({
    collection: "leads",
    where: {
      and: [
        { status: { equals: statusId } },
        { assignee: { exists: false } },
        { createdAt: { less_than: new Date(now.getTime() - REMINDER_AFTER_HOURS * HOUR_MS) } },
        { createdAt: { greater_than: new Date(now.getTime() - REMINDER_WINDOW_HOURS * HOUR_MS) } },
      ],
    },
    sort: "createdAt",
    limit: REMINDER_BATCH,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const leads = docs as Lead[];
  const done = await journaledKeys(
    req,
    leads.map((lead) => maxKeys.unassigned(lead.id))
  );

  const results: DeliveryResult[] = [];
  let transient = 0;
  for (const lead of leads) {
    const key = maxKeys.unassigned(lead.id);
    if (done.has(key)) continue;
    const hours = Math.floor((now.getTime() - new Date(lead.createdAt).getTime()) / HOUR_MS);
    try {
      results.push(
        await deliverMaxNotification(req.payload, {
          key,
          event: "unassigned_reminder",
          channel: "group",
          leadId: lead.id,
          target: { chatId },
          message: unassignedReminderMessage(
            toLeadForMessage(lead),
            { hours },
            { siteUrl: env.SITE_URL }
          ),
        })
      );
    } catch (error) {
      if (!(error instanceof MaxTransientError)) throw error;
      transient += 1;
    }
  }

  const sent = results.filter((result) => result === "sent").length;
  req.payload.logger.info({
    msg: "max-unassigned-reminder: done",
    candidates: leads.length,
    sent,
    results,
    transient,
  });
  // Retryable failures: the queue retries this run (`MAINTENANCE_RETRIES`) and later runs pick
  // them up as well; leads already reminded are skipped by their keys.
  if (transient > 0) {
    throw new MaxTransientError(`max-unassigned-reminder: ${transient} lead(s) to retry`);
  }
  return { sent };
}

export const maxUnassignedReminderTask: TaskConfig<{ input: object; output: object }> = {
  slug: MAX_UNASSIGNED_REMINDER,
  label: "Напоминание в MAX: заявки без ответственного",
  retries: MAINTENANCE_RETRIES,
  schedule: [{ cron: "*/15 * * * *", queue: MAINTENANCE_QUEUE }],
  handler: async ({ req }) => {
    try {
      await runUnassignedReminder(req);
    } catch (error) {
      if (!(error instanceof MaxTransientError)) {
        req.payload.logger.error({
          msg: "max-unassigned-reminder: failed",
          error: describeError(error),
        });
      }
      throw error;
    }
    return { output: {} };
  },
};
