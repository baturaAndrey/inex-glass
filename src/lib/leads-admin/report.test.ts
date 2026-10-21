import { describe, expect, it } from "vitest";
import {
  buildLeadsReport,
  countUtmSources,
  defaultStatus,
  formatPercent,
  NO_STATUS_KEY,
  percent,
  tallyLeads,
} from "./report";
import type { ReportCounts, ReportStatus } from "./report";

const STATUSES: ReportStatus[] = [
  { id: "refused", name: "Отказ", slug: "refused", order: 50, isFinal: true, requiresReason: true },
  { id: "new", name: "Новая", slug: "new", order: 10, isDefault: true },
  { id: "work", name: "В работе", slug: "in-progress", order: 20 },
  { id: "kp", name: "КП отправлено", slug: "kp-sent", order: 30 },
  { id: "contract", name: "Договор", slug: "contract", order: 40, isFinal: true, isContract: true },
];

const EMPTY: ReportCounts = { grid: {}, duplicates: 0, flags: {}, utmSources: [] };

describe("percent", () => {
  it("never divides by zero", () => {
    expect(percent(5, 0)).toBe(0);
    expect(percent(1, 4)).toBe(25);
  });

  it("formats with a comma and NBSP", () => {
    expect(formatPercent(12.345)).toBe("12,3 %");
    expect(formatPercent(0)).toBe("0 %");
  });
});

describe("buildLeadsReport", () => {
  it("gives zeros for an empty period", () => {
    const report = buildLeadsReport(STATUSES, EMPTY);
    expect(report.total).toBe(0);
    expect(report.tiles).toEqual({
      total: 0,
      newLeads: 0,
      contracts: 0,
      refusals: 0,
      duplicates: 0,
    });
    expect(report.bySource).toHaveLength(7);
    expect(report.bySource.every((row) => row.count === 0 && row.share === 0)).toBe(true);
    expect(report.funnel.map((step) => [step.label, step.count, step.share])).toEqual([
      ["Новая", 0, 0],
      ["КП отправлено", 0, 0],
      ["Договор", 0, 0],
    ]);
    expect(report.flags.every((flag) => flag.share === 0)).toBe(true);
    expect(report.utm).toEqual([]);
    expect(report.columns.map((column) => column.key)).toEqual([
      "new",
      "work",
      "kp",
      "contract",
      "refused",
    ]);
  });

  it("aggregates sources, statuses, funnel and tiles", () => {
    const counts: ReportCounts = {
      grid: {
        quiz: { new: 2, work: 1, kp: 1, contract: 1, refused: 1 },
        drawing: { new: 1, contract: 1 },
        callback: { [NO_STATUS_KEY]: 2 },
      },
      duplicates: 3,
      flags: { urgent: 2, no_file: 5 },
      utmSources: [],
    };
    const report = buildLeadsReport(STATUSES, counts);
    expect(report.total).toBe(10);
    expect(report.tiles).toEqual({
      total: 10,
      newLeads: 3,
      contracts: 2,
      refusals: 1,
      duplicates: 3,
    });

    // «Без статуса» column appears only when used.
    expect(report.columns.at(-1)).toMatchObject({ key: NO_STATUS_KEY, label: "Без статуса" });
    const quiz = report.bySource.find((row) => row.formType === "quiz");
    expect(quiz).toMatchObject({ count: 6, share: 60, cells: [2, 1, 1, 1, 1, 0] });
    expect(report.columnTotals).toEqual([3, 1, 1, 2, 1, 2]);

    expect(report.byStatus.find((row) => row.key === "contract")).toMatchObject({
      count: 2,
      share: 20,
    });
    // KP reached = KP (1) + contract (2); refusals and leads without status excluded.
    expect(report.funnel.map((step) => [step.label, step.count, step.share])).toEqual([
      ["Новая", 10, 100],
      ["КП отправлено", 3, 30],
      ["Договор", 2, 20],
    ]);
    expect(report.flags.find((flag) => flag.flag === "no_file")).toMatchObject({
      label: "Без файла",
      count: 5,
      share: 50,
    });
    expect(report.flags.find((flag) => flag.flag === "small_volume")?.count).toBe(0);
  });

  it("keeps the top-10 UTM sources by count", () => {
    const utmSources = Array.from({ length: 12 }, (_, index) => ({
      source: `s${String(index).padStart(2, "0")}`,
      count: index + 1,
    }));
    const report = buildLeadsReport(STATUSES, {
      ...EMPTY,
      grid: { quiz: { new: 100 } },
      utmSources: [...utmSources, { source: "  ", count: 50 }],
    });
    expect(report.utm).toHaveLength(10);
    expect(report.utm[0]).toEqual({ source: "s11", count: 12, share: 12 });
    expect(report.utm.at(-1)?.source).toBe("s02");
  });
});

describe("helpers", () => {
  it("picks the flagged default status, else the first stage", () => {
    expect(defaultStatus(STATUSES)?.id).toBe("new");
    expect(defaultStatus(STATUSES.map((status) => ({ ...status, isDefault: false })))?.id).toBe(
      "new"
    );
    expect(defaultStatus([])).toBeNull();
  });

  it("counts UTM sources, skipping empty values", () => {
    expect(countUtmSources(["yandex", " yandex ", "google", null, "", undefined])).toEqual([
      { source: "yandex", count: 2 },
      { source: "google", count: 1 },
    ]);
  });
});

describe("tallyLeads", () => {
  it("counts the grid, duplicates, flags and UTM sources", () => {
    const counts = tallyLeads([
      { formType: "quiz", status: "new", flags: ["urgent", "urgent"], utm: { source: "yandex" } },
      { formType: "quiz", status: { id: "new" }, isDuplicate: true, flags: ["bogus"] },
      { formType: "callback", status: null, utm: { source: " yandex " } },
    ]);
    expect(counts.grid).toEqual({ quiz: { new: 2 }, callback: { [NO_STATUS_KEY]: 1 } });
    expect(counts.duplicates).toBe(1);
    expect(counts.flags).toEqual({ urgent: 1 });
    expect(counts.utmSources).toEqual([{ source: "yandex", count: 2 }]);
  });
});
