import { jsonError, NO_STORE_HEADERS, requireAdmin, requireStaff } from "@/lib/leads-admin/auth";
import { unlinkGroup, unlinkUser } from "@/lib/max/link-service";
import { isUuid, readMutationBody, readTarget } from "@/lib/max/route-helpers";

/**
 * `POST /api/max/unlink/` — removes a MAX binding (task 06). No message is sent to MAX.
 *
 * - `{ "target": "user" }` or `{ "target": "user", "userId": <own id> }` (admin or manager):
 *   the caller's own binding; another `userId` — admin only (a manager gets 403).
 * - `{ "target": "group" }` (admin): the group chat binding and any pending group code.
 *
 * Same-origin JSON only (403/415), 409 when MAX is not configured. Answers `{ ok: true }`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = await readMutationBody(request);
    if (!input.ok) return input.response;
    const target = readTarget(input.body);
    if (!target) return jsonError(400, 'Ожидается { target: "user" | "group" }');

    if (target === "group") {
      const auth = await requireAdmin(request);
      if (!auth.ok) return auth.response;
      await unlinkGroup(auth.payload);
      return Response.json({ ok: true }, { headers: NO_STORE_HEADERS });
    }

    const auth = await requireStaff(request);
    if (!auth.ok) return auth.response;
    const requested = (input.body as { userId?: unknown }).userId;
    const ownId = String(auth.user.id);
    let userId = ownId;
    if (requested !== undefined && requested !== null && requested !== ownId) {
      if (auth.role !== "admin") return jsonError(403, "Недостаточно прав");
      if (!isUuid(requested)) return jsonError(400, "Некорректный userId");
      userId = requested;
    }

    const exists = await auth.payload.count({
      collection: "users",
      where: { id: { equals: userId } },
      overrideAccess: true,
    });
    if (exists.totalDocs === 0) return jsonError(404, "Пользователь не найден");

    await unlinkUser(auth.payload, userId);
    return Response.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("[max/unlink] failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось отключить MAX");
  }
}
