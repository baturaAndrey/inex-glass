import { describe, expect, it } from "vitest";
import {
  currentRange,
  parseDashboardPeriod,
  previousRange,
  rangeDays,
  sparkBuckets,
} from "./period";

/** 2026-10-22 10:30 in Yekaterinburg (UTC+5). */
const NOW = new Date("2026-10-22T05:30:00.000Z");

describe("parseDashboardPeriod", () => {
  it("accepts the four presets, defaults to 30 days", () => {
    expect(parseDashboardPeriod("today")).toBe("today");
    expect(parseDashboardPeriod("7d")).toBe("7d");
    expect(parseDashboardPeriod("quarter")).toBe("quarter");
    expect(parseDashboardPeriod(["7d", "30d"])).toBe("7d");
    expect(parseDashboardPeriod("foo")).toBe("30d");
    expect(parseDashboardPeriod("month")).toBe("30d");
    expect(parseDashboardPeriod(undefined)).toBe("30d");
  });
});

describe("previousRange", () => {
  it("today → yesterday", () => {
    const range = currentRange("today", NOW);
    expect(range).toEqual({ fromKey: "2026-10-22", toKey: "2026-10-22" });
    expect(previousRange(range)).toEqual({ fromKey: "2026-10-21", toKey: "2026-10-21" });
  });

  it("7d / 30d → the same number of days right before", () => {
    expect(previousRange(currentRange("7d", NOW))).toEqual({
      fromKey: "2026-10-09",
      toKey: "2026-10-15",
    });
    expect(previousRange(currentRange("30d", NOW))).toEqual({
      fromKey: "2026-08-24",
      toKey: "2026-09-22",
    });
  });

  it("quarter → the same length before the quarter start (month and year boundary)", () => {
    const range = currentRange("quarter", NOW);
    expect(range).toEqual({ fromKey: "2026-10-01", toKey: "2026-10-22" });
    expect(previousRange(range)).toEqual({ fromKey: "2026-09-09", toKey: "2026-09-30" });

    const january = new Date("2027-01-05T05:00:00.000Z");
    const q1 = currentRange("quarter", january);
    expect(q1).toEqual({ fromKey: "2027-01-01", toKey: "2027-01-05" });
    expect(previousRange(q1)).toEqual({ fromKey: "2026-12-27", toKey: "2026-12-31" });
  });
});

describe("sparkBuckets", () => {
  it("today at 10:30 → 11 hourly buckets from local midnight", () => {
    const buckets = sparkBuckets("today", currentRange("today", NOW), NOW);
    expect(buckets).toHaveLength(11);
    expect(buckets[0]?.from.toISOString()).toBe("2026-10-21T19:00:00.000Z");
    expect(buckets[10]?.key).toBe("10");
    expect(buckets[10]?.to.toISOString()).toBe("2026-10-22T05:59:59.999Z");
  });

  it("7d / 30d → one bucket per day", () => {
    expect(sparkBuckets("7d", currentRange("7d", NOW), NOW)).toHaveLength(7);
    const month = sparkBuckets("30d", currentRange("30d", NOW), NOW);
    expect(month).toHaveLength(30);
    expect(month[29]?.key).toBe("2026-10-22");
  });

  it("quarter → weeks of 7 days, the last one cut at today", () => {
    const range = currentRange("quarter", NOW);
    const buckets = sparkBuckets("quarter", range, NOW);
    expect(buckets).toHaveLength(Math.ceil(rangeDays(range) / 7));
    expect(buckets).toHaveLength(4);
    expect(buckets.map((bucket) => bucket.key)).toEqual([
      "2026-10-01",
      "2026-10-08",
      "2026-10-15",
      "2026-10-22",
    ]);
    expect(buckets[3]?.to.toISOString()).toBe("2026-10-22T18:59:59.999Z");
  });
});
