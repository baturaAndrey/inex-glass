import type { DuplicateReason } from "@/payload/collections/crm/constants";
import { rel } from "@/payload/slugs";
import { normalizeEmail, normalizeInn, normalizePhone } from "@/payload/utils/normalize";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
  RelationshipFieldSingleValidation,
  TextareaFieldValidation,
  TextFieldValidation,
  Where,
} from "payload";

/**
 * Computed fields of `leads` and `lead-statuses` (ТЗ §6.1). Business logic (intake, e-mails,
 * order creation) lives in tasks 17, 18 and 33.
 *
 * All lookups run through the Local API with `overrideAccess: true` and the incoming `req`, so
 * they share the transaction of the operation and work for public intake (no user) as well.
 */

type RelationValue = string | number | { id?: unknown } | null | undefined;

const INN_PATTERN = /^(\d{10}|\d{12})$/;

/** Id of a relationship value, whether it is populated (`{ id }`) or not. */
export function relationId(value: unknown): string | null {
  const raw = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  if (typeof raw === "string" && raw !== "") return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

// ---------------------------------------------------------------------------------------------
// leads: hooks
// ---------------------------------------------------------------------------------------------

/**
 * `beforeValidate`: stores the phone as `+7XXXXXXXXXX` (keeping what the user typed in
 * `phoneRaw`), lower-cases the e-mail and strips the INN to digits. A phone or INN that cannot
 * be normalized is kept as typed, so `validatePhone` / `validateInn` reject it with a readable
 * message instead of the value being silently dropped.
 */
export const normalizeContacts: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data;
  const next = { ...data };

  if (typeof data.phone === "string") {
    const typed = data.phone.trim();
    const storedRaw = (originalDoc as { phoneRaw?: unknown } | undefined)?.phoneRaw;
    if (isBlank(data.phoneRaw) && isBlank(storedRaw) && typed !== "") next.phoneRaw = typed;
    next.phone = normalizePhone(typed) ?? typed;
  }
  if ("email" in data) next.email = normalizeEmail(data.email);
  if ("inn" in data) next.inn = normalizeInn(data.inn) ?? (isBlank(data.inn) ? null : data.inn);

  return next;
};

async function findDefaultStatusId(req: PayloadRequest): Promise<string | null> {
  const common = {
    collection: rel("lead-statuses"),
    sort: "order",
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  } as const;

  const flagged = await req.payload.find({ ...common, where: { isDefault: { equals: true } } });
  if (flagged.docs[0]) return relationId(flagged.docs[0]);

  // No explicit default: the first stage of the funnel.
  const first = await req.payload.find(common);
  return first.docs[0] ? relationId(first.docs[0]) : null;
}

/**
 * `beforeChange` (create and update): an empty `status` gets the default lead status. Leads
 * saved before the seed created any statuses are healed on their next update (jobs, bulk
 * edits). While no status exists the lead is stored without one — losing a lead is worse.
 * Clearing an existing status on update is not "healed": `validateLeadStatus` rejects it.
 */
export const assignDefaultStatus: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data || relationId(data.status)) return data;
  const stored = relationId((originalDoc as { status?: RelationValue } | undefined)?.status);
  if (operation === "update" && stored) return data;
  const status = await findDefaultStatusId(req);
  return status ? { ...data, status } : data;
};

/** `beforeChange`: stamps `statusChangedAt` when a status is set on create or changed on update. */
export const touchStatusChangedAt: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  if (!data || !("status" in data)) return data;
  const next = relationId(data.status);
  const previous = relationId((originalDoc as { status?: RelationValue } | undefined)?.status);

  const changed = operation === "create" ? next !== null : next !== previous;
  return changed ? { ...data, statusChangedAt: new Date().toISOString() } : data;
};

/** Which contact of an earlier lead matches the new one. */
export function duplicateReasonFor(
  candidate: { phone?: unknown; email?: unknown },
  contacts: { phone: string | null; email: string | null }
): DuplicateReason | null {
  const phoneMatch = contacts.phone !== null && candidate.phone === contacts.phone;
  const emailMatch = contacts.email !== null && candidate.email === contacts.email;
  if (phoneMatch && emailMatch) return "both";
  if (phoneMatch) return "phone";
  if (emailMatch) return "email";
  return null;
}

/**
 * `beforeChange` (create): marks the lead as a duplicate of the earliest lead with the same
 * normalized phone or e-mail. Runs after `normalizeContacts`, so plain equality is enough.
 */
export const detectDuplicate: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== "create" || !data) return data;

  const phone = typeof data.phone === "string" ? normalizePhone(data.phone) : null;
  const email = normalizeEmail(data.email);
  const conditions: Where[] = [];
  if (phone) conditions.push({ phone: { equals: phone } });
  if (email) conditions.push({ email: { equals: email } });
  if (conditions.length === 0) return { ...data, isDuplicate: false };

  const { docs } = await req.payload.find({
    collection: rel("leads"),
    where: { or: conditions },
    sort: "createdAt",
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  });
  const original = docs[0] as { id?: unknown; phone?: unknown; email?: unknown } | undefined;
  const duplicateOf = relationId(original);
  const duplicateReason = original ? duplicateReasonFor(original, { phone, email }) : null;

  if (!duplicateOf || !duplicateReason) {
    return { ...data, isDuplicate: false, duplicateOf: null, duplicateReason: null };
  }
  return { ...data, isDuplicate: true, duplicateOf, duplicateReason };
};

// ---------------------------------------------------------------------------------------------
// leads: field validators
// ---------------------------------------------------------------------------------------------

/**
 * Required Russian phone. Accepts any value `normalizePhone` understands: the admin form
 * validates raw input before `normalizeContacts` runs on the server.
 */
export const validatePhone: TextFieldValidation = (value) => {
  if (isBlank(value)) return "Укажите телефон";
  return normalizePhone(value) !== null ? true : "Введите российский номер телефона: +7 и 10 цифр";
};

/** INN is optional; when present it must be 10 (legal entity) or 12 (individual) digits. */
export const validateInn: TextFieldValidation = (value) => {
  if (isBlank(value)) return true;
  const digits = normalizeInn(value);
  return digits !== null && INN_PATTERN.test(digits) ? true : "ИНН должен содержать 10 или 12 цифр";
};

/**
 * A lead may not lose its status. Field validation runs after the collection `beforeChange`
 * hooks, so an empty value here means `assignDefaultStatus` found no status at all (seed not
 * run yet): that is accepted on create and while the stored lead has no status either. Only
 * clearing an existing status is rejected.
 */
export const validateLeadStatus: RelationshipFieldSingleValidation = (
  value,
  { operation, previousValue }
) => {
  if (relationId(value)) return true;
  if (operation === "create" || !relationId(previousValue)) return true;
  return "Выберите статус заявки";
};

/** `refuseReason` is required when the selected status has `requiresReason` (e.g. «Отказ»). */
export const validateRefuseReason: TextareaFieldValidation = async (
  value,
  { req, siblingData }
) => {
  if (!isBlank(value)) return true;

  const statusValue = (siblingData as { status?: unknown }).status;
  if (typeof statusValue === "object" && statusValue !== null && "requiresReason" in statusValue) {
    return (statusValue as { requiresReason?: unknown }).requiresReason === true
      ? "Укажите причину отказа"
      : true;
  }

  const statusId = relationId(statusValue);
  if (!statusId) return true;
  try {
    const status = await req.payload.findByID({
      collection: rel("lead-statuses"),
      id: statusId,
      depth: 0,
      overrideAccess: true,
      req,
    });
    return (status as { requiresReason?: unknown }).requiresReason === true
      ? "Укажите причину отказа"
      : true;
  } catch {
    // Unknown status id: the relationship field reports it itself.
    return true;
  }
};

// ---------------------------------------------------------------------------------------------
// lead-statuses
// ---------------------------------------------------------------------------------------------

/** `afterChange`: exactly one default status — clears `isDefault` on all the others. */
export const ensureSingleDefaultStatus: CollectionAfterChangeHook = async ({ doc, req }) => {
  const id = relationId(doc);
  if (!id || (doc as { isDefault?: unknown }).isDefault !== true) return doc;

  // Declared separately: the generated types do not know this collection until task 10.
  const clearDefault: Record<string, unknown> = { isDefault: false };
  await req.payload.update({
    collection: rel("lead-statuses"),
    where: { and: [{ isDefault: { equals: true } }, { id: { not_equals: id } }] },
    data: clearDefault,
    depth: 0,
    overrideAccess: true,
    req,
  });
  return doc;
};
