import { describe, expect, it } from "vitest";
import {
  cardAge,
  commentsLabel,
  formatAge,
  formatArea,
  formatEstimateFrom,
  formatKpAmount,
  formatPhoneDisplay,
  initials,
  pluralRu,
  sourceShortLabel,
  tallyRefuseReasons,
} from "./format";

const NBSP = " ";
/** 2026-10-22 10:00 in Yekaterinburg (UTC+5). */
const NOW = new Date("2026-10-22T05:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatAge", () => {
  it("covers every threshold", () => {
    expect(formatAge(ago(20_000), NOW)).toBe("только что");
    expect(formatAge(ago(12 * MIN), NOW)).toBe("12 мин");
    expect(formatAge(ago(59 * MIN), NOW)).toBe("59 мин");
    expect(formatAge(ago(HOUR), NOW)).toBe("1 ч");
    expect(formatAge(ago(2 * HOUR + 15 * MIN), NOW)).toBe("2 ч 15 мин");
    expect(formatAge(ago(3 * HOUR), NOW)).toBe("3 ч");
    expect(formatAge(ago(3 * HOUR + 40 * MIN), NOW)).toBe("3 ч");
    expect(formatAge(ago(23 * HOUR), NOW)).toBe("23 ч");
  });

  it("counts calendar days in the company time zone", () => {
    // 21.10 08:00 local → 22.10 10:00 local: 26 hours, yesterday.
    expect(formatAge(ago(26 * HOUR), NOW)).toBe("вчера");
    // 20.10 23:00 local (18:00 UTC) → 22.10 00:30 local (21.10 19:30 UTC): 25.5 h, but two
    // calendar days in Yekaterinburg (in UTC it would still be «вчера»).
    const lateNight = new Date("2026-10-21T19:30:00.000Z");
    expect(formatAge(new Date("2026-10-20T18:00:00.000Z"), lateNight)).toBe("2 дня");
    expect(formatAge(ago(2 * DAY), NOW)).toBe("2 дня");
    expect(formatAge(ago(5 * DAY), NOW)).toBe("5 дней");
    expect(formatAge(ago(21 * DAY), NOW)).toBe("21 день");
  });
});

describe("cardAge", () => {
  const card = (createdAgo: number, changedAgo: number | null) => ({
    createdAt: ago(createdAgo).toISOString(),
    statusChangedAt: changedAgo === null ? null : ago(changedAgo).toISOString(),
  });

  it("marks a new lead late after 2 hours", () => {
    expect(cardAge(card(59 * MIN, null), "default", NOW)).toEqual({
      label: "59 мин",
      title: "22.10.2026 09:01",
      tone: null,
    });
    expect(cardAge(card(2 * HOUR + 15 * MIN, null), "default", NOW).tone).toBe("late");
  });

  it("measures an offer from the status change and flags it after 5 days", () => {
    expect(cardAge(card(30 * DAY, 2 * DAY), "kp", NOW)).toMatchObject({
      label: "2 дня",
      tone: null,
    });
    expect(cardAge(card(30 * DAY, 6 * DAY), "kp", NOW)).toMatchObject({
      label: "6 дней",
      tone: "waiting",
    });
  });

  it("uses the status change (or creation) for other open columns", () => {
    expect(cardAge(card(10 * DAY, 3 * HOUR), "open", NOW).label).toBe("3 ч");
    expect(cardAge(card(5 * DAY, null), "open", NOW).label).toBe("5 дней");
  });

  it("shows the day of a contract", () => {
    expect(cardAge(card(30 * DAY, 2 * DAY), "contract", NOW)).toMatchObject({
      label: "20.10",
      tone: null,
    });
  });
});

describe("formatPhoneDisplay", () => {
  it("formats Russian mobiles and keeps other numbers", () => {
    expect(formatPhoneDisplay("+79123456789")).toBe("+7 912 345-67-89");
    expect(formatPhoneDisplay("+375291234567")).toBe("+375291234567");
  });
});

describe("sums", () => {
  it("use NBSP", () => {
    expect(formatEstimateFrom(168000)).toBe(`от${NBSP}168${NBSP}000${NBSP}₽`);
    expect(formatKpAmount(412000)).toBe(`КП${NBSP}412${NBSP}000${NBSP}₽`);
    expect(formatArea(120)).toBe(`120${NBSP}м²`);
  });
});

describe("plurals and labels", () => {
  it("declines Russian nouns", () => {
    expect(pluralRu(1, "a", "b", "c")).toBe("a");
    expect(pluralRu(11, "a", "b", "c")).toBe("c");
    expect(pluralRu(22, "a", "b", "c")).toBe("b");
    expect(commentsLabel(1)).toBe("1 комментарий");
    expect(commentsLabel(2)).toBe("2 комментария");
    expect(commentsLabel(5)).toBe("5 комментариев");
    expect(commentsLabel(12)).toBe("12 комментариев");
  });

  it("builds initials", () => {
    expect(initials("Сергей Морозов")).toBe("СМ");
    expect(initials("  ольга  ")).toBe("О");
    expect(initials("Анна Мария Петрова")).toBe("АМ");
    expect(initials("")).toBe("?");
  });

  it("shortens sources", () => {
    expect(sourceShortLabel("drawing")).toBe("Чертёж");
    expect(sourceShortLabel("load")).toBe("Под нагрузку");
    expect(sourceShortLabel("nope")).toBe("—");
  });
});

describe("tallyRefuseReasons", () => {
  it("groups by code, text-only as «Другое», nothing as «Не указана»", () => {
    expect(
      tallyRefuseReasons([
        { refuseReasonCode: "expensive" },
        { refuseReasonCode: "no_contact" },
        { refuseReasonCode: "expensive" },
        { refuseReasonCode: null, refuseReason: "Передумали" },
        { refuseReasonCode: "other_supplier" },
        { refuseReasonCode: null, refuseReason: "  " },
      ])
    ).toEqual([
      { label: "Дорого", count: 2 },
      { label: "Выбрали другого поставщика", count: 1 },
      { label: "Не дозвонились", count: 1 },
      { label: "Другое", count: 1 },
      { label: "Не указана", count: 1 },
    ]);
    expect(tallyRefuseReasons([])).toEqual([]);
  });
});
