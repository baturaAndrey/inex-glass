import { z } from "zod";
import { jsonError, NO_STORE_HEADERS, requireStaff } from "@/lib/orders/admin-auth";
import { isUuid } from "@/lib/orders/files";
import {
  applyStatusChange,
  maxStatusDateKey,
  ORDER_STATUS_IDS,
  statusIndex,
  toStoredDate,
} from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/orders/status";

/**
 * `POST /api/admin/orders/<id>/status/` — status change from the admin «Статус» panel
 * (task 33).
 *
 * Body: `{ status, date: 'YYYY-MM-DD', plannedDate?: 'YYYY-MM-DD' | '', comment?: string,
 * notify: boolean, confirmRollback?: boolean }`.
 * - `date` ≤ today + 1 year; `plannedDate` (of the next stage) ≥ `date`;
 * - moving to an earlier stage requires `confirmRollback: true` (later stages are dropped);
 * - `comment` (when present) replaces `clientComment` (empty string clears it);
 * - the write is done AS THE USER (`overrideAccess: false`); `notify: false` sets
 *   `context.skipStatusEmail`, so `order-lifecycle` does not queue the e-mail.
 * Staff only, site `Origin` only. Answers `{ ok, currentStatus }`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_COMMENT_LENGTH = 2000;

const dateKey = z.string().regex(DATE_KEY, "Дата в формате ГГГГ-ММ-ДД");

const bodySchema = z.object({
  status: z.enum(ORDER_STATUS_IDS as [OrderStatus, ...OrderStatus[]]),
  date: dateKey,
  plannedDate: z.union([dateKey, z.literal("")]).optional(),
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
  notify: z.boolean(),
  confirmRollback: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** A real calendar date (rejects 2026-02-30). */
function isCalendarDate(key: string): boolean {
  const date = new Date(`${key}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(key);
}

export async function POST(request: Request, { params }: Params): Promise<Response> {
  try {
    const auth = await requireStaff(request, { mutation: true });
    if (!auth.ok) return auth.response;
    const { payload, user } = auth.staff;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? "Неверные данные");
    }
    const body = parsed.data;
    const plannedDate = body.plannedDate || null;

    if (!isCalendarDate(body.date)) return jsonError(400, "Некорректная дата");
    if (body.date > maxStatusDateKey())
      return jsonError(400, "Дата не может быть позже чем через год");
    if (plannedDate && (!isCalendarDate(plannedDate) || plannedDate < body.date)) {
      return jsonError(400, "Плановая дата должна быть не раньше даты статуса");
    }

    const id = (await params).id;
    if (!isUuid(id)) return jsonError(404, "Заказ не найден");
    const order = await payload.findByID({
      collection: "orders",
      id,
      depth: 0,
      overrideAccess: false,
      user,
      disableErrors: true,
    });
    if (!order) return jsonError(404, "Заказ не найден");

    if (statusIndex(body.status) < statusIndex(order.currentStatus) && !body.confirmRollback) {
      return jsonError(409, "Возврат на более ранний статус нужно подтвердить");
    }

    const statusHistory = applyStatusChange(order.statusHistory, {
      status: body.status,
      date: toStoredDate(body.date),
      plannedDate: plannedDate ? toStoredDate(plannedDate) : null,
    });

    const updated = await payload.update({
      collection: "orders",
      id,
      data: {
        statusHistory,
        ...(body.comment !== undefined
          ? {
              clientComment: {
                text: body.comment.trim(),
                updatedAt: new Date().toISOString(),
              },
            }
          : {}),
      },
      depth: 0,
      overrideAccess: false,
      user,
      context: { skipStatusEmail: !body.notify, disableRevalidate: true },
    });

    payload.logger.info({
      msg: "orders: status changed",
      orderId: id,
      userId: user.id,
      status: body.status,
      notify: body.notify,
    });
    return Response.json(
      { ok: true, currentStatus: updated.currentStatus ?? null },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    // Payload validation (e.g. the history rule of the schema) and access errors keep their status.
    const status = (error as { status?: unknown }).status;
    if (status === 400 || status === 403) {
      return jsonError(
        status,
        error instanceof Error ? error.message : "Не удалось сменить статус"
      );
    }
    console.error("[orders/status] failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось сменить статус");
  }
}
