import { after } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getPayload } from "payload";
import { getEnv } from "@/lib/env";
import { getClientIp } from "@/lib/leads/client-ip";
import { rateLimit } from "@/lib/leads/rate-limit";
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
 * - Rate limit per client IP (120 / min) → 429; wrong `X-Max-Bot-Api-Secret` → 401
 *   (constant-time comparison); body over 64 KB → 413; invalid JSON → 400.
 * - Otherwise 200 `{ ok: true }` at once, also for update types the site ignores; processing
 *   runs in `after()` and its errors never change the answer (MAX must not retry).
 * - Neither the body nor the headers are logged: only `{ event, type, result }`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const WEBHOOK_RATE_LIMIT = { limit: 120, windowSec: 60 } as const;

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
  const limit = await rateLimit(
    { key: `max:webhook:ip:${getClientIp(request.headers)}`, ...WEBHOOK_RATE_LIMIT },
    payload
  );
  if (!limit.allowed) return reject(429, { "Retry-After": String(limit.retryAfterSec) });

  if (!safeEqual(request.headers.get("x-max-bot-api-secret") ?? "", env.MAX_WEBHOOK_SECRET)) {
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
