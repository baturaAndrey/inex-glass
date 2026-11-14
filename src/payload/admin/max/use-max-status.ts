"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MaxStatus } from "@/lib/max/link-service";

/**
 * MAX link status for the admin UI (task 06): `GET /api/max/status/?userId=…`, a manual
 * `refresh()` and a `poll()` that re-reads the status until a condition holds or time runs out
 * (the link itself happens in the webhook, outside this page). Polling stops on unmount.
 */

export type { MaxStatus };

interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  until: (status: MaxStatus) => boolean;
}

export interface UseMaxStatus {
  status: MaxStatus | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<MaxStatus | null>;
  /** Resolves with the status that met `until`, or `null` on timeout / unmount / `stopPolling`. */
  poll: (options: PollOptions) => Promise<MaxStatus | null>;
  stopPolling: () => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Yekaterinburg",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** `22.10.2026` in the company time zone; `null` for a missing/invalid date. */
export function formatMaxDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date);
}

const statusUrl = (userId: string | null | undefined) =>
  userId ? `/api/max/status/?userId=${encodeURIComponent(userId)}` : "/api/max/status/";

/** POST to a MAX route; returns the JSON body or throws with the server's message. */
export async function postMaxJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Не удалось выполнить запрос");
  }
  return data;
}

/** Status of `userId` (own when empty), or the error to show. Never throws. */
async function fetchMaxStatus(userId: string | null | undefined): Promise<MaxStatus | Error> {
  const failure = "Не удалось получить статус MAX";
  try {
    const response = await fetch(statusUrl(userId), {
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
      (MaxStatus & { error?: string }) | null;
    if (!response.ok || !data) return new Error(data?.error ?? failure);
    return data;
  } catch {
    return new Error(failure);
  }
}

export function useMaxStatus(userId: string | null | undefined, enabled = true): UseMaxStatus {
  const [status, setStatus] = useState<MaxStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  /** Incremented to cancel the running poll (new poll, stopPolling, unmount). */
  const pollGeneration = useRef(0);
  const mounted = useRef(true);

  /** Applies a fetch result to the state; ignored after unmount. */
  const apply = useCallback((result: MaxStatus | Error): MaxStatus | null => {
    if (!mounted.current) return result instanceof Error ? null : result;
    if (result instanceof Error) {
      setError(result.message);
    } else {
      setStatus(result);
      setError(null);
    }
    setLoading(false);
    return result instanceof Error ? null : result;
  }, []);

  const refresh = useCallback(
    async (): Promise<MaxStatus | null> => apply(await fetchMaxStatus(userId)),
    [apply, userId]
  );

  const stopPolling = useCallback(() => {
    pollGeneration.current += 1;
  }, []);

  const poll = useCallback(
    async ({ intervalMs, timeoutMs, until }: PollOptions): Promise<MaxStatus | null> => {
      pollGeneration.current += 1;
      const generation = pollGeneration.current;
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        if (!mounted.current || generation !== pollGeneration.current) return null;
        const next = await refresh();
        if (next && until(next)) return next;
      }
      return null;
    },
    [refresh]
  );

  useEffect(() => {
    mounted.current = true;
    // setState happens in the promise callback, after the effect has returned.
    if (enabled) void fetchMaxStatus(userId).then(apply);
    return () => {
      mounted.current = false;
      pollGeneration.current += 1;
    };
  }, [apply, enabled, userId]);

  return { status, error, loading, refresh, poll, stopPolling };
}
