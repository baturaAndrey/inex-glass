import { createElement } from "react";
import { buildLeadEmailData } from "@/emails/format-answers";
import { LeadAssignedEmail, leadAssignedSubject } from "@/emails/lead-assigned";
import { renderEmail } from "@/emails/render";
import { getEnv } from "@/lib/env";
import { sendMail } from "@/lib/mail/send";
import {
  describeError,
  JOB_WRITE_CONTEXT,
  loadFooter,
  MAIL_RETRIES,
  relationId,
  uniqueEmails,
} from "./shared";
import type { PayloadRequest, TaskConfig } from "payload";

/**
 * `notify-assigned` `{ leadId, assigneeId }` — queued by the leads admin (task 32) when the
 * responsible person changes. A staff user without an e-mail address is an error (retries).
 * If the lead was reassigned again before the job ran, only the current assignee is notified
 * (by its own job), so this one is skipped.
 */

export const NOTIFY_ASSIGNED = "notify-assigned";

export type NotifyAssignedInput = { leadId: string; assigneeId: string };
export type NotifyAssignedOutput = { sentTo: string[]; skipped?: string };

export async function notifyAssigned(
  input: NotifyAssignedInput,
  req: PayloadRequest
): Promise<NotifyAssignedOutput> {
  const { payload } = req;
  const lead = await payload.findByID({
    collection: "leads",
    id: input.leadId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
    req,
  });
  if (!lead) {
    payload.logger.warn({ msg: "notify-assigned: lead not found", leadId: input.leadId });
    return { sentTo: [], skipped: "lead-not-found" };
  }
  if (relationId(lead.assignee) !== input.assigneeId) {
    payload.logger.info({ msg: "notify-assigned: assignee changed, skipped", leadId: lead.id });
    return { sentTo: [], skipped: "assignee-changed" };
  }

  const assignee = await payload.findByID({
    collection: "users",
    id: input.assigneeId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  });
  const [email] = uniqueEmails([assignee?.email]);
  if (!assignee || !email) {
    throw new Error("notify-assigned: у ответственного нет e-mail — письмо не отправлено");
  }

  const { SITE_URL } = getEnv();
  const data = buildLeadEmailData(lead, SITE_URL);
  const footer = await loadFooter(req, SITE_URL);
  const { html, text } = await renderEmail(
    createElement(LeadAssignedEmail, {
      siteUrl: SITE_URL,
      footer,
      lead: data,
      assigneeName: assignee.name,
    })
  );
  const { sentTo } = await sendMail(payload, {
    kind: "lead-assigned",
    to: email,
    subject: leadAssignedSubject(data),
    html,
    text,
  });

  try {
    await payload.update({
      collection: "leads",
      id: lead.id,
      data: { assigneeNotifiedAt: new Date().toISOString() },
      overrideAccess: true,
      context: JOB_WRITE_CONTEXT,
      req,
    });
  } catch (error) {
    payload.logger.error({
      error: describeError(error),
      msg: "notify-assigned: failed to mark lead",
      leadId: lead.id,
    });
  }
  return { sentTo };
}

export const notifyAssignedTask: TaskConfig<{
  input: NotifyAssignedInput;
  output: NotifyAssignedOutput;
}> = {
  slug: NOTIFY_ASSIGNED,
  label: "Письмо ответственному о назначении",
  inputSchema: [
    { name: "leadId", type: "text", required: true },
    { name: "assigneeId", type: "text", required: true },
  ],
  outputSchema: [
    { name: "sentTo", type: "text", hasMany: true },
    { name: "skipped", type: "text" },
  ],
  retries: MAIL_RETRIES,
  handler: async ({ input, req }) => ({ output: await notifyAssigned(input, req) }),
};
