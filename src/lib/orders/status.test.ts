import { describe, expect, it } from "vitest";
import {
  applyStatusChange,
  formatOrderDate,
  formatOrderDayMonth,
  isOrderStatus,
  latestStatus,
  maxStatusDateKey,
  nextStatus,
  ORDER_STATUS_IDS,
  ORDER_STATUS_META,
  orderDateKey,
  statusIndex,
  statusLabel,
  toStoredDate,
} from "./status";

const NOW = new Date("2026-11-14T08:00:00.000Z");

describe("order statuses", () => {
  it("keeps the 5 stages in their natural order", () => {
    expect(ORDER_STATUS_IDS).toEqual([
      "spec_agreed",
      "in_production",
      "packed",
      "shipped",
      "received",
    ]);
    expect(ORDER_STATUS_IDS.map((id) => statusIndex(id))).toEqual([0, 1, 2, 3, 4]);
    expect(ORDER_STATUS_META.shipped).toEqual({
      label: "Отгружено",
      badgeBg: "#E6F4EA",
      badgeText: "#237A35",
    });
  });

  it("rejects unknown values", () => {
    expect(statusIndex("archived")).toBe(-1);
    expect(statusIndex(null)).toBe(-1);
    expect(isOrderStatus("packed")).toBe(true);
    expect(isOrderStatus("PACKED")).toBe(false);
    expect(statusLabel("packed")).toBe("Упаковано");
    expect(statusLabel("legacy")).toBe("legacy");
  });

  it("nextStatus walks the stages and stops after «Получено»", () => {
    expect(nextStatus(null)).toBe("spec_agreed");
    expect(nextStatus("spec_agreed")).toBe("in_production");
    expect(nextStatus("shipped")).toBe("received");
    expect(nextStatus("received")).toBeNull();
  });

  it("latestStatus is the most advanced stage present", () => {
    expect(latestStatus([])).toBeNull();
    expect(
      latestStatus([
        { status: "packed", date: "x" },
        { status: "spec_agreed", date: "x" },
      ])
    ).toBe("packed");
  });
});

describe("order dates", () => {
  it("stores calendar dates at noon UTC and reads them back in the company zone", () => {
    expect(toStoredDate("2026-11-15")).toBe("2026-11-15T12:00:00.000Z");
    expect(orderDateKey("2026-11-15T12:00:00.000Z")).toBe("2026-11-15");
    // Local midnight in Chelyabinsk (UTC+5) written by a browser date picker: same day.
    expect(orderDateKey("2026-11-14T19:00:00.000Z")).toBe("2026-11-15");
    expect(formatOrderDate("2026-11-15T12:00:00.000Z")).toBe("15.11.2026");
    expect(formatOrderDayMonth("2026-11-15T12:00:00.000Z")).toBe("15.11");
    expect(formatOrderDate("not a date")).toBeNull();
    expect(formatOrderDate(null)).toBeNull();
  });

  it("allows stage dates up to one year ahead", () => {
    expect(maxStatusDateKey(NOW)).toBe("2027-11-14");
  });
});

describe("applyStatusChange", () => {
  const history = [
    { id: "a", status: "spec_agreed" as const, date: "2026-10-28T12:00:00.000Z", note: "ok" },
    { id: "b", status: "in_production" as const, date: "2026-10-30T12:00:00.000Z" },
  ];

  it("inserts the new stage with today's date by default", () => {
    const next = applyStatusChange(history, { status: "packed", now: NOW });
    expect(next.map((row) => row.status)).toEqual(["spec_agreed", "in_production", "packed"]);
    expect(next[2]).toEqual({ status: "packed", date: "2026-11-14T12:00:00.000Z" });
  });

  it("keeps the rows of other stages untouched (same objects, ids, notes)", () => {
    const next = applyStatusChange(history, { status: "packed", now: NOW });
    expect(next[0]).toBe(history[0]);
    expect(next[1]).toBe(history[1]);
    expect(history).toHaveLength(2);
  });

  it("updates the date and the planned date of an existing stage, keeping its id", () => {
    const next = applyStatusChange(history, {
      status: "in_production",
      date: "2026-10-31T12:00:00.000Z",
      plannedDate: "2026-11-15T12:00:00.000Z",
    });
    expect(next[1]).toEqual({
      id: "b",
      status: "in_production",
      date: "2026-10-31T12:00:00.000Z",
      plannedDate: "2026-11-15T12:00:00.000Z",
    });
    expect(next[0]).toBe(history[0]);
  });

  it("preserves plannedDate when not given and clears it with null", () => {
    const planned = [{ ...history[0]!, plannedDate: "2026-11-01T12:00:00.000Z" }];
    expect(applyStatusChange(planned, { status: "spec_agreed" })[0]?.plannedDate).toBe(
      "2026-11-01T12:00:00.000Z"
    );
    expect(applyStatusChange(planned, { status: "spec_agreed", plannedDate: null })[0]).toEqual(
      expect.objectContaining({ plannedDate: null })
    );
  });

  it("moving back drops the later stages", () => {
    const shipped = applyStatusChange(applyStatusChange(history, { status: "packed", now: NOW }), {
      status: "shipped",
      now: NOW,
    });
    const back = applyStatusChange(shipped, { status: "in_production" });
    expect(back.map((row) => row.status)).toEqual(["spec_agreed", "in_production"]);
    expect(back[1]).toEqual(history[1]);
  });

  it("orders rows by stage and copes with an empty history", () => {
    expect(applyStatusChange(null, { status: "spec_agreed", now: NOW })).toEqual([
      { status: "spec_agreed", date: "2026-11-14T12:00:00.000Z" },
    ]);
    const shuffled = [history[1]!, history[0]!];
    expect(
      applyStatusChange(shuffled, { status: "packed", now: NOW }).map((r) => r.status)
    ).toEqual(["spec_agreed", "in_production", "packed"]);
  });

  it("throws on an unknown status", () => {
    // @ts-expect-error — runtime guard for untyped callers
    expect(() => applyStatusChange(history, { status: "lost" })).toThrow(RangeError);
  });
});
