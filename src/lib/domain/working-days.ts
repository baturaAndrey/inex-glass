import { addDays, dayOfWeek, toDateKey, todayKey, tryDateKey } from "./dates";
import type { DateInput } from "./types";

/**
 * Working days for lead times (ТЗ, teksty/05-kviz.md step 6): 10 working days from the
 * contract date, 14 for triplex.
 *
 * The calendar is the list of non-working WEEKDAYS (public holidays and days off moved by the
 * government) from `site-settings.holidays`. Saturday and Sunday are always days off unless
 * listed in the optional `workdays` (a weekend day made working by a transfer, the schema's
 * `isWorkday` flag). Callers that do not pass `workdays` get the simplified calendar.
 */

export const LEAD_TIME_DAYS = 10;
export const LEAD_TIME_DAYS_TRIPLEX = 14;

export const URGENT_MESSAGE =
  "Срочного изготовления нет. Ближайший срок — от 10 рабочих дней с даты договора, для триплекса — от 14";

const SATURDAY = 6;
const SUNDAY = 0;
/** Guard against runaway loops on a broken calendar (e.g. every day listed as a holiday). */
const MAX_SCAN_DAYS = 3660;

/** Normalizes CMS dates (`YYYY-MM-DD` or ISO datetime) to a set of keys; bad entries are skipped. */
function keySet(dates: readonly string[]): ReadonlySet<string> {
  const set = new Set<string>();
  for (const date of dates) {
    const key = tryDateKey(date);
    if (key !== null) set.add(key);
  }
  return set;
}

function isWorkingKey(key: string, holidays: ReadonlySet<string>, workdays: ReadonlySet<string>) {
  if (workdays.has(key)) return true;
  const dow = dayOfWeek(key);
  if (dow === SATURDAY || dow === SUNDAY) return false;
  return !holidays.has(key);
}

export function isWorkingDay(
  dateKey: string,
  holidays: readonly string[],
  workdays: readonly string[] = []
): boolean {
  return isWorkingKey(toDateKey(dateKey), keySet(holidays), keySet(workdays));
}

/**
 * The date `n` working days after `from` (counting starts from the NEXT day). `n ≤ 0` returns
 * `from` itself. Result: `YYYY-MM-DD`.
 */
export function addWorkingDays(
  from: DateInput,
  n: number,
  holidays: readonly string[],
  workdays: readonly string[] = []
): string {
  const holidaySet = keySet(holidays);
  const workdaySet = keySet(workdays);
  let key = toDateKey(from);
  let remaining = Math.floor(n);
  for (let scanned = 0; remaining > 0; scanned++) {
    if (scanned > MAX_SCAN_DAYS) throw new RangeError("Working-day calendar has no working days");
    key = addDays(key, 1);
    if (isWorkingKey(key, holidaySet, workdaySet)) remaining--;
  }
  return key;
}

/**
 * Number of working days in `(fromKey, toKey]` — the inverse of `addWorkingDays`. Negative when
 * `toKey` is before `fromKey`.
 */
export function workingDaysBetween(
  fromKey: string,
  toKey: string,
  holidays: readonly string[],
  workdays: readonly string[] = []
): number {
  const from = toDateKey(fromKey);
  const to = toDateKey(toKey);
  if (to < from) return -workingDaysBetween(to, from, holidays, workdays);
  const holidaySet = keySet(holidays);
  const workdaySet = keySet(workdays);
  let count = 0;
  for (let key = addDays(from, 1); key <= to; key = addDays(key, 1)) {
    if (isWorkingKey(key, holidaySet, workdaySet)) count++;
  }
  return count;
}

export function leadTimeDays(isTriplex: boolean): number {
  return isTriplex ? LEAD_TIME_DAYS_TRIPLEX : LEAD_TIME_DAYS;
}

/** Earliest ready date if the contract is signed `today`. */
export function earliestReadyDate(
  today: DateInput,
  isTriplex: boolean,
  holidays: readonly string[],
  workdays: readonly string[] = []
): string {
  return addWorkingDays(today, leadTimeDays(isTriplex), holidays, workdays);
}

/**
 * True when the desired date is strictly before the earliest ready date counted from today in
 * the company time zone. Empty or unparsable date → false.
 */
export function isUrgent(
  desiredDate: DateInput | null | undefined,
  now: Date,
  isTriplex: boolean,
  holidays: readonly string[],
  workdays: readonly string[] = []
): boolean {
  const desired = tryDateKey(desiredDate);
  if (desired === null) return false;
  return desired < earliestReadyDate(todayKey(now), isTriplex, holidays, workdays);
}

/**
 * Non-working weekdays of the Russian production calendar — seed for `site-settings.holidays`
 * (task 16). Only Monday–Friday dates: weekends are days off anyway.
 * - 2026: Постановление Правительства РФ от 24.09.2025 № 1466 (transfers: 03.01 → 09.01,
 *   04.01 → 31.12; 08.03 → 09.03 and 09.05 → 11.05 by ТК РФ ст. 112).
 * - 2027: Постановление Правительства РФ от 17.09.2026 № 1187 (transfers: 02.01 → 05.11,
 *   03.01 → 31.12, 20.02 → 22.02; 01.05 → 03.05, 09.05 → 10.05, 12.06 → 14.06 by ст. 112).
 *   TODO verify against publication.pravo.gov.ru before go-live.
 */
export const RU_HOLIDAYS_2026_2027: readonly string[] = [
  // 2026
  "2026-01-01",
  "2026-01-02",
  "2026-01-05",
  "2026-01-06",
  "2026-01-07",
  "2026-01-08",
  "2026-01-09",
  "2026-02-23",
  "2026-03-09",
  "2026-05-01",
  "2026-05-11",
  "2026-06-12",
  "2026-11-04",
  "2026-12-31",
  // 2027
  "2027-01-01",
  "2027-01-04",
  "2027-01-05",
  "2027-01-06",
  "2027-01-07",
  "2027-01-08",
  "2027-02-22",
  "2027-02-23",
  "2027-03-08",
  "2027-05-03",
  "2027-05-10",
  "2027-06-14",
  "2027-11-04",
  "2027-11-05",
  "2027-12-31",
];

/**
 * Weekend days made working by a transfer (`site-settings.holidays` rows with `isWorkday`).
 * 2027-02-20 (Saturday) is worked instead of Monday 2027-02-22. TODO verify (see above).
 */
export const RU_WORKDAYS_2026_2027: readonly string[] = ["2027-02-20"];
