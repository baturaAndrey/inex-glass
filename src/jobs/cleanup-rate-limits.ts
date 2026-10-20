import { CLEANUP_BATCH_LIMIT, MAINTENANCE_QUEUE, MAINTENANCE_RETRIES } from "./shared";
import type { TaskConfig } from "payload";

/**
 * `cleanup-rate-limits` (hourly at :30): deletes anti-spam counters (`rate-limits`, task 17)
 * whose window started more than a day ago — every window is far shorter, so such rows are dead.
 * Idempotent; at most `CLEANUP_BATCH_LIMIT` rows per run (the rest go on the next run).
 */

export const CLEANUP_RATE_LIMITS = "cleanup-rate-limits";

export const RATE_LIMIT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type CleanupRateLimitsOutput = { deleted: number };

export const cleanupRateLimitsTask: TaskConfig<{ input: object; output: CleanupRateLimitsOutput }> =
  {
    slug: CLEANUP_RATE_LIMITS,
    label: "Очистка счётчиков rate-limit",
    outputSchema: [{ name: "deleted", type: "number" }],
    retries: MAINTENANCE_RETRIES,
    schedule: [{ cron: "30 * * * *", queue: MAINTENANCE_QUEUE }],
    handler: async ({ req }) => {
      const { payload } = req;
      const cutoff = new Date(Date.now() - RATE_LIMIT_MAX_AGE_MS).toISOString();
      const { docs } = await payload.find({
        collection: "rate-limits",
        where: { windowStart: { less_than: cutoff } },
        depth: 0,
        limit: CLEANUP_BATCH_LIMIT,
        overrideAccess: true,
        select: { key: true },
        req,
      });
      if (docs.length === 0) return { output: { deleted: 0 } };

      // Direct adapter call: counters have no hooks, versions or uploads to clean up.
      await payload.db.deleteMany({
        collection: "rate-limits",
        where: { id: { in: docs.map((doc) => doc.id) } },
        req,
      });
      payload.logger.info({ msg: "cleanup-rate-limits", deleted: docs.length });
      return { output: { deleted: docs.length } };
    },
  };
