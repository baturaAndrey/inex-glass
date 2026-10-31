import { formatNumber } from "@/lib/domain/format";
import { percent } from "@/lib/leads-admin/report";
import type { ReportStatus } from "@/lib/leads-admin/report";
import { absoluteDelta, percentDelta, pointsDelta } from "./format";
import type { Delta } from "./format";
import type { SparkBucket } from "./period";

/**
 * KPIs of «Пульс». The cohort is the leads CREATED in the period, judged by their CURRENT
 * status (Payload keeps no status history apart from versions), exactly like the leads report.
 * Pure and total: an empty period gives zeros and «= 0%», never a division by zero.
 */

/** The few lead fields «Пульс» needs (read with `select`). */
export interface PulseLead {
  createdAt: string;
  status?: unknown;
  area?: number | null;
}

export type PulseKpiKey = "leads" | "contracts" | "conversion" | "area";

export interface PulseKpi {
  key: PulseKpiKey;
  label: string;
  /** Formatted value: «42», «14,3», «1 540». */
  value: string;
  /** Unit after the value («%», «м²») or `null`. */
  unit: string | null;
  delta: Delta;
  /** One value per sparkline bucket. */
  series: number[];
}

interface Totals {
  leads: number;
  contracts: number;
  conversion: number;
  area: number;
}

/** Status id of a lead (`depth: 0` gives the id, a populated relation gives `{ id }`). */
export function statusIdOf(value: unknown): string | null {
  const raw = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  return typeof raw === "string" && raw !== "" ? raw : null;
}

/** Ids of the statuses that mean «договор». */
export function contractStatusIds(statuses: readonly ReportStatus[]): Set<string> {
  return new Set(statuses.filter((status) => status.isContract === true).map(({ id }) => id));
}

const areaOf = (lead: PulseLead): number =>
  typeof lead.area === "number" && Number.isFinite(lead.area) ? lead.area : 0;

function totalsOf(leads: readonly PulseLead[], contractIds: ReadonlySet<string>): Totals {
  let contracts = 0;
  let area = 0;
  for (const lead of leads) {
    const statusId = statusIdOf(lead.status);
    if (statusId !== null && contractIds.has(statusId)) contracts += 1;
    area += areaOf(lead);
  }
  return { leads: leads.length, contracts, conversion: percent(contracts, leads.length), area };
}

/** Splits the leads into the buckets by `createdAt` (leads outside every bucket are dropped). */
function bucketize(leads: readonly PulseLead[], buckets: readonly SparkBucket[]): PulseLead[][] {
  const result = buckets.map((): PulseLead[] => []);
  for (const lead of leads) {
    const time = new Date(lead.createdAt).getTime();
    if (Number.isNaN(time)) continue;
    const index = buckets.findIndex(
      (bucket) => time >= bucket.from.getTime() && time <= bucket.to.getTime()
    );
    if (index >= 0) result[index]?.push(lead);
  }
  return result;
}

export function buildPulse(
  statuses: readonly ReportStatus[],
  current: readonly PulseLead[],
  previous: readonly PulseLead[],
  buckets: readonly SparkBucket[]
): PulseKpi[] {
  const contractIds = contractStatusIds(statuses);
  const now = totalsOf(current, contractIds);
  const before = totalsOf(previous, contractIds);
  const perBucket = bucketize(current, buckets).map((leads) => totalsOf(leads, contractIds));

  return [
    {
      key: "leads",
      label: "Заявки",
      value: formatNumber(now.leads),
      unit: null,
      delta: percentDelta(now.leads, before.leads),
      series: perBucket.map((totals) => totals.leads),
    },
    {
      key: "contracts",
      label: "Договоры",
      value: formatNumber(now.contracts),
      unit: null,
      delta: absoluteDelta(now.contracts, before.contracts),
      series: perBucket.map((totals) => totals.contracts),
    },
    {
      key: "conversion",
      label: "Конверсия в договор",
      value: formatNumber(now.conversion, { decimals: 1 }),
      unit: "%",
      delta: pointsDelta(now.conversion, before.conversion),
      series: perBucket.map((totals) => totals.conversion),
    },
    {
      key: "area",
      label: "Площадь в заявках",
      value: formatNumber(Math.round(now.area)),
      unit: "м²",
      delta: percentDelta(now.area, before.area),
      series: perBucket.map((totals) => totals.area),
    },
  ];
}
