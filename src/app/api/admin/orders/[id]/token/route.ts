import { z } from "zod";
import { buildOrderUrl, deriveOrderToken, hashOrderToken } from "@/lib/orders/access-token";
import { jsonError, NO_STORE_HEADERS, requireStaff } from "@/lib/orders/admin-auth";
import type { StaffContext } from "@/lib/orders/admin-auth";
import { isUuid } from "@/lib/orders/files";
import { isOrderLinkActive } from "@/lib/orders/public-view";
import { isOrderStatus } from "@/lib/orders/status";
import type { Order } from "@/payload-types";

/**
 * Client link of an order (task 33, admin «Управление» → «Ссылка»).
 *
 * `GET  /api/admin/orders/<id>/token/` → `{ ok, url, revoked, active }` — the URL is derived on
 *   the server on request (`buildOrderUrl(deriveOrderToken(id, tokenCreatedAt))`) and never
 *   stored or logged.
 * `POST /api/admin/orders/<id>/token/` `{ action }` → `{ ok, url?, revoked? }`:
 *   - `reissue`: new `tokenCreatedAt` → new token and hash, `revoked = false`; the old link dies;
 *   - `revoke` / `restore`: toggles `revoked`;
 *   - `resend`: queues `send-order-status` for the current status again.
 * Staff only; POST also requires the site's own `Origin`. Logs user id + action, never tokens.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["reissue", "revoke", "restore", "resend"] as const;
const bodySchema = z.object({ action: z.enum(ACTIONS) });

/** Internal writes of this route: system fields, no status e-mail, no revalidation. */
const LINK_WRITE_CONTEXT = { skipOrderHooks: true, disableRevalidate: true } as const;

type LinkFields = Pick<
  Order,
  "id" | "tokenCreatedAt" | "tokenReissueCount" | "revoked" | "expiresAt" | "currentStatus"
> &
  Pick<Order, "clientEmail" | "notifyClient">;

type Params = { params: Promise<{ id: string }> };

async function loadOrder(staff: StaffContext, id: string): Promise<LinkFields | null> {
  if (!isUuid(id)) return null;
  // Read as the user: access control of `orders` decides what staff may open.
  const order = await staff.payload.findByID({
    collection: "orders",
    id,
    depth: 0,
    overrideAccess: false,
    user: staff.user,
    disableErrors: true,
  });
  return order ?? null;
}

function linkOf(order: Pick<LinkFields, "id" | "tokenCreatedAt">): string | null {
  return order.tokenCreatedAt
    ? buildOrderUrl(deriveOrderToken(order.id, order.tokenCreatedAt))
    : null;
}

const ok = (body: Record<string, unknown>) =>
  Response.json({ ok: true, ...body }, { headers: NO_STORE_HEADERS });

export async function GET(request: Request, { params }: Params): Promise<Response> {
  try {
    const auth = await requireStaff(request);
    if (!auth.ok) return auth.response;
    const order = await loadOrder(auth.staff, (await params).id);
    if (!order) return jsonError(404, "Заказ не найден");
    return ok({
      url: linkOf(order),
      revoked: order.revoked === true,
      active: isOrderLinkActive(order, new Date()),
    });
  } catch (error) {
    console.error("[orders/token] GET failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось получить ссылку");
  }
}

async function writeLink(
  staff: StaffContext,
  id: string,
  data: Partial<Pick<Order, "tokenCreatedAt" | "tokenHash" | "tokenReissueCount" | "revoked">>
): Promise<LinkFields> {
  // System fields (`tokenHash`, `tokenCreatedAt`) are closed for every API user: the write goes
  // through `overrideAccess` after the staff check above.
  return staff.payload.update({
    collection: "orders",
    id,
    data,
    depth: 0,
    overrideAccess: true,
    context: LINK_WRITE_CONTEXT,
  });
}

export async function POST(request: Request, { params }: Params): Promise<Response> {
  try {
    const auth = await requireStaff(request, { mutation: true });
    if (!auth.ok) return auth.response;
    const { staff } = auth;

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError(400, "Неизвестное действие");
    const { action } = parsed.data;

    const id = (await params).id;
    const order = await loadOrder(staff, id);
    if (!order) return jsonError(404, "Заказ не найден");

    staff.payload.logger.info({
      msg: "orders: link action",
      action,
      orderId: id,
      userId: staff.user.id,
    });

    switch (action) {
      case "reissue": {
        const tokenCreatedAt = new Date().toISOString();
        const updated = await writeLink(staff, id, {
          tokenCreatedAt,
          tokenHash: hashOrderToken(deriveOrderToken(id, tokenCreatedAt)),
          tokenReissueCount: (order.tokenReissueCount ?? 0) + 1,
          revoked: false,
        });
        return ok({ url: linkOf(updated), revoked: false });
      }
      case "revoke":
      case "restore": {
        const revoked = action === "revoke";
        const updated = await writeLink(staff, id, { revoked });
        return ok({ url: linkOf(updated), revoked });
      }
      case "resend": {
        if (!isOrderStatus(order.currentStatus)) return jsonError(409, "У заказа нет статуса");
        if (!order.clientEmail?.trim()) return jsonError(409, "Нет e-mail клиента");
        if (order.notifyClient === false) return jsonError(409, "Уведомления клиенту выключены");
        await staff.payload.jobs.queue({
          task: "send-order-status",
          input: { orderId: id, status: order.currentStatus },
        });
        return ok({ revoked: order.revoked === true });
      }
    }
  } catch (error) {
    console.error("[orders/token] POST failed:", error instanceof Error ? error.name : "unknown");
    return jsonError(500, "Не удалось выполнить действие");
  }
}
