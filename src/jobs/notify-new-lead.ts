import { createElement } from "react";
import { buildLeadEmailData } from "@/emails/format-answers";
import { NewLeadEmail, newLeadSubject } from "@/emails/new-lead";
import { renderEmail } from "@/emails/render";
import { getEnv } from "@/lib/env";
import { sendMail } from "@/lib/mail/send";
import type { Lead, User } from "@/payload-types";
import {
  describeError,
  JOB_WRITE_CONTEXT,
  loadFooter,
  loadSiteSettings,
  MAIL_RETRIES,
  populated,
  uniqueEmails,
} from "./shared";
import type { PayloadRequest, TaskConfig } from "payload";

/**
 * `notify-new-lead` `{ leadId }` — queued by lead intake (task 17, `src/lib/leads/enqueue.ts`).
 *
 * Recipients: the assignee when the lead already has one, otherwise the shared mailboxes of
 * `site-settings → Уведомления` plus staff users with «Получать письма о новых заявках». No
 * recipients is a configuration error: the job throws, is retried and stays visible in the admin.
 */

export const NOTIFY_NEW_LEAD = "notify-new-lead";

export type NotifyNewLeadInput = { leadId: string };
export type NotifyNewLeadOutput = { sentTo: string[]; skipped?: string };

export const NO_RECIPIENTS_MESSAGE =
  "notify-new-lead: нет получателей — добавьте e-mail в «Настройки сайта → Уведомления и заказы» " +
  "или назначьте ответственного";

async function subscribedStaffEmails(req: PayloadRequest): Promise<string[]> {
  const { docs } = await req.payload.find({
    collection: "users",
    where: { notifyNewLeads: { equals: true } },
    depth: 0,
    limit: 100,
    overrideAccess: true,
    select: { email: true },
    req,
  });
  return docs.map((user) => user.email);
}

/** Assignee's address, else the shared list + subscribed staff. */
export async function resolveNewLeadRecipients(lead: Lead, req: PayloadRequest): Promise<string[]> {
  const assignee = populated<User>(lead.assignee);
  const assigneeEmail = uniqueEmails([assignee?.email]);
  if (assigneeEmail.length > 0) return assigneeEmail;

  const settings = await loadSiteSettings(req);
  const shared = (settings?.notifications?.leadNotifyEmails ?? []).map((row) => row.email);
  return uniqueEmails([...shared, ...(await subscribedStaffEmails(req))]);
}

export async function notifyNewLead(
  input: NotifyNewLeadInput,
  req: PayloadRequest
): Promise<NotifyNewLeadOutput> {
  const { payload } = req;
  const lead = await payload.findByID({
    collection: "leads",
    id: input.leadId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
    req,
  });
  // Deleted meanwhile (e.g. personal-data erasure): nothing to notify, do not retry.
  if (!lead) {
    payload.logger.warn({ msg: "notify-new-lead: lead not found", leadId: input.leadId });
    return { sentTo: [], skipped: "lead-not-found" };
  }
  // Idempotency: a retry after a crash between "sent" and the bookkeeping write below (or a
  // duplicate job) must not mail the team twice.
  if (lead.newLeadNotifiedAt) {
    payload.logger.info({ msg: "notify-new-lead: already notified, skipped", leadId: lead.id });
    return { sentTo: [], skipped: "already-notified" };
  }

  const recipients = await resolveNewLeadRecipients(lead, req);
  if (recipients.length === 0) throw new Error(NO_RECIPIENTS_MESSAGE);

  const { SITE_URL } = getEnv();
  const data = buildLeadEmailData(lead, SITE_URL);
  const footer = await loadFooter(req, SITE_URL);
  const { html, text } = await renderEmail(
    createElement(NewLeadEmail, { siteUrl: SITE_URL, footer, lead: data })
  );
  const { sentTo } = await sendMail(payload, {
    kind: "new-lead",
    to: recipients,
    subject: newLeadSubject(data),
    html,
    text,
  });

  // Bookkeeping only: a failure here must not trigger a retry (the mail is already sent).
  try {
    await payload.update({
      collection: "leads",
      id: lead.id,
      data: { newLeadNotifiedAt: new Date().toISOString() },
      overrideAccess: true,
      context: JOB_WRITE_CONTEXT,
      req,
    });
  } catch (error) {
    payload.logger.error({
      error: describeError(error),
      msg: "notify-new-lead: failed to mark lead",
      leadId: lead.id,
    });
  }
  return { sentTo };
}

export const notifyNewLeadTask: TaskConfig<{
  input: NotifyNewLeadInput;
  output: NotifyNewLeadOutput;
}> = {
  slug: NOTIFY_NEW_LEAD,
  label: "Письмо о новой заявке",
  inputSchema: [{ name: "leadId", type: "text", required: true }],
  outputSchema: [
    { name: "sentTo", type: "text", hasMany: true },
    { name: "skipped", type: "text" },
  ],
  retries: MAIL_RETRIES,
  handler: async ({ input, req }) => ({ output: await notifyNewLead(input, req) }),
};
