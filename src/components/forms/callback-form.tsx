"use client";

import { LeadFormShell, PhoneField, TextField, useLeadForm } from "./form-shell";
import { FORM_TEXTS } from "./form-texts";
import { paramText } from "./lead-body";
import { useFormsConfig } from "./use-forms-config";
import type { FormComponentProps } from "./form-dialog-provider";

/** «Заказать звонок»: name and phone; the working hours (global `contacts`) under the fields. */
export function CallbackForm({ params, onClose, onSuccess, variant }: FormComponentProps) {
  const form = useLeadForm({ formKey: "callback", params, onSuccess });
  const { workHours } = useFormsConfig();

  return (
    <LeadFormShell
      form={form}
      variant={variant}
      onClose={onClose}
      submitLabel={paramText(params, "submitLabel") ?? FORM_TEXTS.submit.callback}
    >
      <TextField
        form={form}
        name="name"
        label={FORM_TEXTS.labels.name}
        required
        placeholder={FORM_TEXTS.placeholders.name}
        autoComplete="name"
      />
      <PhoneField form={form} />
      {workHours ? (
        <p data-slot="form-work-hours" className="ig-small text-text-2 m-0 @md:col-span-2">
          {workHours}
        </p>
      ) : null}
    </LeadFormShell>
  );
}
