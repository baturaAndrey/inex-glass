import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/leads/rate-limit";
import { jsonError, NO_STORE_HEADERS, requireAdmin, requireStaff } from "@/lib/leads-admin/auth";
import { maxDeepLink } from "@/lib/max/config";
import { issueGroupLinkCode, issueUserLinkToken } from "@/lib/max/link-service";
import { linkRateLimit, readMutationBody, readTarget } from "@/lib/max/route-helpers";

/**
 * `POST /api/max/link-token/` — one-time MAX link secret (task 06).
 *
 * - `{ "target": "user" }` (admin or manager): a deep-link token for the CALLER only — the body
 *   cannot name another user. Answers `{ url, expiresAt }`.
 * - `{ "target": "group" }` (admin): a group code. Answers `{ code, expiresAt, botName }`.
 *
 * Same-origin JSON only (403/415), 409 when MAX is not configured, 10 secrets per 10 minutes
 * per user (429). Only the SHA-256 of a secret is stored; the value is returned once.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await readMutationBody(request);
    if (!input.ok) return input.response;
    const target = readTarget(input.body);
    if (!target) return jsonError(400, 'Ожидается { target: "user" | "group" }');

    const auth = target === "group" ? await requireAdmin(request) : await requireStaff(request);
    if (!auth.ok) return auth.response;
    const { payload, user } = auth;

    const limit = await rateLimit(linkRateLimit(String(user.id)), payload);
    if (!limit.allowed) {
      return Response.json(
        { error: "Слишком много запросов, попробуйте позже" },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, "Retry-After": String(limit.retryAfterSec) },
        }
      );
    }

    const now = new Date();
    if (target === "user") {
      const { token, expiresAt } = await issueUserLinkToken(payload, String(user.id), now);
      return Response.json({ url: maxDeepLink(token), expiresAt }, { headers: NO_STORE_HEADERS });
    }

    const { code, expiresAt } = await issueGroupLinkCode(payload, now);
    return Response.json(
      { code, expiresAt, botName: getEnv().MAX_BOT_NAME ?? null },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[max/link-token] failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось выпустить ссылку");
  }
}
