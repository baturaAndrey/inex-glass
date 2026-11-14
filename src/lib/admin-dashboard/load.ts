import { formatNumber } from "@/lib/domain/format";
import { createdAtWhere } from "@/lib/leads-admin/period";
import type { DateRange } from "@/lib/leads-admin/period";
import { defaultStatus } from "@/lib/leads-admin/report";
import type { ReportStatus } from "@/lib/leads-admin/report";
import { formTypeLabel, statusBadgeColors } from "@/payload/admin/leads/constants";
import { loadLeadStatuses, loadStaffNames } from "@/payload/admin/leads/data";
import { LEAD_PRODUCT_TYPES } from "@/payload/collections/crm/constants";
import { attentionThresholds, buildAttention } from "./attention";
import { formatWhen, shortName } from "./format";
import { buildFunnel } from "./funnel";
import { DASHBOARD_ORDER_STATUSES, buildOrderTiles, nearestShipment } from "./orders";
import { currentRange, previousRange, sparkBuckets } from "./period";
import { buildPulse, statusIdOf } from "./pulse";
import { buildSources } from "./sources";
import type {
  AttentionCard,
  AttentionKey,
  AttentionOrdersInput,
  AttentionPricesInput,
} from "./attention";
import type { WhenLabel } from "./format";
import type { FunnelLead, FunnelResult } from "./funnel";
import type { DashboardOrderStatus, NearestShipment, OrderTile, ShipmentOrder } from "./orders";
import type { DashboardPeriod } from "./period";
import type { PulseKpi, PulseLead } from "./pulse";
import type { SourceBar } from "./sources";
import type { Payload, TypedUser, Where } from "payload";

/**
 * Server-side data of the admin dashboard (`/admin/`). Every query runs with the viewer's access
 * (`overrideAccess: false`), `depth: 0` and a `select` of the needed fields; queries are
 * sequential (like the leads report) so the dashboard never holds more than one pooled
 * connection. Each block is loaded inside its own try/catch: a failed block renders «Не удалось
 * загрузить данные», the rest of the dashboard still works. Returns serialisable data only.
 */

/** Leads read per page of a period scan (a handful of small columns). */
const SCAN_PAGE_SIZE = 2000;
/** Above this many leads in a period the numbers are partial (warning in «Пульс»). */
const SCAN_LIMIT = 100_000;
/** Packed / shipped orders inspected for missing photos. */
const NO_PHOTOS_SCAN_LIMIT = 100;
/** Packed orders inspected for the nearest planned shipment. */
const SHIPMENT_SCAN_LIMIT = 200;
const LATEST_LEADS_LIMIT = 5;
/** «Требует внимания» cards that depend on `lead-statuses` (the default status). */
const STATUS_DEPENDENT_ATTENTION: ReadonlySet<AttentionKey> = new Set(["unassigned", "stale-new"]);
const STATUSES_FAILED_SUB = "не удалось загрузить данные";

export type Block<T> = { ok: true; data: T } | { ok: false };

export interface PulseData {
  kpis: PulseKpi[];
  /** The scan hit `SCAN_LIMIT`: numbers are incomplete. */
  truncated: boolean;
}

export interface FunnelData extends FunnelResult {
  /** `lead-statuses` is empty: «Статусы не настроены». */
  hasStatuses: boolean;
}

export interface OrdersData {
  tiles: OrderTile[];
  nearest: NearestShipment | null;
}

export interface LatestLead {
  id: string;
  title: string;
  when: WhenLabel;
  product: string;
  area: string | null;
  source: string;
  status: { name: string; color: string } | null;
  assignee: string | null;
}

export interface DashboardData {
  period: DashboardPeriod;
  attention: Block<AttentionCard[]>;
  pulse: Block<PulseData>;
  funnel: Block<FunnelData>;
  sources: Block<SourceBar[]>;
  /** `null`: the viewer cannot read orders — the card is not rendered. */
  orders: Block<OrdersData> | null;
  latest: Block<LatestLead[]>;
}

export interface DashboardAccess {
  canReadOrders: boolean;
}

type Ctx = { payload: Payload; user: TypedUser };

/** Runs one block; any error is logged by name only (no personal data) and isolated. */
async function block<T>(ctx: Ctx, name: string, load: () => Promise<T>): Promise<Block<T>> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    ctx.payload.logger.error({
      msg: `Дашборд: не удалось загрузить блок «${name}»`,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false };
  }
}

type ScanLead = PulseLead & FunnelLead & { formType?: string | null };

/** Paged scan of the leads created in `range` (sequential pages, viewer's access). */
async function scanLeads(
  ctx: Ctx,
  range: DateRange
): Promise<{ leads: ScanLead[]; truncated: boolean }> {
  const where = createdAtWhere(range);
  const leads: ScanLead[] = [];
  for (let page = 1; ; page += 1) {
    const result = await ctx.payload.find({
      collection: "leads",
      where,
      select: {
        createdAt: true,
        status: true,
        area: true,
        formType: true,
        refuseReasonCode: true,
        refuseReason: true,
      },
      sort: "createdAt",
      limit: SCAN_PAGE_SIZE,
      page,
      depth: 0,
      overrideAccess: false,
      user: ctx.user,
    });
    leads.push(...(result.docs as ScanLead[]));
    if (!result.hasNextPage) return { leads, truncated: false };
    if (leads.length >= SCAN_LIMIT) return { leads, truncated: true };
  }
}

const count = async (ctx: Ctx, collection: "leads" | "orders", where: Where) =>
  (
    await ctx.payload.count({
      collection,
      where,
      overrideAccess: false,
      user: ctx.user,
    })
  ).totalDocs;

/**
 * `statuses === null`: loading `lead-statuses` failed. The lead cards then show «—» with an error
 * caption instead of the misleading «статусы не настроены»; order and price cards are unaffected.
 */
async function loadAttention(
  ctx: Ctx,
  statuses: readonly ReportStatus[] | null,
  access: DashboardAccess,
  now: Date
): Promise<AttentionCard[]> {
  const thresholds = attentionThresholds(now);
  const defaultId = statuses ? (defaultStatus(statuses)?.id ?? null) : null;

  let unassignedCount = 0;
  let oldestUnassignedAt: string | null = null;
  let staleNewCount = 0;
  if (defaultId !== null) {
    const unassigned: Where = {
      and: [{ status: { equals: defaultId } }, { assignee: { exists: false } }],
    };
    unassignedCount = await count(ctx, "leads", unassigned);
    if (unassignedCount > 0) {
      const { docs } = await ctx.payload.find({
        collection: "leads",
        where: unassigned,
        select: { createdAt: true },
        sort: "createdAt",
        limit: 1,
        depth: 0,
        overrideAccess: false,
        user: ctx.user,
      });
      oldestUnassignedAt = docs[0]?.createdAt ?? null;
    }
    staleNewCount = await count(ctx, "leads", {
      and: [
        { status: { equals: defaultId } },
        { createdAt: { less_than: thresholds.staleNewBefore } },
      ],
    });
  }

  let orders: AttentionOrdersInput | null = null;
  if (access.canReadOrders) {
    const { docs } = await ctx.payload.find({
      collection: "orders",
      where: { currentStatus: { in: ["packed", "shipped"] } },
      select: { number: true, packPhotos: true },
      sort: "number",
      limit: NO_PHOTOS_SCAN_LIMIT,
      depth: 0,
      overrideAccess: false,
      user: ctx.user,
    });
    const noPhotos = docs
      .filter((order) => (order.packPhotos ?? []).length === 0)
      .map((order) => ({ id: String(order.id), number: order.number ?? null }));
    const expiringCount = await count(ctx, "orders", {
      and: [
        // Rows saved before `revoked` existed hold `null` (as `expiredLinksWhere`).
        { or: [{ revoked: { equals: false } }, { revoked: { exists: false } }] },
        { expiresAt: { greater_than: thresholds.expiringFrom } },
        { expiresAt: { less_than_equal: thresholds.expiringTo } },
      ],
    });
    orders = { noPhotos, expiringCount };
  }

  // Read with the viewer's rights; the site cache is bypassed on purpose (live numbers).
  const priceGlobal = await ctx.payload.findGlobal({
    slug: "prices",
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  });
  const prices: AttentionPricesInput = {
    priceDate: priceGlobal.priceDate ?? null,
    staleAfterDays: priceGlobal.staleAfterDays ?? null,
    staleLabel: priceGlobal.staleLabel ?? null,
  };

  const cards = buildAttention(
    {
      leads: { defaultStatusId: defaultId, unassignedCount, oldestUnassignedAt, staleNewCount },
      orders,
      prices,
    },
    now
  );
  if (statuses !== null) return cards;
  return cards.map((card): AttentionCard =>
    STATUS_DEPENDENT_ATTENTION.has(card.key)
      ? { ...card, value: null, tone: "neutral", sub: STATUSES_FAILED_SUB }
      : card
  );
}

async function loadOrders(ctx: Ctx, now: Date): Promise<OrdersData> {
  const counts: Partial<Record<DashboardOrderStatus, number>> = {};
  for (const status of DASHBOARD_ORDER_STATUSES) {
    counts[status] = await count(ctx, "orders", { currentStatus: { equals: status } });
  }
  const { docs } = await ctx.payload.find({
    collection: "orders",
    where: { currentStatus: { equals: "packed" } },
    select: { number: true, statusHistory: true },
    limit: SHIPMENT_SCAN_LIMIT,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  });
  const shipments: ShipmentOrder[] = docs.map((order) => ({
    id: String(order.id),
    number: order.number ?? null,
    statusHistory: (order.statusHistory ?? []).map((row) => ({
      status: row.status,
      plannedDate: row.plannedDate ?? null,
    })),
  }));
  return { tiles: buildOrderTiles(counts), nearest: nearestShipment(shipments, now) };
}

const PRODUCT_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_PRODUCT_TYPES.map(({ value, label }) => [value, label])
);

async function loadLatest(
  ctx: Ctx,
  statuses: readonly ReportStatus[],
  now: Date
): Promise<LatestLead[]> {
  const { docs } = await ctx.payload.find({
    collection: "leads",
    select: {
      company: true,
      name: true,
      productType: true,
      area: true,
      formType: true,
      status: true,
      assignee: true,
      createdAt: true,
    },
    sort: "-createdAt",
    limit: LATEST_LEADS_LIMIT,
    depth: 0,
    overrideAccess: false,
    user: ctx.user,
  });
  const names = await loadStaffNames(ctx.payload);
  const statusById = new Map(statuses.map((status) => [status.id, status]));
  return docs.map((lead) => {
    const status = statusById.get(statusIdOf(lead.status) ?? "");
    const assigneeId = statusIdOf(lead.assignee);
    const assigneeName = assigneeId ? names.get(assigneeId) : undefined;
    return {
      id: String(lead.id),
      title: lead.company?.trim() || lead.name?.trim() || "Без имени",
      when: formatWhen(lead.createdAt, now),
      product: (lead.productType && PRODUCT_LABELS.get(lead.productType)) || "—",
      area: typeof lead.area === "number" ? `${formatNumber(lead.area)} м²` : null,
      source: formTypeLabel(lead.formType),
      status: status ? { name: status.name, color: statusBadgeColors(status.color).color } : null,
      assignee: assigneeName ? shortName(assigneeName) || assigneeName : null,
    };
  });
}

export async function loadDashboard(
  payload: Payload,
  user: TypedUser,
  period: DashboardPeriod,
  now: Date,
  access: DashboardAccess
): Promise<DashboardData> {
  const ctx: Ctx = { payload, user };
  // Statuses back several blocks; without them those blocks still render their «empty» states.
  const statusesBlock = await block(ctx, "Статусы заявок", () => loadLeadStatuses(payload));
  const statuses: ReportStatus[] = statusesBlock.ok ? statusesBlock.data : [];

  // Order and price cards do not need statuses: only the lead cards degrade without them.
  const attention = await block(ctx, "Требует внимания", () =>
    loadAttention(ctx, statusesBlock.ok ? statuses : null, access, now)
  );

  const range = currentRange(period, now);
  const scan = await block(ctx, "Заявки периода", async () => {
    const current = await scanLeads(ctx, range);
    const previous = await scanLeads(ctx, previousRange(range));
    return { current, previous };
  });

  const pulse: Block<PulseData> =
    scan.ok && statusesBlock.ok
      ? {
          ok: true,
          data: {
            kpis: buildPulse(
              statuses,
              scan.data.current.leads,
              scan.data.previous.leads,
              sparkBuckets(period, range, now)
            ),
            truncated: scan.data.current.truncated || scan.data.previous.truncated,
          },
        }
      : { ok: false };
  const funnel: Block<FunnelData> =
    scan.ok && statusesBlock.ok
      ? {
          ok: true,
          data: {
            ...buildFunnel(statuses, scan.data.current.leads),
            hasStatuses: statuses.length > 0,
          },
        }
      : { ok: false };
  const sources: Block<SourceBar[]> = scan.ok
    ? { ok: true, data: buildSources(scan.data.current.leads) }
    : { ok: false };

  const orders = access.canReadOrders
    ? await block(ctx, "Заказы в работе", () => loadOrders(ctx, now))
    : null;
  const latest = await block(ctx, "Последние заявки", () => loadLatest(ctx, statuses, now));

  return { period, attention, pulse, funnel, sources, orders, latest };
}
