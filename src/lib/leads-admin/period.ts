import { addDays, todayKey } from "@/lib/domain/dates";
import { SITE_TZ } from "@/payload/admin/leads/constants";

/**
 * Reporting periods of the leads admin (export, report, list quick filters).
 *
 * A period is a pair of inclusive calendar dates (`YYYY-MM-DD`) in the company time zone; its
 * instant bounds are `from` 00:00:00.000 and `to` 23:59:59.999 local time, so a lead created at
 * 00:30 in Chelyabinsk belongs to that day even though it is still «yesterday» in UTC.
 * Pure functions: `now` is always injectable.
 */

export const PERIOD_PRESETS = ["today", "7d", "30d", "month", "quarter", "custom"] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

export const PERIOD_PRESET_LABELS: Readonly<Record<PeriodPreset, string>> = {
  today: "Сегодня",
  "7d": "7 дней",
  "30d": "30 дней",
  month: "Этот месяц",
  quarter: "Этот квартал",
  custom: "Свой период",
};

export const DEFAULT_PERIOD_PRESET: PeriodPreset = "30d";

/** Inclusive calendar range in the company time zone. */
export interface DateRange {
  fromKey: string;
  toKey: string;
}

export interface PeriodBounds extends DateRange {
  /** Instant of `fromKey` 00:00:00.000 local time. */
  from: Date;
  /** Instant of `toKey` 23:59:59.999 local time. */
  to: Date;
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS_PER_QUARTER = 3;
/** Days covered by the rolling presets, today included. */
const ROLLING_DAYS = { "7d": 7, "30d": 30 } as const;

/** Strict `YYYY-MM-DD` with a real calendar date; anything else → `null`. */
export function parseDateKey(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const match = DATE_KEY.exec(input.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? match[0] : null;
}

export function isPeriodPreset(value: unknown): value is PeriodPreset {
  return typeof value === "string" && (PERIOD_PRESETS as readonly string[]).includes(value);
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Offset of `timeZone` from UTC at `instant`, in milliseconds (UTC+5 → +18 000 000). */
export function timeZoneOffsetMs(instant: Date, timeZone: string = SITE_TZ): number {
  const parts: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  const wallClockAsUtc = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0
  );
  // Formatter output has whole seconds: drop the instant's milliseconds before comparing.
  return wallClockAsUtc - (instant.getTime() - instant.getUTCMilliseconds());
}

/** Instant of local midnight that starts `dateKey` in `timeZone`. */
export function zonedDayStart(dateKey: string, timeZone: string = SITE_TZ): Date {
  const key = parseDateKey(dateKey);
  if (!key) throw new RangeError(`Invalid date key: ${dateKey}`);
  const [year, month, day] = key.split("-").map(Number) as [number, number, number];
  const wallClock = Date.UTC(year, month - 1, day);
  // Two passes settle the offset around DST switches (no-op for Asia/Yekaterinburg).
  let instant = wallClock - timeZoneOffsetMs(new Date(wallClock), timeZone);
  instant = wallClock - timeZoneOffsetMs(new Date(instant), timeZone);
  return new Date(instant);
}

/** Last millisecond of `dateKey` in `timeZone`. */
export function zonedDayEnd(dateKey: string, timeZone: string = SITE_TZ): Date {
  return new Date(zonedDayStart(addDays(dateKey, 1), timeZone).getTime() - 1);
}

/**
 * A `Date` whose UTC fields equal the wall clock of `instant` in `timeZone`. Spreadsheet cells
 * have no time zone: ExcelJS writes the UTC fields, so this makes Excel show local time.
 */
export function toWallClockDate(instant: Date, timeZone: string = SITE_TZ): Date {
  return new Date(instant.getTime() + timeZoneOffsetMs(instant, timeZone));
}

/** Calendar range of a preset relative to `now` (company time zone). */
export function presetRange(
  preset: Exclude<PeriodPreset, "custom">,
  now: Date = new Date()
): DateRange {
  const today = todayKey(now);
  switch (preset) {
    case "today":
      return { fromKey: today, toKey: today };
    case "7d":
    case "30d":
      return { fromKey: addDays(today, 1 - ROLLING_DAYS[preset]), toKey: today };
    case "month":
      return { fromKey: `${today.slice(0, 7)}-01`, toKey: today };
    case "quarter": {
      const [year, month] = today.split("-").map(Number) as [number, number];
      const quarterStartMonth = Math.floor((month - 1) / MONTHS_PER_QUARTER) * MONTHS_PER_QUARTER;
      const monthKey = String(quarterStartMonth + 1).padStart(2, "0");
      return { fromKey: `${year}-${monthKey}-01`, toKey: today };
    }
  }
}

export function periodBounds(range: DateRange, timeZone: string = SITE_TZ): PeriodBounds {
  return {
    ...range,
    from: zonedDayStart(range.fromKey, timeZone),
    to: zonedDayEnd(range.toKey, timeZone),
  };
}

export type PeriodQuery = {
  period?: string | null;
  from?: string | null;
  to?: string | null;
};

export type ResolvedPeriod =
  { ok: true; preset: PeriodPreset; range: DateRange } | { ok: false; error: string };

const blank = (value: string | null | undefined): boolean =>
  value === undefined || value === null || value.trim() === "";

/**
 * Explicit `from`/`to` dates (either may be omitted: a lone `from` runs to today, a lone `to`
 * covers the 30 days before it). Both missing → `null` (caller picks its default).
 */
function explicitRange(query: PeriodQuery, now: Date): ResolvedPeriod | null {
  if (blank(query.from) && blank(query.to)) return null;
  const fromKey = blank(query.from) ? null : parseDateKey(query.from);
  const toKey = blank(query.to) ? null : parseDateKey(query.to);
  if (!blank(query.from) && !fromKey) return { ok: false, error: "Некорректная дата «с»" };
  if (!blank(query.to) && !toKey) return { ok: false, error: "Некорректная дата «по»" };

  const to = toKey ?? todayKey(now);
  const from = fromKey ?? addDays(to, 1 - ROLLING_DAYS["30d"]);
  if (from > to) return { ok: false, error: "Дата «с» позже даты «по»" };
  return { ok: true, preset: "custom", range: { fromKey: from, toKey: to } };
}

/**
 * Resolves `?period=&from=&to=` (report, export). A preset wins unless it is `custom`; explicit
 * dates win over the default. Nothing given → `fallback` preset (last 30 days).
 */
export function resolvePeriod(
  query: PeriodQuery,
  now: Date = new Date(),
  fallback: Exclude<PeriodPreset, "custom"> = "30d"
): ResolvedPeriod {
  const period = query.period?.trim() || null;
  if (period !== null && !isPeriodPreset(period)) {
    return { ok: false, error: "Неизвестный период" };
  }
  if (period !== null && period !== "custom") {
    return { ok: true, preset: period, range: presetRange(period, now) };
  }
  const explicit = explicitRange(query, now);
  if (explicit) return explicit;
  if (period === "custom") return { ok: false, error: "Укажите даты периода" };
  return { ok: true, preset: fallback, range: presetRange(fallback, now) };
}

/** Payload `where` on `createdAt` for a period (ISO strings, inclusive). */
export function createdAtWhere(range: DateRange, timeZone: string = SITE_TZ) {
  const { from, to } = periodBounds(range, timeZone);
  return {
    createdAt: { greater_than_equal: from.toISOString(), less_than_equal: to.toISOString() },
  };
}

/** «01.10.2026» from a date key. */
export function formatDateKeyRu(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}.${month}.${year}`;
}
