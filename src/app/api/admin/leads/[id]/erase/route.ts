import { getEnv } from "@/lib/env";
import { jsonError, NO_STORE_HEADERS, requireAdmin } from "@/lib/leads-admin/auth";
import { eraseLeadPersonalData, isEraseConfirmed, isSameOrigin } from "@/lib/leads-admin/erase";
import { ERASE_CONFIRM_WORD } from "@/payload/admin/leads/constants";

/**
 * `POST /api/admin/leads/<id>/erase/` — deletes a lead's personal data on the data subject's
 * request (152-ФЗ): the lead, its versions and files; the consent journal is anonymized.
 *
 * Admin only (401/403). CSRF defence on top of Payload's cookie rule: the `Origin` must be the
 * site origin (403) and the body must be JSON `{ "confirm": "УДАЛИТЬ" }` (415/400 — a plain
 * HTML form cannot send `application/json`). Answers `{ ok: true, deleted }`, 404 for an
 * unknown lead, 409 when the lead has an order.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    if (!isSameOrigin(request.headers.get("origin"), getEnv().SITE_URL)) {
      return jsonError(403, "Запрос с чужого источника");
    }
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return jsonError(415, "Ожидается application/json");
    }
    const body: unknown = await request.json().catch(() => null);
    if (!isEraseConfirmed(body)) {
      return jsonError(400, `Подтвердите удаление словом «${ERASE_CONFIRM_WORD}»`);
    }

    const { id } = await params;
    if (!UUID.test(id)) return jsonError(404, "Заявка не найдена");

    const result = await eraseLeadPersonalData(auth.payload, id, auth.user);
    if (!result.ok) return jsonError(result.status, result.error);
    return Response.json(
      { ok: true, deleted: result.deleted },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[leads/erase] failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось удалить данные");
  }
}
