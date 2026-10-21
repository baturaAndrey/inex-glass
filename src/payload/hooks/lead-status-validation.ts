import { ValidationError } from "payload";
import { relationId } from "@/payload/hooks/lead-hooks";
import { REFUSE_REASON_REQUIRED_MESSAGE } from "@/payload/hooks/lead-messages";
import type { CollectionBeforeValidateHook } from "payload";

/**
 * `leads.beforeValidate` (create and update): a lead in a status with `requiresReason`
 * («Отказ») cannot be saved without `refuseReason` (ТЗ §6.1 «Статусы»).
 *
 * Works for partial updates too (REST PATCH, bulk edit in the list): missing keys fall back to
 * the stored document. Moving away from such a status keeps the reason (history). The field
 * validator `validateRefuseReason` shows the same message inline in the form; this hook is the
 * server-side guarantee for every write path, raised as one `ValidationError` on the field.
 */

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

export const validateLeadStatusReason: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data;
  const stored = (originalDoc ?? {}) as { status?: unknown; refuseReason?: unknown };

  const statusValue = "status" in data ? data.status : stored.status;
  const statusId = relationId(statusValue);
  if (!statusId) return data;

  const reason = "refuseReason" in data ? data.refuseReason : stored.refuseReason;
  if (!isBlank(reason)) return data;

  const status = await req.payload.findByID({
    collection: "lead-statuses",
    id: statusId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  });
  if (status?.requiresReason !== true) return data;

  throw new ValidationError({
    collection: "leads",
    errors: [{ message: REFUSE_REASON_REQUIRED_MESSAGE, path: "refuseReason" }],
    req,
  });
};
