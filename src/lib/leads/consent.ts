import type { FormType } from "@/lib/domain";
import { consentEmailHash, consentPhoneHash } from "@/payload/utils/normalize";
import type { PayloadRequest } from "payload";

/**
 * Personal-data consent journal (152-ФЗ) for public forms (task 17).
 *
 * Every lead gets one immutable `consent-log` record: which consent/policy versions the visitor
 * agreed to, a snapshot of the checkbox text, IP, User-Agent and keyed hashes of the contacts
 * (so an erasure request can still find the record after the lead is deleted, task 32).
 * `consent-log.access.create` is `false`: records are written ONLY here, via the Local API.
 */

/** Bump when the consent document (`/soglasie-na-obrabotku-pd/`) changes. */
export const CONSENT_VERSION = "2026-10-19";
/** Bump when the privacy policy (`/politika-konfidencialnosti/`) changes. */
export const POLICY_VERSION = "2026-10-19-draft";

/** Text of the consent checkbox (`ConsentCheckbox`, task 12) at the time of submission. */
export const CONSENT_TEXT =
  "Даю согласие на обработку персональных данных и ознакомлен с политикой обработки персональных данных";

export const MAX_USER_AGENT_LENGTH = 500;
const MAX_PAGE_URL_LENGTH = 500;

export interface ConsentRecordInput {
  formType: FormType;
  ip: string;
  userAgent: string;
  pageUrl?: string | null;
  /** Raw or normalized; hashed after normalization, nothing stored when unusable. */
  phone?: string | null;
  email?: string | null;
}

/**
 * Creates the consent record (without the lead link — see `linkConsentToLead`) inside the
 * caller's transaction. Returns its id.
 */
export async function createConsentRecord(
  req: PayloadRequest,
  input: ConsentRecordInput
): Promise<string> {
  const doc = await req.payload.create({
    collection: "consent-log",
    data: {
      formType: input.formType,
      consentVersion: CONSENT_VERSION,
      policyVersion: POLICY_VERSION,
      consentText: CONSENT_TEXT,
      ip: input.ip,
      userAgent: input.userAgent.slice(0, MAX_USER_AGENT_LENGTH),
      pageUrl: input.pageUrl ? input.pageUrl.slice(0, MAX_PAGE_URL_LENGTH) : null,
      givenAt: new Date().toISOString(),
      phoneHash: consentPhoneHash(input.phone ?? null),
      emailHash: consentEmailHash(input.email ?? null),
    },
    overrideAccess: true,
    depth: 0,
    req,
  });
  return String(doc.id);
}

/** Sets `consent-log.lead` once the lead exists (same transaction). */
export async function linkConsentToLead(
  req: PayloadRequest,
  consentId: string,
  leadId: string
): Promise<void> {
  await req.payload.update({
    collection: "consent-log",
    id: consentId,
    data: { lead: leadId },
    overrideAccess: true,
    depth: 0,
    req,
  });
}
