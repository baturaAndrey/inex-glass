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
 * Registry formKey → form component (task 21), rendered by `FormDialogProvider` (modal) and by
 * `FormSection` / the `form` block (`variant: 'page'`, through `InlineForm`).
 *
 * Every form is a `next/dynamic` chunk: the provider sits in the site layout, so static imports
 * would put all six forms into the initial bundle of every page. Inline forms are still
 * server-rendered (`ssr` stays on); the modal shows a spinner while its chunk loads.
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
