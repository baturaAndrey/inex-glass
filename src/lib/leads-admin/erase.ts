import { access } from "node:fs/promises";
import path from "node:path";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";
import { getEnv } from "@/lib/env";
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
 *  6. its attachments (`lead-files`, Payload removes the files from `UPLOADS_DIR`) are deleted.
 * After the commit (best effort, outside the transaction so a failure cannot abort it): pending
 * jobs carrying the lead id are removed and the disk is checked for leftovers.
 *
 * Nothing personal is logged: only ids and counters.
 */

export const ERASE_CONTEXT = {
  disableRevalidate: true,
  skipAssigneeNotify: true,
  skipOrderHooks: true,
  skipStatusEmail: true,
} as const;

export const ORDER_EXISTS_MESSAGE =
  "По заявке есть заказ: данные хранятся для исполнения договора (политика, п. 3)";

export type EraseResult =
  | {
      ok: true;
      deleted: { versions: number; files: number; consentAnonymized: number };
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
  stored: { fileNames: string[] }
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

  return { ok: true, deleted: { versions, files, consentAnonymized: consent.docs.length } };
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
  const stored = { fileNames: [] as string[] };

  const result = await runInTransaction(req, () => eraseInTransaction(req, leadId, stored));
  if (!result.ok) return result;

  const jobs = await removePendingJobs(payload, leadId);
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
    jobs,
  });
  return result;
}
