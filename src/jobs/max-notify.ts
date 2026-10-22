import { getEnv } from "@/lib/env";
import {
  assignedMessage,
  newLeadMessage,
  orderEventMessage,
  statusChangeMessage,
  toLeadForMessage,
  toOrderForMessage,
} from "@/lib/max/messages";
import {
  deliverMaxNotification,
  maxKeys,
  MaxTransientError,
  recordSkipped,
} from "@/lib/max/notify";
import type { DeliveryResult, MaxDelivery } from "@/lib/max/notify";
import { isOrderStatus, statusLabel } from "@/lib/orders/status";
import { LEAD_REFUSE_REASON_CODES } from "@/payload/collections/crm/constants";
import type { Lead, LeadStatus, SiteSetting, User } from "@/payload-types";
import { describeError, loadSiteSettings, MAIL_RETRIES, relationId } from "./shared";
import type { PayloadRequest, TaskConfig } from "payload";

/**
 * `max-notify`: one messenger (MAX) notification about a lead or order event. Queued by the
 * `leadMaxNotify` / `orderMaxNotify` hooks (task 10). Slug and input shape are a contract frozen
 * by the `admin_redesign` migration: task 10 changes only the handler body.
 *
 * Recipients per event (toggles in «Настройки сайта → Уведомления → MAX»):
 *  - `new_lead` → group chat (`newLead`);
 *  - `assigned` → the assignee's direct chat (`assigned`), not when they assigned themselves;
 *  - `status_change` → the assignee's direct chat ALWAYS (unless they made the change) + the
 *    group when `statusChange` is on;
 *  - `order_event` → group + the order manager's direct chat (`orderEvents`).
 *
 * Every recipient is delivered independently and idempotently (`notification-log` keys). A
 * retryable failure of any of them fails the job after the loop, so the queue retries it
 * (`MAIL_RETRIES`); recipients already served answer `duplicate` on the retry.
 */

export const MAX_NOTIFY = "max-notify";

export const MAX_NOTIFY_EVENTS = ["new_lead", "status_change", "assigned", "order_event"] as const;

export type MaxNotifyEvent = (typeof MAX_NOTIFY_EVENTS)[number];

export type MaxNotifyInput = {
  event: MaxNotifyEvent;
  leadId?: string;
  orderId?: string;
  assigneeId?: string;
  statusChangedAt?: string;
  /** Status id before the change — «из → в» in the message (task 10). */
  previousStatus?: string;
  orderStatus?: string;
};

export type MaxNotifyOutcome = { sent: number; skipped?: string };

/** Display name of a staff user who made a change; `null` author = automation. */
const SYSTEM_AUTHOR = "Система";
const UNNAMED_USER = "Без имени";

export const SKIP_REASON_NOT_LINKED = "не подключил MAX";
export const SKIP_REASON_BOT_STOPPED = "бот остановлен";

const REFUSE_REASON_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_REFUSE_REASON_CODES.map((option) => [option.value, option.label])
);

type MaxSettings = NonNullable<NonNullable<SiteSetting["notifications"]>["max"]>;
type StaffUser = Pick<User, "id" | "name" | "maxUserId" | "maxBotStopped">;

interface RunContext {
  req: PayloadRequest;
  max: MaxSettings;
  siteUrl: string;
  /** Results of the deliveries; retryable failures are collected, not thrown at once. */
  results: DeliveryResult[];
  transient: number;
}

// ---------------------------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------------------------

async function loadLead(req: PayloadRequest, id: string | undefined): Promise<Lead | null> {
  if (!id) return null;
  return (await req.payload.findByID({
    collection: "leads",
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })) as Lead | null;
}

/** Staff users by id (name and MAX link only). */
async function loadUsers(
  req: PayloadRequest,
  ids: readonly (string | null)[]
): Promise<Map<string, StaffUser>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const { docs } = await req.payload.find({
    collection: "users",
    where: { id: { in: unique } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { name: true, maxUserId: true, maxBotStopped: true },
    req,
  });
  return new Map(docs.map((doc) => [String(doc.id), doc as StaffUser]));
}

async function loadStatuses(
  req: PayloadRequest,
  ids: readonly (string | null)[]
): Promise<Map<string, LeadStatus>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const { docs } = await req.payload.find({
    collection: "lead-statuses",
    where: { id: { in: unique } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  });
  return new Map(docs.map((doc) => [String(doc.id), doc]));
}

const authorName = (users: Map<string, StaffUser>, id: string | null): string =>
  id ? users.get(id)?.name?.trim() || UNNAMED_USER : SYSTEM_AUTHOR;

/** «Дорого: клиент нашёл дешевле» — label of the code and/or the free text. */
export function refuseReasonText(code: unknown, text: unknown): string | null {
  const label = typeof code === "string" ? (REFUSE_REASON_LABELS.get(code) ?? null) : null;
  const free = typeof text === "string" && text.trim() !== "" ? text.trim() : null;
  if (label && free) return `${label}: ${free}`;
  return label ?? free;
}

// ---------------------------------------------------------------------------------------------
// Delivery helpers
// ---------------------------------------------------------------------------------------------

async function deliver(ctx: RunContext, delivery: MaxDelivery): Promise<void> {
  try {
    ctx.results.push(await deliverMaxNotification(ctx.req.payload, delivery));
  } catch (error) {
    if (!(error instanceof MaxTransientError)) throw error;
    ctx.transient += 1;
  }
}

/**
 * Direct message to a staff user: journals a skip when they have not linked MAX or stopped the
 * bot (visible in the lead history), otherwise delivers.
 */
async function deliverToUser(
  ctx: RunContext,
  user: StaffUser | undefined,
  delivery: Omit<MaxDelivery, "channel" | "target" | "recipientId"> & { recipientId: string }
): Promise<void> {
  const { message, ...rest } = delivery;
  const journal = { ...rest, channel: "user" as const };
  if (!user?.maxUserId) {
    await recordSkipped(ctx.req.payload, journal, SKIP_REASON_NOT_LINKED);
    ctx.results.push("skipped");
    return;
  }
  if (user.maxBotStopped) {
    await recordSkipped(ctx.req.payload, journal, SKIP_REASON_BOT_STOPPED);
    ctx.results.push("skipped");
    return;
  }
  await deliver(ctx, { ...journal, message, target: { userId: user.maxUserId } });
}

/** Group message when a group chat is linked (otherwise silently nothing). */
async function deliverToGroup(
  ctx: RunContext,
  delivery: Omit<MaxDelivery, "channel" | "target">
): Promise<void> {
  const chatId = ctx.max.groupChatId;
  if (!chatId) return;
  await deliver(ctx, { ...delivery, channel: "group", target: { chatId } });
}

// ---------------------------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------------------------

async function onNewLead(ctx: RunContext, input: MaxNotifyInput): Promise<string | undefined> {
  if (ctx.max.newLead === false) return "disabled";
  if (!ctx.max.groupChatId) return "no-group-chat";
  const lead = await loadLead(ctx.req, input.leadId);
  if (!lead) return "lead-not-found";
  await deliverToGroup(ctx, {
    key: maxKeys.newLead(lead.id),
    event: "new_lead",
    leadId: lead.id,
    message: newLeadMessage(toLeadForMessage(lead), { siteUrl: ctx.siteUrl }),
  });
  return undefined;
}

async function onAssigned(
  ctx: RunContext,
  input: MaxNotifyInput,
  jobId: string
): Promise<string | undefined> {
  if (ctx.max.assigned === false) return "disabled";
  const lead = await loadLead(ctx.req, input.leadId);
  if (!lead) return "lead-not-found";
  const assigneeId = input.assigneeId;
  if (!assigneeId || relationId(lead.assignee) !== assigneeId) return "assignee-changed";
  const authorId = relationId(lead.updatedBy);
  if (authorId === assigneeId) return "self-assigned";

  const users = await loadUsers(ctx.req, [assigneeId, authorId]);
  await deliverToUser(ctx, users.get(assigneeId), {
    key: maxKeys.assigned(lead.id, jobId, assigneeId),
    event: "assigned",
    leadId: lead.id,
    recipientId: assigneeId,
    message: assignedMessage(
      toLeadForMessage(lead),
      { assignedBy: authorName(users, authorId) },
      { siteUrl: ctx.siteUrl }
    ),
  });
  return undefined;
}

const sameInstant = (a: unknown, b: unknown): boolean => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = new Date(a).getTime();
  const right = new Date(b).getTime();
  return Number.isNaN(left) || Number.isNaN(right) ? a === b : left === right;
};

async function onStatusChange(ctx: RunContext, input: MaxNotifyInput): Promise<string | undefined> {
  const lead = await loadLead(ctx.req, input.leadId);
  if (!lead) return "lead-not-found";
  const changedAt = input.statusChangedAt;
  // A later change has its own job (and key); this one is stale.
  if (!changedAt || !sameInstant(lead.statusChangedAt, changedAt)) return "superseded";

  const toId = relationId(lead.status);
  if (!toId) return "no-status";
  const fromId =
    input.previousStatus && input.previousStatus !== toId ? input.previousStatus : null;
  const statuses = await loadStatuses(ctx.req, [toId, fromId]);
  const to = statuses.get(toId);
  if (!to) return "status-not-found";

  const assigneeId = relationId(lead.assignee);
  const authorId = relationId(lead.updatedBy);
  const users = await loadUsers(ctx.req, [assigneeId, authorId]);
  const message = statusChangeMessage(
    toLeadForMessage(lead),
    {
      from: fromId ? (statuses.get(fromId)?.name ?? null) : null,
      to: to.name,
      reason: to.requiresReason ? refuseReasonText(lead.refuseReasonCode, lead.refuseReason) : null,
      changedBy: authorName(users, authorId),
      isContract: to.isContract === true,
    },
    { siteUrl: ctx.siteUrl }
  );

  // (a) the assignee, always — unless they changed the status themselves.
  if (assigneeId && assigneeId !== authorId) {
    await deliverToUser(ctx, users.get(assigneeId), {
      key: maxKeys.statusUser(lead.id, changedAt, assigneeId),
      event: "status_change",
      leadId: lead.id,
      recipientId: assigneeId,
      message,
    });
  }
  // (b) the group, by the toggle.
  if (ctx.max.statusChange !== false) {
    await deliverToGroup(ctx, {
      key: maxKeys.statusGroup(lead.id, changedAt),
      event: "status_change",
      leadId: lead.id,
      message,
    });
  }
  return undefined;
}

async function onOrderEvent(ctx: RunContext, input: MaxNotifyInput): Promise<string | undefined> {
  if (ctx.max.orderEvents === false) return "disabled";
  const status = input.orderStatus;
  if (!input.orderId || !isOrderStatus(status)) return "bad-input";
  const order = await ctx.req.payload.findByID({
    collection: "orders",
    id: input.orderId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req: ctx.req,
  });
  if (!order) return "order-not-found";

  const leadId = relationId(order.lead);
  const leadCompany = order.company
    ? null
    : ((await loadLead(ctx.req, leadId ?? undefined))?.company ?? null);
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const isNew = history.length === 1 && history[0]?.status === status;
  const message = orderEventMessage(
    toOrderForMessage(order, leadCompany),
    { isNew, statusLabel: statusLabel(status) },
    { siteUrl: ctx.siteUrl }
  );
  const common = {
    event: "order_event" as const,
    orderId: order.id,
    ...(leadId ? { leadId } : {}),
  };

  await deliverToGroup(ctx, { ...common, key: maxKeys.orderGroup(order.id, status), message });

  const managerId = relationId(order.manager);
  if (managerId) {
    const users = await loadUsers(ctx.req, [managerId]);
    await deliverToUser(ctx, users.get(managerId), {
      ...common,
      key: maxKeys.orderUser(order.id, status, managerId),
      recipientId: managerId,
      message,
    });
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------------------------

export async function runMaxNotify(
  input: MaxNotifyInput,
  req: PayloadRequest,
  jobId: string
): Promise<MaxNotifyOutcome> {
  const env = getEnv();
  if (!env.MAX_ENABLED) return { sent: 0, skipped: "max-disabled" };

  const settings = await loadSiteSettings(req);
  const ctx: RunContext = {
    req,
    max: settings?.notifications?.max ?? {},
    siteUrl: env.SITE_URL,
    results: [],
    transient: 0,
  };

  let skipped: string | undefined;
  switch (input.event) {
    case "new_lead":
      skipped = await onNewLead(ctx, input);
      break;
    case "assigned":
      skipped = await onAssigned(ctx, input, jobId);
      break;
    case "status_change":
      skipped = await onStatusChange(ctx, input);
      break;
    case "order_event":
      skipped = await onOrderEvent(ctx, input);
      break;
    default:
      skipped = "unknown-event";
  }

  const sent = ctx.results.filter((result) => result === "sent").length;
  req.payload.logger.info({
    msg: "max-notify: done",
    event: input.event,
    leadId: input.leadId,
    orderId: input.orderId,
    sent,
    results: ctx.results,
    transient: ctx.transient,
    ...(skipped ? { skipped } : {}),
  });
  if (ctx.transient > 0) {
    throw new MaxTransientError(`max-notify: ${ctx.transient} recipient(s) to retry`);
  }
  return { sent, ...(skipped ? { skipped } : {}) };
}

export const maxNotifyTask: TaskConfig<{ input: MaxNotifyInput; output: object }> = {
  slug: MAX_NOTIFY,
  label: "Уведомление в MAX",
  inputSchema: [
    {
      name: "event",
      type: "select",
      required: true,
      options: MAX_NOTIFY_EVENTS.map((value) => ({ label: value, value })),
    },
    { name: "leadId", type: "text" },
    { name: "orderId", type: "text" },
    { name: "assigneeId", type: "text" },
    { name: "statusChangedAt", type: "text" },
    { name: "previousStatus", type: "text" },
    { name: "orderStatus", type: "text" },
  ],
  retries: MAIL_RETRIES,
  // The stub has no `outputSchema` (frozen contract): the counters go to the log only.
  handler: async ({ input, job, req }) => {
    try {
      await runMaxNotify(input, req, String(job.id));
    } catch (error) {
      if (!(error instanceof MaxTransientError)) {
        req.payload.logger.error({
          msg: "max-notify: failed",
          event: input.event,
          error: describeError(error),
        });
      }
      throw error;
    }
    return { output: {} };
  },
};
