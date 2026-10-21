import { getPayload } from "payload";
import { getRole } from "@/payload/access";
import type { Role } from "@/payload/access";
import config from "@payload-config";
import type { Payload, TypedUser } from "payload";

/**
 * Authorization of the leads admin route handlers (`/api/admin/leads/**`).
 *
 * The Payload session (cookie `payload-token` or `Authorization: JWT …`) is resolved with
 * `payload.auth`, which applies Payload's own CSRF rule to cookie auth (the `Origin` must be in
 * `config.csrf`). Anonymous → 401, a user without a staff role → 403.
 */

export const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export type AuthResult =
  { ok: true; payload: Payload; user: TypedUser; role: Role } | { ok: false; response: Response };

export const jsonError = (status: number, error: string): Response =>
  Response.json({ error }, { status, headers: NO_STORE_HEADERS });

async function authorize(request: Request, allowed: readonly Role[]): Promise<AuthResult> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user) return { ok: false, response: jsonError(401, "Требуется вход") };
  const role = getRole(user);
  if (role === null || !allowed.includes(role)) {
    return { ok: false, response: jsonError(403, "Недостаточно прав") };
  }
  return { ok: true, payload, user, role };
}

/** Admin or manager. */
export const requireStaff = (request: Request) => authorize(request, ["admin", "manager"]);

/** Admin only (destructive operations). */
export const requireAdmin = (request: Request) => authorize(request, ["admin"]);
