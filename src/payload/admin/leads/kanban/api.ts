/**
 * Client-side writes of the leads kanban. Every change goes through Payload's REST
 * `PATCH /api/leads/<id>/` with the admin session cookie (same as `orders/status-panel.tsx`), so
 * the collection hooks run exactly as for the edit form: refusal-reason validation,
 * `statusChangedAt`, the order of a contract, notifications, versions.
 *
 * The kanban sends only `status`, `assignee`, `refuseReasonCode` and `refuseReason`.
 */

export interface PayloadFieldError {
  path: string;
  message: string;
}

export type PatchResult =
  { ok: true } | { ok: false; message: string; fieldErrors: PayloadFieldError[] };

export const PATCH_FALLBACK_MESSAGE = "Не удалось сохранить";

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/**
 * Error of a Payload REST response: `errors[0].data.errors[]` of a `ValidationError` become field
 * errors (the message is the first of them); otherwise `errors[0].message`; anything else (an
 * HTML error page, `null`, garbage) → «Не удалось сохранить».
 */
export function extractPayloadError(body: unknown): {
  message: string;
  fieldErrors: PayloadFieldError[];
} {
  const first = isRecord(body) && Array.isArray(body.errors) ? body.errors[0] : undefined;
  if (!isRecord(first)) return { message: PATCH_FALLBACK_MESSAGE, fieldErrors: [] };

  const nested = isRecord(first.data) && Array.isArray(first.data.errors) ? first.data.errors : [];
  const fieldErrors: PayloadFieldError[] = [];
  for (const entry of nested) {
    if (!isRecord(entry)) continue;
    const message = nonEmptyString(entry.message);
    if (message) fieldErrors.push({ path: nonEmptyString(entry.path) ?? "", message });
  }
  const message =
    fieldErrors[0]?.message ?? nonEmptyString(first.message) ?? PATCH_FALLBACK_MESSAGE;
  return { message, fieldErrors };
}

/** PATCH /api/leads/<id>/?depth=0 with the admin session cookie (same as orders/status-panel.tsx). */
export async function patchLead(id: string, body: Record<string, unknown>): Promise<PatchResult> {
  try {
    const response = await fetch(`/api/leads/${encodeURIComponent(id)}/?depth=0`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    return { ok: false, ...extractPayloadError(await response.json().catch(() => null)) };
  } catch {
    // Network failure: the caller rolls back and shows the generic message.
    return { ok: false, message: PATCH_FALLBACK_MESSAGE, fieldErrors: [] };
  }
}
