import type { Payload } from "payload";

/**
 * Queues the manager notification of a new lead (task 18 runs it).
 *
 * Contract with task 18: task slug `notify-new-lead`, input `{ leadId: string }` — both typed by
 * the jobs registry in `payload-types.ts`. The job is only queued here (a row in `payload_jobs`);
 * the runner works on the container with `JOBS_ENABLED=true`, other containers only queue. A
 * failure to queue never fails the lead: the lead is already committed, the error is logged
 * without personal data and the manager still sees the lead in the admin.
 */

/** Same slug as `NOTIFY_NEW_LEAD` of `@/jobs/notify-new-lead` (not imported: it pulls in mail). */
export const NOTIFY_NEW_LEAD_TASK = "notify-new-lead" as const;

/** Returns `true` when the job was queued. Never throws. */
export async function enqueueNotifyNewLead(payload: Payload, leadId: string): Promise<boolean> {
  try {
    await payload.jobs.queue({ task: NOTIFY_NEW_LEAD_TASK, input: { leadId } });
    return true;
  } catch (error) {
    payload.logger.error(
      // The job input is only the lead id, so the error message carries no personal data.
      { leadId, error: error instanceof Error ? error.message.slice(0, 300) : "unknown" },
      `[leads] failed to queue "${NOTIFY_NEW_LEAD_TASK}"`
    );
    return false;
  }
}
