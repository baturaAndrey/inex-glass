import { describe, expect, it } from "vitest";
import { attentionThresholds, buildAttention, priceCard } from "./attention";
import type { AttentionCard, AttentionInput } from "./attention";

/** 2026-10-22 10:30 in Yekaterinburg. */
const NOW = new Date("2026-10-22T05:30:00.000Z");

const base: AttentionInput = {
  leads: {
    defaultStatusId: "st-new",
    unassignedCount: 3,
    oldestUnassignedAt: "2026-10-22T03:15:00.000Z",
    staleNewCount: 2,
  },
  orders: { noPhotos: [{ id: "o1", number: "2026-0141" }], expiringCount: 2 },
  prices: {
    priceDate: "2026-10-01T00:00:00.000Z",
    staleAfterDays: 45,
    staleLabel: "Цена по расчёту",
  },
};

const card = (cards: AttentionCard[], key: AttentionCard["key"]) => {
  const found = cards.find((item) => item.key === key);
  if (!found) throw new Error(`no ${key}`);
  return found;
};

describe("buildAttention", () => {
  it("builds five cards with tones, captions and filtered links", () => {
    const cards = buildAttention(base, NOW);
    expect(cards.map((item) => item.key)).toEqual([
      "unassigned",
      "stale-new",
      "no-photos",
      "expiring-links",
      "prices",
    ]);
    const { staleNewBefore, expiringFrom, expiringTo } = attentionThresholds(NOW);
    expect(staleNewBefore).toBe("2026-10-22T03:30:00.000Z");
    expect(expiringTo).toBe("2026-10-25T05:30:00.000Z");

    expect(card(cards, "unassigned")).toEqual({
      key: "unassigned",
      label: "Новые без ответственного",
      value: 3,
      tone: "danger",
      sub: "самая давняя — 2 ч 15 мин",
      href:
        "/admin/collections/leads/?where[and][0][status][equals]=st-new" +
        "&where[and][1][assignee][exists]=false",
    });
    expect(card(cards, "stale-new")).toMatchObject({
      tone: "warning",
      value: 2,
      sub: "клиент ждёт ответа",
      href:
        "/admin/collections/leads/?where[and][0][status][equals]=st-new" +
        `&where[and][1][createdAt][less_than]=${encodeURIComponent(staleNewBefore)}`,
    });
    expect(card(cards, "expiring-links")).toMatchObject({
      tone: "info",
      sub: "в ближайшие 3 дня",
      href:
        `/admin/collections/orders/?where[and][0][expiresAt][greater_than]=${encodeURIComponent(expiringFrom)}` +
        `&where[and][1][expiresAt][less_than_equal]=${encodeURIComponent(expiringTo)}`,
    });
    expect(card(cards, "prices")).toMatchObject({ href: "/admin/globals/prices/" });
  });

  it("names the orders without photos (1 and 3 orders)", () => {
    const one = card(buildAttention(base, NOW), "no-photos");
    expect(one).toMatchObject({
      value: 1,
      tone: "warning",
      sub: "заказ 2026-0141",
      href: "/admin/collections/orders/o1/manage/",
    });

    const three = card(
      buildAttention(
        {
          ...base,
          orders: {
            expiringCount: 0,
            noPhotos: [
              { id: "o1", number: "2026-0141" },
              { id: "o2", number: "2026-0142" },
              { id: "o3", number: "2026-0143" },
            ],
          },
        },
        NOW
      ),
      "no-photos"
    );
    expect(three).toMatchObject({
      value: 3,
      sub: "заказы 2026-0141, 2026-0142…",
      href: "/admin/collections/orders/?where[currentStatus][in]=packed,shipped",
    });
  });

  it("makes zero cards neutral", () => {
    const cards = buildAttention(
      {
        ...base,
        leads: { ...base.leads, unassignedCount: 0, oldestUnassignedAt: null, staleNewCount: 0 },
        orders: { noPhotos: [], expiringCount: 0 },
      },
      NOW
    );
    for (const key of ["unassigned", "stale-new", "no-photos", "expiring-links"] as const) {
      expect(card(cards, key)).toMatchObject({ value: 0, tone: "neutral", sub: "всё в порядке" });
    }
  });

  it("shows «—» without lead statuses and skips cards the user cannot read", () => {
    const cards = buildAttention(
      { ...base, leads: { ...base.leads, defaultStatusId: null }, orders: null, prices: null },
      NOW
    );
    expect(cards.map((item) => [item.key, item.value, item.tone])).toEqual([
      ["unassigned", null, "neutral"],
      ["stale-new", null, "neutral"],
    ]);
  });
});

describe("priceCard", () => {
  const prices = (priceDate: string | null, staleAfterDays = 45) => ({
    priceDate,
    staleAfterDays,
    staleLabel: "Цена по расчёту",
  });

  it("is danger once the prices are stale", () => {
    expect(priceCard(prices("2026-09-01"), NOW)).toMatchObject({
      value: 51,
      tone: "danger",
      sub: "на сайте — «Цена по расчёту»",
    });
  });

  it("is a warning within 7 days of the threshold (inclusive)", () => {
    expect(priceCard(prices("2026-09-07"), NOW)).toMatchObject({
      value: 45,
      tone: "warning",
      sub: "устареют через 0 дн.",
    });
    expect(priceCard(prices("2026-09-14"), NOW)).toMatchObject({
      value: 38,
      tone: "warning",
      sub: "устареют через 7 дн.",
    });
  });

  it("is neutral while fresh", () => {
    expect(priceCard(prices("2026-10-15"), NOW)).toMatchObject({
      value: 7,
      tone: "neutral",
      sub: "порог — 45 дн.",
    });
  });

  it("is danger with «—» without a price date", () => {
    expect(priceCard(prices(null), NOW)).toMatchObject({
      value: null,
      tone: "danger",
      sub: "дата цен не задана",
    });
  });
});
