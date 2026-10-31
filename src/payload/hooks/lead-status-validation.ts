import { ValidationError } from "payload";
import { relationId } from "@/payload/hooks/lead-hooks";
import { REFUSE_REASON_REQUIRED_MESSAGE } from "@/payload/hooks/lead-messages";
import type { CollectionBeforeValidateHook } from "payload";

/**
 * `leads.beforeValidate` (create and update): a lead in a status with `requiresReason`
 * («Отказ») needs a reason (ТЗ §6.1 «Статусы»): a `refuseReasonCode` **or** a non-empty
 * `refuseReason`; the code «Другое» (`other`) still requires the text. Leads saved before the
 * code existed keep passing with the text alone.
 *
 * Works for partial updates too (REST PATCH, bulk edit in the list, kanban drag): missing keys
 * fall back to the stored document. Moving away from such a status keeps the reason (history).
 * The field validator `validateRefuseReason` shows the same message inline in the form; this hook
 * is the server-side guarantee for every write path, raised as one `ValidationError` on the
 * `refuseReason` field (contract with the admin UI and e2e).
 */

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

/** «Другое»: the only code that still requires the text; any other code alone is enough. */
const OTHER_REASON_CODE = "other";

export const validateLeadStatusReason: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data) return data;
  const stored = (originalDoc ?? {}) as {
    status?: unknown;
    refuseReason?: unknown;
    refuseReasonCode?: unknown;
  };

  const statusValue = "status" in data ? data.status : stored.status;
  const statusId = relationId(statusValue);
  if (!statusId) return data;

  // A specific code alone is enough, no status lookup needed.
  const code = "refuseReasonCode" in data ? data.refuseReasonCode : stored.refuseReasonCode;
  if (!isBlank(code) && code !== OTHER_REASON_CODE) return data;

  // No code (legacy) or «Другое»: the text is required.
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
