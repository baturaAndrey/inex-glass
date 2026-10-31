import { after } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getPayload } from "payload";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/leads/client-ip";
import { peekRateLimit, rateLimit } from "@/lib/leads/rate-limit";
import { NO_STORE_HEADERS } from "@/lib/leads-admin/auth";
import { parseMaxJson, parseMaxUpdate } from "@/lib/max/updates";
import { handleMaxUpdate } from "@/lib/max/webhook-handler";
import config from "@payload-config";
import type { Payload } from "payload";

/**
 * `POST /api/max/webhook/` — MAX Bot API webhook (task 06). The trailing slash is part of the
 * subscribed URL: without it Next answers 308 and MAX does not repeat a POST after a redirect.
 *
 * - No `MAX_WEBHOOK_SECRET` → 404 (integration off).
 * - Per-IP failed-secret counter: it is READ (not incremented) before the secret comparison; a
 *   client IP that already has 120 failed attempts in the current minute gets 429 at once,
 *   without the secret being compared, so at most 120 guesses per IP and minute are evaluated.
 * - Wrong `X-Max-Bot-Api-Secret` (constant-time comparison) → the counter is incremented → 401
 *   (429 if that attempt overflowed the limit). Only failures are counted: the bot is shared
 *   with another live site, so every `message_created` of its chats reaches this URL from the
 *   same MAX addresses; counting authenticated traffic would let a busy period of the other
 *   site 429 our own `bot_started` (a lost link). Valid-secret requests never write a counter
 *   row and are blocked only while their IP already has a full failure bucket.
 * - Body over 64 KB → 413; invalid JSON → 400.
 * - Otherwise 200 `{ ok: true }` at once, also for update types the site ignores; processing
 *   runs in `after()` and its errors never change the answer (MAX must not retry).
 * - Neither the body nor the headers are logged: only `{ event, type, result }`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
/** Failed-secret attempts per client IP (authenticated requests are not counted, see above). */
const WEBHOOK_FAILED_SECRET_LIMIT = { limit: 120, windowSec: 60 } as const;

/** Compare via fixed-length SHA-256 digests so timing leaks neither length nor content. */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

const reject = (status: number, headers: Record<string, string> = {}) =>
  Response.json({ ok: false }, { status, headers: { ...NO_STORE_HEADERS, ...headers } });

function logResult(payload: Payload, type: string, result: string): void {
  payload.logger.info({ event: "max-webhook", type, result });
}

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!env.MAX_WEBHOOK_SECRET) return new Response(null, { status: 404 });

  const payload = await getPayload({ config });

  // Only failures count; the key names that, so no old all-traffic counter is reused.
  const failedSecretLimit = {
    key: `max:webhook:bad-secret:ip:${getClientIp(request.headers)}`,
    ...WEBHOOK_FAILED_SECRET_LIMIT,
  };
  // Peek first: once the bucket is full no secret is compared at all (no oracle for guesses).
  const peek = await peekRateLimit(failedSecretLimit, payload);
  if (!peek.allowed) return reject(429, { "Retry-After": String(peek.retryAfterSec) });

  if (!safeEqual(request.headers.get("x-max-bot-api-secret") ?? "", env.MAX_WEBHOOK_SECRET)) {
    const limit = await rateLimit(failedSecretLimit, payload);
    if (!limit.allowed) return reject(429, { "Retry-After": String(limit.retryAfterSec) });
    return reject(401);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return reject(413);
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return reject(413);

  let json: unknown;
  try {
    json = parseMaxJson(text);
  } catch {
    return reject(400);
  }

  const update = parseMaxUpdate(json);
  if (update) {
    after(() =>
      handleMaxUpdate({ payload, update, now: new Date() })
        .then((result) => logResult(payload, update.type, result))
        .catch((error: unknown) =>
          logResult(
            payload,
            update.type,
            `failed:${error instanceof Error ? error.name : "unknown"}`
          )
        )
    );
  } else {
    const rawType = (json as { update_type?: unknown } | null)?.update_type;
    // Only the type name of an ignored update, and only when it looks like one.
    logResult(
      payload,
      typeof rawType === "string" && /^[a-z_]{1,40}$/.test(rawType) ? rawType : "unknown",
      "ignored"
    );
  }

  return Response.json({ ok: true }, { status: 200, headers: NO_STORE_HEADERS });
}
