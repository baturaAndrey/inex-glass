"use client";

import { useEffect, useState } from "react";
import { normalizeRu } from "@/lib/search/normalize";
import {
  isSearchKind,
  SEARCH_API_PATH,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_QUERY_MIN_LENGTH,
  SEARCH_SUGGEST_LIMIT,
  type SearchHit,
} from "@/lib/search/types";
import { SuggestCache } from "./suggest-cache";

/** Debounce of the suggestion requests (ТЗ: 200 ms). */
export const SUGGEST_DEBOUNCE_MS = 200;

/** Successful answers kept per field (LRU); plenty for one typing session. */
export const SUGGEST_CACHE_LIMIT = 50;

export type SuggestStatus = "idle" | "loading" | "ready" | "error";

export interface SuggestionsState {
  /** Normalized query the state belongs to (`""` when idle). */
  query: string;
  /** While `loading`: the previous answer (shown until the new one arrives). */
  hits: SearchHit[];
  status: SuggestStatus;
}

const IDLE: SuggestionsState = { query: "", hits: [], status: "idle" };

function isHit(value: unknown): value is SearchHit {
  if (typeof value !== "object" || value === null) return false;
  const hit = value as Partial<SearchHit>;
  return (
    typeof hit.title === "string" &&
    typeof hit.url === "string" &&
    // Same-origin paths only: a suggestion must never navigate off the site.
    hit.url.startsWith("/") &&
    !hit.url.startsWith("//") &&
    isSearchKind(hit.kind)
  );
}

/** Validated hits of a `/api/site-search/` answer (never trust the wire). */
export function parseHits(body: unknown): SearchHit[] {
  const hits = (body as { hits?: unknown } | null)?.hits;
  return Array.isArray(hits) ? hits.filter(isHit).slice(0, SEARCH_SUGGEST_LIMIT) : [];
}

/** Normalized query of the input (cut to 100 characters); `""` when too short to search. */
export function suggestQuery(value: string): string {
  const query = normalizeRu(value.slice(0, SEARCH_QUERY_MAX_LENGTH));
  return query.length >= SEARCH_QUERY_MIN_LENGTH ? query : "";
}

/**
 * Header suggestions: debounced `GET /api/site-search/?q=&limit=6`; an in-flight request is
 * aborted when the input changes. Successful answers are kept per normalized query in a bounded
 * LRU (`SUGGEST_CACHE_LIMIT`) for the lifetime of the component; a failed request is NOT cached:
 * the error is shown for that query, and typing it again retries. Blank or one-letter input →
 * `idle`, no request. The state is derived during render; the effect only talks to the network.
 */
export function useSearchSuggestions(value: string): SuggestionsState {
  const [cache] = useState(() => new SuggestCache<SearchHit[]>(SUGGEST_CACHE_LIMIT));
  const [lastHits, setLastHits] = useState<SearchHit[]>([]);
  // The query whose last request failed (cleared by the next success of any query).
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const query = suggestQuery(value);
  const cached = query ? cache.peek(query) : undefined;
  const answered = cached !== undefined;

  useEffect(() => {
    if (!query) return;
    // Recency is refreshed here, not during render (render only peeks).
    if (cache.touch(query)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      // A retry of a failed query shows «loading» again, not the old error.
      setFailedQuery((failed) => (failed === query ? null : failed));
      try {
        const params = new URLSearchParams({ q: query, limit: String(SEARCH_SUGGEST_LIMIT) });
        const response = await fetch(`${SEARCH_API_PATH}?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const hits = parseHits(await response.json());
        if (controller.signal.aborted) return;
        cache.set(query, hits);
        setLastHits(hits);
        setFailedQuery(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("header search: suggestions failed", error);
        setLastHits([]);
        setFailedQuery(query);
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cache, query, answered]);

  if (!query) return IDLE;
  if (cached) return { query, hits: cached, status: "ready" };
  if (failedQuery === query) return { query, hits: [], status: "error" };
  return { query, hits: lastHits, status: "loading" };
}
