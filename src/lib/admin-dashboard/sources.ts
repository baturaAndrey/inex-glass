import {
  FORM_TYPE_LABELS,
  LEAD_FORM_TYPE_VALUES,
  isLeadFormType,
} from "@/payload/admin/leads/constants";
import type { LeadFormType } from "@/payload/admin/leads/constants";

/**
 * «Источники» of the dashboard: leads of the period by `formType`, only non-empty sources,
 * the biggest first; the bar width is relative to the biggest source (100 %).
 */

export interface SourceBar {
  formType: LeadFormType;
  label: string;
  count: number;
  /** Bar width, 0…100 (the biggest source is 100). */
  width: number;
}

export function buildSources(leads: readonly { formType?: unknown }[]): SourceBar[] {
  const counts = new Map<LeadFormType, number>();
  for (const lead of leads) {
    if (isLeadFormType(lead.formType)) {
      counts.set(lead.formType, (counts.get(lead.formType) ?? 0) + 1);
    }
  }
  const rows = [...counts]
    .filter(([, count]) => count > 0)
    .sort(
      ([typeA, a], [typeB, b]) =>
        b - a || LEAD_FORM_TYPE_VALUES.indexOf(typeA) - LEAD_FORM_TYPE_VALUES.indexOf(typeB)
    );
  const max = rows[0]?.[1] ?? 0;
  return rows.map(([formType, count]) => ({
    formType,
    label: FORM_TYPE_LABELS[formType],
    count,
    width: max > 0 ? (count / max) * 100 : 0,
  }));
}
