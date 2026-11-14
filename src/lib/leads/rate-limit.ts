import { createHash } from "node:crypto";
import { sql } from "@payloadcms/db-postgres/drizzle";
import { getPayload } from "payload";
import config from "@payload-config";
import type { Payload } from "payload";

/**
 * Fixed-window rate limits in Postgres (task 17), table `rate_limits` of the hidden
 * `rate-limits` collection (`key` unique, `count`, `window_start`).
 *
 * One atomic `INSERT … ON CONFLICT (key) DO UPDATE` per check: concurrent requests of every app
 * container increment the same row, no read-modify-write race. An expired window restarts at 1.
 * Old rows are removed by the `cleanup-rate-limits` job (task 18).
 *
 * Keys never contain personal data in clear text: phones and e-mails are SHA-256 hashed.
 */

const TEN_MINUTES_SEC = 10 * 60;

export const RATE_LIMITS = {
  /** Lead creation: per IP, per phone, per e-mail. */
  lead: { limit: 5, windowSec: TEN_MINUTES_SEC },
  upload: { limit: 20, windowSec: TEN_MINUTES_SEC },
  formToken: { limit: 60, windowSec: TEN_MINUTES_SEC },
} as const;

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window ends (0 when allowed). */
  retryAfterSec: number;
}

/** Hex SHA-256 of a normalized contact for a rate-limit key. */
export const hashKeyPart = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

export const rateLimitKeys = {
  leadIp: (ip: string) => `lead:ip:${ip}`,
  /** `digits` — the phone's digits only (`79001234567`). */
  leadPhone: (digits: string) => `lead:phone:${hashKeyPart(digits)}`,
  /** `email` — trimmed, lower case. */
  leadEmail: (email: string) => `lead:email:${hashKeyPart(email)}`,
  uploadIp: (ip: string) => `upload:ip:${ip}`,
  tokenIp: (ip: string) => `token:ip:${ip}`,
};

type CounterRow = { count: string | number; window_start: string | Date };

/** Increments the counter of `key` and reports whether the request fits into the limit. */
export async function rateLimit(
  { key, limit, windowSec }: RateLimitOptions,
  payloadInstance?: Payload
): Promise<RateLimitResult> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const result = await payload.db.drizzle.execute(sql`
    INSERT INTO rate_limits (id, key, count, window_start, created_at, updated_at)
    VALUES (gen_random_uuid(), ${key}, 1, now(), now(), now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1
        ELSE rate_limits.count + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now()
        ELSE rate_limits.window_start
      END,
      updated_at = now()
    RETURNING count, window_start`);

  const row = (result as unknown as { rows: CounterRow[] }).rows[0];
  if (!row) throw new Error("rate_limits upsert returned no row");

  // `count` is a Postgres numeric: node-postgres returns it as a string.
  const count = Number(row.count);
  const windowEndsAt = new Date(row.window_start).getTime() + windowSec * 1000;
  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((windowEndsAt - Date.now()) / 1000)),
  };
}

/**
 * Reads the counter of `key` WITHOUT incrementing it and reports whether one more counted
 * attempt would still fit into the limit (`count < limit`; a missing row or an expired window
 * counts as 0). Pair it with `rateLimit()` on the counted outcome only: a check that must not
 * even be attempted once the bucket is full (e.g. a secret comparison) peeks first, so at most
 * `limit` counted attempts happen per window. Read-only, so it never writes a row.
 */
export async function peekRateLimit(
  { key, limit, windowSec }: RateLimitOptions,
  payloadInstance?: Payload
): Promise<RateLimitResult> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const result = await payload.db.drizzle.execute(sql`
    SELECT count, window_start FROM rate_limits
    WHERE key = ${key}
      AND window_start >= now() - make_interval(secs => ${windowSec})
    LIMIT 1`);

  const row = (result as unknown as { rows: CounterRow[] }).rows[0];
  if (!row) return { allowed: true, remaining: limit, retryAfterSec: 0 };

  const count = Number(row.count);
  const windowEndsAt = new Date(row.window_start).getTime() + windowSec * 1000;
  const allowed = count < limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((windowEndsAt - Date.now()) / 1000)),
  };
}
