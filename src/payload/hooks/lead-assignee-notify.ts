import { relationId } from "@/payload/hooks/lead-hooks";
import type { CollectionAfterChangeHook } from "payload";

/**
 * `leads.afterChange`: when the responsible person changes to someone, queue the e-mail job
 * `notify-assigned` `{ leadId, assigneeId }` (task 18 sends it).
 *
 * - exactly one job per change: re-saving with the same assignee queues nothing;
 * - clearing the assignee or a public lead without one queues nothing;
 * - writes with `context.skipAssigneeNotify` (jobs, erasure, imports) are ignored;
 * - the job is queued in the same transaction (`req`), so a rolled-back save leaves no job;
 *   a queueing error is logged without personal data and never fails the save.
 *
 * The «new lead» e-mail is `notify-new-lead` (tasks 17/18) and is not duplicated here.
 */

export const NOTIFY_ASSIGNED_TASK = "notify-assigned" as const;

export const notifyAssigneeChange: CollectionAfterChangeHook = async ({
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (context?.skipAssigneeNotify) return doc;

  const assigneeId = relationId((doc as { assignee?: unknown }).assignee);
  if (!assigneeId) return doc;
  const previousId =
    operation === "create"
      ? null
      : relationId((previousDoc as { assignee?: unknown } | undefined)?.assignee);
  if (assigneeId === previousId) return doc;

  const leadId = relationId(doc);
  if (!leadId) return doc;

  try {
    await req.payload.jobs.queue({
      task: NOTIFY_ASSIGNED_TASK,
      input: { leadId, assigneeId },
      req,
    });
  } catch (error) {
    req.payload.logger.error({
      msg: `[leads] failed to queue "${NOTIFY_ASSIGNED_TASK}"`,
      leadId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
  return doc;
};
