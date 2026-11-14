import { relationIdOf } from "@/lib/leads-admin/export-rows";
import { LEAD_REFUSE_REASON_CODES } from "@/payload/collections/crm/constants";
import { loadLeadStatuses, loadStaffNames } from "../data";
import { buildLeadTimeline } from "./build-timeline";
import type { NotificationRow, TimelineItem, VersionSnapshot } from "./build-timeline";
import type { Payload, TypedUser } from "payload";

/**
 * Server loader of the lead timeline (Local API). Access:
 * - the lead, its versions and orders are read with the viewer's rights (`overrideAccess:
 *   false`): no access to the lead → `null`, the card renders no history;
 * - `notification-log` is closed to managers over REST, but the lead access is already checked
 *   above and only this lead's rows are selected, so it is read with `overrideAccess: true`;
 *   only the `NotificationRow` fields leave this module (never `chatId` / `messageId`);
 * - lookups (statuses, staff names, the group chat title) are system reads.
 *
 * Secondary sources (orders, the MAX journal, the chat title) degrade to empty on an error: a
 * broken journal must not hide the rest of the history.
 */

/** Same as `versions.maxPerDoc` of `leads`: every kept version. */
const VERSIONS_LIMIT = 50;
const NOTIFICATIONS_LIMIT = 100;
const ORDERS_LIMIT = 20;

const REASON_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_REFUSE_REASON_CODES.map((option) => [option.value, option.label])
);

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Logs keep the error class only: messages may carry query values (personal data). */
const errorName = (error: unknown): string => (error instanceof Error ? error.name : typeof error);

async function loadVersions(
  payload: Payload,
  user: TypedUser,
  leadId: string
): Promise<VersionSnapshot[]> {
  const { docs } = await payload.findVersions({
    collection: "leads",
    where: { parent: { equals: leadId } },
    sort: "createdAt",
    limit: VERSIONS_LIMIT,
    depth: 0,
    overrideAccess: false,
    user,
  });
  return docs.map((doc) => {
    const version = doc.version;
    return {
      id: String(doc.id),
      createdAt: doc.createdAt,
      status: relationIdOf(version.status),
      assignee: relationIdOf(version.assignee),
      refuseReasonCode: stringOrNull(version.refuseReasonCode),
      refuseReason: stringOrNull(version.refuseReason),
      kpAmount: numberOrNull(version.kpAmount),
      updatedBy: relationIdOf(version.updatedBy),
    };
  });
}

async function loadNotifications(payload: Payload, leadId: string): Promise<NotificationRow[]> {
  try {
    const { docs } = await payload.find({
      collection: "notification-log",
      where: { lead: { equals: leadId } },
      sort: "-createdAt",
      limit: NOTIFICATIONS_LIMIT,
      depth: 0,
      // Deliberate: see the module comment (lead access is checked by the caller).
      overrideAccess: true,
      select: {
        event: true,
        channel: true,
        status: true,
        recipient: true,
        error: true,
        sentAt: true,
        createdAt: true,
      },
    });
    return docs.map((doc) => ({
      id: String(doc.id),
      event: doc.event,
      channel: doc.channel,
      status: doc.status,
      recipient: relationIdOf(doc.recipient),
      error: stringOrNull(doc.error),
      sentAt: stringOrNull(doc.sentAt),
      createdAt: doc.createdAt,
    }));
  } catch (error) {
    payload.logger.error({
      msg: "lead history: notification log lookup failed",
      errorName: errorName(error),
    });
    return [];
  }
}

async function loadOrders(payload: Payload, user: TypedUser, leadId: string) {
  try {
    const { docs } = await payload.find({
      collection: "orders",
      where: { lead: { equals: leadId } },
      depth: 0,
      limit: ORDERS_LIMIT,
      overrideAccess: false,
      user,
      select: { number: true, createdAt: true },
    });
    return docs.map((doc) => ({
      id: String(doc.id),
      number: stringOrNull(doc.number),
      createdAt: doc.createdAt,
    }));
  } catch (error) {
    payload.logger.error({
      msg: "lead history: orders lookup failed",
      errorName: errorName(error),
    });
    return [];
  }
}

async function loadGroupChatTitle(payload: Payload): Promise<string | null> {
  try {
    const settings = await payload.findGlobal({
      slug: "site-settings",
      depth: 0,
      overrideAccess: true,
      select: { notifications: true },
    });
    return stringOrNull(settings.notifications?.max?.groupChatTitle);
  } catch {
    // The title is decoration («в чат «…»»); without it the item says «в групповой чат».
    return null;
  }
}

/** Timeline of the lead for `user`, newest first; `null` when the user may not read the lead. */
export async function loadLeadTimeline(
  payload: Payload,
  user: TypedUser,
  leadId: string
): Promise<TimelineItem[] | null> {
  let lead;
  try {
    lead = await payload.findByID({
      collection: "leads",
      id: leadId,
      depth: 0,
      overrideAccess: false,
      user,
      disableErrors: true,
      select: {
        createdAt: true,
        formType: true,
        newLeadNotifiedAt: true,
        assigneeNotifiedAt: true,
      },
    });
  } catch {
    // Forbidden (no read access) is still thrown with `disableErrors`; treat it as «no lead».
    return null;
  }
  if (!lead) return null;

  const [versions, notifications, orders, statuses, staff, groupChatTitle] = await Promise.all([
    loadVersions(payload, user, leadId),
    loadNotifications(payload, leadId),
    loadOrders(payload, user, leadId),
    loadLeadStatuses(payload),
    loadStaffNames(payload),
    loadGroupChatTitle(payload),
  ]);

  return buildLeadTimeline({
    lead: {
      createdAt: lead.createdAt,
      formType: stringOrNull(lead.formType),
      newLeadNotifiedAt: stringOrNull(lead.newLeadNotifiedAt),
      assigneeNotifiedAt: stringOrNull(lead.assigneeNotifiedAt),
    },
    versions,
    notifications,
    orders,
    statuses: new Map(
      statuses.map((status) => [
        status.id,
        { name: status.name, requiresReason: status.requiresReason },
      ])
    ),
    staff,
    reasons: REASON_LABELS,
    groupChatTitle,
  });
}
