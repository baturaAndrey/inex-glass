import { createdAtWhere, presetRange } from "@/lib/leads-admin/period";
import {
  isLeadFormType,
  LEADS_EXPORT_API_PATH,
  LEADS_KANBAN_PATH,
} from "@/payload/admin/leads/constants";
import type { LeadFormType } from "@/payload/admin/leads/constants";
import { LEAD_FLAGS } from "@/payload/collections/crm/constants";
import type { Where } from "payload";

/**
 * URL state of the leads kanban. The page is fully described by its query string, so a reload or
 * a bookmark restores the view. Pure: `now` and the viewer id are injected.
 *
 * | param    | values                                           | default |
 * |----------|--------------------------------------------------|---------|
 * | `filter` | `all`, `mine`, `unassigned`, `repeat`, `flagged` | `all`   |
 * | `source` | `LEAD_FORM_TYPES` values                         | —       |
 * | `period` | `all`, `today`, `7d`, `30d`, `quarter`           | `all`   |
 * | `search` | up to 100 characters                             | —       |
 * | `expand` | a status id (that column shows 200 cards)        | —       |
 */

export const KANBAN_FILTERS = ["all", "mine", "unassigned", "repeat", "flagged"] as const;
export type KanbanFilter = (typeof KANBAN_FILTERS)[number];

export const KANBAN_FILTER_LABELS: Readonly<Record<KanbanFilter, string>> = {
  all: "Все",
  mine: "Мои",
  unassigned: "Без ответственного",
  repeat: "Повторные",
  flagged: "С флагами",
};

/**
 * «За всё время» is the default (not 30 days as drawn in the mockup): otherwise open leads older
 * than a month would silently disappear from «В работе» / «КП отправлено».
 */
export const KANBAN_PERIODS = ["all", "today", "7d", "30d", "quarter"] as const;
export type KanbanPeriod = (typeof KANBAN_PERIODS)[number];

export const KANBAN_PERIOD_LABELS: Readonly<Record<KanbanPeriod, string>> = {
  all: "За всё время",
  today: "Сегодня",
  "7d": "7 дней",
  "30d": "30 дней",
  quarter: "Квартал",
};

export const KANBAN_SEARCH_MAX_LENGTH = 100;
/** A search string with at least this many digits also matches the phone. */
const PHONE_SEARCH_MIN_DIGITS = 3;
/** Russian numbers typed as «8 912 …» are stored as «+7912…». */
const RU_TRUNK_PREFIX = /^8(\d{10})$/;

const FLAG_VALUES = LEAD_FLAGS.map((flag) => flag.value);

export interface KanbanQuery {
  filter: KanbanFilter;
  source: LeadFormType | null;
  period: KanbanPeriod;
  search: string;
  expand: string | null;
}

export const DEFAULT_KANBAN_QUERY: Readonly<KanbanQuery> = {
  filter: "all",
  source: null,
  period: "all",
  search: "",
  expand: null,
};

type SearchParams = Record<string, string | string[] | undefined> | undefined;

/** Ids are UUIDs (`idType: 'uuid'`); anything else in `expand` is ignored. */
const ID_PATTERN = /^[0-9a-f-]{1,64}$/i;

const single = (value: string | string[] | undefined): string | null =>
  typeof value === "string" ? value : Array.isArray(value) ? (value[0] ?? null) : null;

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | null =>
  value !== null && (values as readonly string[]).includes(value) ? (value as T) : null;

/** Parses the page's search params; garbage falls back to the defaults. */
export function parseKanbanQuery(searchParams: SearchParams): KanbanQuery {
  const source = single(searchParams?.source)?.trim() ?? null;
  const expand = single(searchParams?.expand)?.trim() ?? null;
  const search = (single(searchParams?.search) ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, KANBAN_SEARCH_MAX_LENGTH);
  return {
    filter: oneOf(KANBAN_FILTERS, single(searchParams?.filter)) ?? DEFAULT_KANBAN_QUERY.filter,
    source: isLeadFormType(source) ? source : null,
    period: oneOf(KANBAN_PERIODS, single(searchParams?.period)) ?? DEFAULT_KANBAN_QUERY.period,
    search,
    expand: expand && ID_PATTERN.test(expand) ? expand : null,
  };
}

/** Condition of a quick-filter chip (`null` for «Все»). */
export function filterWhere(filter: KanbanFilter, userId: string): Where | null {
  switch (filter) {
    case "all":
      return null;
    case "mine":
      return { assignee: { equals: userId } };
    case "unassigned":
      return { assignee: { exists: false } };
    case "repeat":
      return { isDuplicate: { equals: true } };
    case "flagged":
      return { flags: { in: [...FLAG_VALUES] } };
  }
}

/** Digits of a phone search: `null` when there are too few to be a phone fragment. */
export function phoneSearchDigits(search: string): string | null {
  const digits = search.replace(/\D/g, "");
  if (digits.length < PHONE_SEARCH_MIN_DIGITS) return null;
  const trunk = RU_TRUNK_PREFIX.exec(digits);
  return trunk ? `7${trunk[1]}` : digits;
}

/** `or` over the text contacts (`like`) plus the normalized phone when the string has digits. */
export function searchWhere(search: string): Where | null {
  if (!search) return null;
  const or: Where[] = [
    { company: { like: search } },
    { name: { like: search } },
    { email: { like: search } },
    { inn: { like: search } },
  ];
  const digits = phoneSearchDigits(search);
  if (digits) or.push({ phone: { like: digits } });
  return { or };
}

/**
 * Conditions of the kanban query WITHOUT the status: the caller adds the column's status (and
 * the 30-day window of final columns). An empty array means «all leads».
 */
export function kanbanWhere(query: KanbanQuery, ctx: { userId: string; now: Date }): Where[] {
  const conditions: Where[] = [];
  const byFilter = filterWhere(query.filter, ctx.userId);
  if (byFilter) conditions.push(byFilter);
  if (query.source) conditions.push({ formType: { equals: query.source } });
  if (query.period !== "all") conditions.push(createdAtWhere(presetRange(query.period, ctx.now)));
  const bySearch = searchWhere(query.search);
  if (bySearch) conditions.push(bySearch);
  return conditions;
}

/**
 * Link to the kanban with `patch` applied. Default values are left out, so the plain board is
 * exactly `LEADS_KANBAN_PATH`.
 */
export function kanbanHref(query: KanbanQuery, patch: Partial<KanbanQuery>): string {
  const next: KanbanQuery = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.filter !== DEFAULT_KANBAN_QUERY.filter) params.set("filter", next.filter);
  if (next.source) params.set("source", next.source);
  if (next.period !== DEFAULT_KANBAN_QUERY.period) params.set("period", next.period);
  if (next.search) params.set("search", next.search);
  if (next.expand) params.set("expand", next.expand);
  const search = params.toString();
  return search ? `${LEADS_KANBAN_PATH}?${search}` : LEADS_KANBAN_PATH;
}

/**
 * Quick filters the export route can express (`assignee=me`, `duplicates=1`). «Без
 * ответственного» and «С флагами» have no export parameter, so such exports are not narrowed.
 */
const EXPORT_FILTER_PARAMS: Readonly<Partial<Record<KanbanFilter, readonly [string, string]>>> = {
  mine: ["assignee", "me"],
  repeat: ["duplicates", "1"],
};

/**
 * «Экспорт» of the page head: xlsx of the board's period, source and quick filter — only what
 * `GET /api/admin/leads/export/` supports (the search is not exported). «За всё время» sends no
 * dates (the export route then takes the last 30 days on its own).
 */
export function kanbanExportHref(query: KanbanQuery, now: Date): string {
  const params = new URLSearchParams({ format: "xlsx" });
  if (query.period !== "all") {
    const range = presetRange(query.period, now);
    params.set("from", range.fromKey);
    params.set("to", range.toKey);
  }
  if (query.source) params.set("source", query.source);
  const filterParam = EXPORT_FILTER_PARAMS[query.filter];
  if (filterParam) params.set(filterParam[0], filterParam[1]);
  return `${LEADS_EXPORT_API_PATH}?${params.toString()}`;
}
