import {
  CLEANUP_BATCH_LIMIT,
  JOB_WRITE_CONTEXT,
  MAINTENANCE_QUEUE,
  MAINTENANCE_RETRIES,
} from "./shared";
import type { TaskConfig, Where } from "payload";

/**
 * `expire-order-links` (hourly at :15): marks orders whose client link has expired
 * (`expiresAt < now`, i.e. the TTL after «Получено» passed) as `revoked: true`. The order page
 * (task 33) also checks `expiresAt` itself; this job makes the state explicit in the admin.
 * Idempotent: already revoked orders are not touched.
 */

export const EXPIRE_ORDER_LINKS = "expire-order-links";

export type ExpireOrderLinksOutput = { expired: number };

/** Orders with an expired, not yet revoked link. `revoked` may be NULL on old rows. */
export const expiredLinksWhere = (now: Date): Where => ({
  and: [
    { expiresAt: { less_than: now.toISOString() } },
    { or: [{ revoked: { equals: false } }, { revoked: { exists: false } }] },
  ],
});

export const expireOrderLinksTask: TaskConfig<{ input: object; output: ExpireOrderLinksOutput }> = {
  slug: EXPIRE_ORDER_LINKS,
  label: "Истечение ссылок заказов",
  outputSchema: [{ name: "expired", type: "number" }],
  retries: MAINTENANCE_RETRIES,
  schedule: [{ cron: "15 * * * *", queue: MAINTENANCE_QUEUE }],
  handler: async ({ req }) => {
    const { payload } = req;
    const { docs } = await payload.find({
      collection: "orders",
      where: expiredLinksWhere(new Date()),
      depth: 0,
      limit: CLEANUP_BATCH_LIMIT,
      overrideAccess: true,
      select: { revoked: true },
      req,
    });
    if (docs.length === 0) return { output: { expired: 0 } };

    const { docs: updated, errors } = await payload.update({
      collection: "orders",
      where: { id: { in: docs.map((doc) => doc.id) } },
      data: { revoked: true },
      depth: 0,
      overrideAccess: true,
      context: JOB_WRITE_CONTEXT,
      req,
    });
    if (errors.length > 0) {
      payload.logger.error({
        msg: "expire-order-links: some orders failed",
        failed: errors.length,
      });
    }
    payload.logger.info({ msg: "expire-order-links", expired: updated.length });
    return { output: { expired: updated.length } };
  },
};
