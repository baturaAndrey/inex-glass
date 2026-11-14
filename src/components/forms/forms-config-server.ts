import { unstable_rethrow } from "next/navigation";
import { getContacts, getSiteSettings, primaryEmail, primaryPhone } from "@/lib/cms/globals";
import { FORM_TEXTS, PHONE_PLACEHOLDER } from "./form-texts";
import type { FormsConfig } from "./use-forms-config";

/**
 * Server side of the forms config (task 21): public, safe fields of the `contacts` and
 * `site-settings` globals through the cached loaders of task 15. Used by
 * `GET /api/forms-config/` (modal forms) and by `FormSection` (inline forms, no request).
 */

export interface ServerFormsConfig extends FormsConfig {
  /** Primary e-mail (the left column of `FormSection`); not part of the public endpoint. */
  email: string;
}

const textOr = (value: string | null | undefined, fallback: string): string =>
  value && value.trim() !== "" ? value : fallback;

/** `{телефон}` replaced by the phone; left as is when the phone is unknown (the client fills it). */
export function fillPhone(text: string, phone: string): string {
  return phone ? text.split(PHONE_PLACEHOLDER).join(phone) : text;
}

/**
 * A failed read becomes `null` (the form still works with the defaults), but Next's own control
 * flow (the build-time `connection()` bail-out of the loaders) is re-thrown.
 */
function orNull<T>(promise: Promise<T>): Promise<T | null> {
  return promise.catch((error: unknown) => {
    unstable_rethrow(error);
    return null;
  });
}

/** Reads the globals; on a database failure the `FORM_TEXTS` defaults are returned. */
export async function getServerFormsConfig(): Promise<ServerFormsConfig> {
  const [contacts, settings] = await Promise.all([
    orNull(getContacts()),
    orNull(getSiteSettings()),
  ]);
  const phone = primaryPhone(contacts).trim();
  const forms = settings?.forms;
  return {
    phone,
    email: primaryEmail(contacts).trim(),
    workHours: contacts?.workHours?.full?.trim() ?? "",
    thankYouTitle: textOr(forms?.thankYouTitle, FORM_TEXTS.thankYouTitle),
    thankYouText: textOr(forms?.thankYouText, FORM_TEXTS.thankYouText),
    submitErrorText: fillPhone(textOr(forms?.submitErrorText, FORM_TEXTS.submitErrorText), phone),
  };
}
