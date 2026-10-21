import type { NextRequest } from "next/server";
import { normalizeQuery, searchSite } from "@/lib/search/query";
import { SEARCH_DEFAULT_LIMIT, SEARCH_QUERY_MIN_LENGTH } from "@/lib/search/types";

/**
 * `GET /api/site-search/?q=&limit=` (trailing slash!) — public site search (task 35) for the
 * header suggestions: `{ hits: SearchHit[] }`. Not `/api/search/`: that path belongs to the
 * plugin's REST collection, which is closed to visitors.
 *
 * - `q` shorter than 2 characters (after normalization) → 400 `{ hits: [] }`;
 * - `limit` 1…20 (default 10), `q` cut to 100 characters (`searchSite`);
 * - a database error is logged and answered with `{ hits: [] }` (200, not cached), never with
 *   the error text.
 * Identical queries may be cached by the browser / CDN for a minute.
 */

export const dynamic = "force-dynamic";

const PUBLIC_CACHE = "public, max-age=60";
const NO_STORE = "no-store";

function parseLimit(raw: string | null): number {
  const value = raw === null ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : SEARCH_DEFAULT_LIMIT;
}

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const q = params.get("q") ?? "";
  if (normalizeQuery(q).length < SEARCH_QUERY_MIN_LENGTH) {
    return Response.json({ hits: [] }, { status: 400, headers: { "Cache-Control": NO_STORE } });
  }

  try {
    const { hits } = await searchSite({ q, limit: parseLimit(params.get("limit")) });
    return Response.json({ hits }, { headers: { "Cache-Control": PUBLIC_CACHE } });
  } catch (error) {
    console.error("site-search: query failed", error);
    return Response.json({ hits: [] }, { headers: { "Cache-Control": NO_STORE } });
  }
}
