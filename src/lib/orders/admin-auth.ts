import { getPayloadClient } from "@/lib/cms/payload";
import { getEnv } from "@/lib/env";
import { getRole } from "@/payload/access";
import type { Role } from "@/payload/access";
import type { User } from "@/payload-types";
import type { Payload } from "payload";

/**
 * Auth of the order admin API (`/api/admin/orders/<id>/…`, task 33).
 *
 * Only signed-in staff (`admin` / `manager`; Payload session cookie or `Authorization` header):
 * anonymous → 401, other users → 403. State-changing requests must also come from the site's
 * own origin (`Origin` = origin of `SITE_URL`): the session cookie alone is not enough, which
 * blocks CSRF from other sites. Kept separate from task-32's twin on purpose (no cross-task
 * imports inside one wave).
 */

export const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

export type StaffContext = { payload: Payload; user: User & { role: Role } };

export type StaffResult = { ok: true; staff: StaffContext } | { ok: false; response: Response };

export function jsonError(status: number, message: string): Response {
  return Response.json({ ok: false, message }, { status, headers: NO_STORE_HEADERS });
}

/** `Origin` of the request equals the origin of `SITE_URL`. Missing `Origin` fails. */
export function isSameOrigin(request: Request, siteUrl: string = getEnv().SITE_URL): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

export async function requireStaff(
  request: Request,
  options: { mutation?: boolean } = {}
): Promise<StaffResult> {
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return { ok: false, response: jsonError(401, "Требуется вход") };
  const role = getRole(user);
  if (role === null || user.collection !== "users") {
    return { ok: false, response: jsonError(403, "Недостаточно прав") };
  }
  if (options.mutation && !isSameOrigin(request)) {
    return { ok: false, response: jsonError(403, "Запрос с чужого сайта") };
  }
  return { ok: true, staff: { payload, user: { ...user, role } } };
}
