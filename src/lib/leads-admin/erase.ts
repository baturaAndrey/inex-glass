import { access } from "node:fs/promises";
import path from "node:path";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";
import { getEnv } from "@/lib/env";
import type { Env } from "@/lib/env";
import { maxDeleteMessage } from "@/lib/max/client";
import { ERASE_CONFIRM_WORD } from "@/payload/admin/leads/constants";
import { consentEmailHash, consentPhoneHash } from "@/payload/utils/normalize";
import type { Payload, PayloadRequest, Where } from "payload";

/**
 * Personal-data erasure of one lead on the data subject's request (152-ФЗ, ТЗ §6.1).
 *
 * Inside one DB transaction:
 *  1. a lead with an order is refused (409): the data serves the contract (policy, п. 3);
 *  2. the consent journal is anonymized (IP, User-Agent, link to the lead) — the record stays as
 *     proof of the consent (versions, time). Found by the lead link, by `leads.consent`, and
 *     orphaned records (lead already gone) by the contact HMACs `phoneHash` / `emailHash`;
 *  3. all versions of the lead are deleted (otherwise the PII survives in `_leads_v`);
 *  4. links `duplicateOf → lead` of other leads are cleared (no hooks, no new versions);
 *  5. the lead is deleted;
 *  6. its attachments (`lead-files`, Payload removes the files from `UPLOADS_DIR`) are deleted;
 *  7. its MAX notification journal (`notification-log`) is deleted; the message ids are kept
 *     (outside production only those of the `MAX_INTERCEPT_CHAT_ID` chat).
 * After the commit (best effort, outside the transaction so a failure cannot abort it): pending
 * jobs carrying the lead id are removed, the disk is checked for leftovers and the MAX messages
 * (they quote the phone) are deleted from the chats.
 *
 * Nothing personal is logged: only ids and counters.
 */

export const ERASE_CONTEXT = {
  disableRevalidate: true,
  skipAssigneeNotify: true,
  skipOrderHooks: true,
  skipStatusEmail: true,
  skipMaxNotify: true,
} as const;

export const ORDER_EXISTS_MESSAGE =
  "По заявке есть заказ: данные хранятся для исполнения договора (политика, п. 3)";

export type EraseResult =
  | {
      ok: true;
      deleted: {
        versions: number;
        files: number;
        consentAnonymized: number;
        /** Rows of `notification-log` deleted with the lead. */
        notifications: number;
      };
    }
  | { ok: false; status: 404 | 409; error: string };

export interface EraseActor {
  id: string | number;
}

/** `{ "confirm": "УДАЛИТЬ" }` — the explicit confirmation typed by the admin. */
export function isEraseConfirmed(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as { confirm?: unknown }).confirm === ERASE_CONFIRM_WORD
  );
}

/** `Origin` of the request equals the site origin (`SITE_URL`). Missing → not allowed. */
export function isSameOrigin(originHeader: string | null, siteUrl: string): boolean {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

const idOf = (value: unknown): string | null => {
  const raw = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  if (typeof raw === "string" && raw !== "") return raw;
  if (typeof raw === "number") return String(raw);
  return null;
};

/** Unique attachment ids: the lead's `files` plus files that point back to the lead. */
export function collectFileIds(files: unknown, linked: readonly unknown[]): string[] {
  const ids = new Set<string>();
  for (const value of [...(Array.isArray(files) ? files : []), ...linked]) {
    const id = idOf(value);
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Consent records of the lead: linked to it, referenced by it, or orphaned records (lead already
 * deleted) with the same contact hash. Records of OTHER existing leads are never touched: their
 * consent still covers those leads.
 */
export function consentRecordsWhere(args: {
  leadId: string;
  consentId: string | null;
  phoneHash: string | null;
  emailHash: string | null;
}): Where {
  const or: Where[] = [{ lead: { equals: args.leadId } }];
  if (args.consentId) or.push({ id: { equals: args.consentId } });
  const hashes: Where[] = [];
  if (args.phoneHash) hashes.push({ phoneHash: { equals: args.phoneHash } });
  if (args.emailHash) hashes.push({ emailHash: { equals: args.emailHash } });
  if (hashes.length > 0) or.push({ and: [{ lead: { exists: false } }, { or: hashes }] });
  return { or };
}

type MaxDeletionEnv = Pick<Env, "SITE_ENV" | "MAX_INTERCEPT_CHAT_ID">;

/**
 * Unique non-empty MAX message ids of journal rows (what to delete in the chats).
 *
 * Outside production (`SITE_ENV !== "production"`) only rows whose `chatId` equals
 * `MAX_INTERCEPT_CHAT_ID` qualify: the bot is shared with another live site, and a staging or
 * dev database (e.g. a copy of prod) may hold journal rows of real chats; a test stand must never
 * touch messages outside its own intercept chat. Without an intercept chat nothing qualifies.
 */
export function collectMaxMessageIds(
  rows: readonly { messageId?: unknown; chatId?: unknown }[],
  env: MaxDeletionEnv
): string[] {
  const interceptChatId = env.SITE_ENV === "production" ? null : (env.MAX_INTERCEPT_CHAT_ID ?? "");
  const ids = new Set<string>();
  for (const row of rows) {
    if (interceptChatId !== null) {
      const chatId = typeof row.chatId === "string" ? row.chatId.trim() : "";
      if (interceptChatId === "" || chatId !== interceptChatId) continue;
    }
    const id = row.messageId;
    if (typeof id === "string" && id.trim() !== "") ids.add(id.trim());
  }
  return [...ids];
}

/** Pending (not completed, not running) jobs whose input carries the lead id. */
export function pendingJobsWhere(leadId: string): Where {
  return {
    and: [
      { "input.leadId": { equals: leadId } },
      { completedAt: { exists: false } },
      { processing: { equals: false } },
    ],
  };
}

/** What the transaction leaves for the after-commit cleanup. */
interface ErasedLeftovers {
  fileNames: string[];
  maxMessageIds: string[];
}

type LeadForErase = {
  id: string;
  phone?: string | null;
  email?: string | null;
  consent?: unknown;
  files?: unknown;
};

async function runInTransaction(
  req: PayloadRequest,
  work: () => Promise<EraseResult>
): Promise<EraseResult> {
  const shouldCommit = await initTransaction(req);
  try {
    const result = await work();
    if (!shouldCommit) return result;
    if (result.ok) await commitTransaction(req);
    else await killTransaction(req);
    return result;
  } catch (error) {
    if (shouldCommit) await killTransaction(req);
    throw error;
  }
}

async function eraseInTransaction(
  req: PayloadRequest,
  leadId: string,
  stored: ErasedLeftovers
): Promise<EraseResult> {
  const { payload } = req;
  const lead = (await payload.findByID({
    collection: "leads",
    id: leadId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })) as LeadForErase | null;
  if (!lead) return { ok: false, status: 404, error: "Заявка не найдена" };

  const orders = await payload.count({
    collection: "orders",
    where: { lead: { equals: leadId } },
    overrideAccess: true,
    req,
  });
  if (orders.totalDocs > 0) return { ok: false, status: 409, error: ORDER_EXISTS_MESSAGE };

  const linkedFiles = await payload.find({
    collection: "lead-files",
    where: { lead: { equals: leadId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { filename: true },
    req,
  });
  const fileIds = collectFileIds(lead.files, linkedFiles.docs);

  const consent = await payload.update({
    collection: "consent-log",
    where: consentRecordsWhere({
      leadId,
      consentId: idOf(lead.consent),
      phoneHash: consentPhoneHash(lead.phone ?? null),
      emailHash: consentEmailHash(lead.email ?? null),
    }),
    data: { ip: null, userAgent: null, lead: null, anonymizedAt: new Date().toISOString() },
    depth: 0,
    overrideAccess: true,
    context: ERASE_CONTEXT,
    req,
  });
  if (consent.errors.length > 0) throw new Error("consent-log anonymization failed");

  const versionsWhere: Where = { parent: { equals: leadId } };
  const { totalDocs: versions } = await payload.countVersions({
    collection: "leads",
    where: versionsWhere,
    overrideAccess: true,
    req,
  });
  await payload.db.deleteVersions({ collection: "leads", where: versionsWhere, req });

  await payload.db.updateMany({
    collection: "leads",
    where: { duplicateOf: { equals: leadId } },
    data: { duplicateOf: null },
    returning: false,
    req,
  });

  // MAX notifications: remember the message ids (deleted in the chats after the commit), then
  // drop the journal rows together with the lead.
  const notificationWhere: Where = { lead: { equals: leadId } };
  const journal = await payload.find({
    collection: "notification-log",
    where: notificationWhere,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { messageId: true, chatId: true },
    req,
  });
  stored.maxMessageIds = collectMaxMessageIds(journal.docs, getEnv());
  let notifications = 0;
  if (journal.docs.length > 0) {
    const removed = await payload.delete({
      collection: "notification-log",
      where: notificationWhere,
      depth: 0,
      overrideAccess: true,
      context: ERASE_CONTEXT,
      req,
    });
    if (removed.errors.length > 0) throw new Error("notification-log deletion failed");
    notifications = removed.docs.length;
  }

  await payload.delete({
    collection: "leads",
    id: leadId,
    overrideAccess: true,
    context: ERASE_CONTEXT,
    req,
  });

  // Bulk delete by ids: dangling ids simply match nothing (a by-id delete would throw NotFound,
  // and a failed nested operation kills the surrounding transaction).
  let files = 0;
  if (fileIds.length > 0) {
    const deleted = await payload.delete({
      collection: "lead-files",
      where: { id: { in: fileIds } },
      depth: 0,
      overrideAccess: true,
      context: ERASE_CONTEXT,
      req,
    });
    if (deleted.errors.length > 0) throw new Error("lead-files deletion failed");
    for (const doc of deleted.docs) {
      files += 1;
      if (typeof doc.filename === "string" && doc.filename !== "")
        stored.fileNames.push(doc.filename);
    }
  }

  return {
    ok: true,
    deleted: { versions, files, consentAnonymized: consent.docs.length, notifications },
  };
}

/** Best effort after the commit: queued jobs with the lead id (their input is only ids). */
async function removePendingJobs(payload: Payload, leadId: string): Promise<number> {
  try {
    const result = await payload.delete({
      collection: "payload-jobs",
      where: pendingJobsWhere(leadId),
      overrideAccess: true,
      depth: 0,
    });
    return result.docs.length;
  } catch (error) {
    payload.logger.warn({
      event: "lead-erase-jobs-skipped",
      leadId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return 0;
  }
}

/**
 * Best effort after the commit: deletes the lead's MAX messages one by one. Old messages may be
 * beyond what the platform lets a bot delete; such failures only show up in the counters.
 *
 * Gated on the bot token only, NOT on `MAX_ENABLED`: deleting is not sending. The ids are of
 * messages this site already sent (their journal rows are gone after the commit), so with MAX
 * switched off later the messages — with the client's phone — would stay in the chats and the
 * ids would be lost for good. Without a token nothing can be deleted: only the count is logged.
 * Exported for unit tests.
 */
export async function deleteMaxMessages(
  payload: Payload,
  leadId: string,
  messageIds: readonly string[]
): Promise<void> {
  if (messageIds.length === 0) return;
  if (!getEnv().MAX_BOT_TOKEN) {
    payload.logger.warn({ event: "lead-erase-max-skipped", leadId, count: messageIds.length });
    return;
  }
  let deleted = 0;
  let failed = 0;
  for (const id of messageIds) {
    try {
      await maxDeleteMessage(id);
      deleted += 1;
    } catch {
      // The error may quote the API answer: only the counter is kept.
      failed += 1;
    }
  }
  const log = { event: "lead-erase-max-messages", leadId, deleted, failed };
  if (failed > 0) payload.logger.warn(log);
  else payload.logger.info(log);
}

/** Files Payload should have unlinked; any that are still on disk are reported (names only). */
async function findLeftoverFiles(fileNames: readonly string[]): Promise<number> {
  const root = path.resolve(getEnv().UPLOADS_DIR, "leads");
  let leftovers = 0;
  for (const name of fileNames) {
    const filePath = path.resolve(root, name);
    if (!filePath.startsWith(root + path.sep)) continue;
    const exists = await access(filePath).then(
      () => true,
      () => false
    );
    if (exists) leftovers += 1;
  }
  return leftovers;
}

export async function eraseLeadPersonalData(
  payload: Payload,
  leadId: string,
  actor: EraseActor
): Promise<EraseResult> {
  const req = await createLocalReq({ context: { ...ERASE_CONTEXT } }, payload);
  const stored: ErasedLeftovers = { fileNames: [], maxMessageIds: [] };

  const result = await runInTransaction(req, () => eraseInTransaction(req, leadId, stored));
  if (!result.ok) return result;

  const jobs = await removePendingJobs(payload, leadId);
  await deleteMaxMessages(payload, leadId, stored.maxMessageIds);
  const leftovers = await findLeftoverFiles(stored.fileNames);
  if (leftovers > 0) {
    payload.logger.warn({ event: "lead-erase-files-left", leadId, leftovers });
  }

  payload.logger.info({
    event: "lead-erased",
    actor: String(actor.id),
    leadId,
    versions: result.deleted.versions,
    files: result.deleted.files,
    consentAnonymized: result.deleted.consentAnonymized,
    notifications: result.deleted.notifications,
    jobs,
  });
  return result;
}
