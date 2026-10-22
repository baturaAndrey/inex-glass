import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RateLimitOptions, RateLimitResult } from "@/lib/leads/rate-limit";

/**
 * Order of the webhook checks: the per-IP failed-secret counter is peeked (read-only) before the
 * secret comparison, and only failed attempts increment it. Payload, the limiter and the update
 * handler are mocked (no DB, no MAX API).
 */

const env = vi.hoisted(() => ({ MAX_WEBHOOK_SECRET: "s".repeat(32) as string | undefined }));
vi.mock("@/lib/env", () => ({ getEnv: () => env }));

const fakePayload = vi.hoisted(() => ({ logger: { info: vi.fn() } }));
vi.mock("payload", () => ({ getPayload: vi.fn(async () => fakePayload) }));
vi.mock("@payload-config", () => ({ default: {} }));

const rateLimit = vi.hoisted(() =>
  vi.fn<(options: RateLimitOptions) => Promise<RateLimitResult>>()
);
const peekRateLimit = vi.hoisted(() =>
  vi.fn<(options: RateLimitOptions) => Promise<RateLimitResult>>()
);
vi.mock("@/lib/leads/rate-limit", () => ({ rateLimit, peekRateLimit }));

const handleMaxUpdate = vi.hoisted(() => vi.fn(async () => "ignored"));
vi.mock("@/lib/max/webhook-handler", () => ({ handleMaxUpdate }));

const after = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after }));

const { POST } = await import("./route");

const BODY = JSON.stringify({ update_type: "bot_added", timestamp: 1, chat_id: 1 });
const SECRET = "s".repeat(32);
const ALLOWED: RateLimitResult = { allowed: true, remaining: 1, retryAfterSec: 0 };
const BLOCKED: RateLimitResult = { allowed: false, remaining: 0, retryAfterSec: 30 };

function webhook(secret: string | null): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": "203.0.113.7",
  };
  if (secret !== null) headers["x-max-bot-api-secret"] = secret;
  return new Request("http://localhost/api/max/webhook/", { method: "POST", headers, body: BODY });
}

beforeEach(() => {
  env.MAX_WEBHOOK_SECRET = SECRET;
  rateLimit.mockReset();
  rateLimit.mockResolvedValue(ALLOWED);
  peekRateLimit.mockReset();
  peekRateLimit.mockResolvedValue(ALLOWED);
  after.mockClear();
});

describe("POST /api/max/webhook/", () => {
  it("404 without a configured secret, before anything else", async () => {
    env.MAX_WEBHOOK_SECRET = undefined;
    expect((await POST(webhook(null))).status).toBe(404);
    expect(peekRateLimit).not.toHaveBeenCalled();
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("a valid secret under the limit answers 200 and never increments the counter", async () => {
    const response = await POST(webhook(SECRET));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(peekRateLimit).toHaveBeenCalledTimes(1);
    expect(peekRateLimit.mock.calls[0]?.[0]).toMatchObject({
      key: "max:webhook:bad-secret:ip:203.0.113.7",
      limit: 120,
      windowSec: 60,
    });
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("a wrong or missing secret is counted and answers 401 with a generic body", async () => {
    for (const secret of [null, "wrong-secret-wrong-secret-wrong-secret"]) {
      const response = await POST(webhook(secret));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ ok: false });
    }
    expect(rateLimit).toHaveBeenCalledTimes(2);
    expect(rateLimit.mock.calls[0]?.[0]).toMatchObject({
      key: "max:webhook:bad-secret:ip:203.0.113.7",
      limit: 120,
      windowSec: 60,
    });
  });

  it("the failed attempt that overflows the limit answers 429 with Retry-After", async () => {
    rateLimit.mockResolvedValue(BLOCKED);
    const response = await POST(webhook("nope"));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(await response.json()).toEqual({ ok: false });
  });

  it("an IP over the limit gets 429 before any secret comparison, even with the valid secret", async () => {
    peekRateLimit.mockResolvedValue(BLOCKED);
    for (const secret of [SECRET, "wrong-secret-wrong-secret-wrong-secret", null]) {
      const response = await POST(webhook(secret));
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("30");
      expect(await response.json()).toEqual({ ok: false });
    }
    // Blocked attempts are not counted again and nothing is processed.
    expect(rateLimit).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });
});
