import type { Validate } from "payload";

/** Empty for publishing purposes: nothing, blank text, no rows/relations, zero row count. */
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

/** Row count of an array field: an array on the server, a number in the admin form state. */
export function rowCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** True when the document is being saved as published (`_status` of a drafts collection). */
export function isPublishing(data: unknown): boolean {
  return (data as { _status?: unknown } | null | undefined)?._status === "published";
}

/**
 * Any field validator. `TValidate` is inferred from the field the result is assigned to, so one
 * helper fits text, relationship, upload and array fields alike.
 */

type AnyValidate = Validate<any, any, any, any>;

/**
 * Field required only when publishing: drafts (e.g. imported objects) may be saved empty.
 *
 * Optionally chains another validator (e.g. Payload's built-in one) when the value is present.
 */
export function requiredOnPublish<TValidate extends AnyValidate = AnyValidate>(
  message: string,
  next?: TValidate
): TValidate {
  const validate: AnyValidate = async (value, options) => {
    if (isPublishing(options.data) && isEmptyValue(value)) return message;
    return next ? next(value, options) : true;
  };
  return validate as TValidate;
}

/** Array field that needs at least `min` rows when publishing (drafts may be empty). */
export function minRowsOnPublish<TValidate extends AnyValidate = AnyValidate>(
  min: number,
  message: string,
  next?: TValidate
): TValidate {
  const validate: AnyValidate = async (value, options) => {
    if (isPublishing(options.data) && rowCount(value) < min) return message;
    return next ? next(value, options) : true;
  };
  return validate as TValidate;
}
