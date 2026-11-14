import { sql } from "@payloadcms/db-postgres";
import { getPayloadClient } from "@/lib/cms/payload";
import { normalizeRu } from "./normalize";
import { sanitizeSnippet } from "./snippet";
import {
  isSearchKind,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_QUERY_MAX_LENGTH,
  type SearchHit,
  type SearchResult,
} from "./types";
import type { SQL } from "@payloadcms/db-postgres/drizzle";
import type { Payload } from "payload";

/**
 * Site search over the `search` collection (task 35): Postgres FTS with the `russian`
 * configuration on the generated `search.tsv` column (GIN index `search_tsv_gin`).
 *
 * Two queries are OR-ed: the exact one (`websearch_to_tsquery` of the whole normalized input,
 * stemmed words, quotes / `-` / `or` supported) and a prefix one built here from clean tokens
 * (`слово1 & слово2:*`), so «перегор» already finds «перегородки» while the user is typing.
 * Every value reaches Postgres as a bound parameter (drizzle `sql` placeholders); the prefix
 * query additionally consists of letters / digits only, so the tsquery syntax cannot be injected.
 */

/** Words shorter than this are dropped from the prefix query (one letter matches everything). */
const MIN_TOKEN_LENGTH = 2;
/** Upper bound of tokens in the prefix query (keeps the tsquery and the plan small). */
const MAX_TOKENS = 8;
/** `ts_headline` input cap: the snippet is taken from the start of long bodies only. */
const HEADLINE_INPUT_CHARS = 5000;
const HEADLINE_OPTIONS =
  "MaxFragments=1,MaxWords=28,MinWords=12,ShortWord=2,StartSel=<mark>,StopSel=</mark>";
/**
 * Postgres text search configuration (also baked into the `search.tsv` expression). A constant
 * SQL literal, never user input: a literal `regconfig` keeps the tsquery expressions IMMUTABLE.
 */
const TS_CONFIG = sql.raw("'russian'::regconfig");

const TOKEN = /[\p{L}\p{N}]+/gu;

export interface SearchParams {
  q: string;
  /** 1…`SEARCH_MAX_LIMIT`, default `SEARCH_DEFAULT_LIMIT`. */
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface PreparedQuery {
  /** Normalized input for `websearch_to_tsquery`. */
  exact: string;
  /** `слово1 & слово2:*` for `to_tsquery`. */
  prefix: string;
}

/** Input cut to `SEARCH_QUERY_MAX_LENGTH` and normalized (`normalizeRu`). */
export function normalizeQuery(q: unknown): string {
  if (typeof q !== "string") return "";
  return normalizeRu(q.slice(0, SEARCH_QUERY_MAX_LENGTH));
}

/**
 * Letters / digits tokens (Unicode) of a NORMALIZED query, at least `MIN_TOKEN_LENGTH` long, at
 * most `MAX_TOKENS`. Everything else — `& | ! ( ) : ' *`, punctuation, spaces — is a separator.
 */
export function queryTokens(normalized: string): string[] {
  const tokens = normalized.match(TOKEN) ?? [];
  return tokens.filter((token) => token.length >= MIN_TOKEN_LENGTH).slice(0, MAX_TOKENS);
}

/** A token of digits only (a thickness, a size): never a prefix. */
const NUMERIC_TOKEN = /^\d+$/;

/**
 * `to_tsquery` text: tokens joined with ` & `, the last one as a prefix (`:*`); `""` if none.
 * A purely numeric last token stays exact: «10» must not find «100» or «1000 × 2000».
 */
export function buildPrefixQuery(tokens: readonly string[]): string {
  if (tokens.length === 0) return "";
  const head = tokens.slice(0, -1);
  const last = tokens[tokens.length - 1] as string;
  return [...head, NUMERIC_TOKEN.test(last) ? last : `${last}:*`].join(" & ");
}

/** Both tsquery inputs for a raw user query, or `null` when it has no searchable word. */
export function prepareQuery(q: unknown): PreparedQuery | null {
  const exact = normalizeQuery(q);
  const tokens = queryTokens(exact);
  if (tokens.length === 0) return null;
  return { exact, prefix: buildPrefixQuery(tokens) };
}

/** `limit` clamped to 1…`SEARCH_MAX_LIMIT` (non-numbers → default). */
export function clampLimit(limit: unknown): number {
  const value = typeof limit === "number" ? Math.trunc(limit) : NaN;
  if (!Number.isFinite(value)) return SEARCH_DEFAULT_LIMIT;
  return Math.min(Math.max(value, 1), SEARCH_MAX_LIMIT);
}

/** Non-negative integer offset (anything else → 0). */
export function clampOffset(offset: unknown): number {
  const value = typeof offset === "number" ? Math.trunc(offset) : NaN;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * The search statement. Ranking: exact matches weigh twice the prefix ones, multiplied by the
 * collection priority (`1 + priority / 10`). The tsquery expressions are written inline
 * (not in a CTE) so the planner sees them as constants and can use the GIN index
 * `search_tsv_gin` for `tsv @@ …` (a CTE referenced twice is materialized and forces a
 * sequential scan); both queries are OR-ed into one tsquery (`||`), one index condition. The inner query ranks and pages; `ts_headline` (expensive) runs on the page
 * rows only.
 */
export function buildSearchSql(query: PreparedQuery, limit: number, offset: number): SQL {
  const exactQ = sql`websearch_to_tsquery(${TS_CONFIG}, ${query.exact})`;
  const prefixQ = sql`to_tsquery(${TS_CONFIG}, ${query.prefix})`;
  return sql`
    WITH ranked AS (
      SELECT
        s.title,
        s.url,
        s.kind,
        s.body_text,
        (ts_rank_cd(s.tsv, ${exactQ}) * 2 + ts_rank_cd(s.tsv, ${prefixQ}))
          * (1 + coalesce(s.priority, 0) / 10.0) AS rank,
        count(*) OVER () AS total
      FROM search s
      WHERE s.tsv @@ (${exactQ} || ${prefixQ})
        AND s.url IS NOT NULL
      ORDER BY rank DESC, s.title
      LIMIT ${limit} OFFSET ${offset}
    )
    SELECT
      r.title,
      r.url,
      r.kind,
      r.total,
      ts_headline(
        ${TS_CONFIG},
        left(coalesce(r.body_text, ''), ${HEADLINE_INPUT_CHARS}),
        ${exactQ} || ${prefixQ},
        ${HEADLINE_OPTIONS}
      ) AS snippet
    FROM ranked r
    ORDER BY r.rank DESC, r.title`;
}

type SearchRow = {
  title: unknown;
  url: unknown;
  kind: unknown;
  total: unknown;
  snippet: unknown;
};

/** DB rows → hits; rows with an unknown kind or without a URL are dropped. */
export function rowsToResult(rows: readonly SearchRow[]): SearchResult {
  const hits: SearchHit[] = [];
  for (const row of rows) {
    if (typeof row.url !== "string" || row.url === "" || !isSearchKind(row.kind)) continue;
    hits.push({
      title: typeof row.title === "string" ? row.title : "",
      url: row.url,
      kind: row.kind,
      snippet: sanitizeSnippet(row.snippet),
    });
  }
  // `count(*)` is a bigint: node-postgres returns it as a string.
  const total = rows.length > 0 ? Number(rows[0]?.total) || hits.length : 0;
  return { hits, total };
}

/**
 * Runs the search. An input without a searchable word gives an empty result without a query.
 * Database errors propagate: callers decide how to degrade (the API answers `{hits: []}`).
 */
export async function searchSite(
  { q, limit, offset }: SearchParams,
  payloadInstance?: Payload
): Promise<SearchResult> {
  const prepared = prepareQuery(q);
  if (!prepared) return { hits: [], total: 0 };
  const payload = payloadInstance ?? (await getPayloadClient());
  const result = await payload.db.drizzle.execute(
    buildSearchSql(prepared, clampLimit(limit), clampOffset(offset))
  );
  return rowsToResult((result as unknown as { rows: SearchRow[] }).rows);
}
