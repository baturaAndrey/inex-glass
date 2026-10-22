import { daysBetween, tryDateKey } from "@/lib/domain/dates";
import { formatNumber, formatRub } from "@/lib/domain/format";
import { NBSP } from "@/lib/domain/types";
import { SITE_TZ } from "@/payload/admin/leads/constants";
import type { LeadFormType } from "@/payload/admin/leads/constants";
import { LEAD_REFUSE_REASON_CODES } from "@/payload/collections/crm/constants";
import type { KanbanReasonCount } from "./types";

/**
 * Pure formatting of the kanban cards: age, phone, sums, Russian plurals, initials, the refusal
 * breakdown. Imported by the server view and the client board alike; `now` is always passed in.
 *
 * Deliberately duplicates the age formatting of the dashboard (task 04): the tasks ran in
 * parallel; a shared module can be extracted afterwards.
 */

/** A new lead older than this is overdue (ТЗ: reaction within 2 hours). */
export const NEW_LEAD_LATE_MS = 2 * 60 * 60 * 1000;
/** A commercial offer unanswered longer than this needs a reminder call. */
export const KP_WAITING_DAYS = 5;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** Below this the age shows hours AND minutes («2 ч 15 мин»). */
const HOURS_WITH_MINUTES_MS = 3 * HOUR_MS;

/** Short source tags of the cards. */
export const SOURCE_SHORT_LABELS: Readonly<Record<LeadFormType, string>> = {
  quiz: "Квиз",
  drawing: "Чертёж",
  callback: "Звонок",
  sample: "Образец",
  load: "Под нагрузку",
  contacts: "Контакты",
  full: "Полная форма",
};

export function sourceShortLabel(formType: unknown): string {
  return typeof formType === "string" && formType in SOURCE_SHORT_LABELS
    ? SOURCE_SHORT_LABELS[formType as LeadFormType]
    : "—";
}

/** Russian plural form: 1 день, 2 дня, 5 дней, 11 дней, 21 день. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** «2 комментария». */
export function commentsLabel(count: number): string {
  return `${count} ${pluralRu(count, "комментарий", "комментария", "комментариев")}`;
}

const parseInstant = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Relative age: «только что», «12 мин», «2 ч 15 мин», «5 ч», «вчера», «3 дня». Calendar days
 * («вчера», «N дн.») are counted in the company time zone, not in UTC.
 */
export function formatAge(from: Date, now: Date): string {
  const diff = Math.max(0, now.getTime() - from.getTime());
  if (diff < MINUTE_MS) return "только что";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} мин`;
  if (diff < HOURS_WITH_MINUTES_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    const minutes = Math.floor((diff % HOUR_MS) / MINUTE_MS);
    return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} ч`;
  const fromKey = tryDateKey(from);
  const nowKey = tryDateKey(now);
  const days = fromKey && nowKey ? daysBetween(fromKey, nowKey) : Math.floor(diff / DAY_MS);
  if (days <= 1) return "вчера";
  return `${days} ${pluralRu(days, "день", "дня", "дней")}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: SITE_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** «22.10.2026 10:48» (company time zone). */
export function formatDateTime(date: Date): string {
  const parts: Record<string, string> = {};
  for (const part of dateTimeFormatter.formatToParts(date)) parts[part.type] = part.value;
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

/** «20.10» (company time zone). */
export function formatDayMonth(date: Date): string {
  const key = tryDateKey(date);
  return key ? `${key.slice(8, 10)}.${key.slice(5, 7)}` : "";
}

export type CardAgeMode = "default" | "kp" | "open" | "contract";

export interface CardAge {
  label: string;
  /** Full date for the `title` attribute. */
  title: string;
  /** `late` — a new lead older than 2 h; `waiting` — an offer older than 5 days. */
  tone: "late" | "waiting" | null;
}

/**
 * Age shown in the card corner, by column:
 * - default status — since `createdAt`, overdue after 2 h;
 * - `kp-sent` — since `statusChangedAt`, waiting after 5 days;
 * - other open columns — since `statusChangedAt ?? createdAt`;
 * - contract columns — the date `DD.MM` of `statusChangedAt`.
 */
export function cardAge(
  card: { createdAt: string; statusChangedAt: string | null },
  mode: CardAgeMode,
  now: Date
): CardAge {
  const created = parseInstant(card.createdAt);
  const changed = parseInstant(card.statusChangedAt);
  const since = mode === "default" ? created : (changed ?? created);
  if (!since) return { label: "", title: "", tone: null };
  const title = formatDateTime(since);
  if (mode === "contract") return { label: formatDayMonth(since), title, tone: null };

  const elapsed = now.getTime() - since.getTime();
  let tone: CardAge["tone"] = null;
  if (mode === "default" && elapsed > NEW_LEAD_LATE_MS) tone = "late";
  if (mode === "kp" && elapsed > KP_WAITING_DAYS * DAY_MS) tone = "waiting";
  return { label: formatAge(since, now), title, tone };
}

const RU_MOBILE = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/;

/** `+79123456789` → «+7 912 345-67-89»; other numbers are shown as stored. */
export function formatPhoneDisplay(phone: string): string {
  const match = RU_MOBILE.exec(phone);
  return match ? `+7 ${match[1]} ${match[2]}-${match[3]}-${match[4]}` : phone;
}

/** «от 168 000 ₽» (NBSP everywhere: never breaks). */
export function formatEstimateFrom(amount: number): string {
  return `от${NBSP}${formatRub(amount)}`;
}

/** «КП 412 000 ₽». */
export function formatKpAmount(amount: number): string {
  return `КП${NBSP}${formatRub(amount)}`;
}

/** «120 м²». */
export function formatArea(area: number): string {
  return `${formatNumber(area)}${NBSP}м²`;
}

/** «Сергей Морозов» → «СМ», «Ольга» → «О»; empty → «?». */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return letters || "?";
}

const REASON_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_REFUSE_REASON_CODES.map((option) => [option.value, option.label])
);
const OTHER_REASON = "other";
export const UNSPECIFIED_REASON_LABEL = "Не указана";

/**
 * Refusal breakdown of a strip: by `refuseReasonCode`; a lead without a code but with a text
 * counts as «Другое» (the reports' rule), without either as «Не указана». Most frequent first,
 * ties in the order of `LEAD_REFUSE_REASON_CODES`; «Не указана» always last.
 */
export function tallyRefuseReasons(
  leads: readonly { refuseReasonCode?: string | null; refuseReason?: string | null }[]
): KanbanReasonCount[] {
  const counts = new Map<string, number>();
  let unspecified = 0;
  for (const lead of leads) {
    const code =
      lead.refuseReasonCode && REASON_LABELS.has(lead.refuseReasonCode)
        ? lead.refuseReasonCode
        : lead.refuseReason?.trim()
          ? OTHER_REASON
          : null;
    if (code === null) unspecified += 1;
    else counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const rows: KanbanReasonCount[] = LEAD_REFUSE_REASON_CODES.map((option) => ({
    label: option.label,
    count: counts.get(option.value) ?? 0,
  }))
    .filter((row) => row.count > 0)
    // `sort` is stable: equal counts keep the order of the codes.
    .sort((a, b) => b.count - a.count);
  if (unspecified > 0) rows.push({ label: UNSPECIFIED_REASON_LABEL, count: unspecified });
  return rows;
}
