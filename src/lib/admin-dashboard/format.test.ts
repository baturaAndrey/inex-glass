import { describe, expect, it } from "vitest";
import {
  absoluteDelta,
  formatAge,
  formatWhen,
  percentDelta,
  plural,
  pointsDelta,
  shortName,
} from "./format";

/** 2026-10-22 10:30 in Yekaterinburg (UTC+5). */
const NOW = new Date("2026-10-22T05:30:00.000Z");

describe("formatWhen", () => {
  it("shows the time for today, «вчера» and DD.MM otherwise", () => {
    expect(formatWhen("2026-10-22T05:48:00.000Z", NOW)).toEqual({
      text: "10:48",
      title: "22.10.2026 10:48",
    });
    expect(formatWhen("2026-10-21T10:00:00.000Z", NOW).text).toBe("вчера");
    expect(formatWhen("2026-10-20T10:00:00.000Z", NOW)).toEqual({
      text: "20.10",
      title: "20.10.2026 15:00",
    });
  });

  it("uses the Yekaterinburg midnight, not UTC", () => {
    // 19:30 UTC on the 21st is 00:30 on the 22nd in Yekaterinburg: today.
    expect(formatWhen("2026-10-21T19:30:00.000Z", NOW).text).toBe("00:30");
    // 18:59 UTC on the 21st is 23:59 on the 21st: yesterday.
    expect(formatWhen("2026-10-21T18:59:00.000Z", NOW).text).toBe("вчера");
  });

  it("degrades on an invalid date", () => {
    expect(formatWhen("garbage", NOW).text).toBe("—");
  });
});

describe("formatAge", () => {
  const minutes = (n: number) => n * 60_000;
  it("formats minutes, hours and days", () => {
    expect(formatAge(minutes(12))).toBe("12 мин");
    expect(formatAge(minutes(60))).toBe("1 ч");
    expect(formatAge(minutes(135))).toBe("2 ч 15 мин");
    expect(formatAge(minutes(3 * 24 * 60 + 5))).toBe("3 дня");
    expect(formatAge(minutes(24 * 60))).toBe("1 день");
    expect(formatAge(minutes(5 * 24 * 60))).toBe("5 дней");
  });

  it("never shows zero minutes", () => {
    expect(formatAge(10_000)).toBe("1 мин");
    expect(formatAge(-5_000)).toBe("1 мин");
  });
});

describe("plural", () => {
  it("picks the Russian form", () => {
    const forms = ["день", "дня", "дней"] as const;
    expect([1, 2, 5, 11, 21, 22, 25, 111].map((n) => plural(n, forms))).toEqual([
      "день",
      "дня",
      "дней",
      "дней",
      "день",
      "дня",
      "дней",
      "дней",
    ]);
  });
});

describe("shortName", () => {
  it("shortens the surname", () => {
    expect(shortName("Сергей Морозов")).toBe("Сергей М.");
    expect(shortName("  Ольга   кузнецова ")).toBe("Ольга К.");
    expect(shortName("Админ")).toBe("Админ");
    expect(shortName("")).toBe("");
    expect(shortName(null)).toBe("");
  });
});

describe("deltas", () => {
  it("percent: growth, fall, zero and «новые»", () => {
    expect(percentDelta(118, 100)).toMatchObject({ direction: "up", text: "↑ 18%" });
    expect(percentDelta(118, 100).srText).toBe("рост на 18 % к предыдущему периоду");
    expect(percentDelta(80, 100)).toMatchObject({ direction: "down", text: "↓ 20%" });
    expect(percentDelta(5, 5)).toMatchObject({ direction: "flat", text: "= 0%" });
    expect(percentDelta(0, 0)).toMatchObject({ direction: "flat", text: "= 0%" });
    expect(percentDelta(3, 0)).toMatchObject({ direction: "new", text: "новые" });
  });

  it("absolute: difference of counts", () => {
    expect(absoluteDelta(6, 4).text).toBe("↑ 2");
    expect(absoluteDelta(3, 4).text).toBe("↓ 1");
    expect(absoluteDelta(0, 0).text).toBe("= 0");
  });

  it("points: one decimal", () => {
    expect(pointsDelta(14.3, 15.5)).toMatchObject({ direction: "down", text: "↓ 1,2 п. п." });
    expect(pointsDelta(20, 10).text).toBe("↑ 10 п. п.");
    expect(pointsDelta(10.01, 10).text).toBe("= 0 п. п.");
  });
});
