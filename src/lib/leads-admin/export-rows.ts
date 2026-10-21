import { QUIZ_FLAG_LABELS } from "@/lib/domain/quiz-flags";
import type { QuizFlag } from "@/lib/domain/quiz-flags";
import { formTypeLabel, SITE_TZ } from "@/payload/admin/leads/constants";
import { LEAD_PRODUCT_TYPES, LEAD_ROLES } from "@/payload/collections/crm/constants";
import type { Lead } from "@/payload-types";

/**
 * Lead → row of the CSV/XLSX export (ТЗ §6.1 «Экспорт»). Pure: names of related statuses and
 * users come from lookup maps prepared by the route, so the rows never depend on populate depth
 * or on what the reader may see of `users`.
 */

/** Value of one export cell: dates stay `Date` for XLSX, CSV formats them. */
export type ExportValue = string | number | Date | null;

export interface ExportColumn {
  readonly header: string;
  /** XLSX column width, characters. */
  readonly width: number;
}

/** Column order and Russian headers are part of the contract (task 32 spec). */
export const EXPORT_COLUMNS = [
  { header: "Дата создания", width: 17 },
  { header: "Источник", width: 18 },
  { header: "Метка источника", width: 24 },
  { header: "Страница входа", width: 28 },
  { header: "Компания", width: 28 },
  { header: "ИНН", width: 14 },
  { header: "Имя", width: 20 },
  { header: "Телефон", width: 16 },
  { header: "E-mail", width: 26 },
  { header: "Роль", width: 22 },
  { header: "Город", width: 16 },
  { header: "Площадь, м²", width: 12 },
  { header: "Тип изделия", width: 18 },
  { header: "Комментарий", width: 40 },
  { header: "Статус", width: 16 },
  { header: "Причина отказа", width: 30 },
  { header: "Ответственный", width: 20 },
  { header: "Флаги", width: 30 },
  { header: "Повтор", width: 9 },
  { header: "utm_source", width: 14 },
  { header: "utm_medium", width: 14 },
  { header: "utm_campaign", width: 18 },
  { header: "utm_term", width: 14 },
  { header: "utm_content", width: 14 },
  { header: "Client ID", width: 22 },
  { header: "Файлов", width: 8 },
  { header: "Ответы", width: 60 },
] as const satisfies readonly ExportColumn[];

export const EXPORT_HEADERS: readonly string[] = EXPORT_COLUMNS.map((column) => column.header);

/** 0-based indexes of typed columns (XLSX formats). */
export const EXPORT_COLUMN_INDEX = {
  createdAt: 0,
  inn: 5,
  phone: 7,
  area: 11,
  files: 25,
} as const;

/** Excel refuses cells longer than 32 767 characters; keep a margin for the ellipsis. */
export const MAX_CELL_LENGTH = 32_000;

export type ExportLead = Pick<
  Lead,
  | "createdAt"
  | "formType"
  | "sourceLabel"
  | "entryPage"
  | "company"
  | "inn"
  | "name"
  | "phone"
  | "email"
  | "role"
  | "city"
  | "area"
  | "productType"
  | "comment"
  | "status"
  | "refuseReason"
  | "assignee"
  | "flags"
  | "isDuplicate"
  | "utm"
  | "metrikaClientId"
  | "files"
  | "answers"
>;

export interface ExportLookups {
  /** Status id → name. */
  statusNames: ReadonlyMap<string, string>;
  /** User id → display name. */
  userNames: ReadonlyMap<string, string>;
}

const ROLE_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_ROLES.map((option) => [option.value, option.label])
);
const PRODUCT_TYPE_LABELS: ReadonlyMap<string, string> = new Map(
  LEAD_PRODUCT_TYPES.map((option) => [option.value, option.label])
);

/** Id of a relationship value, populated (`{ id }`) or not. */
export function relationIdOf(value: unknown): string | null {
  const raw = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  if (typeof raw === "string" && raw !== "") return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

const textOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const truncate = (value: string): string =>
  value.length > MAX_CELL_LENGTH ? `${value.slice(0, MAX_CELL_LENGTH)}…` : value;

/** Russian labels of the flags joined with «; » (unknown ids are skipped). */
export function flagsText(flags: readonly string[] | null | undefined): string | null {
  const labels = (flags ?? [])
    .map((flag) => QUIZ_FLAG_LABELS[flag as QuizFlag] as string | undefined)
    .filter((label): label is string => label !== undefined);
  return labels.length > 0 ? labels.join("; ") : null;
}

/** Answers as one line of JSON (`null` for empty answers). */
export function answersText(answers: unknown): string | null {
  if (answers === null || answers === undefined || answers === "") return null;
  try {
    const json = JSON.stringify(answers);
    return json === undefined || json === "{}" || json === "[]" ? null : truncate(json);
  } catch {
    return null;
  }
}

function lookupName(map: ReadonlyMap<string, string>, value: unknown): string | null {
  const id = relationIdOf(value);
  if (!id) return null;
  // A populated relation carries its own name; otherwise the lookup, finally the bare id.
  const ownName =
    typeof value === "object" && value !== null
      ? textOrNull((value as { name?: unknown }).name)
      : null;
  return ownName ?? map.get(id) ?? id;
}

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Export row in `EXPORT_COLUMNS` order. */
export function toExportRow(lead: ExportLead, lookups: ExportLookups): ExportValue[] {
  const utm = lead.utm ?? {};
  const area = typeof lead.area === "number" && Number.isFinite(lead.area) ? lead.area : null;
  const comment = textOrNull(lead.comment);
  return [
    parseDate(lead.createdAt),
    formTypeLabel(lead.formType),
    textOrNull(lead.sourceLabel),
    textOrNull(lead.entryPage),
    textOrNull(lead.company),
    textOrNull(lead.inn),
    textOrNull(lead.name),
    textOrNull(lead.phone),
    textOrNull(lead.email),
    lead.role ? (ROLE_LABELS.get(lead.role) ?? lead.role) : null,
    textOrNull(lead.city),
    area,
    lead.productType ? (PRODUCT_TYPE_LABELS.get(lead.productType) ?? lead.productType) : null,
    comment === null ? null : truncate(comment),
    lookupName(lookups.statusNames, lead.status),
    textOrNull(lead.refuseReason),
    lookupName(lookups.userNames, lead.assignee),
    flagsText(lead.flags),
    lead.isDuplicate ? "Да" : "Нет",
    textOrNull(utm.source),
    textOrNull(utm.medium),
    textOrNull(utm.campaign),
    textOrNull(utm.term),
    textOrNull(utm.content),
    textOrNull(lead.metrikaClientId),
    Array.isArray(lead.files) ? lead.files.length : 0,
    answersText(lead.answers),
  ];
}

const dateTimeParts = (timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const siteDateTimeFormatter = dateTimeParts(SITE_TZ);

/** `DD.MM.YYYY HH:mm` in the company time zone (export, list cells). */
export function formatDateTime(value: Date | string, timeZone: string = SITE_TZ): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const formatter = timeZone === SITE_TZ ? siteDateTimeFormatter : dateTimeParts(timeZone);
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) parts[part.type] = part.value;
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Number for Russian Excel: comma decimal separator, no grouping (stays numeric on import). */
export function formatCsvNumber(value: number): string {
  return String(value).replace(".", ",");
}

/** CSV cells of an export row: dates as `DD.MM.YYYY HH:mm`, numbers with a decimal comma. */
export function toCsvValues(row: readonly ExportValue[]): (string | null)[] {
  return row.map((value) => {
    if (value instanceof Date) return formatDateTime(value);
    if (typeof value === "number") return formatCsvNumber(value);
    return value;
  });
}

/** `leads_2026-09-21_2026-10-20.csv` */
export function exportFileName(fromKey: string, toKey: string, extension: "csv" | "xlsx"): string {
  return `leads_${fromKey}_${toKey}.${extension}`;
}
