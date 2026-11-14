import { COMPANY_TZ } from "@/lib/domain/types";
import { LEAD_FLAGS, LEAD_FORM_TYPES } from "@/payload/collections/crm/constants";

/**
 * Shared constants of the leads admin module (ТЗ §6.1). Pure: imported by server views, client
 * components, route handlers and unit tests alike.
 */

/** Every date of the leads admin (list, export, report) is shown in the company time zone. */
export const SITE_TZ = COMPANY_TZ;

/** Hard cap of one export: beyond it the user must narrow the period (HTTP 413). */
export const LEAD_EXPORT_MAX_ROWS = 20_000;

/** Page size of the leads list. */
export const LEADS_LIST_PAGE_SIZE = 25;

/** Word the admin must type to confirm the personal-data erasure. */
export const ERASE_CONFIRM_WORD = "УДАЛИТЬ";

export const LEADS_LIST_PATH = "/admin/collections/leads/";
export const LEADS_REPORT_PATH = "/admin/leads-report/";
export const LEADS_EXPORT_API_PATH = "/api/admin/leads/export/";
/** Kanban of leads: custom collection view `views.kanban` (admin redesign, task 05). */
export const LEADS_KANBAN_PATH = "/admin/collections/leads/kanban/";

export const leadAdminPath = (id: string) => `/admin/collections/leads/${encodeURIComponent(id)}/`;
/** «Сводка» tab of a lead: the card linked from the kanban, the dashboard and MAX messages. */
export const leadSummaryPath = (id: string) =>
  `/admin/collections/leads/${encodeURIComponent(id)}/summary/`;
export const leadEraseApiPath = (id: string) => `/api/admin/leads/${encodeURIComponent(id)}/erase/`;
export const leadFileDownloadPath = (id: string) =>
  `/api/lead-files/${encodeURIComponent(id)}/download/`;

export type LeadFormType = (typeof LEAD_FORM_TYPES)[number]["value"];
export type LeadFlag = (typeof LEAD_FLAGS)[number]["value"];

export const LEAD_FORM_TYPE_VALUES: readonly LeadFormType[] = LEAD_FORM_TYPES.map(
  (option) => option.value
);

/** «Квиз», «Отправить чертёж», … — labels of `leads.formType`. */
export const FORM_TYPE_LABELS: Readonly<Record<LeadFormType, string>> = Object.fromEntries(
  LEAD_FORM_TYPES.map((option) => [option.value, option.label])
) as Record<LeadFormType, string>;

export function formTypeLabel(value: unknown): string {
  return typeof value === "string" && value in FORM_TYPE_LABELS
    ? FORM_TYPE_LABELS[value as LeadFormType]
    : "—";
}

export function isLeadFormType(value: unknown): value is LeadFormType {
  return typeof value === "string" && value in FORM_TYPE_LABELS;
}

/** «Повтор» badge colours (amber, ТЗ §6.1 «Дубли»). */
export const DUPLICATE_BADGE_COLORS = { color: "#8A5A00", background: "#FCF6EA" } as const;

/** Fallback text colour of a status badge whose `lead-statuses.color` is empty or not a colour. */
export const DEFAULT_STATUS_COLOR = "#4B5563";

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Badge colours of a lead status. `lead-statuses.color` stores the TEXT colour (seed, task 16);
 * the background is the same colour at 12 % (ТЗ table «Статусы»). Anything that is not a hex
 * colour falls back to neutral grey, so a CMS typo can never inject CSS.
 */
export function statusBadgeColors(color: unknown): { color: string; background: string } {
  const text = typeof color === "string" && HEX_COLOR.test(color.trim()) ? color.trim() : null;
  const base = text ?? DEFAULT_STATUS_COLOR;
  return { color: base, background: `color-mix(in srgb, ${base} 12%, transparent)` };
}
