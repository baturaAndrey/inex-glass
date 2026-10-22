import { footerFromContacts } from "@/emails/layout";
import type { FooterContacts } from "@/emails/layout";
import { describeMailError } from "@/lib/mail/send";
import type { Contact, SiteSetting } from "@/payload-types";
import type { PayloadRequest, TaskConfig } from "payload";

/** Object form of `TaskConfig.retries` (the type itself is not exported by Payload). */
type RetryConfig = Exclude<NonNullable<TaskConfig["retries"]>, number>;

/**
 * Helpers shared by the job handlers (`src/jobs/*`). Kept out of `index.ts` so the task modules
 * do not import the registry that imports them.
 */

/** Queue of event-driven jobs (mail). */
export const DEFAULT_QUEUE = "default";
/** Queue of scheduled housekeeping jobs; its own runner keeps mail bursts from delaying it. */
export const MAINTENANCE_QUEUE = "maintenance";

const MAIL_RETRY_DELAY_MS = 60_000;
const MAIL_RETRY_ATTEMPTS = 5;

/** Mail jobs: 5 retries, exponential backoff from 60 s (60 s, 2 min, 4 min, 8 min, 16 min). */
export const MAIL_RETRIES: RetryConfig = {
  attempts: MAIL_RETRY_ATTEMPTS,
  backoff: { type: "exponential", delay: MAIL_RETRY_DELAY_MS },
};

/** Housekeeping jobs are idempotent and rescheduled anyway: a couple of quick retries suffice. */
export const MAINTENANCE_RETRIES: RetryConfig = {
  attempts: 2,
  backoff: { type: "fixed", delay: MAIL_RETRY_DELAY_MS },
};

/** Upper bound of records/files a housekeeping job touches per run. */
export const CLEANUP_BATCH_LIMIT = 1000;

/**
 * Context for bookkeeping writes from jobs: no revalidation, no side-effect hooks of tasks 32/33,
 * and `updatedBy` keeps the last human author (`setUpdatedBy`).
 */
export const JOB_WRITE_CONTEXT = {
  disableRevalidate: true,
  skipAssigneeNotify: true,
  skipOrderHooks: true,
  skipStatusEmail: true,
  keepUpdatedBy: true,
  skipMaxNotify: true,
} as const;

/** Id of a relationship value (`string` with depth 0, document with depth ≥ 1). */
export function relationId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = (value as { id: unknown }).id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }
  return null;
}

/** Populated relationship document or `null` (depth 0 / dangling reference). */
export function populated<T extends { id: string }>(
  value: string | T | null | undefined
): T | null {
  return typeof value === "object" && value !== null ? value : null;
}

/** `site-settings` or `null` when not seeded yet; the jobs then use their built-in defaults. */
export async function loadSiteSettings(req: PayloadRequest): Promise<SiteSetting | null> {
  try {
    return await req.payload.findGlobal({
      slug: "site-settings",
      depth: 0,
      overrideAccess: true,
      req,
    });
  } catch (error) {
    req.payload.logger.warn({
      error: describeError(error),
      msg: "jobs: site-settings unavailable, using defaults",
    });
    return null;
  }
}

export async function loadContacts(req: PayloadRequest): Promise<Contact | null> {
  try {
    return await req.payload.findGlobal({ slug: "contacts", depth: 0, overrideAccess: true, req });
  } catch (error) {
    req.payload.logger.warn({
      error: describeError(error),
      msg: "jobs: contacts unavailable, using defaults",
    });
    return null;
  }
}

/** E-mail footer from the `contacts` global (with the built-in fallback). */
export async function loadFooter(req: PayloadRequest, siteUrl: string): Promise<FooterContacts> {
  return footerFromContacts(await loadContacts(req), siteUrl);
}

/** Lower-cased, de-duplicated, non-empty addresses. */
export function uniqueEmails(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const email = value?.trim().toLowerCase();
    if (email) seen.add(email);
  }
  return [...seen];
}

/**
 * What job handlers log for a caught error: name + `code` / SMTP `responseCode` only. Never the
 * raw error (`err: error`): SMTP and Postgres messages quote addresses and row values
 * (`550 <client@…>`, `Key (email)=(…)`), and job logs must stay free of personal data (152-ФЗ).
 */
export function describeError(error: unknown): string {
  return describeMailError(error);
}
