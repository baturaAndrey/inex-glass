import type { Payload } from "payload";

/**
 * JSON responses of the public intake API (task 17): `/api/upload/`, `/api/forms/lead/`,
 * `/api/form-token/`. One error shape for every route — `{ ok: false, code, message }` (+ `fields`
 * for validation) — and only the user-facing texts of teksty/05-kviz.md «Ошибки формы».
 * Responses are never cached.
 */

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export type IntakeErrorCode =
  | "format"
  | "size"
  | "rate"
  | "token"
  | "expired"
  | "too_fast"
  | "validation"
  | "bad_request"
  | "server";

export const ERROR_STATUS: Readonly<Record<IntakeErrorCode, number>> = {
  format: 400,
  size: 413,
  rate: 429,
  token: 400,
  expired: 400,
  too_fast: 400,
  validation: 400,
  bad_request: 400,
  server: 500,
};

/** Format error of the quiz (sketch photos allowed). */
export const FORMAT_MESSAGE_QUIZ = "Подойдут DWG, DXF, PDF, JPG или PNG";
/** Format error of the other forms (drawings only). */
export const FORMAT_MESSAGE_FORM = "Подойдут DWG, DXF или PDF";
export const SIZE_MESSAGE = "Файл больше 50 МБ. Сожмите его или пришлите ссылку в комментарии";
/** Safe fallback when the `contacts` global is unavailable. */
export const FALLBACK_PHONE = "+7 (351) 247-05-57";

export const submitErrorMessage = (phone: string): string =>
  `Не удалось отправить заявку. Попробуйте ещё раз или позвоните: ${phone}`;

/**
 * Primary phone from the `contacts` global (the `{телефон}` placeholder), or the fallback. Read
 * only on the error path, so no cache layer; never throws.
 */
export async function getSupportPhone(payload: Payload | null): Promise<string> {
  if (!payload) return FALLBACK_PHONE;
  try {
    const contacts = await payload.findGlobal({ slug: "contacts", depth: 0, overrideAccess: true });
    const phones = contacts.phones ?? [];
    const primary = phones.find((phone) => phone.isPrimary) ?? phones[0];
    return primary?.number?.trim() || FALLBACK_PHONE;
  } catch {
    return FALLBACK_PHONE;
  }
}

export function jsonOk<T extends Record<string, unknown>>(body: T): Response {
  return Response.json({ ok: true, ...body }, { headers: NO_STORE_HEADERS });
}

export function jsonError(
  code: IntakeErrorCode,
  message: string,
  extra: { fields?: Record<string, string>; retryAfterSec?: number } = {}
): Response {
  const headers: Record<string, string> = { ...NO_STORE_HEADERS };
  if (extra.retryAfterSec !== undefined) headers["Retry-After"] = String(extra.retryAfterSec);
  const body = { ok: false, code, message, ...(extra.fields ? { fields: extra.fields } : {}) };
  return Response.json(body, { status: ERROR_STATUS[code], headers });
}

/** Error with the generic «Не удалось отправить заявку…» text (limits, anti-spam, server). */
export async function jsonSubmitError(
  code: IntakeErrorCode,
  payload: Payload | null,
  extra: { retryAfterSec?: number } = {}
): Promise<Response> {
  return jsonError(code, submitErrorMessage(await getSupportPhone(payload)), extra);
}
