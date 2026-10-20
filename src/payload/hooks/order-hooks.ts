import { sql } from "@payloadcms/db-postgres/drizzle";
import { ORDER_STATUSES } from "@/payload/collections/crm/constants";
import type { OrderStatus } from "@/payload/collections/crm/constants";
import { relGlobal } from "@/payload/slugs";
import type { SQL } from "@payloadcms/db-postgres/drizzle";
import type { CollectionBeforeChangeHook, PayloadRequest } from "payload";

/**
 * Computed fields of `orders` (ТЗ §6.2): order number, current status, link expiry.
 *
 * The pure helpers (`nextOrderNumber`, `deriveOrderState`, …) hold all the logic and are unit
 * tested; the hooks only gather inputs from Payload. Type-only imports from `payload` keep this
 * module loadable in Vitest without booting Payload.
 */

/** Business time zone (Chelyabinsk): the order year flips at local midnight, not UTC. */
export const ORDER_TIME_ZONE = "Asia/Yekaterinburg";
/** Fallback when `site-settings.orderLinkTtlDays` is missing or invalid. */
export const DEFAULT_ORDER_LINK_TTL_DAYS = 90;

const ORDER_SEQUENCE_DIGITS = 4;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ORDER_NUMBER_PATTERN = /^(\d{4})-(\d+)$/;
/** POSIX regex for `SUBSTRING … FROM`: the capture group is the sequence part of the number. */
const ORDER_SEQUENCE_REGEX = "^[0-9]{4}-([0-9]+)$";
/** Postgres table of the `orders` collection (key in the adapter's `tables`). */
const ORDERS_TABLE = "orders";
/** First key of the two-key advisory lock (second key: the year). */
const ORDER_NUMBER_LOCK_NAMESPACE = "inex-glass:orders.number";

const STATUS_RANK: ReadonlyMap<string, number> = new Map(
  ORDER_STATUSES.map(({ value }, index) => [value, index])
);

export type StatusHistoryEntry = {
  status?: unknown;
  date?: unknown;
  [key: string]: unknown;
};

export type OrderState = {
  currentStatus: OrderStatus | null;
  receivedAt: string | null;
  expiresAt: string | null;
};

/** Calendar year of `now` in the business time zone. */
export function orderYear(now: Date, timeZone: string = ORDER_TIME_ZONE): number {
  const year = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric" }).format(now);
  return Number(year);
}

/**
 * Next number in the `YYYY-NNNN` sequence of `year`.
 *
 * `lastSequence` is the greatest sequence already issued for that year, compared numerically
 * (`0` when there is none or the value is invalid). The sequence is zero-padded to at least 4
 * digits; past `9999` it keeps growing (5 digits) instead of failing.
 */
export function nextOrderNumber(year: number, lastSequence: number): string {
  const last = Number.isSafeInteger(lastSequence) && lastSequence > 0 ? lastSequence : 0;
  const sequence = String(last + 1).padStart(ORDER_SEQUENCE_DIGITS, "0");
  return `${year}-${sequence}`;
}

const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && STATUS_RANK.has(value);

const rankOf = (entry: StatusHistoryEntry): number =>
  isOrderStatus(entry.status) ? (STATUS_RANK.get(entry.status) ?? -1) : -1;

/** History ordered by stage (spec_agreed → received); unknown statuses go first. Stable. */
export function sortStatusHistory<T extends StatusHistoryEntry>(history: readonly T[]): T[] {
  return [...history].sort((a, b) => rankOf(a) - rankOf(b));
}

/** First status that occurs more than once in the history, or `null`. */
export function findRepeatedStatus(history: readonly StatusHistoryEntry[]): string | null {
  const seen = new Set<string>();
  for (const { status } of history) {
    if (typeof status !== "string") continue;
    if (seen.has(status)) return status;
    seen.add(status);
  }
  return null;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * Current status = the most advanced stage present in the history. `receivedAt` is the date of
 * the `received` entry; the client link expires `ttlDays` after it. Without `received` the link
 * does not expire (`expiresAt = null`).
 */
export function deriveOrderState(
  history: readonly StatusHistoryEntry[],
  ttlDays: number = DEFAULT_ORDER_LINK_TTL_DAYS
): OrderState {
  let currentStatus: OrderStatus | null = null;
  let receivedAt: string | null = null;

  for (const entry of history) {
    if (!isOrderStatus(entry.status)) continue;
    if (currentStatus === null || rankOf(entry) > (STATUS_RANK.get(currentStatus) ?? -1)) {
      currentStatus = entry.status;
    }
    if (entry.status === "received") receivedAt = toIsoDate(entry.date);
  }

  const expiresAt =
    receivedAt === null
      ? null
      : new Date(new Date(receivedAt).getTime() + ttlDays * MS_PER_DAY).toISOString();

  return { currentStatus, receivedAt, expiresAt };
}

/** Positive TTL from the settings value, otherwise the default. */
export function resolveTtlDays(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_ORDER_LINK_TTL_DAYS;
}

async function readOrderLinkTtlDays(req: PayloadRequest): Promise<number> {
  try {
    const settings: unknown = await req.payload.findGlobal({
      slug: relGlobal("site-settings"),
      depth: 0,
      overrideAccess: true,
      req,
    });
    return resolveTtlDays((settings as { orderLinkTtlDays?: unknown } | null)?.orderLinkTtlDays);
  } catch (error) {
    // Settings are not seeded yet (or the global is missing): the documented default applies.
    req.payload.logger.warn({ err: error, msg: "orders: site-settings unavailable, TTL fallback" });
    return DEFAULT_ORDER_LINK_TTL_DAYS;
  }
}

/** Minimal view of the Postgres adapter (`@payloadcms/db-postgres`) used for raw SQL. */
type SqlExecutor = { execute: (query: SQL) => Promise<{ rows?: Record<string, unknown>[] }> };
type PostgresAdapterView = {
  drizzle: SqlExecutor;
  sessions?: Record<string, { db: SqlExecutor } | undefined>;
  tables?: Record<string, unknown>;
};

/**
 * Drizzle handle of the operation's transaction (the same lookup as Payload's internal
 * `getTransaction`), so the advisory lock lives exactly as long as the insert's transaction.
 */
async function transactionDb(req: PayloadRequest): Promise<SqlExecutor> {
  const adapter = req.payload.db as unknown as PostgresAdapterView;
  const transactionId = req.transactionID ? await req.transactionID : null;
  const session = transactionId ? adapter.sessions?.[String(transactionId)] : undefined;
  if (!session) {
    // No transaction (transactions disabled): the lock is released right away and only the
    // unique index on `number` protects against a concurrent duplicate.
    req.payload.logger.warn({ msg: "orders: no transaction, order number is not serialized" });
  }
  return session?.db ?? adapter.drizzle;
}

/**
 * Greatest issued sequence of `year`, under a transaction-scoped advisory lock per year.
 *
 * Concurrent creates of the same year queue on the lock until the holder commits or rolls back;
 * the next one (READ COMMITTED, new statement snapshot) then sees the committed number. Retrying
 * a duplicate inside one transaction is impossible in Postgres (the failed statement aborts the
 * transaction), hence the lock instead of retries. The sequence is parsed in SQL and compared
 * as a number: text order would put `2026-9999` after `2026-10000`.
 */
async function lockAndReadLastSequence(req: PayloadRequest, year: number): Promise<number> {
  const db = await transactionDb(req);
  const adapter = req.payload.db as unknown as PostgresAdapterView;
  const table = adapter.tables?.[ORDERS_TABLE] ?? sql.identifier(ORDERS_TABLE);

  await db.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${ORDER_NUMBER_LOCK_NAMESPACE}), ${year}::int)`
  );
  const result = await db.execute(sql`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(${sql.identifier("number")} FROM ${ORDER_SEQUENCE_REGEX}::text) AS bigint)),
      0
    ) AS "last"
    FROM ${table}
    WHERE ${sql.identifier("number")} LIKE ${`${year}-%`}
  `);
  return Number(result.rows?.[0]?.last ?? 0);
}

/**
 * `beforeChange` (create): assigns `YYYY-NNNN` — the greatest number of the current year + 1,
 * serialized per year by `lockAndReadLastSequence`. An explicitly provided valid number (data
 * import through the Local API) is kept.
 */
export const assignOrderNumber: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create" || !data) return data;
  if (typeof data.number === "string" && ORDER_NUMBER_PATTERN.test(data.number)) return data;

  const year = orderYear(new Date());
  const lastSequence = await lockAndReadLastSequence(req, year);
  return { ...data, number: nextOrderNumber(year, lastSequence) };
};

/**
 * `beforeChange` (create/update): keeps `statusHistory` ordered by stage and recomputes
 * `currentStatus`, `receivedAt`, `expiresAt`.
 */
export const computeOrderState: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;

  const incoming: unknown = data.statusHistory;
  const stored: unknown = (originalDoc as { statusHistory?: unknown } | undefined)?.statusHistory;
  const source = Array.isArray(incoming) ? incoming : Array.isArray(stored) ? stored : [];
  const history = sortStatusHistory(source as StatusHistoryEntry[]);

  const hasReceived = history.some((entry) => entry.status === "received");
  const ttlDays = hasReceived ? await readOrderLinkTtlDays(req) : DEFAULT_ORDER_LINK_TTL_DAYS;
  const state = deriveOrderState(history, ttlDays);

  return {
    ...data,
    ...(Array.isArray(incoming) ? { statusHistory: history } : {}),
    currentStatus: state.currentStatus,
    receivedAt: state.receivedAt,
    expiresAt: state.expiresAt,
  };
};
