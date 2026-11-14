import { REFUSE_REASON_REQUIRED_MESSAGE } from "@/payload/hooks/lead-messages";

/**
 * Pure logic of the «Обработка» panel of the lead card (`processing-panel.tsx`): the form diff
 * that becomes the body of `PATCH /api/leads/<id>/`, the «Договор» confirmation rule, the client
 * mirror of the refusal-reason rule and the parsing of Payload REST errors. No React, so the
 * rules are unit-tested (`processing.test.ts`).
 */

export interface ProcessingStatus {
  id: string;
  name: string;
  isContract: boolean;
  requiresReason: boolean;
}

/** Serializable props of `ProcessingPanel`, collected by the server view. */
export interface ProcessingPanelProps {
  leadId: string;
  currentUserId: string;
  /** Statuses in funnel order. */
  statuses: ProcessingStatus[];
  /** Staff users sorted by name (`loadStaffNames`). */
  staff: { id: string; name: string }[];
  /** Options of `refuseReasonCode` (`LEAD_REFUSE_REASON_CODES`). */
  reasons: { value: string; label: string }[];
  /** `LEAD_FLAGS`. */
  flags: { value: string; label: string }[];
  initial: {
    status: string | null;
    assignee: string | null;
    flags: string[];
    refuseReasonCode: string | null;
    refuseReason: string;
    kpAmount: number | null;
  };
}

export type ProcessingForm = ProcessingPanelProps["initial"];
export type ProcessingField = keyof ProcessingForm;
export type LeadPatch = Partial<Record<ProcessingField, unknown>>;

/** Value of `refuseReasonCode` whose text is mandatory (`validateLeadStatusReason`). */
export const OTHER_REASON_CODE = "other";

const findStatus = (statuses: readonly ProcessingStatus[], id: string | null) =>
  id ? statuses.find((status) => status.id === id) : undefined;

/** `""`, whitespace and `null` are «empty» for the select and text fields of the panel. */
const blankToNull = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
};

const sameFlags = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((flag) => set.has(flag));
};

/** Whether the selected status needs the refusal block (`lead-statuses.requiresReason`). */
export function requiresReason(
  statusId: string | null,
  statuses: readonly ProcessingStatus[]
): boolean {
  return findStatus(statuses, statusId)?.requiresReason === true;
}

/**
 * Body of the PATCH: only the keys the user changed, so a concurrent edit of other fields by a
 * colleague is never overwritten. «Не назначен» is `assignee: null`; an empty `kpAmount` is
 * `null`. The refusal fields are sent only while a status with `requiresReason` is selected
 * (they are hidden otherwise) and only when they changed: the server falls back to the stored
 * reason for the keys that are missing.
 */
export function buildLeadPatch(
  initial: ProcessingForm,
  form: ProcessingForm,
  statuses: readonly ProcessingStatus[]
): LeadPatch {
  const patch: LeadPatch = {};
  if (blankToNull(form.status) !== blankToNull(initial.status)) {
    patch.status = blankToNull(form.status);
  }
  if (blankToNull(form.assignee) !== blankToNull(initial.assignee)) {
    patch.assignee = blankToNull(form.assignee);
  }
  if (!sameFlags(form.flags, initial.flags)) patch.flags = [...form.flags];

  if (requiresReason(form.status, statuses)) {
    const code = blankToNull(form.refuseReasonCode);
    if (code !== blankToNull(initial.refuseReasonCode)) patch.refuseReasonCode = code;
    const reason = blankToNull(form.refuseReason);
    if (reason !== blankToNull(initial.refuseReason)) patch.refuseReason = reason;
  }

  const kp = Number.isFinite(form.kpAmount) ? form.kpAmount : null;
  if (kp !== initial.kpAmount) patch.kpAmount = kp;
  return patch;
}

/** «Договор» creates an order and a client link: confirm when the lead enters such a status. */
export function needsContractConfirm(
  initialStatus: string | null,
  nextStatus: string | null,
  statuses: readonly ProcessingStatus[]
): boolean {
  if (!nextStatus || nextStatus === initialStatus) return false;
  return (
    findStatus(statuses, nextStatus)?.isContract === true &&
    findStatus(statuses, initialStatus)?.isContract !== true
  );
}

/**
 * Client mirror of `validateLeadStatusReason`: a status with `requiresReason` needs a code
 * (any but «Другое» is enough) or a non-empty text; «Другое» needs the text. The server answer
 * stays the source of truth.
 */
export function reasonError(
  form: ProcessingForm,
  statuses: readonly ProcessingStatus[]
): string | null {
  if (!requiresReason(form.status, statuses)) return null;
  const code = blankToNull(form.refuseReasonCode);
  if (code !== null && code !== OTHER_REASON_CODE) return null;
  return blankToNull(form.refuseReason) === null ? REFUSE_REASON_REQUIRED_MESSAGE : null;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/**
 * Errors of a Payload REST response. A `ValidationError` (400) carries
 * `errors[0].data.errors[] { path, message }`: they become `fields` (first message per path) and
 * `errors[0].message` becomes `message`. A response without `data` (403, 404, …) or anything
 * that is not a Payload error body gives `message: null`, so the caller shows its fallback.
 */
export function parsePayloadErrors(body: unknown): {
  fields: Record<string, string>;
  message: string | null;
} {
  const fields: Record<string, string> = {};
  const first = isRecord(body) && Array.isArray(body.errors) ? body.errors[0] : undefined;
  if (!isRecord(first) || !isRecord(first.data) || !Array.isArray(first.data.errors)) {
    return { fields, message: null };
  }
  for (const entry of first.data.errors) {
    if (!isRecord(entry)) continue;
    const path = nonEmptyString(entry.path);
    const message = nonEmptyString(entry.message);
    if (path && message && !(path in fields)) fields[path] = message;
  }
  return { fields, message: nonEmptyString(first.message) };
}

/**
 * New server values after `router.refresh()` while the form may hold unsaved edits: a field the
 * user did not touch (still equal to the old baseline) takes the new value, an edited field
 * keeps the user's value.
 */
export function rebaseForm(
  oldBase: ProcessingForm,
  newBase: ProcessingForm,
  form: ProcessingForm
): ProcessingForm {
  const untouched = (key: ProcessingField): boolean =>
    key === "flags"
      ? sameFlags(form.flags, oldBase.flags)
      : (form[key] ?? null) === (oldBase[key] ?? null);
  return {
    status: untouched("status") ? newBase.status : form.status,
    assignee: untouched("assignee") ? newBase.assignee : form.assignee,
    flags: untouched("flags") ? newBase.flags : form.flags,
    refuseReasonCode: untouched("refuseReasonCode")
      ? newBase.refuseReasonCode
      : form.refuseReasonCode,
    refuseReason: untouched("refuseReason") ? newBase.refuseReason : form.refuseReason,
    kpAmount: untouched("kpAmount") ? newBase.kpAmount : form.kpAmount,
  };
}

/** Value of the «Сумма КП, ₽» input: empty or not a number → `null`. */
export function parseKpAmount(input: string): number | null {
  if (input.trim() === "") return null;
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}
