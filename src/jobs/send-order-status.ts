import { createElement } from "react";
import { footerFromContacts } from "@/emails/layout";
import {
  ORDER_EMAIL_DEFAULTS,
  OrderStatusEmail,
  orderStatusLabel,
  orderStatusSubject,
} from "@/emails/order-status";
import { renderEmail } from "@/emails/render";
import { getEnv } from "@/lib/env";
import { sendMail } from "@/lib/mail/send";
import { buildOrderUrl, deriveOrderToken } from "@/lib/orders/access-token";
import { ORDER_STATUSES, toOptions } from "@/payload/collections/crm/constants";
import type { OrderStatus } from "@/payload/collections/crm/constants";
import type { Order, User } from "@/payload-types";
import {
  describeError,
  JOB_WRITE_CONTEXT,
  loadContacts,
  loadSiteSettings,
  MAIL_RETRIES,
  populated,
  uniqueEmails,
} from "./shared";
import type { PayloadRequest, TaskConfig } from "payload";

/**
 * `send-order-status` `{ orderId, status }` — client e-mail on an order status change
 * (ТЗ §6.2). Queued by the order lifecycle hook and the «send again» action (task 33).
 *
 * Not sent (job succeeds, reason in the output): order deleted, link revoked or expired, client
 * notifications off, no client e-mail, the status is not in the history any more. The link is
 * rebuilt from `tokenCreatedAt` via `deriveOrderToken` — the token itself is never stored.
 * The client's own contacts never appear in the e-mail body.
 */

export const SEND_ORDER_STATUS = "send-order-status";

export type SendOrderStatusInput = { orderId: string; status: OrderStatus };
export type SendOrderStatusOutput = { sent: boolean; skipped?: string };

type SkipReason =
  | "order-not-found"
  | "link-revoked"
  | "link-expired"
  | "notifications-off"
  | "no-client-email"
  | "status-not-in-history";

/** Why the e-mail must not be sent, or `null` when it should be. Pure. */
export function orderStatusSkipReason(
  order: Pick<Order, "revoked" | "expiresAt" | "notifyClient" | "clientEmail" | "statusHistory">,
  status: OrderStatus,
  now: Date = new Date()
): SkipReason | null {
  if (order.revoked === true) return "link-revoked";
  if (order.expiresAt && new Date(order.expiresAt).getTime() <= now.getTime())
    return "link-expired";
  if (order.notifyClient === false) return "notifications-off";
  if (uniqueEmails([order.clientEmail]).length === 0) return "no-client-email";
  if (!order.statusHistory.some((entry) => entry.status === status)) return "status-not-in-history";
  return null;
}

export async function sendOrderStatus(
  input: SendOrderStatusInput,
  req: PayloadRequest
): Promise<SendOrderStatusOutput> {
  const { payload } = req;
  const order = await payload.findByID({
    collection: "orders",
    id: input.orderId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
    req,
  });
  const skipped = order ? orderStatusSkipReason(order, input.status) : "order-not-found";
  if (!order || skipped) {
    payload.logger.info({
      msg: "send-order-status: skipped",
      orderId: input.orderId,
      reason: skipped,
    });
    return { sent: false, skipped: skipped ?? "order-not-found" };
  }
  const clientEmail = uniqueEmails([order.clientEmail])[0];
  if (!clientEmail) return { sent: false, skipped: "no-client-email" };
  // Task 33 issues the link right after creating the order; until then retry.
  if (!order.tokenCreatedAt) {
    throw new Error("send-order-status: ссылка на заказ ещё не выпущена (tokenCreatedAt пуст)");
  }

  const { SITE_URL } = getEnv();
  const [settings, contacts] = await Promise.all([loadSiteSettings(req), loadContacts(req)]);
  const footer = footerFromContacts(contacts, SITE_URL);
  const statusSettings = settings?.orderStatuses?.find((row) => row.key === input.status);
  const orderPage = settings?.orderPage;
  const entry = order.statusHistory.find((row) => row.status === input.status);
  const manager = populated<User>(order.manager);
  const managerEmail = uniqueEmails([manager?.email])[0];
  const label = orderStatusLabel(input.status, statusSettings?.label);
  const orderNumber = order.number ?? order.id;

  const { html, text } = await renderEmail(
    createElement(OrderStatusEmail, {
      siteUrl: SITE_URL,
      footer,
      orderNumber,
      status: input.status,
      statusLabel: label,
      date: entry?.date ?? null,
      plannedDate: entry?.plannedDate ?? null,
      carrier: order.shipment?.carrier ?? null,
      waybill: order.shipment?.waybill ?? null,
      clientComment: order.clientComment?.text ?? null,
      statusText: statusSettings?.emailText ?? null,
      orderUrl: buildOrderUrl(deriveOrderToken(order.id, order.tokenCreatedAt), SITE_URL),
      signature: {
        name: manager?.name?.trim() || footer.brandName,
        title: orderPage?.emailSignatureTitle?.trim() || ORDER_EMAIL_DEFAULTS.signatureTitle,
        // Manager's own contacts, else the company's.
        phone: manager?.phone?.trim() || footer.phone,
        email: managerEmail ?? footer.email,
      },
      buttonLabel: orderPage?.emailButton ?? null,
      footerReason: orderPage?.emailFooterNote ?? null,
    })
  );

  const replyTo = managerEmail ?? uniqueEmails([settings?.notifications?.replyTo])[0];
  await sendMail(payload, {
    kind: "order-status",
    to: clientEmail,
    subject: orderStatusSubject(orderPage?.emailSubject, orderNumber, label),
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  try {
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { lastNotifiedStatus: input.status, lastNotifiedAt: new Date().toISOString() },
      overrideAccess: true,
      context: JOB_WRITE_CONTEXT,
      req,
    });
  } catch (error) {
    payload.logger.error({
      error: describeError(error),
      msg: "send-order-status: failed to mark order",
      orderId: order.id,
    });
  }
  return { sent: true };
}

export const sendOrderStatusTask: TaskConfig<{
  input: SendOrderStatusInput;
  output: SendOrderStatusOutput;
}> = {
  slug: SEND_ORDER_STATUS,
  label: "Письмо клиенту о статусе заказа",
  inputSchema: [
    { name: "orderId", type: "text", required: true },
    { name: "status", type: "select", required: true, options: toOptions(ORDER_STATUSES) },
  ],
  outputSchema: [
    { name: "sent", type: "checkbox" },
    { name: "skipped", type: "text" },
  ],
  retries: MAIL_RETRIES,
  handler: async ({ input, req }) => ({ output: await sendOrderStatus(input, req) }),
};
