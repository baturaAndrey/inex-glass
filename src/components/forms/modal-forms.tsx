"use client";

import type { ComponentType } from "react";
import { CallbackForm } from "./callback-form";
import { ContactsForm } from "./contacts-form";
import { DrawingForm, FullForm } from "./drawing-form";
import { LoadForm } from "./load-form";
import { SampleForm } from "./sample-form";
import type { FormComponentProps, FormKey } from "./form-dialog-provider";

/**
 * formKey → form component for the MODAL path only (`./form-dialog`).
 *
 * Static imports on purpose: this module is reached only from `./form-dialog`, which
 * `FormDialogProvider` loads with `next/dynamic({ ssr: false })` on the first `openForm()` (or a
 * trigger's hover / focus). So the forms already sit in a lazy chunk, and splitting them again
 * would only add a second network round trip to the first open.
 *
 * Keep it separate from `./registry` (the page path): when one module with `next/dynamic` loaders
 * was reachable both from the page entry and from this lazy chunk, the Turbopack production
 * build listed chunk files in `react-loadable-manifest.json` that were never emitted, and every
 * page with an inline form preloaded a 404 (Wave 7).
 */
export const MODAL_FORMS: Readonly<Record<FormKey, ComponentType<FormComponentProps>>> = {
  drawing: DrawingForm,
  callback: CallbackForm,
  sample: SampleForm,
  load: LoadForm,
  contacts: ContactsForm,
  full: FullForm,
};
