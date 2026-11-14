import { addDays, daysBetween, todayKey } from "@/lib/domain/dates";
import { presetRange, zonedDayEnd, zonedDayStart } from "@/lib/leads-admin/period";
import type { DateRange } from "@/lib/leads-admin/period";

/**
 * Periods of the dashboard «Пульс»: the current range is a preset of the leads report (same
 * ids, so «подробнее →» opens the report with the same `?period=`), the previous range has the
 * same number of days right before it, and the sparkline splits the current range into
 * buckets (hours of today, days, or weeks of the quarter). Pure: `now` is always passed in.
 */

export const DASHBOARD_PERIODS = ["today", "7d", "30d", "quarter"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "30d";

/** Labels of the period switch. */
export const DASHBOARD_PERIOD_LABELS: Readonly<Record<DashboardPeriod, string>> = {
  today: "Сегодня",
  "7d": "7 дней",
  "30d": "30 дней",
  quarter: "Квартал",
};

/** Caption under «Пульс»: what the deltas compare with. */
export const DASHBOARD_COMPARISON_LABELS: Readonly<Record<DashboardPeriod, string>> = {
  today: "сравнение со вчера",
  "7d": "сравнение с предыдущими 7 днями",
  "30d": "сравнение с предыдущими 30 днями",
  quarter: "сравнение с предыдущим периодом той же длины",
};

const DAYS_PER_WEEK = 7;
const MS_PER_HOUR = 3_600_000;

/** `?period=` value → dashboard period; anything unknown → «30 дней». */
export function parseDashboardPeriod(value: unknown): DashboardPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && (DASHBOARD_PERIODS as readonly string[]).includes(raw)
    ? (raw as DashboardPeriod)
    : DEFAULT_DASHBOARD_PERIOD;
}

/** Current range: `presetRange(period, now)` of the leads report. */
export function currentRange(period: DashboardPeriod, now: Date): DateRange {
  return presetRange(period, now);
}

/** Days in an inclusive range (today → 1). */
export function rangeDays(range: DateRange): number {
  return daysBetween(range.fromKey, range.toKey) + 1;
}

/** The same number of days right before `range`: `[from − n, from − 1]`. */
export function previousRange(range: DateRange): DateRange {
  const days = rangeDays(range);
  return { fromKey: addDays(range.fromKey, -days), toKey: addDays(range.fromKey, -1) };
}

export interface SparkBucket {
  /** `HH` for hours, `YYYY-MM-DD` (first day) for days and weeks. */
  key: string;
  from: Date;
  to: Date;
}

/** Hour of `now` on the company wall clock (0…23). */
function localHour(now: Date): number {
  const dayStart = zonedDayStart(todayKey(now));
  return Math.floor((now.getTime() - dayStart.getTime()) / MS_PER_HOUR);
}

/**
 * Sparkline buckets of the current range: `today` — hours 0…current hour; `7d` / `30d` — days;
 * `quarter` — weeks of 7 days from the start of the range (the last one may be shorter).
 */
export function sparkBuckets(period: DashboardPeriod, range: DateRange, now: Date): SparkBucket[] {
  if (period === "today") {
    const dayStart = zonedDayStart(range.fromKey).getTime();
    const hours = Math.max(0, Math.min(23, localHour(now)));
    return Array.from({ length: hours + 1 }, (_, hour) => ({
      key: String(hour).padStart(2, "0"),
      from: new Date(dayStart + hour * MS_PER_HOUR),
      to: new Date(dayStart + (hour + 1) * MS_PER_HOUR - 1),
    }));
  }
  const step = period === "quarter" ? DAYS_PER_WEEK : 1;
  const buckets: SparkBucket[] = [];
  for (let start = range.fromKey; start <= range.toKey; start = addDays(start, step)) {
    const end = addDays(start, step - 1);
    const last = end < range.toKey ? end : range.toKey;
    buckets.push({ key: start, from: zonedDayStart(start), to: zonedDayEnd(last) });
  }
  return buckets;
}
