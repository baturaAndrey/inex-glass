import { SEARCH_PAGE_PATH, SEARCH_PAGE_SIZE, SEARCH_QUERY_MAX_LENGTH } from "./types";

/**
 * URL helpers of the results page `/poisk/?q=…&page=N` (task 35). Pure: unit-tested.
 */

const POSITIVE_INTEGER = /^[1-9]\d{0,5}$/;
/** Pages shown around the current one before an ellipsis. */
const WINDOW_RADIUS = 2;

/** First value of a search param (`?q=a&q=b` → `a`), trimmed and cut to 100 characters. */
export function readQueryParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim().slice(0, SEARCH_QUERY_MAX_LENGTH) : "";
}

/** `page` param → 1-based page number; anything that is not a canonical positive integer → 1. */
export function readPageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && POSITIVE_INTEGER.test(value) ? Number(value) : 1;
}

export function searchPageCount(total: number, pageSize = SEARCH_PAGE_SIZE): number {
  return Number.isFinite(total) && total > 0 ? Math.ceil(total / pageSize) : 0;
}

export function searchOffset(page: number, pageSize = SEARCH_PAGE_SIZE): number {
  return (Math.max(1, Math.trunc(page)) - 1) * pageSize;
}

/** `/poisk/?q=…` (page 1) or `/poisk/?q=…&page=N`. */
export function searchPageHref(q: string, page = 1): string {
  const params = new URLSearchParams({ q });
  if (page > 1) params.set("page", String(page));
  return `${SEARCH_PAGE_PATH}?${params.toString()}`;
}

/** Page numbers to show: first, last and a window around `current`; `null` = ellipsis. */
export function paginationItems(current: number, count: number): Array<number | null> {
  if (count <= 1) return [];
  const pages = new Set<number>([1, count]);
  for (let page = current - WINDOW_RADIUS; page <= current + WINDOW_RADIUS; page += 1) {
    if (page >= 1 && page <= count) pages.add(page);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | null> = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) items.push(null);
    items.push(page);
  });
  return items;
}
