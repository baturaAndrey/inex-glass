import { normalizeEmail, normalizePhone } from "@/payload/utils/normalize";
import type { Payload, Where } from "payload";

/**
 * Duplicate helpers (task 17). Duplicate MARKING is not done here: the `detectDuplicate`
 * `beforeChange` hook of `leads` (task 8) sets `isDuplicate` / `duplicateOf` / `duplicateReason`
 * on every create, intake included. This module only offers the shared normalizers and a
 * read-only lookup for notifications (task 18) and the admin (task 32).
 */

export { normalizeEmail, normalizePhone };

const MAX_DUPLICATES = 20;

/**
 * Ids of other leads with the same normalized phone or e-mail, oldest first (at most 20).
 * Raw values are fine: they are normalized here. No contacts → `[]`.
 */
export async function findDuplicateLeadIds(
  payload: Payload,
  { phone, email, excludeId }: { phone?: unknown; email?: unknown; excludeId?: string }
): Promise<string[]> {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);
  const contacts: Where[] = [];
  if (normalizedPhone) contacts.push({ phone: { equals: normalizedPhone } });
  if (normalizedEmail) contacts.push({ email: { equals: normalizedEmail } });
  if (contacts.length === 0) return [];

  const where: Where = excludeId
    ? { and: [{ or: contacts }, { id: { not_equals: excludeId } }] }
    : { or: contacts };
  const { docs } = await payload.find({
    collection: "leads",
    where,
    sort: "createdAt",
    limit: MAX_DUPLICATES,
    depth: 0,
    pagination: false,
    select: {},
    overrideAccess: true,
  });
  return docs.map((doc) => String(doc.id));
}
