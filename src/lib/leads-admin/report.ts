import { formatNumber } from "@/lib/domain/format";
import { QUIZ_FLAG_LABELS } from "@/lib/domain/quiz-flags";
import { FORM_TYPE_LABELS, LEAD_FORM_TYPE_VALUES } from "@/payload/admin/leads/constants";
import type { LeadFlag, LeadFormType } from "@/payload/admin/leads/constants";
import { LEAD_FLAGS } from "@/payload/collections/crm/constants";

/**
 * «Отчёт по заявкам» (ТЗ §6.1, end-to-end analytics of §10 «заявка → КП → договор»).
 *
 * The view runs `payload.count` per (formType × status) cell plus a few extra counters; this
 * module turns those raw numbers into the tiles, tables, funnel and shares. Pure and total:
 * an empty period gives zeros everywhere, never a division by zero.
 */

/** Grid column of leads without a status (saved before the statuses were seeded). */
export const NO_STATUS_KEY = "__none__";

/** Funnel stages by `lead-statuses.slug` (seed, task 16). */
export const FUNNEL_KP_SLUG = "kp-sent";

export const UTM_TOP_LIMIT = 10;

export interface ReportStatus {
  id: string;
  name: string;
  slug: string;
  order: number;
  color?: string | null;
  isDefault?: boolean | null;
  isFinal?: boolean | null;
  isContract?: boolean | null;
  requiresReason?: boolean | null;
}

export interface ReportCounts {
  /** formType → status id (or `NO_STATUS_KEY`) → number of leads. */
  grid: Partial<Record<string, Partial<Record<string, number>>>>;
  duplicates: number;
  flags: Partial<Record<LeadFlag, number>>;
  /** UTM sources with their lead counts, any order (see `countUtmSources`). */
  utmSources: readonly { source: string; count: number }[];
}

export interface CountShare {
  count: number;
  /** Percent of all leads of the period, 0…100. */
  share: number;
}

export interface SourceRow extends CountShare {
  formType: LeadFormType;
  label: string;
  /** Counts per status column, in `LeadsReport.columns` order. */
  cells: number[];
}

export interface ReportColumn {
  key: string;
  label: string;
  color: string | null;
}

export interface LeadsReport {
  total: number;
  tiles: {
    total: number;
    newLeads: number;
    contracts: number;
    refusals: number;
    duplicates: number;
  };
  /** Status columns of the «По источникам» table (+ «Без статуса» only when used). */
  columns: ReportColumn[];
  bySource: SourceRow[];
  /** Column totals of «По источникам», same order as `columns`. */
  columnTotals: number[];
  byStatus: (CountShare & { key: string; label: string; color: string | null })[];
  funnel: (CountShare & { key: string; label: string })[];
  flags: (CountShare & { flag: LeadFlag; label: string })[];
  utm: (CountShare & { source: string })[];
}

/** Percent of `part` in `total`; 0 when the total is 0. */
export function percent(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

/** «12,5 %» (one decimal, trimmed; NBSP before the sign). */
export function formatPercent(value: number): string {
  return `${formatNumber(value, { decimals: 1 })} %`;
}

const sortStatuses = (statuses: readonly ReportStatus[]) =>
  [...statuses].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "ru"));

/** Status every new lead gets: the flagged default, else the first funnel stage. */
export function defaultStatus(statuses: readonly ReportStatus[]): ReportStatus | null {
  const sorted = sortStatuses(statuses);
  return sorted.find((status) => status.isDefault) ?? sorted[0] ?? null;
}

/** A refusal-like final status (not a contract) ends the funnel without reaching later stages. */
const isDeadEnd = (status: ReportStatus) =>
  status.requiresReason === true || (status.isFinal === true && status.isContract !== true);

const cell = (counts: ReportCounts, formType: string, key: string): number =>
  counts.grid[formType]?.[key] ?? 0;

/**
 * Funnel «Новая → КП отправлено → Договор» from CURRENT statuses (Payload keeps no status
 * history apart from versions): a stage is reached by every lead whose status is at or beyond it
 * in the funnel order, refusals excluded. «Новая» therefore equals all leads of the period.
 */
function buildFunnel(
  sorted: readonly ReportStatus[],
  statusTotals: ReadonlyMap<string, number>,
  total: number
): LeadsReport["funnel"] {
  const first = defaultStatus(sorted);
  const kp = sorted.find((status) => status.slug === FUNNEL_KP_SLUG);
  const contract = sorted.find((status) => status.isContract === true);
  const progressing = sorted.filter((status) => !isDeadEnd(status));

  const reachedFrom = (stage: ReportStatus) =>
    progressing
      .filter((status) => status.order >= stage.order)
      .reduce((sum, status) => sum + (statusTotals.get(status.id) ?? 0), 0);

  const steps: LeadsReport["funnel"] = [];
  if (first) steps.push({ key: first.id, label: first.name, count: total, share: 100 });
  if (kp) {
    const count = reachedFrom(kp);
    steps.push({ key: kp.id, label: kp.name, count, share: percent(count, total) });
  }
  if (contract) {
    // Contracts are final: only leads currently in a contract status count.
    const count = sorted
      .filter((status) => status.isContract === true)
      .reduce((sum, status) => sum + (statusTotals.get(status.id) ?? 0), 0);
    steps.push({ key: contract.id, label: contract.name, count, share: percent(count, total) });
  }
  // Without any lead the first step is not «100 %» either.
  return total > 0 ? steps : steps.map((step) => ({ ...step, share: 0 }));
}

export function buildLeadsReport(
  statuses: readonly ReportStatus[],
  counts: ReportCounts
): LeadsReport {
  const sorted = sortStatuses(statuses);
  const hasNoStatus = LEAD_FORM_TYPE_VALUES.some(
    (formType) => cell(counts, formType, NO_STATUS_KEY) > 0
  );
  const columns: ReportColumn[] = sorted.map((status) => ({
    key: status.id,
    label: status.name,
    color: status.color ?? null,
  }));
  if (hasNoStatus) columns.push({ key: NO_STATUS_KEY, label: "Без статуса", color: null });

  const rows = LEAD_FORM_TYPE_VALUES.map((formType) => {
    const cells = columns.map((column) => cell(counts, formType, column.key));
    return { formType, label: FORM_TYPE_LABELS[formType], cells, count: sum(cells) };
  });
  const total = sum(rows.map((row) => row.count));
  const bySource: SourceRow[] = rows.map((row) => ({ ...row, share: percent(row.count, total) }));
  const columnTotals = columns.map((_, index) => sum(rows.map((row) => row.cells[index] ?? 0)));

  const statusTotals = new Map(
    columns.map((column, index) => [column.key, columnTotals[index] ?? 0])
  );
  const byStatus = columns.map((column) => {
    const count = statusTotals.get(column.key) ?? 0;
    return {
      key: column.key,
      label: column.label,
      color: column.color,
      count,
      share: percent(count, total),
    };
  });

  const sumWhere = (predicate: (status: ReportStatus) => boolean) =>
    sorted.filter(predicate).reduce((acc, status) => acc + (statusTotals.get(status.id) ?? 0), 0);
  const first = defaultStatus(sorted);

  const flags = LEAD_FLAGS.map(({ value }) => {
    const count = counts.flags[value] ?? 0;
    return { flag: value, label: QUIZ_FLAG_LABELS[value], count, share: percent(count, total) };
  });

  const utm = [...counts.utmSources]
    .filter((entry) => entry.count > 0 && entry.source.trim() !== "")
    .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source, "ru"))
    .slice(0, UTM_TOP_LIMIT)
    .map((entry) => ({ ...entry, share: percent(entry.count, total) }));

  return {
    total,
    tiles: {
      total,
      newLeads: first ? (statusTotals.get(first.id) ?? 0) : 0,
      contracts: sumWhere((status) => status.isContract === true),
      refusals: sumWhere((status) => status.requiresReason === true),
      duplicates: counts.duplicates,
    },
    columns,
    bySource,
    columnTotals,
    byStatus,
    funnel: buildFunnel(sorted, statusTotals, total),
    flags,
    utm,
  };
}

/** The few fields of a lead the report needs (read with `select`). */
export interface TallyLead {
  formType?: string | null;
  status?: unknown;
  isDuplicate?: boolean | null;
  flags?: readonly string[] | null;
  utm?: { source?: string | null } | null;
}

const statusKeyOf = (value: unknown): string => {
  const raw = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  return typeof raw === "string" && raw !== "" ? raw : NO_STATUS_KEY;
};

/**
 * Raw report counters from a scan of the period's leads: one paged `select` query instead of a
 * `count` per (formType × status) cell keeps the report to a single round trip per page.
 */
export function tallyLeads(leads: Iterable<TallyLead>): ReportCounts {
  const grid: Record<string, Record<string, number>> = {};
  const flags: Partial<Record<LeadFlag, number>> = {};
  const sources: (string | null | undefined)[] = [];
  let duplicates = 0;
  for (const lead of leads) {
    const formType = typeof lead.formType === "string" ? lead.formType : "";
    const row = (grid[formType] ??= {});
    const key = statusKeyOf(lead.status);
    row[key] = (row[key] ?? 0) + 1;
    if (lead.isDuplicate === true) duplicates += 1;
    for (const flag of new Set(lead.flags ?? [])) {
      if (flag in QUIZ_FLAG_LABELS) flags[flag as LeadFlag] = (flags[flag as LeadFlag] ?? 0) + 1;
    }
    sources.push(lead.utm?.source);
  }
  return { grid, duplicates, flags, utmSources: countUtmSources(sources) };
}

/** Counts UTM sources (trimmed, case kept as typed; empty values are skipped). */
export function countUtmSources(
  values: Iterable<string | null | undefined>
): { source: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const source = typeof value === "string" ? value.trim() : "";
    if (source !== "") counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return [...counts].map(([source, count]) => ({ source, count }));
}

function sum(values: readonly number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}
