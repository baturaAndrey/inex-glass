import { getPayload } from "payload";
import { issueFormToken } from "@/lib/leads/antispam";
import { getClientIp } from "@/lib/leads/client-ip";
import { RATE_LIMITS, rateLimit, rateLimitKeys } from "@/lib/leads/rate-limit";
import { jsonOk, jsonSubmitError } from "@/lib/leads/responses";
import config from "@payload-config";
import type { Payload } from "payload";

/**
 * `POST /api/form-token/` (trailing slash!) → `{ ok: true, token }`.
 *
 * Issues the signed issue-time token every public form sends as `formToken` (lead) and
 * `X-Form-Token` (upload). Forms request it on mount and again after `expired` / `too_fast`.
 * Limited to 60 tokens per 10 minutes per IP.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let payload: Payload | null = null;
  try {
    payload = await getPayload({ config });
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(
      { key: rateLimitKeys.tokenIp(ip), ...RATE_LIMITS.formToken },
      payload
    );
    if (!limit.allowed) {
      return jsonSubmitError("rate", payload, { retryAfterSec: limit.retryAfterSec });
    }
    return jsonOk({ token: issueFormToken() });
  } catch (error) {
    console.error("[form-token] failed:", error instanceof Error ? error.name : "unknown");
    return jsonSubmitError("server", payload);
  }
}
