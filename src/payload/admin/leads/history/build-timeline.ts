import { formatRub } from "@/lib/domain/format";
import { formTypeLabel } from "@/payload/admin/leads/constants";

/**
 * Timeline of a lead («Комментарии и история» of the lead card, admin redesign task 09).
 *
 * The timeline is not stored anywhere: it is derived from the lead's versions (`_leads_v`, each
 * carries `updatedBy`), the mail stamps of the lead (`newLeadNotifiedAt`, `assigneeNotifiedAt`),
 * the MAX journal (`notification-log`) and the orders of the lead. This module is pure (no
 * Payload, no React): the server loader (`load-timeline.ts`) maps documents into
 * `TimelineInput`, unit tests feed it directly.
 */

export type TimelineKind = "created" | "status" | "assignee" | "kp" | "email" | "max" | "order";

export interface TimelineItem {
  /** Stable key: `${kind}:${source id}` (+ field suffix where one source yields several items). */
  id: string;
  /** ISO date. */
  date: string;
  kind: TimelineKind;
  /** «Сайт», «Система» or a staff member's name. */
  author: string;
  /** Ready Russian sentence. */
  text: string;
  /** `danger`: a failed delivery or a refusal. */
  tone: "default" | "danger";
  /** Link of the item (an order). */
  href?: string;
}

export interface VersionSnapshot {
  id: string;
  /** Date of the version (when the change was saved). */
  createdAt: string;
  /** Lead status id. */
  status: string | null;
  /** Assignee user id. */
  assignee: string | null;
  refuseReasonCode: string | null;
  refuseReason: string | null;
  kpAmount: number | null;
  /** Who saved the version; `null` = a system write (public form, job, script). */
  updatedBy: string | null;
}

export type NotificationEvent =
  "new_lead" | "status_change" | "assigned" | "order_event" | "unassigned_reminder";

export interface NotificationRow {
  id: string;
  event: NotificationEvent;
  channel: "group" | "user";
  /** `pending`: the job reserved the row and the delivery is still in progress (task 10). */
  status: "pending" | "sent" | "failed" | "skipped";
  /** Recipient user id (`user` channel). */
  recipient: string | null;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface TimelineInput {
  lead: {
    createdAt: string;
    formType: string | null;
    newLeadNotifiedAt: string | null;
    assigneeNotifiedAt: string | null;
  };
  /** Any order. */
  versions: VersionSnapshot[];
  notifications: NotificationRow[];
  orders: { id: string; number: string | null; createdAt: string }[];
  statuses: ReadonlyMap<string, { name: string; requiresReason: boolean }>;
  /** User id → display name. */
  staff: ReadonlyMap<string, string>;
  /** `refuseReasonCode` → label. */
  reasons: ReadonlyMap<string, string>;
  groupChatTitle: string | null;
}

export const AUTHOR_SITE = "Сайт";
export const AUTHOR_SYSTEM = "Система";
/** Author or recipient id that is no longer among the users (deleted staff). */
export const AUTHOR_UNKNOWN_STAFF = "Сотрудник";

/**
 * The first version of a lead is written by the same `create` operation as the lead itself, a
 * moment later. A version further away than this is not the creation: older versions were
 * trimmed by `versions.maxPerDoc`, so the creator is unknown and the lead came from the site.
 */
export const CREATION_VERSION_WINDOW_MS = 5_000;
/** Delivery errors come from the MAX API verbatim; the card shows only their beginning. */
export const MAX_ERROR_LENGTH = 200;

const NO_VALUE = "—";
const UNKNOWN_STATUS = "Неизвестный статус";

const MAX_EVENT_PREFIX: Readonly<Record<NotificationEvent, string>> = {
  new_lead: "Новая заявка",
  status_change: "Смена статуса",
  assigned: "Назначение",
  unassigned_reminder: "Напоминание: нет ответственного",
  order_event: "Заказ",
};

/** Milliseconds of an ISO date; an unparsable date sorts as the oldest. */
const timeOf = (iso: string): number => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
};

const staffName = (staff: TimelineInput["staff"], id: string | null): string | null =>
  id === null ? null : (staff.get(id) ?? AUTHOR_UNKNOWN_STAFF);

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}…` : value;

const nonEmpty = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

function createdItem(input: TimelineInput, earliest: VersionSnapshot | undefined): TimelineItem {
  const { lead, statuses, staff } = input;
  // Only a version saved together with the lead describes the creation (see the window above).
  const isCreation =
    earliest !== undefined &&
    Math.abs(timeOf(earliest.createdAt) - timeOf(lead.createdAt)) <= CREATION_VERSION_WINDOW_MS;
  const creator = isCreation ? staffName(staff, earliest.updatedBy) : null;
  const statusId = isCreation ? earliest.status : null;
  const statusName = statusId === null ? null : (statuses.get(statusId)?.name ?? UNKNOWN_STATUS);

  let text = `Заявка создана · ${formTypeLabel(lead.formType)}`;
  if (statusName !== null) text += ` · статус «${statusName}»`;
  return {
    id: "created:lead",
    date: lead.createdAt,
    kind: "created",
    author: creator ?? AUTHOR_SITE,
    text,
    tone: "default",
  };
}

function refusalSuffix(input: TimelineInput, version: VersionSnapshot): string {
  const code = version.refuseReasonCode;
  const parts = [
    code === null ? null : (input.reasons.get(code) ?? code),
    nonEmpty(version.refuseReason),
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? ` · причина: ${parts.join(": ")}` : "";
}

/** Events of one version compared with the previous one (status, assignee, КП amount). */
function versionItems(
  input: TimelineInput,
  previous: VersionSnapshot,
  version: VersionSnapshot
): TimelineItem[] {
  const author = staffName(input.staff, version.updatedBy) ?? AUTHOR_SYSTEM;
  const base = { date: version.createdAt, author };
  const items: TimelineItem[] = [];

  if (version.status !== previous.status) {
    const name = (id: string | null) =>
      id === null ? NO_VALUE : (input.statuses.get(id)?.name ?? UNKNOWN_STATUS);
    const requiresReason =
      version.status !== null && input.statuses.get(version.status)?.requiresReason === true;
    let text = `Статус: «${name(previous.status)}» → «${name(version.status)}»`;
    if (requiresReason) text += refusalSuffix(input, version);
    items.push({
      ...base,
      id: `status:${version.id}`,
      kind: "status",
      text,
      tone: requiresReason ? "danger" : "default",
    });
  }

  if (version.assignee !== previous.assignee) {
    const name = staffName(input.staff, version.assignee);
    items.push({
      ...base,
      id: `assignee:${version.id}`,
      kind: "assignee",
      text: name === null ? "Ответственный снят" : `Ответственный: ${name}`,
      tone: "default",
    });
  }

  if (version.kpAmount !== previous.kpAmount) {
    items.push({
      ...base,
      id: `kp:${version.id}`,
      kind: "kp",
      text:
        version.kpAmount === null ? "Сумма КП удалена" : `Сумма КП: ${formatRub(version.kpAmount)}`,
      tone: "default",
    });
  }

  return items;
}

function emailItems(lead: TimelineInput["lead"]): TimelineItem[] {
  const items: TimelineItem[] = [];
  // Addresses are deliberately not shown: the card is not a place for the mailing list.
  if (lead.newLeadNotifiedAt) {
    items.push({
      id: "email:new-lead",
      date: lead.newLeadNotifiedAt,
      kind: "email",
      author: AUTHOR_SYSTEM,
      text: "Письмо о заявке отправлено менеджерам",
      tone: "default",
    });
  }
  if (lead.assigneeNotifiedAt) {
    items.push({
      id: "email:assignee",
      date: lead.assigneeNotifiedAt,
      kind: "email",
      author: AUTHOR_SYSTEM,
      text: "Письмо ответственному отправлено",
      tone: "default",
    });
  }
  return items;
}

function maxText(input: TimelineInput, row: NotificationRow): string {
  const recipient =
    row.channel === "group"
      ? "групповой чат"
      : (staffName(input.staff, row.recipient) ?? AUTHOR_UNKNOWN_STAFF);
  const error = nonEmpty(row.error);

  switch (row.status) {
    case "pending":
      return "Отправка в MAX…";
    case "sent":
      if (row.channel === "group") {
        const title = nonEmpty(input.groupChatTitle);
        return title
          ? `Уведомление в MAX отправлено в чат «${title}»`
          : "Уведомление в MAX отправлено в групповой чат";
      }
      return `Уведомление в MAX отправлено: ${recipient}`;
    case "failed":
      return `Не удалось отправить в MAX (${recipient}): ${truncate(error ?? "ошибка", MAX_ERROR_LENGTH)}`;
    case "skipped":
      if (error) return `Не отправлено в MAX: ${truncate(error, MAX_ERROR_LENGTH)}`;
      return row.channel === "group"
        ? "Не отправлено в MAX: групповой чат не подключён"
        : `Не отправлено в MAX: ${recipient} не подключил MAX`;
  }
}

function maxItem(input: TimelineInput, row: NotificationRow): TimelineItem {
  return {
    id: `max:${row.id}`,
    date: row.sentAt ?? row.createdAt,
    kind: "max",
    author: AUTHOR_SYSTEM,
    text: `${MAX_EVENT_PREFIX[row.event]}: ${maxText(input, row)}`,
    tone: row.status === "failed" ? "danger" : "default",
  };
}

function orderItem(order: TimelineInput["orders"][number]): TimelineItem {
  const number = nonEmpty(order.number);
  return {
    id: `order:${order.id}`,
    date: order.createdAt,
    kind: "order",
    author: AUTHOR_SYSTEM,
    text: number ? `Создан заказ № ${number}` : "Создан заказ",
    tone: "default",
    href: `/admin/collections/orders/${encodeURIComponent(order.id)}/`,
  };
}

/** Timeline of a lead, newest first. */
export function buildLeadTimeline(input: TimelineInput): TimelineItem[] {
  // Stable ascending order of the versions (equal dates keep the input order).
  const versions = input.versions
    .map((version, index) => ({ version, index }))
    .sort((a, b) => timeOf(a.version.createdAt) - timeOf(b.version.createdAt) || a.index - b.index)
    .map(({ version }) => version);

  const items: TimelineItem[] = [createdItem(input, versions[0])];
  // The first kept version is compared with nothing: older ones may have been trimmed
  // (`maxPerDoc`), so its differences from the unknown predecessor are not events.
  for (let index = 1; index < versions.length; index += 1) {
    items.push(...versionItems(input, versions[index - 1]!, versions[index]!));
  }
  items.push(...emailItems(input.lead));
  for (const row of input.notifications) items.push(maxItem(input, row));
  for (const order of input.orders) items.push(orderItem(order));

  // Newest first; on equal dates the creation goes last (bottom), everything else keeps the
  // generation order (Array#sort is stable).
  const rank = (item: TimelineItem) => (item.kind === "created" ? 1 : 0);
  return items.sort((a, b) => timeOf(b.date) - timeOf(a.date) || rank(a) - rank(b));
}
