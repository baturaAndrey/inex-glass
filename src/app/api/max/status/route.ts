import { jsonError, NO_STORE_HEADERS, requireStaff } from "@/lib/leads-admin/auth";
import { getMaxStatus } from "@/lib/max/link-service";
import { isUuid } from "@/lib/max/route-helpers";

/**
 * `GET /api/max/status/?userId=<id>` — MAX link status for the admin UI (task 06).
 *
 * Admin or manager. Without `userId` (or with the own id) — the caller; another user — admin
 * only (403). The group status is included for admins only. Reads the Local API with
 * `overrideAccess` (the `pending` flags need the never-readable token fields) and returns only
 * the public view: no hashes, no MAX user id.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await requireStaff(request);
    if (!auth.ok) return auth.response;

    const requested = new URL(request.url).searchParams.get("userId");
    const ownId = String(auth.user.id);
    let userId = ownId;
    if (requested && requested !== ownId) {
      if (auth.role !== "admin") return jsonError(403, "Недостаточно прав");
      if (!isUuid(requested)) return jsonError(400, "Некорректный userId");
      userId = requested;
    }

    const { docs } = await auth.payload.find({
      collection: "users",
      where: { id: { equals: userId } },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    });
    const user = docs[0];
    if (!user) return jsonError(404, "Пользователь не найден");

    const status = await getMaxStatus(auth.payload, user, {
      includeGroup: auth.role === "admin",
      now: new Date(),
    });
    return Response.json(status, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[max/status] failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось получить статус MAX");
  }
}
