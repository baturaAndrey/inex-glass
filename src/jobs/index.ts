import { getEnv } from "@/lib/env";
import { CLEANUP_RATE_LIMITS, cleanupRateLimitsTask } from "./cleanup-rate-limits";
import { CLEANUP_TMP_UPLOADS, cleanupTmpUploadsTask } from "./cleanup-tmp-uploads";
import { EXPIRE_ORDER_LINKS, expireOrderLinksTask } from "./expire-order-links";
import { INDEXNOW_SUBMIT, indexNowSubmitTask } from "./indexnow";
import { MAX_NOTIFY, maxNotifyTask } from "./max-notify";
import { MAX_UNASSIGNED_REMINDER, maxUnassignedReminderTask } from "./max-unassigned-reminder";
import { NOTIFY_ASSIGNED, notifyAssignedTask } from "./notify-assigned";
import { NOTIFY_NEW_LEAD, notifyNewLeadTask } from "./notify-new-lead";
import { SEND_ORDER_STATUS, sendOrderStatusTask } from "./send-order-status";
import { DEFAULT_QUEUE, MAINTENANCE_QUEUE } from "./shared";
import type { JobsConfig } from "payload";

/**
 * Registry of ALL Payload Jobs tasks of the project (task 18). Task slugs end up in the
 * `payload_jobs` enums, so this list is frozen together with the `add_jobs_queue` and
 * `admin_redesign` migrations: later tasks change only handler bodies (task 36:
 * `src/jobs/indexnow.ts`; admin redesign task 10: `src/jobs/max-*.ts`).
 *
 * Contract (input shapes) used by other tasks:
 * - `notify-new-lead`   `{ leadId }`              — task 17 (lead intake)
 * - `notify-assigned`   `{ leadId, assigneeId }`  — task 32 (leads admin)
 * - `send-order-status` `{ orderId, status }`     — task 33 (orders)
 * - `indexnow-submit`   `{ urls }`                — task 36 (IndexNow plugin)
 * - `max-notify`        `MaxNotifyInput` (`{ event, leadId?, orderId?, assigneeId?,
 *                       statusChangedAt?, previousStatus?, orderStatus? }`) — admin redesign task 10
 * Scheduled (no input): `cleanup-tmp-uploads`, `expire-order-links`, `cleanup-rate-limits`,
 * `max-unassigned-reminder` (every 15 min, admin redesign task 10).
 */

export const JOB_SLUGS = {
  notifyNewLead: NOTIFY_NEW_LEAD,
  notifyAssigned: NOTIFY_ASSIGNED,
  sendOrderStatus: SEND_ORDER_STATUS,
  cleanupTmpUploads: CLEANUP_TMP_UPLOADS,
  expireOrderLinks: EXPIRE_ORDER_LINKS,
  cleanupRateLimits: CLEANUP_RATE_LIMITS,
  indexNowSubmit: INDEXNOW_SUBMIT,
  maxNotify: MAX_NOTIFY,
  maxUnassignedReminder: MAX_UNASSIGNED_REMINDER,
} as const;

export const jobTasks: NonNullable<JobsConfig["tasks"]> = [
  notifyNewLeadTask,
  notifyAssignedTask,
  sendOrderStatusTask,
  cleanupTmpUploadsTask,
  expireOrderLinksTask,
  cleanupRateLimitsTask,
  indexNowSubmitTask,
  maxNotifyTask,
  maxUnassignedReminderTask,
];

/**
 * Runners: both queues are polled every minute. Scheduled housekeeping jobs are queued (by the
 * `maintenance` runner) with `waitUntil` = their next cron time, so they run on time.
 */
export const JOB_AUTORUN = [
  { cron: "* * * * *", limit: 20, queue: DEFAULT_QUEUE },
  { cron: "* * * * *", limit: 10, queue: MAINTENANCE_QUEUE },
] as const;

/**
 * The runner is enabled on exactly one container (`JOBS_ENABLED=true`). Other containers still
 * QUEUE jobs; they neither run nor schedule them.
 */
export const isJobsRunnerEnabled = (): boolean => getEnv().JOBS_ENABLED;

export { DEFAULT_QUEUE, MAINTENANCE_QUEUE };
