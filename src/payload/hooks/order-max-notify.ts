import { getEnv } from "@/lib/env";
import { isOrderStatus } from "@/lib/orders/status";
import { queueMaxNotify } from "@/payload/hooks/lead-max-notify";
import type { CollectionAfterChangeHook } from "payload";

/**
 * `orders.afterChange`: queues `max-notify` `{ event: 'order_event', orderId, orderStatus }`
 * (task 10) when an order is created with a stage or its `currentStatus` changes.
 *
 * Skipped for bookkeeping writes (`skipOrderHooks`, `skipMaxNotify`) and when MAX is off. The
 * schema has no «client opened the link / confirmed receipt» events, so «Получено» arrives only
 * as a stage change. Queued in the save transaction; a queueing error never fails the save.
 */

type OrderLike = { id?: unknown; currentStatus?: unknown };

export const orderMaxNotify: CollectionAfterChangeHook = async ({
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (context?.skipOrderHooks === true || context?.skipMaxNotify === true) return doc;
  if (!getEnv().MAX_ENABLED) return doc;

  const order = doc as OrderLike;
  if (typeof order.id !== "string" || !isOrderStatus(order.currentStatus)) return doc;
  if (
    operation === "update" &&
    (previousDoc as OrderLike | undefined)?.currentStatus === order.currentStatus
  ) {
    return doc;
  }

  await queueMaxNotify(
    req,
    { event: "order_event", orderId: order.id, orderStatus: order.currentStatus },
    { orderId: order.id }
  );
  return doc;
};
