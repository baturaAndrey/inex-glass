import { addDays, formatDateRu, todayKey, tryDateKey } from "@/lib/domain";
import { ORDER_STATUSES } from "@/payload/collections/crm/constants";
import type { OrderStatus } from "@/payload/collections/crm/constants";

/**
 * Order stages (ТЗ §6.2): ids, labels, badge colours, ordering and the status-change rule
 * shared by the lifecycle hook, the admin «Статус» panel and the public order page.
 *
 * Pure module (no Payload/Next imports): unit-tested in `status.test.ts`.
 */

export { ORDER_STATUSES };
export type { OrderStatus };

/** Stage ids in their natural order (`spec_agreed` → `received`). */
export const ORDER_STATUS_IDS: readonly OrderStatus[] = ORDER_STATUSES.map(({ value }) => value);

export interface OrderStatusMeta {
  label: string;
  /** Badge fill / text (admin list cell). */
  badgeBg: string;
  badgeText: string;
}

/** Labels and badge colours (task-33 «Статусы, цвета, подписи»). */
export const ORDER_STATUS_META: Readonly<Record<OrderStatus, OrderStatusMeta>> = {
  spec_agreed: { label: "Спецификация согласована", badgeBg: "#EEF4FA", badgeText: "#2C5B86" },
  in_production: { label: "В производстве", badgeBg: "#FCF6EA", badgeText: "#8A5A00" },
  packed: { label: "Упаковано", badgeBg: "#EAF3F1", badgeText: "#16403D" },
  shipped: { label: "Отгружено", badgeBg: "#E6F4EA", badgeText: "#237A35" },
  received: { label: "Получено", badgeBg: "#ECEEEC", badgeText: "#3E464D" },
};

const STATUS_INDEX: ReadonlyMap<string, number> = new Map(
  ORDER_STATUS_IDS.map((status, index) => [status, index])
);

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && STATUS_INDEX.has(value);
}

/** Position of the stage (0 … 4), `-1` for anything that is not a stage. */
export function statusIndex(status: unknown): number {
  return typeof status === "string" ? (STATUS_INDEX.get(status) ?? -1) : -1;
}

/** Label of a stage; unknown values are returned as is (never throws on stale data). */
export function statusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_META[status].label : status;
}

/** The stage after `current`; the first stage when nothing is set; `null` after «Получено». */
export function nextStatus(current: unknown): OrderStatus | null {
  const index = statusIndex(current);
  return ORDER_STATUS_IDS[index + 1] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------------------------

/**
 * Stage dates are calendar dates kept in Payload `date` fields (timestamps). They are written
 * at 12:00 UTC: that instant falls on the same calendar day in every time zone from UTC−11 to
 * UTC+11, so the admin date picker and the site show the same day.
 */
export function toStoredDate(dateKey: string): string {
  return `${dateKey}T12:00:00.000Z`;
}

/** Calendar date (`YYYY-MM-DD`) of a stored timestamp in the company time zone, or `null`. */
export function orderDateKey(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : tryDateKey(date);
}

/** «15.11.2026» or `null`. */
export function formatOrderDate(value: unknown): string | null {
  const key = orderDateKey(value);
  return key ? formatDateRu(key) : null;
}

/** «15.11» (planned dates on the timeline) or `null`. */
export function formatOrderDayMonth(value: unknown): string | null {
  const full = formatOrderDate(value);
  return full ? full.slice(0, 5) : null;
}

/** Today in the company time zone as a stored timestamp. */
export function todayStoredDate(now: Date = new Date()): string {
  return toStoredDate(todayKey(now));
}

/** Latest stage date the admin may set: one year ahead (typos like 2062 are rejected). */
export function maxStatusDateKey(now: Date = new Date()): string {
  return addDays(todayKey(now), 365);
}

// ---------------------------------------------------------------------------------------------
// Status change
// ---------------------------------------------------------------------------------------------

/** A `statusHistory` row as stored by Payload (extra keys such as `id` are preserved). */
export interface StatusHistoryRow {
  status: OrderStatus;
  date: string;
  plannedDate?: string | null;
  note?: string | null;
  id?: string | null;
}

export interface StatusChange {
  status: OrderStatus;
  /** Stage date (stored timestamp). `undefined`: keep the existing one, today for a new row. */
  date?: string | undefined;
  /**
   * Planned date of the NEXT stage, stored on this stage's row («план 15.11» on the timeline).
   * `undefined`: keep the existing value; `null`: clear it.
   */
  plannedDate?: string | null | undefined;
  /** «Today» for new rows (tests). */
  now?: Date;
}

/**
 * Applies «the order is now at `status`» to the history and returns a new array:
 * - the row of `status` is inserted (date = `date` or today) or updated (`date`/`plannedDate`
 *   only when given);
 * - rows of LATER stages are removed: the current status is the most advanced stage present
 *   (`computeOrderState`, task 08), so moving back is only possible by dropping them;
 * - rows of earlier stages are kept untouched (same objects, ids included);
 * - unknown rows (stale enum values) are kept; the result is ordered by stage.
 */
export function applyStatusChange<T extends Partial<StatusHistoryRow>>(
  history: readonly T[] | null | undefined,
  change: StatusChange
): (T | StatusHistoryRow)[] {
  const targetIndex = statusIndex(change.status);
  if (targetIndex < 0) throw new RangeError(`Unknown order status: ${String(change.status)}`);

  const rows = Array.isArray(history) ? history : [];
  const kept = rows.filter((row) => statusIndex(row.status) <= targetIndex);
  const existing = kept.find((row) => row.status === change.status);

  let target: T | StatusHistoryRow;
  if (existing) {
    target = {
      ...existing,
      ...(change.date !== undefined ? { date: change.date } : {}),
      ...(change.plannedDate !== undefined ? { plannedDate: change.plannedDate } : {}),
    };
  } else {
    target = {
      status: change.status,
      date: change.date ?? todayStoredDate(change.now),
      ...(change.plannedDate ? { plannedDate: change.plannedDate } : {}),
    };
  }

  const others = kept.filter((row) => row !== existing);
  return [...others, target].sort((a, b) => statusIndex(a.status) - statusIndex(b.status));
}

/** The most advanced stage present in the history, or `null`. */
export function latestStatus(
  history: readonly Partial<StatusHistoryRow>[] | null | undefined
): OrderStatus | null {
  let best: OrderStatus | null = null;
  for (const row of history ?? []) {
    if (isOrderStatus(row.status) && statusIndex(row.status) > statusIndex(best)) best = row.status;
  }
  return best;
}
