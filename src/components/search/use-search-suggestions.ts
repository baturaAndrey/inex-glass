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

/** Debounce of the suggestion requests (ТЗ: 200 ms). */
export const SUGGEST_DEBOUNCE_MS = 200;

export type SuggestStatus = "idle" | "loading" | "ready" | "error";

export interface SuggestionsState {
  /** Normalized query the state belongs to (`""` when idle). */
  query: string;
  /** While `loading`: the previous answer (shown until the new one arrives). */
  hits: SearchHit[];
  status: SuggestStatus;
}

type Answer = { hits: SearchHit[]; status: "ready" | "error" };

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
 * aborted when the input changes; answers are kept per normalized query for the lifetime of the
 * component. Blank or one-letter input → `idle`, no request. The state is derived from the
 * stored answers during render; the effect only talks to the network.
 */
export function useSearchSuggestions(value: string): SuggestionsState {
  const [answers, setAnswers] = useState<ReadonlyMap<string, Answer>>(() => new Map());
  const [lastHits, setLastHits] = useState<SearchHit[]>([]);
  const query = suggestQuery(value);
  const answer = query ? answers.get(query) : undefined;
  const answered = answer !== undefined;

  useEffect(() => {
    if (!query || answered) return;
    const controller = new AbortController();
    const store = (next: Answer) => {
      setAnswers((previous) => new Map(previous).set(query, next));
      setLastHits(next.hits);
    };
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, limit: String(SEARCH_SUGGEST_LIMIT) });
        const response = await fetch(`${SEARCH_API_PATH}?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        store({ hits: parseHits(await response.json()), status: "ready" });
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("header search: suggestions failed", error);
        store({ hits: [], status: "error" });
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, answered]);

  if (!query) return IDLE;
  if (answer) return { query, ...answer };
  return { query, hits: lastHits, status: "loading" };
}
