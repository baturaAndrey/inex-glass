import { z } from "zod";

/**
 * Ad-click attribution schema shared by the quiz answers (`quiz-schema.ts`) and every site form
 * (`lead-form-schemas.ts`). A separate module so the site forms do not bundle the quiz schema.
 */

/** Limits of the ad-click attribution values (longer values are dropped, never rejected). */
const MAX_CLICK_ID = 500;
const MAX_REFERRER = 1000;

/** One attribution value: a trimmed string within `max`; anything else is silently dropped. */
const softAttributionText = (max: number) =>
  z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().trim().max(max).optional()
    )
    .catch(undefined);

/**
 * Ad click ids and the external referrer of the session (`getLeadAttribution().extra`). The
 * `leads` collection has no columns for them, so they are stored in the `answers` JSON. Purely
 * informational: an invalid value (or the whole object) degrades to `undefined` and never fails
 * a lead.
 */
export const leadAttributionSchema = z
  .object({
    yclid: softAttributionText(MAX_CLICK_ID),
    gclid: softAttributionText(MAX_CLICK_ID),
    referrer: softAttributionText(MAX_REFERRER),
  })
  .partial()
  .optional()
  .catch(undefined);
export type LeadAttributionExtra = z.infer<typeof leadAttributionSchema>;
