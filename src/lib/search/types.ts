/**
 * Public contract of the site search (task 35): `searchSite()`, `GET /api/site-search/`,
 * the `/poisk/` page and the header suggestions. Pure types and constants (client-safe).
 */

/** Collections indexed by `@payloadcms/plugin-search`, in the order of the ТЗ table. */
export const SEARCH_COLLECTIONS = [
  "glass-types",
  "thicknesses",
  "constructions",
  "processing-services",
  "pages",
  "articles",
  "objects",
] as const;

/** Kind of a hit = the source collection (stored in `search.kind`). */
export type SearchKind = (typeof SEARCH_COLLECTIONS)[number];

/** Badge label of every kind (results page and header suggestions). */
export const SEARCH_KIND_LABELS: Readonly<Record<SearchKind, string>> = {
  "glass-types": "Вид стекла",
  thicknesses: "Толщина",
  constructions: "Конструкция",
  "processing-services": "Услуга",
  pages: "Страница",
  articles: "Статья",
  objects: "Объект",
};

export function isSearchKind(value: unknown): value is SearchKind {
  return typeof value === "string" && (SEARCH_COLLECTIONS as readonly string[]).includes(value);
}

export interface SearchHit {
  title: string;
  /** Site path with a trailing slash (`/zakalennoe-steklo/10-mm/`). */
  url: string;
  /**
   * Fragment of the indexed text, HTML-escaped except for `<mark>…</mark>` around the matched
   * words (`sanitizeSnippet`), so it may be rendered as HTML. Empty when nothing to show.
   */
  snippet: string;
  kind: SearchKind;
}

export interface SearchResult {
  hits: SearchHit[];
  /** Total number of matches (for pagination). */
  total: number;
}

/** Query limits (ТЗ: `q` ≤ 100 characters, `limit` ≤ 20). */
export const SEARCH_QUERY_MAX_LENGTH = 100;
export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_DEFAULT_LIMIT = 10;
export const SEARCH_MAX_LIMIT = 20;
/** Results per page of `/poisk/`. */
export const SEARCH_PAGE_SIZE = 20;
/** Header suggestions. */
export const SEARCH_SUGGEST_LIMIT = 6;

/** Results page and the public JSON endpoint (NOT `/api/search/`: that is the plugin's REST). */
export const SEARCH_PAGE_PATH = "/poisk/";
export const SEARCH_API_PATH = "/api/site-search/";
