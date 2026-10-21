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
import { leadAttributionSchema, quizAnswersSchema } from "./quiz-schema";

/**
 * Lead submission schemas of every site form. The same schemas validate on the client
 * (`leadSubmitSchemaForForm`) and on the server (`leadSubmitSchema`, task 17). Phones are
 * normalized to `+7XXXXXXXXXX`, e-mails to lower case.
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

const formSchema = <const T extends FormType, S extends z.ZodRawShape>(formType: T, shape: S) =>
  z.object({ formType: z.literal(formType), ...leadBase, ...shape });

export const quizLeadSchema = formSchema("quiz", { answers: quizAnswersSchema });
export const drawingLeadSchema = formSchema("drawing", drawingFields);
export const fullLeadSchema = formSchema("full", drawingFields);
export const callbackLeadSchema = formSchema("callback", contactBase);
export const sampleLeadSchema = formSchema("sample", {
  ...contactBase,
  company: optionalText(),
  email: emailField(),
  glassKind: optionalText(),
  /** City or delivery address of the sample. */
  address: optionalText(MAX_LONG_TEXT),
  comment: optionalText(MAX_LONG_TEXT),
});
export const loadLeadSchema = formSchema("load", {
  description: requiredText(MAX_LONG_TEXT),
  sizes: optionalText(MAX_LONG_TEXT),
  mounting: optionalText(MAX_LONG_TEXT),
  ...contactBase,
  company: optionalText(),
  email: emailField(),
});
export const contactsLeadSchema = formSchema("contacts", {
  ...contactBase,
  company: optionalText(),
  email: emailField(),
  comment: optionalText(MAX_LONG_TEXT),
});

const LEAD_FORM_SCHEMAS = {
  quiz: quizLeadSchema,
  drawing: drawingLeadSchema,
  callback: callbackLeadSchema,
  sample: sampleLeadSchema,
  load: loadLeadSchema,
  contacts: contactsLeadSchema,
  full: fullLeadSchema,
} as const satisfies Record<FormType, z.ZodType>;

/** Server-side schema of `POST /api/leads`: one variant per `formType`. */
export const leadSubmitSchema = z.discriminatedUnion("formType", [
  quizLeadSchema,
  drawingLeadSchema,
  callbackLeadSchema,
  sampleLeadSchema,
  loadLeadSchema,
  contactsLeadSchema,
  fullLeadSchema,
]);
export type LeadSubmit = z.infer<typeof leadSubmitSchema>;
export type LeadSubmitOf<T extends FormType> = Extract<LeadSubmit, { formType: T }>;

/** Schema of a single form, for client-side validation. */
export function leadSubmitSchemaForForm<T extends FormType>(
  formType: T
): (typeof LEAD_FORM_SCHEMAS)[T] {
  return LEAD_FORM_SCHEMAS[formType];
}
