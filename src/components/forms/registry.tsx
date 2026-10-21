"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { FormsConfigContext } from "./use-forms-config";
import type { FormComponentProps, FormKey, FormParams } from "./form-dialog-provider";
import type { FormsConfig } from "./use-forms-config";

// The form contract types are defined next to the provider; re-exported for registry consumers.
export type { FormComponentProps, FormKey, FormParams } from "./form-dialog-provider";

/**
 * Registry formKey → form component (task 21) for the PAGE path: `FormSection` / the `form`
 * block (through `InlineForm`) and `UploadCard`, all `variant: 'page'`.
 *
 * Every form is a `next/dynamic` chunk, server-rendered (`ssr` stays on): the catch-all route
 * statically references every block, so static imports would ship all six forms (and zod) with
 * every page of that route (+45 KB gzip measured); this way only pages that render a form load it.
 *
 * The modal does NOT use this module: it has its own static map in `./modal-forms`, inside the
 * lazy `./form-dialog` chunk. Do not import this registry from the dialog again: with these
 * loaders reachable both from the page entry and from the lazy dialog chunk, the Turbopack
 * production build wrote never-emitted chunk files into `react-loadable-manifest.json`, so every
 * page with an inline form preloaded a 404 (Wave 7). Verify any change here on a prod build: no
 * `/_next/static/` 404 on `/`, `/kontakty/`, `/kak-zakazat/trebovaniya-k-chertezham/`.
 */

function FormLoading() {
  return (
    <div role="status" className="text-muted grid min-h-40 place-items-center">
      <Loader2 aria-hidden="true" className="size-6 animate-spin" />
      <span className="sr-only">Загрузка формы</span>
    </div>
  );
}

const loading = () => <FormLoading />;

const DrawingForm = dynamic(() => import("./drawing-form").then((mod) => mod.DrawingForm), {
  loading,
});
const FullForm = dynamic(() => import("./drawing-form").then((mod) => mod.FullForm), {
  loading,
});
const CallbackForm = dynamic(() => import("./callback-form").then((mod) => mod.CallbackForm), {
  loading,
});
const SampleForm = dynamic(() => import("./sample-form").then((mod) => mod.SampleForm), {
  loading,
});
const LoadForm = dynamic(() => import("./load-form").then((mod) => mod.LoadForm), { loading });
const ContactsForm = dynamic(() => import("./contacts-form").then((mod) => mod.ContactsForm), {
  loading,
});

export const FORM_REGISTRY: Record<FormKey, ComponentType<FormComponentProps>> = {
  drawing: DrawingForm,
  callback: CallbackForm,
  sample: SampleForm,
  load: LoadForm,
  contacts: ContactsForm,
  full: FullForm,
};

/** Inline forms have nothing to close. */
const noop = () => {};

export interface InlineFormProps {
  formKey: FormKey;
  params: FormParams;
  /** CMS values read on the server (`FormSection`): no `/api/forms-config/` request. */
  config: FormsConfig;
}

/** A registry form embedded in a page (`variant="page"`); the thank-you screen replaces it. */
export function InlineForm({ formKey, params, config }: InlineFormProps) {
  const Form = FORM_REGISTRY[formKey];
  return (
    <FormsConfigContext.Provider value={config}>
      <Form params={params} onClose={noop} variant="page" />
    </FormsConfigContext.Provider>
  );
}
