import { defaultStatus, percent } from "@/lib/leads-admin/report";
import type { ReportStatus } from "@/lib/leads-admin/report";
import { LEAD_REFUSE_REASON_CODES } from "@/payload/collections/crm/constants";
import { statusIdOf } from "./pulse";

/**
 * «Воронка заявок» of the dashboard: every «progressing» status of `lead-statuses` in funnel
 * order (unlike the report, which shows only «Новая → КП → Договор»), plus a separate refusal
 * row with its reasons. Same cohort as «Пульс»: leads created in the period, current statuses.
 */

export interface FunnelStage {
  id: string;
  name: string;
  /** Raw `lead-statuses.color` (validated by `statusBadgeColors` when rendered). */
  color: string;
  count: number;
  /** Percent of all leads of the period, 0…100. */
  share: number;
}

export interface RefuseReasonCount {
  code: string;
  label: string;
  count: number;
}

export interface FunnelResult {
  stages: FunnelStage[];
  refused: { count: number; reasons: RefuseReasonCount[]; topLabel: string | null };
}

export interface FunnelLead {
  status: unknown;
  refuseReasonCode?: string | null;
  refuseReason?: string | null;
}

/** Code of a refusal without code and text. */
export const NO_REASON_CODE = "none";
const NO_REASON_LABEL = "Не указана";
/** Code a refusal with text but no code is counted under (rule of task-01). */
const OTHER_REASON_CODE = "other";

const REASON_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_REFUSE_REASON_CODES.map(({ value, label }) => [value, label])
);
/** Tie-break order of reasons: the order of the select options, «Не указана» last. */
const REASON_ORDER: readonly string[] = [
  ...LEAD_REFUSE_REASON_CODES.map(({ value }) => value),
  NO_REASON_CODE,
];

/** Same rule as `isDeadEnd` of the leads report: refusals and other non-contract finals. */
const isDeadEnd = (status: ReportStatus) =>
  status.requiresReason === true || (status.isFinal === true && status.isContract !== true);

const sortStatuses = (statuses: readonly ReportStatus[]) =>
  [...statuses].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ru"));

/** Reason code of a refused lead: its code, «other» for text without code, else «none». */
export function refuseReasonKey(lead: FunnelLead): string {
  const code = lead.refuseReasonCode;
  if (typeof code === "string" && REASON_LABELS.has(code)) return code;
  const text = typeof lead.refuseReason === "string" ? lead.refuseReason.trim() : "";
  return text !== "" ? OTHER_REASON_CODE : NO_REASON_CODE;
}

function countReasons(refused: readonly FunnelLead[]): RefuseReasonCount[] {
  const counts = new Map<string, number>();
  for (const lead of refused) {
    const key = refuseReasonKey(lead);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([code, count]) => ({ code, label: REASON_LABELS.get(code) ?? NO_REASON_LABEL, count }))
    .sort(
      (a, b) => b.count - a.count || REASON_ORDER.indexOf(a.code) - REASON_ORDER.indexOf(b.code)
    );
}

export function buildFunnel(
  statuses: readonly ReportStatus[],
  leads: readonly FunnelLead[]
): FunnelResult {
  const sorted = sortStatuses(statuses);
  const total = leads.length;

  const byStatus = new Map<string, number>();
  for (const lead of leads) {
    const id = statusIdOf(lead.status);
    if (id !== null) byStatus.set(id, (byStatus.get(id) ?? 0) + 1);
  }
  const countOf = (status: ReportStatus) => byStatus.get(status.id) ?? 0;

  const progressing = sorted.filter((status) => !isDeadEnd(status));
  const first = defaultStatus(sorted);
  // The default status opens the funnel even if a CMS edit gave it a later `order`.
  const ordered =
    first && progressing.includes(first)
      ? [first, ...progressing.filter((status) => status !== first)]
      : progressing;

  const stages: FunnelStage[] = ordered.map((stage, index) => {
    let count: number;
    if (index === 0 && stage === first) {
      count = total;
    } else if (stage.isContract === true) {
      // Contracts are final: only leads currently in this status.
      count = countOf(stage);
    } else {
      count = progressing
        .filter((status) => status.order >= stage.order)
        .reduce((sum, status) => sum + countOf(status), 0);
    }
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color ?? "",
      count,
      share: percent(count, total),
    };
  });

  const refusalIds = new Set(
    sorted.filter((status) => status.requiresReason === true).map(({ id }) => id)
  );
  const refusedLeads = leads.filter((lead) => {
    const id = statusIdOf(lead.status);
    return id !== null && refusalIds.has(id);
  });
  const reasons = countReasons(refusedLeads);
  const top = reasons[0];

  return {
    stages,
    refused: {
      count: refusedLeads.length,
      reasons,
      topLabel: top ? top.label.toLocaleLowerCase("ru") : null,
    },
  };
}
