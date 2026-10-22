import type { MaxNotifyInput } from "@/jobs/max-notify";
import { getEnv } from "@/lib/env";
import { relationId } from "@/payload/hooks/lead-hooks";
import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

/**
 * `leads.afterChange`: queues `max-notify` jobs (task 10) — the MAX messenger counterpart of
 * the e-mail hooks.
 *
 * - create → `new_lead` (+ `assigned` when the lead is created with an assignee);
 * - update: assignee changed to someone → `assigned`; status changed → `status_change` with
 *   `statusChangedAt` (the job's idempotency key) and `previousStatus` («из → в»);
 * - nothing is queued when MAX is off (`MAX_ENABLED`) or for service writes
 *   (`context.skipMaxNotify`: jobs, erasure); `skipAssigneeNotify` also silences `assigned`;
 * - jobs are queued in the save transaction (`req`): a rolled-back save leaves no job; a queueing
 *   error is logged (ids only) and never fails the save.
 */

export const MAX_NOTIFY_TASK = "max-notify" as const;

type LeadLike = { id?: unknown; assignee?: unknown; status?: unknown; statusChangedAt?: unknown };

export async function queueMaxNotify(
  req: PayloadRequest,
  input: MaxNotifyInput,
  ids: { leadId?: string | undefined; orderId?: string | undefined }
): Promise<void> {
  try {
    await req.payload.jobs.queue({ task: MAX_NOTIFY_TASK, input, req });
  } catch (error) {
    req.payload.logger.error({
      msg: `[max] failed to queue "${MAX_NOTIFY_TASK}"`,
      event: input.event,
      ...ids,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** Jobs to queue for one lead save (pure, exported for tests). */
export function leadMaxNotifyInputs(args: {
  operation: "create" | "update";
  doc: LeadLike;
  previousDoc: LeadLike | undefined;
  skipAssignee: boolean;
}): MaxNotifyInput[] {
  const leadId = relationId(args.doc);
  if (!leadId) return [];
  const inputs: MaxNotifyInput[] = [];
  const assigneeId = relationId(args.doc.assignee);

  if (args.operation === "create") {
    inputs.push({ event: "new_lead", leadId });
    if (assigneeId && !args.skipAssignee) inputs.push({ event: "assigned", leadId, assigneeId });
    return inputs;
  }

  const previousAssignee = relationId(args.previousDoc?.assignee);
  if (assigneeId && assigneeId !== previousAssignee && !args.skipAssignee) {
    inputs.push({ event: "assigned", leadId, assigneeId });
  }

  const statusId = relationId(args.doc.status);
  const previousStatus = relationId(args.previousDoc?.status);
  const changedAt = args.doc.statusChangedAt;
  if (statusId && statusId !== previousStatus && typeof changedAt === "string" && changedAt) {
    inputs.push({
      event: "status_change",
      leadId,
      statusChangedAt: changedAt,
      ...(previousStatus ? { previousStatus } : {}),
    });
  }
  return inputs;
}

export const leadMaxNotify: CollectionAfterChangeHook = async ({
  context,
  doc,
  operation,
  previousDoc,
  req,
}) => {
  if (context?.skipMaxNotify === true || !getEnv().MAX_ENABLED) return doc;

  const inputs = leadMaxNotifyInputs({
    operation,
    doc: doc as LeadLike,
    previousDoc: previousDoc as LeadLike | undefined,
    skipAssignee: context?.skipAssigneeNotify === true,
  });
  for (const input of inputs) await queueMaxNotify(req, input, { leadId: input.leadId });
  return doc;
};
