import { addDays, todayKey } from "@/lib/domain/dates";
import { formatNumber } from "@/lib/domain/format";
import { toWallClockDate } from "@/lib/leads-admin/period";

/**
 * Text formatting of the admin dashboard: «Когда» of the latest leads, the age of the oldest
 * unassigned lead, short staff names and the «к пред. периоду» deltas. Pure: `now` is always
 * passed in; every calendar decision is made in the company time zone (`SITE_TZ`).
 */

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Wall-clock parts of an instant in the company time zone. */
function wallClock(instant: Date) {
  const local = toWallClockDate(instant);
  return {
    year: local.getUTCFullYear(),
    month: pad2(local.getUTCMonth() + 1),
    day: pad2(local.getUTCDate()),
    time: `${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`,
  };
}

export interface WhenLabel {
  /** «10:48» today, «вчера», otherwise «20.10». */
  text: string;
  /** Full local date and time «20.10.2026 10:48» (tooltip). */
  title: string;
}

/** «Когда» column of «Последние заявки»; an invalid date gives «—». */
export function formatWhen(createdAt: string | Date, now: Date): WhenLabel {
  const instant = new Date(createdAt);
  if (Number.isNaN(instant.getTime())) return { text: "—", title: "" };
  const parts = wallClock(instant);
  const title = `${parts.day}.${parts.month}.${parts.year} ${parts.time}`;
  const key = todayKey(instant);
  const today = todayKey(now);
  if (key === today) return { text: parts.time, title };
  if (key === addDays(today, -1)) return { text: "вчера", title };
  return { text: `${parts.day}.${parts.month}`, title };
}

/** Russian plural form: `plural(3, ["день", "дня", "дней"])` → «дня». */
export function plural(count: number, forms: readonly [string, string, string]): string {
  const mod100 = Math.abs(count) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/**
 * Age of a waiting lead: «12 мин», «1 ч», «2 ч 15 мин», «3 дня». Under a minute (or a negative
 * duration from clock skew) shows «1 мин»: the lead is already waiting.
 */
export function formatAge(ms: number): string {
  const minutes = Math.max(1, Math.floor(ms / MS_PER_MINUTE));
  if (minutes < MINUTES_PER_HOUR) return `${minutes} мин`;
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) {
    const rest = minutes % MINUTES_PER_HOUR;
    return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
  }
  const days = Math.floor(hours / HOURS_PER_DAY);
  return `${days} ${plural(days, ["день", "дня", "дней"])}`;
}

/** «Сергей Морозов» → «Сергей М.»; a single word stays as is; blank → «». */
export function shortName(fullName: string | null | undefined): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  const [first, second] = words;
  if (!first) return "";
  return second ? `${first} ${second.charAt(0).toUpperCase()}.` : first;
}

// ---------------------------------------------------------------------------------------------
// Deltas «к пред. периоду»
// ---------------------------------------------------------------------------------------------

/** `new`: the previous period had nothing, the current one has something. */
export type DeltaDirection = "up" | "down" | "flat" | "new";

/** `percent`: relative change; `absolute`: difference of counts; `points`: percentage points. */
export type DeltaKind = "percent" | "absolute" | "points";

export interface Delta {
  kind: DeltaKind;
  direction: DeltaDirection;
  /** Visible text: «↑ 18%», «↓ 1», «= 0%», «↓ 1,2 п. п.», «новые». */
  text: string;
  /** Screen-reader text: «рост на 18 % к предыдущему периоду». */
  srText: string;
}

const SR_SUFFIX = "к предыдущему периоду";

function directed(kind: DeltaKind, signed: number, body: (abs: string) => string): Delta {
  const abs = Math.abs(signed);
  if (signed === 0) {
    return {
      kind,
      direction: "flat",
      text: `= ${body("0")}`,
      srText: `без изменений ${SR_SUFFIX}`,
    };
  }
  const value = body(formatNumber(abs, { decimals: 1 }));
  const srValue = value.replace(/%$/, " %");
  return signed > 0
    ? { kind, direction: "up", text: `↑ ${value}`, srText: `рост на ${srValue} ${SR_SUFFIX}` }
    : {
        kind,
        direction: "down",
        text: `↓ ${value}`,
        srText: `снижение на ${srValue} ${SR_SUFFIX}`,
      };
}

/** Relative change in whole percent; previous 0 and current > 0 → «новые». */
export function percentDelta(current: number, previous: number): Delta {
  if (previous === 0) {
    if (current > 0) {
      return {
        kind: "percent",
        direction: "new",
        text: "новые",
        srText: `в предыдущем периоде значений не было`,
      };
    }
    return directed("percent", 0, (abs) => `${abs}%`);
  }
  const change = Math.round(((current - previous) / previous) * 100);
  return directed("percent", change, (abs) => `${abs}%`);
}

/** Difference of counts: «↑ 2», «↓ 1», «= 0». */
export function absoluteDelta(current: number, previous: number): Delta {
  return directed("absolute", Math.round(current - previous), (abs) => abs);
}

/** Difference of two percentages, one decimal: «↓ 1,2 п. п.». */
export function pointsDelta(current: number, previous: number): Delta {
  const diff = Math.round((current - previous) * 10) / 10;
  return directed("points", diff, (abs) => `${abs} п. п.`);
}
