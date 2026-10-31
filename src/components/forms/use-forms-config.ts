"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FORM_TEXTS, PHONE_PLACEHOLDER } from "./form-texts";

/**
 * CMS values the forms show: primary phone, working hours and the thank-you / error texts of
 * `site-settings.forms` (`GET /api/forms-config/`).
 *
 * Inline forms (`FormSection`, server-rendered) receive them from the server through
 * `FormsConfigContext`; modal forms request the endpoint once per page session. Until the answer
 * arrives (or when it fails) `FORM_TEXTS` and the first `tel:` link of the page are used, so a
 * form is always complete.
 */

export interface FormsConfig {
  /** Primary phone as displayed, «+7 (351) 247-05-57»; `''` when unknown. */
  phone: string;
  /** «Пн–пт, 9:00–18:00»; `''` when unknown. */
  workHours: string;
  thankYouTitle: string;
  thankYouText: string;
  /** Error banner text; `{телефон}` is substituted when the phone is known. */
  submitErrorText: string;
}

export const FORMS_CONFIG_URL = "/api/forms-config/";

/** Server-provided config of inline forms; `null` → fetch it. */
export const FormsConfigContext = createContext<FormsConfig | null>(null);

const DEFAULT_CONFIG: FormsConfig = {
  phone: "",
  workHours: "",
  thankYouTitle: FORM_TEXTS.thankYouTitle,
  thankYouText: FORM_TEXTS.thankYouText,
  submitErrorText: FORM_TEXTS.submitErrorText,
};

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

/** Untrusted JSON → config; missing or empty fields keep the defaults. */
export function parseFormsConfig(json: unknown): FormsConfig {
  const raw = typeof json === "object" && json !== null ? (json as Record<string, unknown>) : {};
  return {
    phone: nonEmpty(raw.phone) ? raw.phone.trim() : DEFAULT_CONFIG.phone,
    workHours: nonEmpty(raw.workHours) ? raw.workHours.trim() : DEFAULT_CONFIG.workHours,
    thankYouTitle: nonEmpty(raw.thankYouTitle) ? raw.thankYouTitle : DEFAULT_CONFIG.thankYouTitle,
    thankYouText: nonEmpty(raw.thankYouText) ? raw.thankYouText : DEFAULT_CONFIG.thankYouText,
    submitErrorText: nonEmpty(raw.submitErrorText)
      ? raw.submitErrorText
      : DEFAULT_CONFIG.submitErrorText,
  };
}

/** One request per page session, shared by every modal form. */
let pending: Promise<FormsConfig | null> | null = null;
let loaded: FormsConfig | null = null;

function loadFormsConfig(): Promise<FormsConfig | null> {
  pending ??= fetch(FORMS_CONFIG_URL, { headers: { Accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) throw new Error(`forms-config ${response.status}`);
      loaded = parseFormsConfig(await response.json());
      return loaded;
    })
    .catch(() => {
      // Allow a later form to retry; this one keeps the defaults.
      pending = null;
      return null;
    });
  return pending;
}

/**
 * Text of the first `tel:` link on the page (header/footer phone): fallback for the error text
 * when the config has no phone. Client-only: call it from UI that never renders on the server.
 */
export function phoneFromPage(): string {
  if (typeof document === "undefined") return "";
  const link = document.querySelector<HTMLAnchorElement>('a[href^="tel:"]');
  return link?.textContent?.trim() ?? "";
}

/**
 * Forms config: the server-provided one (inline forms), otherwise the endpoint's answer, with
 * `FORM_TEXTS` and the page phone as the fallback.
 */
export function useFormsConfig(): FormsConfig {
  const provided = useContext(FormsConfigContext);
  const [fetched, setFetched] = useState<FormsConfig | null>(loaded);

  useEffect(() => {
    if (provided || loaded) return;
    let active = true;
    void loadFormsConfig().then((config) => {
      if (active && config) setFetched(config);
    });
    return () => {
      active = false;
    };
  }, [provided]);

  return provided ?? fetched ?? DEFAULT_CONFIG;
}

/**
 * Splits the error text around the phone so the caller can render it as a `tel:` link:
 * `{телефон}` placeholder first, otherwise the phone itself if the text contains it.
 */
export function splitAroundPhone(
  text: string,
  phone: string
): { before: string; phone: string; after: string } | null {
  if (!phone) return null;
  const marker = text.includes(PHONE_PLACEHOLDER) ? PHONE_PLACEHOLDER : phone;
  const index = text.indexOf(marker);
  if (index === -1) return null;
  return {
    before: text.slice(0, index),
    phone,
    after: text.slice(index + marker.length),
  };
}
