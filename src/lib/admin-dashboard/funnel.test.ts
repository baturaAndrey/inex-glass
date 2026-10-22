import { describe, expect, it } from "vitest";
import type { ReportStatus } from "@/lib/leads-admin/report";
import { buildFunnel, refuseReasonKey } from "./funnel";
import type { FunnelLead } from "./funnel";

const STATUSES: ReportStatus[] = [
  {
    id: "deal",
    name: "Договор",
    slug: "contract",
    order: 40,
    isFinal: true,
    isContract: true,
    color: "#237A35",
  },
  { id: "no", name: "Отказ", slug: "refused", order: 50, isFinal: true, requiresReason: true },
  { id: "kp", name: "КП отправлено", slug: "kp-sent", order: 30, color: "#16403D" },
  { id: "new", name: "Новая", slug: "new", order: 10, isDefault: true, color: "#2C5B86" },
  { id: "work", name: "В работе", slug: "in-progress", order: 20, color: "#8A5A00" },
];

const leads = (status: string, n: number, extra: Partial<FunnelLead> = {}): FunnelLead[] =>
  Array.from({ length: n }, () => ({ status, ...extra }));

describe("buildFunnel", () => {
  it("builds progressing stages by order; contracts count only their status", () => {
    const result = buildFunnel(STATUSES, [
      ...leads("new", 4),
      ...leads("work", 3),
      ...leads("kp", 2),
      ...leads("deal", 1),
      ...leads("no", 2, { refuseReasonCode: "expensive" }),
    ]);
    expect(result.stages.map((stage) => [stage.id, stage.count])).toEqual([
      ["new", 12],
      ["work", 6],
      ["kp", 3],
      ["deal", 1],
    ]);
    expect(result.stages[0]?.share).toBe(100);
    expect(result.stages[1]?.share).toBe(50);
    expect(result.stages[0]?.color).toBe("#2C5B86");
    // The refusal is not a stage.
    expect(result.stages.some((stage) => stage.id === "no")).toBe(false);
    expect(result.refused.count).toBe(2);
  });

  it("breaks refusals down by reason code", () => {
    const result = buildFunnel(STATUSES, [
      ...leads("no", 3, { refuseReasonCode: "expensive" }),
      ...leads("no", 1, { refuseReasonCode: "other_supplier" }),
      ...leads("no", 2, { refuseReasonCode: null, refuseReason: "Передумали" }),
      ...leads("no", 1, { refuseReasonCode: "other", refuseReason: "Сам заберёт" }),
      ...leads("no", 1, { refuseReasonCode: null, refuseReason: "   " }),
    ]);
    expect(result.refused.reasons).toEqual([
      { code: "expensive", label: "Дорого", count: 3 },
      { code: "other", label: "Другое", count: 3 },
      { code: "other_supplier", label: "Выбрали другого поставщика", count: 1 },
      { code: "none", label: "Не указана", count: 1 },
    ]);
    expect(result.refused.topLabel).toBe("дорого");
    expect(result.refused.count).toBe(8);
  });

  it("reports no refusals and an empty period", () => {
    const result = buildFunnel(STATUSES, []);
    expect(result.refused).toEqual({ count: 0, reasons: [], topLabel: null });
    expect(result.stages.every((stage) => stage.count === 0 && stage.share === 0)).toBe(true);
  });

  it("works without statuses", () => {
    expect(buildFunnel([], leads("x", 2)).stages).toEqual([]);
  });
});

describe("refuseReasonKey", () => {
  it("maps code / text / nothing", () => {
    expect(refuseReasonKey({ status: "no", refuseReasonCode: "no_contact" })).toBe("no_contact");
    expect(refuseReasonKey({ status: "no", refuseReason: "текст" })).toBe("other");
    expect(refuseReasonKey({ status: "no" })).toBe("none");
  });
});
