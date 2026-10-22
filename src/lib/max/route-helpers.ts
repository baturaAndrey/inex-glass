import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/leads-admin/auth";
import { isSameOrigin } from "@/lib/leads-admin/erase";
import { isMaxLinkConfigured } from "./config";

/**
 * Request checks shared by the MAX link routes (`/api/max/{link-token,unlink,status}/`).
 * Kept apart from `link-service.ts`, which the webhook handler (and its unit tests) import
 * without the Payload config.
 */

/**
 * CSRF and configuration checks of the mutating MAX routes, before authentication: the `Origin`
 * must be the site (403), the body JSON (415 — a plain HTML form cannot send it) and the
 * integration configured (409). Returns the parsed body or the error response.
 */
export async function readMutationBody(
  request: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  if (!isSameOrigin(request.headers.get("origin"), getEnv().SITE_URL)) {
    return { ok: false, response: jsonError(403, "Запрос с чужого источника") };
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return { ok: false, response: jsonError(415, "Ожидается application/json") };
  }
  if (!isMaxLinkConfigured()) {
    return { ok: false, response: jsonError(409, "MAX не настроен на сервере") };
  }
  const body: unknown = await request.json().catch(() => null);
  return { ok: true, body };
}

export type LinkTarget = "user" | "group";

/** `target` of a `{ "target": "user" | "group" }` body, else `null`. */
export function readTarget(body: unknown): LinkTarget | null {
  if (typeof body !== "object" || body === null) return null;
  const target = (body as { target?: unknown }).target;
  return target === "user" || target === "group" ? target : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

/** Rate limit key of issuing link tokens/codes (10 per 10 minutes per staff user). */
export const linkRateLimit = (userId: string) => ({
  key: `max:link:${userId}`,
  limit: 10,
  windowSec: 600,
});
