import { describe, expect, it } from "vitest";
import {
  createdAtWhere,
  parseDateKey,
  periodBounds,
  presetRange,
  resolvePeriod,
  timeZoneOffsetMs,
  toWallClockDate,
  zonedDayEnd,
  zonedDayStart,
} from "./period";

/** 2026-10-20 10:00 in Chelyabinsk (UTC+5). */
const NOW = new Date("2026-10-20T05:00:00.000Z");

describe("parseDateKey", () => {
  it("accepts real calendar dates only", () => {
    expect(parseDateKey("2026-10-20")).toBe("2026-10-20");
    expect(parseDateKey(" 2024-02-29 ")).toBe("2024-02-29");
    expect(parseDateKey("2026-02-29")).toBeNull();
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("20.10.2026")).toBeNull();
    expect(parseDateKey("garbage")).toBeNull();
    expect(parseDateKey(undefined)).toBeNull();
  });
});

describe("company time zone bounds", () => {
  it("has a constant +5 h offset", () => {
    expect(timeZoneOffsetMs(NOW)).toBe(5 * 3_600_000);
    expect(timeZoneOffsetMs(new Date("2026-10-20T05:00:00.999Z"))).toBe(5 * 3_600_000);
  });

  it("starts the local day at 19:00 UTC of the previous day", () => {
    expect(zonedDayStart("2026-10-20").toISOString()).toBe("2026-10-19T19:00:00.000Z");
    expect(zonedDayEnd("2026-10-20").toISOString()).toBe("2026-10-20T18:59:59.999Z");
  });

  it("crosses the year boundary", () => {
    expect(zonedDayStart("2027-01-01").toISOString()).toBe("2026-12-31T19:00:00.000Z");
    expect(zonedDayEnd("2026-12-31").toISOString()).toBe("2026-12-31T18:59:59.999Z");
  });

  it("works for a zone with DST", () => {
    // Europe/Berlin switches to summer time on 2026-03-29.
    expect(zonedDayStart("2026-03-29", "Europe/Berlin").toISOString()).toBe(
      "2026-03-28T23:00:00.000Z"
    );
    expect(zonedDayStart("2026-03-30", "Europe/Berlin").toISOString()).toBe(
      "2026-03-29T22:00:00.000Z"
    );
  });

  it("places a lead created at 00:30 local time into that local day", () => {
    const created = new Date("2026-10-19T19:30:00.000Z"); // 20.10 00:30 in Chelyabinsk
    const { from, to } = periodBounds({ fromKey: "2026-10-20", toKey: "2026-10-20" });
    expect(created >= from && created <= to).toBe(true);
  });

  it("shifts dates to the wall clock for spreadsheets", () => {
    expect(toWallClockDate(new Date("2026-10-19T19:30:00.000Z")).toISOString()).toBe(
      "2026-10-20T00:30:00.000Z"
    );
  });

  it("builds an inclusive createdAt condition", () => {
    expect(createdAtWhere({ fromKey: "2026-10-01", toKey: "2026-10-31" })).toEqual({
      createdAt: {
        greater_than_equal: "2026-09-30T19:00:00.000Z",
        less_than_equal: "2026-10-31T18:59:59.999Z",
      },
    });
  });
});

describe("presetRange", () => {
  it("covers today, 7 and 30 days including today", () => {
    expect(presetRange("today", NOW)).toEqual({ fromKey: "2026-10-20", toKey: "2026-10-20" });
    expect(presetRange("7d", NOW)).toEqual({ fromKey: "2026-10-14", toKey: "2026-10-20" });
    expect(presetRange("30d", NOW)).toEqual({ fromKey: "2026-09-21", toKey: "2026-10-20" });
  });

  it("starts the month and the quarter on their first day", () => {
    expect(presetRange("month", NOW)).toEqual({ fromKey: "2026-10-01", toKey: "2026-10-20" });
    expect(presetRange("quarter", NOW)).toEqual({ fromKey: "2026-10-01", toKey: "2026-10-20" });
    const may = new Date("2026-05-15T05:00:00.000Z");
    expect(presetRange("quarter", may)).toEqual({ fromKey: "2026-04-01", toKey: "2026-05-15" });
  });

  it("uses the local date right after local midnight (still yesterday in UTC)", () => {
    const justAfterMidnight = new Date("2026-10-31T19:10:00.000Z"); // 01.11 00:10 local
    expect(presetRange("today", justAfterMidnight)).toEqual({
      fromKey: "2026-11-01",
      toKey: "2026-11-01",
    });
    expect(presetRange("month", justAfterMidnight).fromKey).toBe("2026-11-01");
  });

  it("rolls 7 days back across a month and a year", () => {
    const jan2 = new Date("2027-01-02T05:00:00.000Z");
    expect(presetRange("7d", jan2)).toEqual({ fromKey: "2026-12-27", toKey: "2027-01-02" });
  });
});

describe("resolvePeriod", () => {
  it("defaults to the last 30 days", () => {
    expect(resolvePeriod({}, NOW)).toEqual({
      ok: true,
      preset: "30d",
      range: { fromKey: "2026-09-21", toKey: "2026-10-20" },
    });
  });

  it("prefers a preset over dates", () => {
    const result = resolvePeriod({ period: "7d", from: "2026-01-01", to: "2026-01-31" }, NOW);
    expect(result).toMatchObject({ ok: true, preset: "7d" });
  });

  it("accepts explicit dates (custom)", () => {
    expect(resolvePeriod({ from: "2026-10-01", to: "2026-10-05" }, NOW)).toEqual({
      ok: true,
      preset: "custom",
      range: { fromKey: "2026-10-01", toKey: "2026-10-05" },
    });
    expect(resolvePeriod({ period: "custom", from: "2026-10-01" }, NOW)).toEqual({
      ok: true,
      preset: "custom",
      range: { fromKey: "2026-10-01", toKey: "2026-10-20" },
    });
    expect(resolvePeriod({ to: "2026-10-20" }, NOW)).toMatchObject({
      range: { fromKey: "2026-09-21", toKey: "2026-10-20" },
    });
  });

  it("rejects garbage", () => {
    expect(resolvePeriod({ from: "garbage" }, NOW)).toMatchObject({ ok: false });
    expect(resolvePeriod({ to: "2026-02-30" }, NOW)).toMatchObject({ ok: false });
    expect(resolvePeriod({ from: "2026-10-10", to: "2026-10-01" }, NOW)).toMatchObject({
      ok: false,
    });
    expect(resolvePeriod({ period: "year" }, NOW)).toMatchObject({ ok: false });
    expect(resolvePeriod({ period: "custom" }, NOW)).toMatchObject({ ok: false });
  });
});
