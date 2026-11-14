import { z } from "zod";
import {
  callbackLeadSchema,
  contactsLeadSchema,
  drawingLeadSchema,
  fullLeadSchema,
  leadFormSchema,
  loadLeadSchema,
  sampleLeadSchema,
  SITE_FORM_LEAD_SCHEMAS,
} from "./lead-form-schemas";
import { quizAnswersSchema } from "./quiz-schema";
import type { FormType } from "./lead-form-schemas";

/**
 * Lead submission schemas of every site form AND the quiz. The server validates with
 * `leadSubmitSchema` (task 17). The site-form schemas live in `./lead-form-schemas` (quiz-free,
 * imported directly by the client forms) and are re-exported here, so existing imports from
 * `@/lib/domain/lead-schemas` and the `@/lib/domain` barrel keep working.
 */

export * from "./lead-form-schemas";

export const quizLeadSchema = leadFormSchema("quiz", { answers: quizAnswersSchema });

const LEAD_FORM_SCHEMAS = {
  quiz: quizLeadSchema,
  ...SITE_FORM_LEAD_SCHEMAS,
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

/**
 * Schema of a single form (quiz included). Client site forms use the quiz-free
 * `siteFormLeadSchema` of `./lead-form-schemas` instead.
 */
export function leadSubmitSchemaForForm<T extends FormType>(
  formType: T
): (typeof LEAD_FORM_SCHEMAS)[T] {
  return LEAD_FORM_SCHEMAS[formType];
}
