import { describe, expect, it } from "vitest";
import type { ReportStatus } from "@/lib/leads-admin/report";
import { currentRange, sparkBuckets } from "./period";
import { buildPulse } from "./pulse";
import type { PulseKpi, PulseLead } from "./pulse";

const STATUSES: ReportStatus[] = [
  { id: "new", name: "Новая", slug: "new", order: 10, isDefault: true },
  { id: "work", name: "В работе", slug: "in-progress", order: 20 },
  { id: "deal", name: "Договор", slug: "contract", order: 40, isFinal: true, isContract: true },
  { id: "no", name: "Отказ", slug: "refused", order: 50, isFinal: true, requiresReason: true },
];

/** 2026-10-22 10:30 in Yekaterinburg. */
const NOW = new Date("2026-10-22T05:30:00.000Z");
const BUCKETS = sparkBuckets("7d", currentRange("7d", NOW), NOW);

const lead = (createdAt: string, status: string, area?: number | null): PulseLead => ({
  createdAt,
  status,
  area: area ?? null,
});

const byKey = (kpis: PulseKpi[], key: PulseKpi["key"]) => {
  const kpi = kpis.find((item) => item.key === key);
  if (!kpi) throw new Error(`no ${key}`);
  return kpi;
};

describe("buildPulse", () => {
  const current = [
    lead("2026-10-22T04:00:00.000Z", "deal", 100),
    lead("2026-10-22T03:00:00.000Z", "new", 40.6),
    lead("2026-10-20T03:00:00.000Z", "work", null),
    lead("2026-10-16T03:00:00.000Z", "no"),
  ];
  const previous = [
    lead("2026-10-10T03:00:00.000Z", "deal", 50),
    lead("2026-10-11T03:00:00.000Z", "deal", 20),
  ];

  it("counts leads, contracts, conversion and area with deltas", () => {
    const kpis = buildPulse(STATUSES, current, previous, BUCKETS);
    expect(byKey(kpis, "leads")).toMatchObject({ value: "4", unit: null });
    expect(byKey(kpis, "leads").delta).toMatchObject({ direction: "up", text: "↑ 100%" });

    expect(byKey(kpis, "contracts").value).toBe("1");
    expect(byKey(kpis, "contracts").delta.text).toBe("↓ 1");

    // 1/4 = 25 % now, 2/2 = 100 % before → −75 п. п.
    expect(byKey(kpis, "conversion")).toMatchObject({ value: "25", unit: "%" });
    expect(byKey(kpis, "conversion").delta).toMatchObject({
      direction: "down",
      text: "↓ 75 п. п.",
    });

    // 100 + 40.6 (null skipped) = 140.6 → «141»; 70 before → +101 %.
    expect(byKey(kpis, "area")).toMatchObject({ value: "141", unit: "м²" });
    expect(byKey(kpis, "area").delta.text).toBe("↑ 101%");
  });

  it("formats the conversion with one decimal", () => {
    const seven = [
      lead("2026-10-22T04:00:00.000Z", "deal"),
      ...Array.from({ length: 6 }, () => lead("2026-10-22T04:00:00.000Z", "new")),
    ];
    const kpis = buildPulse(STATUSES, seven, [], BUCKETS);
    expect(byKey(kpis, "conversion").value).toBe("14,3");
    expect(byKey(kpis, "conversion").delta.text).toBe("↑ 14,3 п. п.");
    expect(byKey(kpis, "leads").delta.text).toBe("новые");
  });

  it("splits the sparkline series by bucket", () => {
    const kpis = buildPulse(STATUSES, current, previous, BUCKETS);
    expect(byKey(kpis, "leads").series).toEqual([1, 0, 0, 0, 1, 0, 2]);
    expect(byKey(kpis, "contracts").series).toEqual([0, 0, 0, 0, 0, 0, 1]);
    expect(byKey(kpis, "conversion").series).toEqual([0, 0, 0, 0, 0, 0, 50]);
    expect(byKey(kpis, "area").series).toEqual([0, 0, 0, 0, 0, 0, 140.6]);
  });

  it("handles an empty period without dividing by zero", () => {
    const kpis = buildPulse(STATUSES, [], [], BUCKETS);
    for (const kpi of kpis) {
      expect(kpi.value).toBe("0");
      expect(kpi.delta.direction).toBe("flat");
      expect(kpi.series.every((value) => value === 0)).toBe(true);
    }
    expect(byKey(kpis, "leads").delta.text).toBe("= 0%");
    expect(byKey(kpis, "contracts").delta.text).toBe("= 0");
    expect(byKey(kpis, "conversion").delta.text).toBe("= 0 п. п.");
  });

  it("accepts populated status relations", () => {
    const kpis = buildPulse(
      STATUSES,
      [{ createdAt: "2026-10-22T04:00:00.000Z", status: { id: "deal" } }],
      [],
      BUCKETS
    );
    expect(byKey(kpis, "contracts").value).toBe("1");
  });
});
