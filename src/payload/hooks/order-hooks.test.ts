import { PgDialect } from "@payloadcms/db-postgres/drizzle/pg-core";
import { describe, expect, it, vi } from "vitest";
import {
  assignOrderNumber,
  computeOrderState,
  DEFAULT_ORDER_LINK_TTL_DAYS,
  deriveOrderState,
  findRepeatedStatus,
  nextOrderNumber,
  orderYear,
  resolveTtlDays,
  sortStatusHistory,
} from "./order-hooks";
import type { SQL } from "@payloadcms/db-postgres/drizzle";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe("nextOrderNumber", () => {
  it("starts the year at 0001", () => {
    expect(nextOrderNumber(2026, 0)).toBe("2026-0001");
  });

  it("increments the last sequence of the year", () => {
    expect(nextOrderNumber(2026, 146)).toBe("2026-0147");
  });

  it("treats invalid sequences as an empty year", () => {
    expect(nextOrderNumber(2026, Number.NaN)).toBe("2026-0001");
    expect(nextOrderNumber(2026, -5)).toBe("2026-0001");
  });

  it("keeps growing past 9999", () => {
    expect(nextOrderNumber(2026, 9999)).toBe("2026-10000");
    expect(nextOrderNumber(2026, 10000)).toBe("2026-10001");
  });
});

describe("orderYear", () => {
  it("uses the business time zone (UTC+5) for the new-year boundary", () => {
    // 2026-12-31 20:00 UTC is already 2027-01-01 01:00 in Chelyabinsk.
    expect(orderYear(new Date("2026-12-31T20:00:00Z"))).toBe(2027);
    expect(orderYear(new Date("2026-12-31T18:00:00Z"))).toBe(2026);
  });
});

describe("deriveOrderState", () => {
  it("returns empty state for an empty history", () => {
    expect(deriveOrderState([])).toEqual({
      currentStatus: null,
      receivedAt: null,
      expiresAt: null,
    });
  });

  it("picks the most advanced stage regardless of entry order", () => {
    const state = deriveOrderState([
      { status: "packed", date: "2026-03-10" },
      { status: "spec_agreed", date: "2026-03-01" },
      { status: "in_production", date: "2026-03-03" },
    ]);
    expect(state.currentStatus).toBe("packed");
    expect(state.receivedAt).toBeNull();
    expect(state.expiresAt).toBeNull();
  });

  it("sets expiresAt = receivedAt + 90 days by default", () => {
    const receivedAt = "2026-04-01T09:00:00.000Z";
    const state = deriveOrderState([
      { status: "shipped", date: "2026-03-25T09:00:00.000Z" },
      { status: "received", date: receivedAt },
    ]);
    expect(state.currentStatus).toBe("received");
    expect(state.receivedAt).toBe(receivedAt);
    expect(state.expiresAt).toBe(
      new Date(Date.parse(receivedAt) + DEFAULT_ORDER_LINK_TTL_DAYS * MS_PER_DAY).toISOString()
    );
    expect(state.expiresAt).toBe("2026-06-30T09:00:00.000Z");
  });

  it("honours a custom TTL", () => {
    const state = deriveOrderState([{ status: "received", date: "2026-04-01T00:00:00.000Z" }], 30);
    expect(state.expiresAt).toBe("2026-05-01T00:00:00.000Z");
  });

  it("ignores unknown statuses and invalid dates", () => {
    const state = deriveOrderState([
      { status: "bogus", date: "2026-04-01" },
      { status: "received", date: "not a date" },
    ]);
    expect(state.currentStatus).toBe("received");
    expect(state.receivedAt).toBeNull();
    expect(state.expiresAt).toBeNull();
  });
});

describe("history helpers", () => {
  it("sorts entries by stage", () => {
    const sorted = sortStatusHistory([
      { status: "shipped" },
      { status: "spec_agreed" },
      { status: "packed" },
    ]);
    expect(sorted.map((entry) => entry.status)).toEqual(["spec_agreed", "packed", "shipped"]);
  });

  it("detects a repeated status", () => {
    expect(findRepeatedStatus([{ status: "packed" }, { status: "packed" }])).toBe("packed");
    expect(findRepeatedStatus([{ status: "packed" }, { status: "shipped" }])).toBeNull();
  });

  it("falls back to the default TTL for invalid settings", () => {
    expect(resolveTtlDays(30)).toBe(30);
    expect(resolveTtlDays(0)).toBe(DEFAULT_ORDER_LINK_TTL_DAYS);
    expect(resolveTtlDays(undefined)).toBe(DEFAULT_ORDER_LINK_TTL_DAYS);
  });
});

/** Minimal hook arguments; the hooks only use `data`, `operation`, `originalDoc` and `req`. */
function hookArgs(options: {
  data: Record<string, unknown>;
  operation: "create" | "update";
  originalDoc?: Record<string, unknown>;
  payload: Record<string, unknown>;
  transactionID?: string;
}) {
  const { data, operation, originalDoc, payload, transactionID } = options;
  const logger = { warn: vi.fn() };
  return {
    data,
    operation,
    originalDoc,
    req: { payload: { logger, ...payload }, transactionID },
  } as any;
}

const dialect = new PgDialect();
const renderSql = (query: SQL) => dialect.sqlToQuery(query);

/** Fake Postgres adapter: the transaction's `execute` answers the lock and then the max-sequence query. */
function fakeDb(lastSequence: unknown) {
  const txExecute = vi
    .fn()
    .mockResolvedValueOnce({ rows: [{ pg_advisory_xact_lock: "" }] })
    .mockResolvedValueOnce({ rows: [{ last: lastSequence }] });
  const poolExecute = vi.fn();
  const db = {
    drizzle: { execute: poolExecute },
    sessions: { tx1: { db: { execute: txExecute } } },
  };
  return { db, txExecute, poolExecute };
}

describe("assignOrderNumber hook", () => {
  it("locks the year inside the operation's transaction, then reads the numeric max", async () => {
    const year = orderYear(new Date());
    // pg returns bigint as a string.
    const { db, txExecute, poolExecute } = fakeDb("9999");
    const result = await assignOrderNumber(
      hookArgs({ data: {}, operation: "create", payload: { db }, transactionID: "tx1" })
    );

    expect(result).toEqual({ number: `${year}-10000` });
    expect(poolExecute).not.toHaveBeenCalled();
    expect(txExecute).toHaveBeenCalledTimes(2);

    const lock = renderSql(txExecute.mock.calls[0]![0]);
    expect(lock.sql).toContain("pg_advisory_xact_lock(hashtext($1), $2::int)");
    expect(lock.params).toEqual(["inex-glass:orders.number", year]);

    const max = renderSql(txExecute.mock.calls[1]![0]);
    expect(max.sql).toContain('MAX(CAST(SUBSTRING("number" FROM $1::text) AS bigint))');
    expect(max.sql).toContain('FROM "orders"');
    expect(max.params).toEqual(["^[0-9]{4}-([0-9]+)$", `${year}-%`]);
  });

  it("starts the year at 0001 when nothing is issued yet", async () => {
    const year = orderYear(new Date());
    const { db } = fakeDb(0);
    const result = await assignOrderNumber(
      hookArgs({ data: {}, operation: "create", payload: { db }, transactionID: "tx1" })
    );
    expect(result).toEqual({ number: `${year}-0001` });
  });

  it("keeps an explicitly provided number", async () => {
    const { db, txExecute } = fakeDb(5);
    const data = { number: "2025-0042" };
    const result = await assignOrderNumber(
      hookArgs({ data, operation: "create", payload: { db }, transactionID: "tx1" })
    );
    expect(result).toBe(data);
    expect(txExecute).not.toHaveBeenCalled();
  });

  it("does nothing on update", async () => {
    const { db, txExecute } = fakeDb(5);
    const data = { company: "ООО Ромашка" };
    const result = await assignOrderNumber(
      hookArgs({ data, operation: "update", payload: { db }, transactionID: "tx1" })
    );
    expect(result).toBe(data);
    expect(txExecute).not.toHaveBeenCalled();
  });
});

describe("computeOrderState hook", () => {
  it("reads the TTL from site-settings once the order is received", async () => {
    const findGlobal = vi.fn().mockResolvedValue({ orderLinkTtlDays: 10 });
    const result = await computeOrderState(
      hookArgs({
        data: {
          statusHistory: [
            { status: "received", date: "2026-04-01T00:00:00.000Z" },
            { status: "spec_agreed", date: "2026-03-01T00:00:00.000Z" },
          ],
        },
        operation: "update",
        payload: { findGlobal },
      })
    );
    expect(result.currentStatus).toBe("received");
    expect(result.expiresAt).toBe("2026-04-11T00:00:00.000Z");
    expect(result.statusHistory.map((entry: { status: string }) => entry.status)).toEqual([
      "spec_agreed",
      "received",
    ]);
  });

  it("falls back to 90 days when settings are unavailable", async () => {
    const findGlobal = vi.fn().mockRejectedValue(new Error("no global"));
    const result = await computeOrderState(
      hookArgs({
        data: {},
        operation: "update",
        originalDoc: { statusHistory: [{ status: "received", date: "2026-04-01T00:00:00.000Z" }] },
        payload: { findGlobal },
      })
    );
    expect(result.expiresAt).toBe("2026-06-30T00:00:00.000Z");
    expect(result.statusHistory).toBeUndefined();
  });

  it("does not query settings before the order is received", async () => {
    const findGlobal = vi.fn();
    const result = await computeOrderState(
      hookArgs({
        data: { statusHistory: [{ status: "spec_agreed", date: "2026-03-01" }] },
        operation: "create",
        payload: { findGlobal },
      })
    );
    expect(result.currentStatus).toBe("spec_agreed");
    expect(result.expiresAt).toBeNull();
    expect(findGlobal).not.toHaveBeenCalled();
  });
});
