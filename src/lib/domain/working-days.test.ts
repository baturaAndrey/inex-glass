import { describe, expect, it } from "vitest";
import { dayOfWeek } from "./dates";
import {
  addWorkingDays,
  earliestReadyDate,
  isUrgent,
  isWorkingDay,
  leadTimeDays,
  RU_HOLIDAYS_2026_2027,
  RU_WORKDAYS_2026_2027,
  URGENT_MESSAGE,
  workingDaysBetween,
} from "./working-days";

/** 2026-10-19 is a Monday; noon in Chelyabinsk. */
const MONDAY_NOON = new Date("2026-10-19T07:00:00Z");

describe("isWorkingDay", () => {
  it("treats weekends and listed holidays as days off", () => {
    expect(isWorkingDay("2026-10-19", [])).toBe(true);
    expect(isWorkingDay("2026-10-24", [])).toBe(false);
    expect(isWorkingDay("2026-10-25", [])).toBe(false);
    expect(isWorkingDay("2026-11-04", ["2026-11-04"])).toBe(false);
    expect(isWorkingDay("2026-11-04", ["2026-11-04T00:00:00.000Z"])).toBe(false);
  });

  it("supports a weekend made working by a transfer", () => {
    expect(isWorkingDay("2027-02-20", [])).toBe(false);
    expect(isWorkingDay("2027-02-20", [], ["2027-02-20"])).toBe(true);
  });
});

describe("addWorkingDays", () => {
  it("counts from the next day", () => {
    expect(addWorkingDays("2026-10-19", 10, [])).toBe("2026-11-02");
    expect(addWorkingDays("2026-10-19", 14, [])).toBe("2026-11-06");
  });

  it("skips holidays", () => {
    expect(addWorkingDays("2026-10-19", 10, ["2026-10-21"])).toBe("2026-11-03");
  });

  it("moves Friday + 1 to Monday", () => {
    expect(addWorkingDays("2026-10-23", 1, [])).toBe("2026-10-26");
  });

  it("returns the start date for n ≤ 0", () => {
    expect(addWorkingDays("2026-10-24", 0, [])).toBe("2026-10-24");
  });

  it("is the inverse of workingDaysBetween", () => {
    expect(workingDaysBetween("2026-10-19", "2026-11-02", [])).toBe(10);
    expect(workingDaysBetween("2026-10-19", "2026-11-03", ["2026-10-21"])).toBe(10);
    expect(workingDaysBetween("2026-11-02", "2026-10-19", [])).toBe(-10);
  });
});

describe("lead time and urgency", () => {
  it("is 10 working days, 14 for triplex", () => {
    expect(leadTimeDays(false)).toBe(10);
    expect(leadTimeDays(true)).toBe(14);
    expect(earliestReadyDate("2026-10-19", false, [])).toBe("2026-11-02");
    expect(earliestReadyDate("2026-10-19", true, [])).toBe("2026-11-06");
  });

  it("flags a date strictly before the earliest ready date", () => {
    expect(isUrgent("2026-11-01", MONDAY_NOON, false, [])).toBe(true);
    expect(isUrgent("2026-11-02", MONDAY_NOON, false, [])).toBe(false);
    expect(isUrgent("2026-11-05", MONDAY_NOON, true, [])).toBe(true);
    expect(isUrgent("2026-11-06", MONDAY_NOON, true, [])).toBe(false);
  });

  it("ignores an empty or invalid date", () => {
    expect(isUrgent(null, MONDAY_NOON, false, [])).toBe(false);
    expect(isUrgent(undefined, MONDAY_NOON, false, [])).toBe(false);
    expect(isUrgent("", MONDAY_NOON, false, [])).toBe(false);
    expect(isUrgent("soon", MONDAY_NOON, false, [])).toBe(false);
  });

  it("takes «today» in Asia/Yekaterinburg", () => {
    // 20:00 UTC on 19.10 = 01:00 on 20.10 in Chelyabinsk → earliest date is 03.11.
    const lateEvening = new Date("2026-10-19T20:00:00Z");
    expect(isUrgent("2026-11-02", lateEvening, false, [])).toBe(true);
    expect(isUrgent("2026-11-03", lateEvening, false, [])).toBe(false);
  });

  it("exports the message verbatim", () => {
    expect(URGENT_MESSAGE).toBe(
      "Срочного изготовления нет. Ближайший срок — от 10 рабочих дней с даты договора, для триплекса — от 14"
    );
  });
});

describe("RU_HOLIDAYS_2026_2027 (smoke)", () => {
  it("contains valid, unique weekdays only", () => {
    expect(new Set(RU_HOLIDAYS_2026_2027).size).toBe(RU_HOLIDAYS_2026_2027.length);
    for (const key of RU_HOLIDAYS_2026_2027) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const dow = dayOfWeek(key);
      expect(dow, key).toBeGreaterThanOrEqual(1);
      expect(dow, key).toBeLessThanOrEqual(5);
    }
  });

  it("lists only weekend days as transferred workdays", () => {
    for (const key of RU_WORKDAYS_2026_2027) expect([0, 6]).toContain(dayOfWeek(key));
  });
});
