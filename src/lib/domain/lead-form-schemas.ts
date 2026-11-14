import { z } from "zod";
import {
  consentField,
  emailField,
  MAX_LONG_TEXT,
  MAX_SHORT_TEXT,
  optionalText,
  phoneField,
  requiredText,
  softNumber,
} from "./contact-fields";
import { leadAttributionSchema } from "./lead-attribution";

/**
 * Lead schemas of the SITE forms (drawing, callback, sample, load, contacts, full) — everything
 * of `./lead-schemas` except the quiz variant. The client forms import this module directly, so
 * their bundle does not carry the quiz answers schema (`./quiz-schema`, ~16 KB); the server keeps
 * using `./lead-schemas` (`leadSubmitSchema`), which re-exports everything declared here.
 * Phones are normalized to `+7XXXXXXXXXX`, e-mails to lower case.
 */

export {
  CONSENT_MESSAGE,
  EMAIL_MESSAGE,
  INN_MESSAGE,
  normalizeEmail,
  normalizePhone,
  PHONE_MESSAGE,
  REQUIRED_MESSAGE,
} from "./contact-fields";

/** Ids equal `LEAD_FORM_TYPES` of the CRM schema (`leads.formType`). */
export const FORM_TYPES = [
  "quiz",
  "drawing",
  "callback",
  "sample",
  "load",
  "contacts",
  "full",
] as const;
export type FormType = (typeof FORM_TYPES)[number];
/** Form types of the site forms (everything but the quiz). */
export type SiteFormType = Exclude<FormType, "quiz">;

export const MAX_UPLOAD_TOKENS = 5;
const MAX_PATH = 500;
const MAX_METRIKA_ID = 64;

const utmSchema = z.object({
  source: optionalText(),
  medium: optionalText(),
  campaign: optionalText(),
  term: optionalText(),
  content: optionalText(),
});

const uploadTokensSchema = z.array(z.string().min(1).max(MAX_SHORT_TEXT)).max(MAX_UPLOAD_TOKENS);

/** Fields common to every form: attribution, consent, anti-spam. */
const leadBase = {
  /** Path of the page where the visitor entered the site. */
  entryPage: z.string().max(MAX_PATH),
  utm: utmSchema.optional(),
  metrikaClientId: z.string().max(MAX_METRIKA_ID).optional(),
  consent: consentField(),
  formToken: z.string().min(1).max(MAX_LONG_TEXT),
  /** Honeypot: any string is accepted here; the server decides what to do with a filled one. */
  company_website: z.string().optional(),
  uploadTokens: uploadTokensSchema.optional(),
  /**
   * Ad click ids / external referrer; never blocks a lead. Site forms send it here and the
   * server keeps it in the stored `answers` JSON; the quiz sends it inside `answers.attribution`.
   */
  attribution: leadAttributionSchema,
};

const contactBase = {
  name: requiredText(),
  phone: phoneField(),
};

/** «Отправить чертёж» and the full form share one field set. */
const drawingFields = {
  ...contactBase,
  company: optionalText(),
  email: emailField(),
  city: optionalText(100),
  area: softNumber({ min: 0 }),
  comment: optionalText(MAX_LONG_TEXT),
  /** Where the visitor clicked, e.g. «Отправить чертёж». */
  sourceLabel: optionalText(),
  /** Page context (thickness, kind, …) passed by the button. */
  params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
};

/** `{ formType: literal, ...common fields, ...form fields }` — one variant of the lead union. */
export const leadFormSchema = <const T extends FormType, S extends z.ZodRawShape>(
  formType: T,
  shape: S
) => z.object({ formType: z.literal(formType), ...leadBase, ...shape });

export const drawingLeadSchema = leadFormSchema("drawing", drawingFields);
export const fullLeadSchema = leadFormSchema("full", drawingFields);
export const callbackLeadSchema = leadFormSchema("callback", contactBase);
export const sampleLeadSchema = leadFormSchema("sample", {
  ...contactBase,
  company: optionalText(),
  email: emailField(),
  glassKind: optionalText(),
  /** City or delivery address of the sample. */
  address: optionalText(MAX_LONG_TEXT),
  comment: optionalText(MAX_LONG_TEXT),
});
export const loadLeadSchema = leadFormSchema("load", {
  description: requiredText(MAX_LONG_TEXT),
  sizes: optionalText(MAX_LONG_TEXT),
  mounting: optionalText(MAX_LONG_TEXT),
  ...contactBase,
  company: optionalText(),
  email: emailField(),
});
export const contactsLeadSchema = leadFormSchema("contacts", {
  ...contactBase,
  company: optionalText(),
  email: emailField(),
  comment: optionalText(MAX_LONG_TEXT),
});

export const SITE_FORM_LEAD_SCHEMAS = {
  drawing: drawingLeadSchema,
  callback: callbackLeadSchema,
  sample: sampleLeadSchema,
  load: loadLeadSchema,
  contacts: contactsLeadSchema,
  full: fullLeadSchema,
} as const satisfies Record<SiteFormType, z.ZodType>;

/** Schema of a single site form, for client-side validation (quiz-free). */
export function siteFormLeadSchema<T extends SiteFormType>(
  formType: T
): (typeof SITE_FORM_LEAD_SCHEMAS)[T] {
  return SITE_FORM_LEAD_SCHEMAS[formType];
}
