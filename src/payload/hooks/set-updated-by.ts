import { systemOnly } from "@/payload/collections/crm/field-access";
import { rel } from "@/payload/slugs";
import type { CollectionBeforeChangeHook, RelationshipField } from "payload";

/**
 * `beforeChange` (leads, pages): who saved the document last. `null` = «Система» (public forms,
 * jobs, scripts). Bookkeeping writes pass `context.keepUpdatedBy` (see `JOB_WRITE_CONTEXT`) and
 * keep the stored value, so a job stamping `newLeadNotifiedAt` does not overwrite the manager.
 *
 * Field access (`systemOnly`) strips any client-sent value first; this collection hook runs after
 * that pass, so the stamp cannot be forged through REST or the admin.
 */
export const setUpdatedBy: CollectionBeforeChangeHook = ({ data, req, context }) => {
  if (context?.keepUpdatedBy === true) return data;
  return { ...data, updatedBy: req.user?.id ?? null };
};

/**
 * `updatedBy` field shared by leads and pages. `maxDepth: 0` keeps the staff document (e-mail)
 * out of the public page loaders; the admin resolves the author's name separately.
 */
export function updatedByField(label = "Кем изменена"): RelationshipField {
  return {
    name: "updatedBy",
    type: "relationship",
    label,
    relationTo: rel("users"),
    maxDepth: 0,
    access: systemOnly,
    admin: { readOnly: true, position: "sidebar" },
  };
}
