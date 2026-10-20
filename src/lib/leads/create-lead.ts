import { open, stat } from "node:fs/promises";
import path from "node:path";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";
import { getHolidays, getTechLimits, getWorkdays } from "@/lib/cms/globals";
import {
  computeQuizFlags,
  DEFAULT_STALE_AFTER_DAYS,
  DEFAULT_TECH_LIMITS,
  MAX_UPLOAD_TOKENS,
} from "@/lib/domain";
import type { FormType, LeadSubmit, LeadSubmitOf, QuizContext, QuizFlag } from "@/lib/domain";
import { getEnv } from "@/lib/env";
import {
  SIGNATURE_HEAD_LENGTH,
  SIGNATURE_TAIL_LENGTH,
  validateFile,
} from "@/lib/uploads/signature";
import type { FileKind } from "@/lib/uploads/signature";
import {
  readUploadSidecar,
  removeQuietly,
  tmpUploadPath,
  uploadSidecarPath,
} from "@/lib/uploads/stream";
import type { UploadSidecar } from "@/lib/uploads/stream";
import { verifyUploadToken } from "@/lib/uploads/tokens";
import type { UploadPurpose, VerifiedUploadToken } from "@/lib/uploads/tokens";
import type { Lead } from "@/payload-types";
import { createConsentRecord, linkConsentToLead, MAX_USER_AGENT_LENGTH } from "./consent";
import { FORMAT_MESSAGE_FORM, FORMAT_MESSAGE_QUIZ } from "./responses";
import type { Payload, PayloadRequest, RequiredDataFromCollectionSlug } from "payload";

/**
 * Lead creation of the public forms (task 17): attached files → `lead-files`, the consent record
 * → `consent-log`, the lead → `leads`, all in ONE database transaction through the Local API
 * (`overrideAccess: true`). Either everything is stored or nothing is: on any error the
 * transaction is rolled back and the files already copied into `${UPLOADS_DIR}/leads` are
 * deleted, so no orphaned data remains. Temp uploads are deleted only after the commit.
 *
 * Status and duplicate marking are NOT set here — the `leads` hooks of task 8 do it
 * (`assignDefaultStatus` → «Новая», `detectDuplicate`).
 */

/** Shown at the file field when an upload token is forged, expired or its file is gone. */
export const FILE_REUPLOAD_MESSAGE = "Не удалось прикрепить файл. Загрузите его ещё раз";

/** Client-correctable problem with the submission (→ 400 `validation` with `fields`). */
export class LeadIntakeError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super("Lead submission rejected");
    this.name = "LeadIntakeError";
  }
}

export interface LeadRequestMeta {
  ip: string;
  userAgent: string;
  /** Same-origin page the form was sent from (path + query), from `Referer`. */
  pageUrl?: string | null;
  /** Phone exactly as typed, kept in `leads.phoneRaw`. */
  phoneRaw?: string | null;
}

const leadFilesDir = (): string => path.resolve(getEnv().UPLOADS_DIR, "leads");

/** JPG/PNG sketches are allowed only in the quiz; every other form takes drawings only. */
const purposeFor = (formType: FormType): UploadPurpose => (formType === "quiz" ? "quiz" : "form");

const formatMessage = (purpose: UploadPurpose): string =>
  purpose === "quiz" ? FORMAT_MESSAGE_QUIZ : FORMAT_MESSAGE_FORM;

/** Errors Payload throws when it refuses the file content itself (type, PDF structure, image). */
const FILE_REJECTION_ERRORS: ReadonlySet<string> = new Set([
  "ValidationError",
  "FileUploadError",
  "MissingFile",
]);

// ---------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------

interface ResolvedFile {
  meta: VerifiedUploadToken;
  /** Display name and hash written by `/api/upload/`. */
  sidecar: UploadSidecar;
  tmpPath: string;
  kind: FileKind;
  /** Request field the token came from, for error messages. */
  field: string;
}

/** First and last kilobyte of a file (the windows of the content checks). */
async function readEdges(filePath: string, size: number): Promise<{ head: Buffer; tail: Buffer }> {
  const handle = await open(filePath, "r");
  try {
    const head = Buffer.alloc(Math.min(SIGNATURE_HEAD_LENGTH, size));
    await handle.read(head, 0, head.length, 0);
    const tail = Buffer.alloc(Math.min(SIGNATURE_TAIL_LENGTH, size));
    await handle.read(tail, 0, tail.length, size - tail.length);
    return { head, tail };
  } finally {
    await handle.close();
  }
}

async function fileSize(filePath: string): Promise<number | null> {
  try {
    const info = await stat(filePath);
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

/** Upload tokens of the submission with the field path to report errors at. */
function collectUploadTokens(data: LeadSubmit): Array<{ token: string; field: string }> {
  const entries = (data.uploadTokens ?? []).map((token, index) => ({
    token,
    field: `uploadTokens.${index}`,
  }));
  if (data.formType === "quiz" && data.answers.file) {
    entries.push({ token: data.answers.file.uploadToken, field: "answers.file" });
  }
  // The quiz sends the same token in `uploadTokens` and `answers.file`.
  const seen = new Set<string>();
  return entries.filter(({ token }) => !seen.has(token) && seen.add(token));
}

/**
 * Verifies every upload token (signature, expiry), checks that its temp file still exists with
 * the signed size, and re-checks the signature bytes for the purpose of this form.
 */
async function resolveFiles(data: LeadSubmit, now: number): Promise<ResolvedFile[]> {
  const entries = collectUploadTokens(data);
  if (entries.length > MAX_UPLOAD_TOKENS) {
    throw new LeadIntakeError({ uploadTokens: FILE_REUPLOAD_MESSAGE });
  }

  const purpose = purposeFor(data.formType);
  const fields: Record<string, string> = {};
  const files: ResolvedFile[] = [];
  const seenIds = new Set<string>();

  for (const { token, field } of entries) {
    const meta = verifyUploadToken(token, now);
    if (!meta) {
      fields[field] = FILE_REUPLOAD_MESSAGE;
      continue;
    }
    if (seenIds.has(meta.id)) continue;
    seenIds.add(meta.id);

    const tmpPath = tmpUploadPath(meta.id, meta.ext);
    const sidecar = await readUploadSidecar(meta.id);
    if (!sidecar || (await fileSize(tmpPath)) !== meta.size) {
      fields[field] = FILE_REUPLOAD_MESSAGE;
      continue;
    }
    const { head, tail } = await readEdges(tmpPath, meta.size);
    const check = validateFile(meta.ext, head, purpose, tail);
    if (!check.ok) {
      fields[field] = formatMessage(purpose);
      continue;
    }
    files.push({ meta, sidecar, tmpPath, kind: check.kind, field });
  }

  if (Object.keys(fields).length > 0) throw new LeadIntakeError(fields);
  return files;
}

// ---------------------------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------------------------

/**
 * CMS settings the quiz flags depend on: tech limits (`tech-params`, task 15) and the production
 * calendar (`site-settings`). Each part falls back to its default on its own when the CMS read
 * fails — a lead must never be lost because a global could not be read.
 */
export async function loadFlagSettings(
  payload: Payload
): Promise<Pick<QuizContext, "limits" | "holidays" | "workdays">> {
  const [limits, holidays, workdays] = await Promise.allSettled([
    getTechLimits(),
    getHolidays(),
    getWorkdays(),
  ]);
  if ([limits, holidays, workdays].some((result) => result.status === "rejected")) {
    payload.logger.warn("[leads] CMS settings unavailable; quiz flags use defaults");
  }
  return {
    limits: limits.status === "fulfilled" ? limits.value : DEFAULT_TECH_LIMITS,
    holidays: holidays.status === "fulfilled" ? holidays.value : [],
    workdays: workdays.status === "fulfilled" ? workdays.value : [],
  };
}

/**
 * Manager flags of a quiz lead. `computeQuizFlags` uses only the calendar and the tech limits;
 * prices and promo are part of `QuizContext` for the hints/estimate and are not read for flags.
 */
async function quizFlags(
  payload: Payload,
  data: LeadSubmitOf<"quiz">,
  hasFiles: boolean,
  now: Date
): Promise<QuizFlag[]> {
  const ctx: QuizContext = {
    now,
    ...(await loadFlagSettings(payload)),
    prices: { items: [], priceDate: null, staleAfterDays: DEFAULT_STALE_AFTER_DAYS },
    promo: null,
    atSubmit: true,
  };
  const flags = computeQuizFlags(data.answers, ctx);
  // A lead with a verified attachment is never «без файла».
  return hasFiles ? flags.filter((flag) => flag !== "no_file") : flags;
}

// ---------------------------------------------------------------------------------------------
// Lead data
// ---------------------------------------------------------------------------------------------

type LeadData = RequiredDataFromCollectionSlug<"leads">;
type LeadAnswers = Exclude<Lead["answers"], null | undefined>;

const DRAWING_LABEL = "Форма: отправить чертёж";
const FULL_LABEL = "Полная форма";

/** `leads.sourceLabel` by form (ТЗ §6.1). */
export const SOURCE_LABELS: Readonly<Record<FormType, string>> = {
  quiz: "Квиз",
  drawing: DRAWING_LABEL,
  callback: "Заказ звонка",
  sample: "Заказ образца",
  load: "Подбор под нагрузку",
  contacts: "Форма на странице контактов",
  full: FULL_LABEL,
};

/** Fields of the submission that are transport/anti-spam, not answers. */
const META_KEYS: ReadonlySet<string> = new Set([
  "formType",
  "entryPage",
  "utm",
  "metrikaClientId",
  "consent",
  "formToken",
  "company_website",
  "uploadTokens",
]);

const withoutMeta = (data: LeadSubmit): Record<string, unknown> =>
  Object.fromEntries(Object.entries(data).filter(([key]) => !META_KEYS.has(key)));

/** Button/form caption the visitor clicked: `sourceLabel`, else `params.label`. */
function clickedLabel(data: LeadSubmitOf<"drawing"> | LeadSubmitOf<"full">): string | undefined {
  const fromParams = data.params?.label;
  const label = data.sourceLabel ?? (typeof fromParams === "string" ? fromParams.trim() : "");
  return label ? label.slice(0, 200) : undefined;
}

function labelWithContext(base: string, extra: string | undefined): string {
  if (!extra || base.toLowerCase().endsWith(extra.toLowerCase())) return base;
  return `${base} — ${extra}`;
}

/** Lines `Подпись: значение` of the present values, for the manager-facing comment. */
const joinLines = (lines: Array<[string, string | undefined]>): string | undefined => {
  const present = lines.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  return present.length > 0 ? present.join("\n") : undefined;
};

/** Columns that depend on the form type. */
function formColumns(data: LeadSubmit): Omit<LeadData, "formType"> {
  switch (data.formType) {
    case "quiz": {
      const { answers } = data;
      const { contact } = answers;
      // The upload token is a transport detail; keep only what the manager needs to see.
      const storedAnswers = {
        ...answers,
        file: answers.file ? { name: answers.file.name, size: answers.file.size } : undefined,
      };
      return {
        sourceLabel: SOURCE_LABELS.quiz,
        company: contact.company,
        inn: contact.inn ?? null,
        name: contact.name,
        phone: contact.phone,
        email: contact.email ?? null,
        role: contact.role ?? null,
        city: answers.cityOther ?? answers.city ?? null,
        area: answers.area ?? null,
        productType: answers.type,
        comment: contact.comment ?? null,
        answers: storedAnswers as LeadAnswers,
      };
    }
    case "drawing":
    case "full":
      return {
        sourceLabel: labelWithContext(SOURCE_LABELS[data.formType], clickedLabel(data)),
        company: data.company ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        city: data.city ?? null,
        area: data.area ?? null,
        comment: data.comment ?? null,
        answers: withoutMeta(data) as LeadAnswers,
      };
    case "callback":
      return {
        sourceLabel: SOURCE_LABELS.callback,
        name: data.name,
        phone: data.phone,
        answers: withoutMeta(data) as LeadAnswers,
      };
    case "sample":
      return {
        sourceLabel: SOURCE_LABELS.sample,
        company: data.company ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        comment:
          joinLines([
            ["Вид стекла", data.glassKind],
            ["Адрес доставки", data.address],
            ["Комментарий", data.comment],
          ]) ?? null,
        answers: withoutMeta(data) as LeadAnswers,
      };
    case "load":
      return {
        sourceLabel: SOURCE_LABELS.load,
        company: data.company ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        comment:
          joinLines([
            ["Задача", data.description],
            ["Размеры", data.sizes],
            ["Крепление", data.mounting],
          ]) ?? null,
        answers: withoutMeta(data) as LeadAnswers,
      };
    case "contacts":
      return {
        sourceLabel: SOURCE_LABELS.contacts,
        company: data.company ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        comment: data.comment ?? null,
        answers: withoutMeta(data) as LeadAnswers,
      };
  }
}

/** Contacts of the submission (for rate limits and consent hashes). */
export function submissionContacts(data: LeadSubmit): { phone: string; email: string | null } {
  if (data.formType === "quiz") {
    return { phone: data.answers.contact.phone, email: data.answers.contact.email ?? null };
  }
  const email = "email" in data ? (data.email ?? null) : null;
  return { phone: data.phone, email };
}

function buildLeadData(
  data: LeadSubmit,
  extra: { flags: QuizFlag[]; fileIds: string[]; consentId: string; meta: LeadRequestMeta }
): LeadData {
  const utm = data.utm ?? {};
  return {
    formType: data.formType,
    entryPage: data.entryPage || null,
    pageUrl: extra.meta.pageUrl ?? null,
    utm: {
      source: utm.source ?? null,
      medium: utm.medium ?? null,
      campaign: utm.campaign ?? null,
      term: utm.term ?? null,
      content: utm.content ?? null,
    },
    metrikaClientId: data.metrikaClientId || null,
    ...formColumns(data),
    phoneRaw: extra.meta.phoneRaw?.trim().slice(0, 50) || null,
    flags: extra.flags,
    files: extra.fileIds,
    consent: extra.consentId,
  };
}

// ---------------------------------------------------------------------------------------------
// createLead
// ---------------------------------------------------------------------------------------------

/** Creates the `lead-files` documents (Payload copies each temp file into `staticDir`). */
async function storeFiles(
  req: PayloadRequest,
  files: ResolvedFile[],
  source: UploadPurpose,
  storedPaths: string[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const file of files) {
    // Payload keeps the base name (`<uuid>.<ext>`, unique): register it for cleanup up front,
    // so a failure inside `create` after the copy still removes the stored file.
    storedPaths.push(path.join(leadFilesDir(), path.basename(file.tmpPath)));
    const doc = await createLeadFile(req, file, source);
    if (doc.filename) storedPaths.push(path.join(leadFilesDir(), doc.filename));
    ids.push(String(doc.id));
  }
  return ids;
}

/**
 * One `lead-files` document. A refusal of the content by Payload (type detection, PDF structure,
 * undecodable image) becomes a field error for the client instead of a server error — the
 * upload checks mirror Payload's, so this is a safety net only.
 */
async function createLeadFile(req: PayloadRequest, file: ResolvedFile, source: UploadPurpose) {
  try {
    return await req.payload.create({
      collection: "lead-files",
      data: {
        originalName: file.sidecar.originalName,
        kind: file.kind,
        source,
        sha256: file.sidecar.sha256,
        sizeBytes: file.meta.size,
      },
      filePath: file.tmpPath,
      overrideAccess: true,
      depth: 0,
      context: { disableRevalidate: true },
      req,
    });
  } catch (error) {
    if (error instanceof Error && FILE_REJECTION_ERRORS.has(error.name)) {
      throw new LeadIntakeError({ [file.field]: formatMessage(source) });
    }
    throw error;
  } finally {
    // The Local API leaves the file on the shared request; later operations must not see it.
    delete req.file;
  }
}

/**
 * Stores a validated submission. Throws `LeadIntakeError` for client-correctable file problems
 * (→ 400) and rethrows anything else after a full rollback (→ 500).
 */
export async function createLead(
  payload: Payload,
  data: LeadSubmit,
  meta: LeadRequestMeta,
  now: Date = new Date()
): Promise<{ leadId: string }> {
  const files = await resolveFiles(data, now.getTime());
  const flags =
    data.formType === "quiz" ? await quizFlags(payload, data, files.length > 0, now) : [];
  const contacts = submissionContacts(data);

  const req = await createLocalReq({ context: { disableRevalidate: true } }, payload);
  const ownTransaction = await initTransaction(req);
  const storedPaths: string[] = [];
  let leadId: string;

  try {
    const fileIds = await storeFiles(req, files, purposeFor(data.formType), storedPaths);
    const consentId = await createConsentRecord(req, {
      formType: data.formType,
      ip: meta.ip,
      userAgent: meta.userAgent.slice(0, MAX_USER_AGENT_LENGTH),
      pageUrl: meta.pageUrl ?? null,
      phone: contacts.phone,
      email: contacts.email,
    });

    const lead = await payload.create({
      collection: "leads",
      data: buildLeadData(data, { flags, fileIds, consentId, meta }),
      overrideAccess: true,
      depth: 0,
      context: { disableRevalidate: true },
      req,
    });
    leadId = String(lead.id);

    await linkConsentToLead(req, consentId, leadId);
    if (fileIds.length > 0) {
      await payload.update({
        collection: "lead-files",
        where: { id: { in: fileIds } },
        data: { lead: leadId },
        overrideAccess: true,
        depth: 0,
        context: { disableRevalidate: true },
        req,
      });
    }

    if (ownTransaction) await commitTransaction(req);
  } catch (error) {
    if (ownTransaction) await killTransaction(req);
    await Promise.allSettled([...new Set(storedPaths)].map((filePath) => removeQuietly(filePath)));
    throw error;
  }

  // Committed: the temp copies are no longer needed. A leftover is purged by task 18's cleanup.
  await Promise.allSettled(
    files.flatMap((file) => [
      removeQuietly(file.tmpPath),
      removeQuietly(uploadSidecarPath(file.meta.id)),
    ])
  );
  return { leadId };
}

/** Path + query of a same-origin `Referer` (the page the form was sent from), else `null`. */
export function pageUrlFromReferer(referer: string | null, siteUrl: string): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.origin !== new URL(siteUrl).origin) return null;
    return `${url.pathname}${url.search}`.slice(0, 500);
  } catch {
    return null;
  }
}
