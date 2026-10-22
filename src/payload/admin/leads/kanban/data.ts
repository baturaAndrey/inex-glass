import { todayKey } from "@/lib/domain/dates";
import { formatNumber } from "@/lib/domain/format";
import { NBSP } from "@/lib/domain/types";
import { zonedDayStart } from "@/lib/leads-admin/period";
import { FUNNEL_KP_SLUG } from "@/lib/leads-admin/report";
import { statusBadgeColors } from "@/payload/admin/leads/constants";
import { loadLeadStatuses, loadStaffNames } from "@/payload/admin/leads/data";
import type { StatusOption } from "@/payload/admin/leads/data";
import {
  LEAD_FLAGS,
  LEAD_PRODUCT_TYPES,
  LEAD_REFUSE_REASON_CODES,
} from "@/payload/collections/crm/constants";
import { columnKind } from "./board-state";
import { initials, sourceShortLabel, tallyRefuseReasons } from "./format";
import { kanbanHref, kanbanWhere, KANBAN_FILTERS } from "./query";
import type { KanbanFilter, KanbanQuery } from "./query";
import type { KanbanBoardProps, KanbanCard, KanbanCardFlag, KanbanColumn } from "./types";
import type { Payload, TypedUser, Where } from "payload";

/**
 * Server-side data of the leads kanban: columns with their cards, the summary tiles and the
 * chip counters. Every query runs with the viewer's access (`overrideAccess: false`) and they
 * run one after another, so the page never holds more than one pooled connection (same rule as
 * `LeadListQuickFilters`).
 */

/** Cards per column, and in the column opened with «Ещё N» (`expand`). */
export const COLUMN_CARD_LIMIT = 20;
export const EXPANDED_CARD_LIMIT = 200;
/** Contract columns and refusal strips show the last 30 days by `statusChangedAt`. */
export const FINAL_WINDOW_DAYS = 30;
/** «Ждут ответа на КП»: an offer older than this is overdue. */
const KP_OVERDUE_DAYS = 5;
/** Leads read to sum the area of the month's contracts, and to tally the refusal reasons. */
const AGGREGATE_SCAN_LIMIT = 500;
const DAY_MS = 86_400_000;

const PRODUCT_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_PRODUCT_TYPES.map((option) => [option.value, option.label])
);
const FLAG_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_FLAGS.map((option) => [option.value, option.label])
);
/** The only red flag; the others are amber. */
const URGENT_FLAG = "urgent";

const CARD_SELECT = {
  company: true,
  name: true,
  phone: true,
  productType: true,
  area: true,
  formType: true,
  flags: true,
  isDuplicate: true,
  estimate: { from: true },
  kpAmount: true,
  assignee: true,
  files: true,
  internalComments: true,
  createdAt: true,
  statusChangedAt: true,
  status: true,
  refuseReasonCode: true,
  refuseReason: true,
} as const;

/** Shape of a lead read with `CARD_SELECT` at depth 0. */
interface LeadRow {
  id: string;
  company?: string | null;
  name?: string | null;
  phone?: string | null;
  productType?: string | null;
  area?: number | null;
  formType?: string | null;
  flags?: string[] | null;
  isDuplicate?: boolean | null;
  estimate?: { from?: number | null } | null;
  kpAmount?: number | null;
  assignee?: unknown;
  files?: unknown[] | null;
  internalComments?: unknown[] | null;
  createdAt: string;
  statusChangedAt?: string | null;
  status?: unknown;
  refuseReasonCode?: string | null;
  refuseReason?: string | null;
}

export interface KanbanStat {
  key: "new-today" | "in-progress" | "kp-waiting" | "contracts-month";
  label: string;
  /** Formatted number or «—» when the status is missing from the dictionary. */
  value: string;
  sub: string | null;
  tone: "info" | "success" | null;
}

export interface KanbanPageData {
  board: KanbanBoardProps;
  stats: KanbanStat[];
  /** Open leads per chip with the current source / period / search (`undefined` = failed). */
  chipCounts: Partial<Record<KanbanFilter, number>>;
}

/** Id of a relationship at depth 0 (a populated doc is accepted too). */
function relationId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null && "id" in value) {
    return relationId((value as { id: unknown }).id);
  }
  return null;
}

const finiteOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function toCard(
  row: LeadRow,
  staffNames: ReadonlyMap<string, string>,
  orders: ReadonlyMap<string, { id: string; number: string | null }>
): KanbanCard {
  const name = row.name?.trim() || "Без имени";
  const assigneeId = relationId(row.assignee);
  const assigneeName = assigneeId ? (staffNames.get(assigneeId) ?? "Сотрудник") : null;
  const flags: KanbanCardFlag[] = (row.flags ?? [])
    .filter((value) => FLAG_LABELS.has(value))
    .map((value) => ({
      value,
      label: FLAG_LABELS.get(value) ?? value,
      tone: value === URGENT_FLAG ? "no" : "work",
    }));
  const order = orders.get(row.id) ?? null;
  return {
    id: String(row.id),
    title: row.company?.trim() || name,
    name,
    phone: row.phone?.trim() || null,
    productLabel: row.productType ? (PRODUCT_LABELS.get(row.productType) ?? null) : null,
    area: finiteOrNull(row.area),
    sourceShort: sourceShortLabel(row.formType),
    filesCount: row.files?.length ?? 0,
    flags,
    isDuplicate: row.isDuplicate === true,
    estimateFrom: finiteOrNull(row.estimate?.from),
    kpAmount: finiteOrNull(row.kpAmount),
    commentsCount: row.internalComments?.length ?? 0,
    assignee:
      assigneeId && assigneeName
        ? { id: assigneeId, name: assigneeName, initials: initials(assigneeName) }
        : null,
    orderNumber: order?.number ?? null,
    orderId: order?.id ?? null,
    createdAt: row.createdAt,
    statusChangedAt: row.statusChangedAt ?? null,
    statusId: relationId(row.status) ?? "",
  };
}

interface Ctx {
  payload: Payload;
  user: TypedUser;
  query: KanbanQuery;
  now: Date;
}

async function countLeads(ctx: Ctx, where: Where): Promise<number | undefined> {
  try {
    const { totalDocs } = await ctx.payload.count({
      collection: "leads",
      where,
      overrideAccess: false,
      user: ctx.user,
    });
    return totalDocs;
  } catch (error) {
    ctx.payload.logger.error({ err: error }, "kanban: lead count failed");
    return undefined;
  }
}

/** Orders of the given leads (contract cards link to them): lead id → order. */
async function loadOrders(
  ctx: Ctx,
  leadIds: readonly string[]
): Promise<Map<string, { id: string; number: string | null }>> {
  const result = new Map<string, { id: string; number: string | null }>();
  if (leadIds.length === 0) return result;
  try {
    const { docs } = await ctx.payload.find({
      collection: "orders",
      where: { lead: { in: [...leadIds] } },
      select: { number: true, lead: true },
      depth: 0,
      limit: leadIds.length * 2,
      pagination: false,
      overrideAccess: false,
      user: ctx.user,
    });
    for (const doc of docs) {
      const leadId = relationId(doc.lead);
      if (leadId && !result.has(leadId)) {
        result.set(leadId, { id: String(doc.id), number: doc.number ?? null });
      }
    }
  } catch (error) {
    ctx.payload.logger.error({ err: error }, "kanban: orders lookup failed");
  }
  return result;
}

function finalWindowWhere(now: Date): Where {
  const since = new Date(now.getTime() - FINAL_WINDOW_DAYS * DAY_MS).toISOString();
  return { statusChangedAt: { greater_than_equal: since } };
}

/** Refusal breakdown over the whole strip (not only the cards shown). */
async function loadReasons(ctx: Ctx, where: Where) {
  const { docs } = await ctx.payload.find({
    collection: "leads",
    where,
    select: { refuseReasonCode: true, refuseReason: true },
    depth: 0,
    limit: AGGREGATE_SCAN_LIMIT,
    sort: "-statusChangedAt",
    overrideAccess: false,
    user: ctx.user,
  });
  return tallyRefuseReasons(docs);
}

async function loadColumns(
  ctx: Ctx,
  statuses: readonly StatusOption[],
  staffNames: ReadonlyMap<string, string>
): Promise<KanbanColumn[]> {
  const base = kanbanWhere(ctx.query, { userId: String(ctx.user.id), now: ctx.now });
  const kinds = statuses.map((status) => ({ status, kind: columnKind(status) }));
  // Board order: working columns, then contracts, then the refusal strips (each by `order`).
  const ordered = [
    ...kinds.filter((entry) => entry.kind === "open"),
    ...kinds.filter((entry) => entry.kind === "contract"),
    ...kinds.filter((entry) => entry.kind === "refuse"),
  ];

  const columns: KanbanColumn[] = [];
  for (const { status, kind } of ordered) {
    const where: Where = {
      and: [
        { status: { equals: status.id } },
        ...base,
        ...(kind === "open" ? [] : [finalWindowWhere(ctx.now)]),
      ],
    };
    const result = await ctx.payload.find({
      collection: "leads",
      where,
      select: CARD_SELECT,
      sort: "-createdAt",
      limit: ctx.query.expand === status.id ? EXPANDED_CARD_LIMIT : COLUMN_CARD_LIMIT,
      depth: 0,
      overrideAccess: false,
      user: ctx.user,
    });
    const rows = result.docs as unknown as LeadRow[];
    const orders =
      kind === "contract"
        ? await loadOrders(
            ctx,
            rows.map((row) => String(row.id))
          )
        : new Map<string, { id: string; number: string | null }>();
    const column: KanbanColumn = {
      id: status.id,
      name: status.name,
      slug: status.slug,
      color: statusBadgeColors(status.color).color,
      kind,
      isDefault: status.isDefault,
      requiresReason: status.requiresReason,
      isContract: status.isContract,
      total: result.totalDocs,
      cards: rows.map((row) => toCard(row, staffNames, orders)),
    };
    if (kind === "refuse") column.reasons = await loadReasons(ctx, where);
    columns.push(column);
  }
  return columns;
}

const formatCount = (value: number | undefined): string =>
  value === undefined ? "—" : formatNumber(value);

async function loadStats(ctx: Ctx, statuses: readonly StatusOption[]): Promise<KanbanStat[]> {
  const userId = String(ctx.user.id);
  const today = todayKey(ctx.now);
  const dayStart = zonedDayStart(today).toISOString();
  const monthStart = zonedDayStart(`${today.slice(0, 7)}-01`).toISOString();
  const bySlug = (slug: string) => statuses.find((status) => status.slug === slug) ?? null;
  const defaultStatus = statuses.find((status) => status.isDefault) ?? null;
  const inProgress = bySlug("in-progress");
  const kpSent = bySlug(FUNNEL_KP_SLUG);
  const contractIds = statuses.filter((status) => status.isContract).map((status) => status.id);

  const newToday = await countLeads(ctx, { createdAt: { greater_than_equal: dayStart } });
  const newUnassigned = defaultStatus
    ? await countLeads(ctx, {
        and: [{ status: { equals: defaultStatus.id } }, { assignee: { exists: false } }],
      })
    : undefined;

  const stats: KanbanStat[] = [
    {
      key: "new-today",
      label: "Новые сегодня",
      value: formatCount(newToday),
      sub: newUnassigned === undefined ? null : `${formatNumber(newUnassigned)} без ответственного`,
      tone: "info",
    },
  ];

  if (inProgress) {
    const total = await countLeads(ctx, { status: { equals: inProgress.id } });
    const mine = await countLeads(ctx, {
      and: [{ status: { equals: inProgress.id } }, { assignee: { equals: userId } }],
    });
    stats.push({
      key: "in-progress",
      label: "В работе",
      value: formatCount(total),
      sub: mine === undefined ? null : `у вас — ${formatNumber(mine)}`,
      tone: null,
    });
  } else {
    stats.push({ key: "in-progress", label: "В работе", value: "—", sub: null, tone: null });
  }

  if (kpSent) {
    const overdueSince = new Date(ctx.now.getTime() - KP_OVERDUE_DAYS * DAY_MS).toISOString();
    const total = await countLeads(ctx, { status: { equals: kpSent.id } });
    const overdue = await countLeads(ctx, {
      and: [{ status: { equals: kpSent.id } }, { statusChangedAt: { less_than: overdueSince } }],
    });
    stats.push({
      key: "kp-waiting",
      label: "Ждут ответа на КП",
      value: formatCount(total),
      sub: overdue === undefined ? null : `дольше 5 дней — ${formatNumber(overdue)}`,
      tone: null,
    });
  } else {
    stats.push({
      key: "kp-waiting",
      label: "Ждут ответа на КП",
      value: "—",
      sub: null,
      tone: null,
    });
  }

  if (contractIds.length > 0) {
    const where: Where = {
      and: [
        { status: { in: contractIds } },
        { statusChangedAt: { greater_than_equal: monthStart } },
      ],
    };
    let value = "—";
    let sub: string | null = null;
    try {
      const { docs, totalDocs } = await ctx.payload.find({
        collection: "leads",
        where,
        select: { area: true },
        depth: 0,
        limit: AGGREGATE_SCAN_LIMIT,
        overrideAccess: false,
        user: ctx.user,
      });
      const area = docs.reduce((sum, doc) => sum + (finiteOrNull(doc.area) ?? 0), 0);
      value = formatNumber(totalDocs);
      sub = `${formatNumber(Math.round(area))}${NBSP}м² в заказах`;
    } catch (error) {
      ctx.payload.logger.error({ err: error }, "kanban: contracts summary failed");
    }
    stats.push({ key: "contracts-month", label: "Договоры за месяц", value, sub, tone: "success" });
  } else {
    stats.push({
      key: "contracts-month",
      label: "Договоры за месяц",
      value: "—",
      sub: null,
      tone: "success",
    });
  }
  return stats;
}

/** «Мои N», «Без ответственного N», … — open leads only, with the other current filters. */
async function loadChipCounts(
  ctx: Ctx,
  statuses: readonly StatusOption[]
): Promise<Partial<Record<KanbanFilter, number>>> {
  const openIds = statuses.filter((status) => columnKind(status) === "open").map((s) => s.id);
  const counts: Partial<Record<KanbanFilter, number>> = {};
  if (openIds.length === 0) return counts;
  for (const filter of KANBAN_FILTERS) {
    if (filter === "all") continue;
    const where: Where = {
      and: [
        { status: { in: openIds } },
        ...kanbanWhere({ ...ctx.query, filter }, { userId: String(ctx.user.id), now: ctx.now }),
      ],
    };
    const count = await countLeads(ctx, where);
    if (count !== undefined) counts[filter] = count;
  }
  return counts;
}

/** Everything the kanban page renders. */
export async function loadKanbanPage(
  payload: Payload,
  user: TypedUser,
  query: KanbanQuery,
  now: Date
): Promise<KanbanPageData> {
  const ctx: Ctx = { payload, user, query, now };
  const statuses = await loadLeadStatuses(payload);
  const staffNames = await loadStaffNames(payload).catch(() => new Map<string, string>());

  const stats = await loadStats(ctx, statuses);
  const chipCounts = await loadChipCounts(ctx, statuses);
  const columns = await loadColumns(ctx, statuses, staffNames);

  const expandHrefs: Record<string, string> = {};
  for (const column of columns) {
    expandHrefs[column.id] = kanbanHref(query, {
      expand: query.expand === column.id ? null : column.id,
    });
  }
  const currentUserId = String(user.id);
  const userName = (user as { name?: unknown }).name;

  return {
    stats,
    chipCounts,
    board: {
      columns,
      currentUserId,
      currentUserName:
        staffNames.get(currentUserId) ??
        (typeof userName === "string" && userName.trim() ? userName.trim() : "Вы"),
      reasonOptions: LEAD_REFUSE_REASON_CODES.map(({ value, label }) => ({ value, label })),
      expandHrefs,
      expandedId: columns.some((column) => column.id === query.expand) ? query.expand : null,
      now: now.toISOString(),
    },
  };
}
