import { deriveOrderToken, hashOrderToken } from "@/lib/orders/access-token";
import { applyStatusChange, isOrderStatus } from "@/lib/orders/status";
import type { OrderStatus, StatusHistoryRow } from "@/lib/orders/status";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
  RequestContext,
} from "payload";

/**
 * Lifecycle of `orders` (ТЗ §6.2, task 33):
 * - `syncStatusHistory` (beforeChange, before task-08's `computeOrderState`): when a writer
 *   sets `currentStatus` (Local API: the lead → order hook, scripts) the history gets a row for
 *   that stage, so both fields always agree. Staff cannot write `currentStatus` (system field):
 *   in the admin they edit the history and `computeOrderState` derives the status from it.
 * - `orderLifecycleAfterChange`:
 *   - create → issues the client link (`tokenCreatedAt` + `tokenHash`; the order id is only
 *     known after the insert, hence a second write) and queues the first status e-mail;
 *   - update → queues `send-order-status` whenever `currentStatus` changed.
 *
 * Context flags: `skipOrderHooks` (internal bookkeeping writes: the link write below, jobs)
 * skips everything; `skipStatusEmail` (admin «Статус» panel with the e-mail checkbox off) skips
 * only the e-mail. Type-only `payload` imports keep the module loadable in Vitest.
 */

const SEND_ORDER_STATUS = "send-order-status";

/** Context of the write that stores the link: no recursion into these hooks, no revalidation. */
const LINK_WRITE_CONTEXT = { skipOrderHooks: true, disableRevalidate: true } as const;

type OrderLike = {
  id?: unknown;
  currentStatus?: unknown;
  statusHistory?: unknown;
  clientEmail?: unknown;
  tokenHash?: unknown;
};

const skipAll = (context: RequestContext): boolean => context.skipOrderHooks === true;

const hasEmail = (value: unknown): boolean => typeof value === "string" && value.trim() !== "";

export const syncStatusHistory: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  context,
}) => {
  if (!data || skipAll(context)) return data;
  const status: unknown = data.currentStatus;
  if (!isOrderStatus(status)) return data;
  const previous = (originalDoc as OrderLike | undefined)?.currentStatus;
  if (operation !== "create" && previous === status) return data;

  const incoming: unknown = data.statusHistory;
  const stored = (originalDoc as OrderLike | undefined)?.statusHistory;
  const history = (
    Array.isArray(incoming) ? incoming : Array.isArray(stored) ? stored : []
  ) as Partial<StatusHistoryRow>[];
  // `date`/`plannedDate` undefined: an existing row keeps its dates, a new one is dated today.
  return { ...data, statusHistory: applyStatusChange(history, { status }) };
};

/** Queues the client e-mail; a failing queue never fails the order write. */
async function queueStatusEmail(
  req: PayloadRequest,
  orderId: string,
  status: OrderStatus
): Promise<void> {
  try {
    await req.payload.jobs.queue({
      task: SEND_ORDER_STATUS,
      input: { orderId, status },
      req,
    });
  } catch (error) {
    req.payload.logger.error({
      msg: "orders: failed to queue send-order-status",
      orderId,
      status,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** New link for a just created order. Returns the stored `tokenCreatedAt`. */
async function issueLink(req: PayloadRequest, orderId: string): Promise<string> {
  const tokenCreatedAt = new Date().toISOString();
  const tokenHash = hashOrderToken(deriveOrderToken(orderId, tokenCreatedAt));
  await req.payload.update({
    collection: "orders",
    id: orderId,
    data: { tokenCreatedAt, tokenHash },
    depth: 0,
    overrideAccess: true,
    context: LINK_WRITE_CONTEXT,
    req,
  });
  return tokenCreatedAt;
}

export const orderLifecycleAfterChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (skipAll(context)) return doc;
  const order = doc as OrderLike;
  if (typeof order.id !== "string") return doc;
  const status = isOrderStatus(order.currentStatus) ? order.currentStatus : null;

  if (operation === "create") {
    let result = doc;
    if (!order.tokenHash) {
      // Not caught: an order without a link must not be committed.
      const tokenCreatedAt = await issueLink(req, order.id);
      result = { ...doc, tokenCreatedAt };
    }
    if (status && hasEmail(order.clientEmail)) await queueStatusEmail(req, order.id, status);
    return result;
  }

  const previous = (previousDoc as OrderLike | undefined)?.currentStatus;
  if (
    status &&
    previous !== status &&
    context.skipStatusEmail !== true &&
    hasEmail(order.clientEmail)
  ) {
    await queueStatusEmail(req, order.id, status);
  }
  return doc;
};
