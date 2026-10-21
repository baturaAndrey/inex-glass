import { REQUIRED_MESSAGE, siteFormLeadSchema } from "@/lib/domain/lead-form-schemas";
import { FORM_TEXTS } from "./form-texts";
import type { FormKey, FormParams } from "./form-dialog-provider";
import type { z } from "zod";

/**
 * Pure part of the site forms (task 21): which fields each form has, client-side validation and
 * the body of `POST /api/forms/lead/`. No React, no browser APIs — unit-tested in node
 * (`use-lead-form.test.ts`) against the same `leadSubmitSchema` the server uses.
 */

export type LeadFieldName =
  | "company"
  | "name"
  | "phone"
  | "email"
  | "city"
  | "area"
  | "comment"
  | "glassKind"
  | "address"
  | "description"
  | "sizes"
  | "mounting";

export type LeadValues = Partial<Record<LeadFieldName, string>>;

/** Text fields of each form, in display (and focus) order. */
export const FORM_FIELDS: Readonly<Record<FormKey, readonly LeadFieldName[]>> = {
  drawing: ["company", "name", "phone", "email", "comment"],
  full: ["company", "name", "phone", "email", "city", "area", "comment"],
  callback: ["name", "phone"],
  sample: ["company", "name", "phone", "email", "glassKind", "address", "comment"],
  load: ["description", "sizes", "mounting", "company", "name", "phone", "email"],
  contacts: ["company", "name", "phone", "email", "comment"],
};

/**
 * Fields marked with `*`. The schema requires `name`, `phone` (and `description`); «Компания» is
 * required by the UI only (the schema keeps it optional for the quiz/legacy forms).
 */
export const REQUIRED_FIELDS: Readonly<Record<FormKey, readonly LeadFieldName[]>> = {
  drawing: ["company", "name", "phone"],
  full: ["company", "name", "phone"],
  callback: ["name", "phone"],
  sample: ["company", "name", "phone"],
  load: ["description", "company", "name", "phone"],
  contacts: ["company", "name", "phone"],
};

/** Forms with a drawing upload (one file at most). */
export const FILE_FORMS: ReadonlySet<FormKey> = new Set(["drawing", "full", "load", "contacts"]);

/** Forms whose schema stores the clicked caption (`sourceLabel`) and the page context (`params`). */
const LABELLED_FORMS: ReadonlySet<FormKey> = new Set(["drawing", "full"]);

/**
 * Trigger parameters that configure the UI and are not page context: never sent in `params`
 * (`accept` is an array, which the schema would reject anyway).
 */
const UI_PARAM_KEYS: ReadonlySet<string> = new Set([
  "label",
  "title",
  "accept",
  "source",
  "submitLabel",
  "fileLabel",
  "sourceLabel",
]);

export type LeadParams = Record<string, string | number | boolean>;

/**
 * `params` of the lead: `{ source, …page context }` (thickness, glass kind id, …). Only
 * primitive values survive, as the schema allows; empty strings are dropped.
 */
export function leadParams(params: FormParams, source: string | undefined): LeadParams {
  const result: LeadParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (UI_PARAM_KEYS.has(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    else if (typeof value === "boolean") result[key] = value;
    else if (typeof value === "string" && value.trim() !== "") result[key] = value.trim();
  }
  const trimmedSource = source?.trim();
  if (trimmedSource) result.source = trimmedSource;
  return result;
}

/** Optional UI override passed through `params` (`submitLabel`, `fileLabel`), trimmed. */
export function paramText(params: FormParams, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Thickness in mm passed by a thickness card (`params.thickness`), or `null`. */
export function paramThickness(params: FormParams): number | null {
  const raw = params.thickness;
  const value = typeof raw === "string" ? Number(raw.replace(",", ".")) : raw;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** «Толщина: 10 мм». */
export function thicknessLabel(mm: number): string {
  return FORM_TEXTS.load.thickness.replace("{N}", String(mm).replace(".", ","));
}

/** Lead caption: the trigger's `label`, else the form default (`drawing` → «Отправить чертёж»). */
export function sourceLabelOf(formKey: FormKey, params: FormParams): string | undefined {
  const label = typeof params.label === "string" ? params.label.trim() : "";
  return label || FORM_TEXTS.defaultSourceLabel[formKey];
}

export interface LeadMeta {
  entryPage: string;
  utm?: Record<string, string | undefined> | undefined;
  metrikaClientId?: string | undefined;
  formToken: string;
  consent: boolean;
  /** Honeypot `company_website`: always sent, `''` for people. */
  honeypot: string;
  uploadTokens: readonly string[];
  /** Ad click ids / external referrer (`getLeadAttribution().extra`); stored in `answers`. */
  attribution?: { yclid?: string; gclid?: string; referrer?: string } | undefined;
  /** Place the form was opened from (`home-hero`, `/kontakty/#forma`, …). */
  source?: string | undefined;
}

/** `utm` without empty keys, or `undefined` when nothing is left. */
function compactUtm(utm: LeadMeta["utm"]): Record<string, string> | undefined {
  if (!utm) return undefined;
  const entries = Object.entries(utm).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== ""
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Body of `POST /api/forms/lead/` for one form. Values are sent as typed: the schema trims,
 * normalizes the phone (`+7XXXXXXXXXX`) and drops empty optional fields.
 *
 * The `load` schema has no `params`, so a thickness passed by a thickness card is kept in
 * `sizes` («Толщина: 10 мм; 1200 × 800») — otherwise the server would strip it.
 */
export function buildLeadBody(
  formKey: FormKey,
  values: LeadValues,
  params: FormParams,
  meta: LeadMeta
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    formType: formKey,
    entryPage: meta.entryPage,
    consent: meta.consent,
    formToken: meta.formToken,
    company_website: meta.honeypot,
  };

  const utm = compactUtm(meta.utm);
  if (utm) body.utm = utm;
  if (meta.metrikaClientId) body.metrikaClientId = meta.metrikaClientId;
  if (meta.attribution && Object.keys(meta.attribution).length > 0) {
    body.attribution = { ...meta.attribution };
  }
  if (meta.uploadTokens.length > 0 && FILE_FORMS.has(formKey)) {
    body.uploadTokens = [...meta.uploadTokens];
  }

  for (const field of FORM_FIELDS[formKey]) {
    body[field] = values[field] ?? "";
  }

  if (formKey === "load") {
    const thickness = paramThickness(params);
    if (thickness !== null) {
      const sizes = (values.sizes ?? "").trim();
      body.sizes = sizes ? `${thicknessLabel(thickness)}; ${sizes}` : thicknessLabel(thickness);
    }
  }

  if (LABELLED_FORMS.has(formKey)) {
    const label = sourceLabelOf(formKey, params);
    if (label) body.sourceLabel = label;
    const context = leadParams(params, meta.source);
    if (Object.keys(context).length > 0) body.params = context;
  }

  return body;
}

/** Error key of the consent checkbox (same as the schema path). */
export const CONSENT_KEY = "consent";

export type LeadErrors = Partial<Record<LeadFieldName | typeof CONSENT_KEY, string>>;

/** Placeholders for the transport fields while validating the user's input only. */
const VALIDATION_META: Omit<LeadMeta, "consent"> = {
  entryPage: "/",
  formToken: "pending",
  honeypot: "",
  uploadTokens: [],
};

/**
 * Client-side validation with the form's own schema (`siteFormLeadSchema`, quiz-free) plus the
 * UI-required fields. Returns the first message per field; `{}` when the input is valid.
 */
export function validateLead(
  formKey: FormKey,
  values: LeadValues,
  consent: boolean,
  params: FormParams = {}
): LeadErrors {
  const known = new Set<string>([...FORM_FIELDS[formKey], CONSENT_KEY]);
  const errors: LeadErrors = {};

  for (const field of REQUIRED_FIELDS[formKey]) {
    if (!(values[field] ?? "").trim()) errors[field] = REQUIRED_MESSAGE;
  }

  const body = buildLeadBody(formKey, values, params, { ...VALIDATION_META, consent });
  const schema = siteFormLeadSchema(formKey) as z.ZodType;
  const result = schema.safeParse(body);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (typeof key !== "string" || !known.has(key)) continue;
      const name = key as keyof LeadErrors;
      errors[name] ??= issue.message;
    }
  }
  return errors;
}

/** Keys of `errors` in display order (fields, then consent): the first one gets focus. */
export function orderedErrorKeys(formKey: FormKey, errors: LeadErrors): Array<keyof LeadErrors> {
  const order: Array<keyof LeadErrors> = [...FORM_FIELDS[formKey], CONSENT_KEY];
  return order.filter((key) => Boolean(errors[key]));
}

/**
 * Server field errors (`fields` of a 400 `validation` answer, keyed by schema path) mapped onto
 * this form's fields; unknown paths are ignored (the caller shows the generic banner).
 */
export function mapServerFieldErrors(
  formKey: FormKey,
  fields: Record<string, string> | undefined
): LeadErrors {
  if (!fields) return {};
  const known = new Set<string>([...FORM_FIELDS[formKey], CONSENT_KEY]);
  const errors: LeadErrors = {};
  for (const [path, message] of Object.entries(fields)) {
    const key = path.split(".")[0] ?? "";
    if (known.has(key)) errors[key as keyof LeadErrors] ??= message;
  }
  return errors;
}
