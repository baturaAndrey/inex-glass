/**
 * Pagination of the blog listing (ТЗ §8 п.4): page 1 is `/blog/`, pages 2…N are
 * `/blog/page/N/`; `/blog/page/1/` permanently redirects to `/blog/`, anything else is a 404.
 * Pure helpers: no Next / Payload imports (unit-tested).
 */

export const BLOG_PAGE_SIZE = 12;
export const BLOG_PATH = "/blog/";
/** Reserved segment of the pagination URLs (an article can never have this slug). */
export const BLOG_PAGE_SEGMENT = "page";

const POSITIVE_INTEGER = /^[1-9]\d*$/;

/** Number of listing pages for `total` items; at least 1 (an empty blog still has `/blog/`). */
export function totalPages(total: number, pageSize: number = BLOG_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

/**
 * Page number from the `[n]` segment: a canonical positive integer (`"2"`), otherwise `null`
 * (`"02"`, `"2.0"`, `"-1"`, `"abc"` are not the same URL and must not resolve).
 */
export function parsePageParam(raw: string | undefined): number | null {
  if (raw === undefined || !POSITIVE_INTEGER.test(raw)) return null;
  const page = Number(raw);
  return Number.isSafeInteger(page) ? page : null;
}

/** Items of the 1-based `page`; empty outside the range. */
export function pageSlice<T>(items: readonly T[], page: number, pageSize = BLOG_PAGE_SIZE): T[] {
  if (!Number.isInteger(page) || page < 1) return [];
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** `true` when `page` exists for `total` items (page 1 always exists). */
export function isPageInRange(page: number, total: number, pageSize = BLOG_PAGE_SIZE): boolean {
  return Number.isInteger(page) && page >= 1 && page <= totalPages(total, pageSize);
}

/** URL of a listing page: `/blog/` for page 1, `/blog/page/N/` otherwise. */
export function blogPageHref(page: number): string {
  return page <= 1 ? BLOG_PATH : `${BLOG_PATH}${BLOG_PAGE_SEGMENT}/${page}/`;
}

export interface PageLink {
  page: number;
  href: string;
  current: boolean;
}

/** Every page of the listing as links (the blog stays small, so no ellipsis is needed). */
export function pageLinks(current: number, total: number, pageSize = BLOG_PAGE_SIZE): PageLink[] {
  const count = totalPages(total, pageSize);
  return Array.from({ length: count }, (_, index) => {
    const page = index + 1;
    return { page, href: blogPageHref(page), current: page === current };
  });
}
