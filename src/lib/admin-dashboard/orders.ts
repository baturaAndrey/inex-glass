import { todayKey } from "@/lib/domain/dates";
import { ORDER_STATUS_META, formatOrderDayMonth, orderDateKey } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/status";

/**
 * «Заказы в работе»: four stage tiles and the nearest planned shipment. A `statusHistory` row
 * keeps the planned date of the NEXT stage, so the planned shipment of a packed order is the
 * `plannedDate` of its `packed` row.
 */

/** Stages shown as tiles, in their natural order. */
export const DASHBOARD_ORDER_STATUSES = [
  "spec_agreed",
  "in_production",
  "packed",
  "shipped",
] as const satisfies readonly OrderStatus[];

export type DashboardOrderStatus = (typeof DASHBOARD_ORDER_STATUSES)[number];

export interface OrderTile {
  status: DashboardOrderStatus;
  label: string;
  count: number;
}

export function buildOrderTiles(
  counts: Partial<Record<DashboardOrderStatus, number>>
): OrderTile[] {
  return DASHBOARD_ORDER_STATUSES.map((status) => ({
    status,
    label: ORDER_STATUS_META[status].label,
    count: counts[status] ?? 0,
  }));
}

export interface ShipmentOrder {
  id: string;
  number?: string | null;
  statusHistory?: readonly { status?: string | null; plannedDate?: string | null }[] | null;
}

export interface NearestShipment {
  id: string;
  number: string;
  /** Planned date, `YYYY-MM-DD` in the company time zone. */
  dateKey: string;
  /** «2026-0138 · 24.10». */
  label: string;
}

/** Planned shipment of a packed order: `plannedDate` of its (last) `packed` history row. */
function plannedShipment(order: ShipmentOrder): { key: string; raw: string } | null {
  const rows = (order.statusHistory ?? []).filter((row) => row.status === "packed");
  const raw = rows[rows.length - 1]?.plannedDate;
  if (!raw) return null;
  const key = orderDateKey(raw);
  return key ? { key, raw } : null;
}

/** The earliest planned shipment from today on (company time zone), or `null`. */
export function nearestShipment(
  orders: readonly ShipmentOrder[],
  now: Date
): NearestShipment | null {
  const today = todayKey(now);
  let best: { order: ShipmentOrder; key: string; raw: string } | null = null;
  for (const order of orders) {
    const planned = plannedShipment(order);
    if (!planned || planned.key < today) continue;
    if (!best || planned.key < best.key) best = { order, ...planned };
  }
  if (!best) return null;
  const number = best.order.number?.trim() || "без номера";
  return {
    id: best.order.id,
    number,
    dateKey: best.key,
    label: `${number} · ${formatOrderDayMonth(best.raw) ?? ""}`,
  };
}
