"use client";

import {
  FileField,
  LeadFormShell,
  PhoneField,
  TextareaField,
  TextField,
  useLeadForm,
} from "./form-shell";
import { FORM_TEXTS } from "./form-texts";
import { paramText } from "./lead-body";
import type { FormComponentProps, FormKey } from "./form-dialog-provider";

type DrawingMode = Extract<FormKey, "drawing" | "full">;

/**
 * «Отправить чертёж» — one parameterised form: `label` (dialog title and `sourceLabel`),
 * `source`, `accept`. The short version (`drawing`) opens in the modal; the full version
 * (`full`, «Получить расчёт») adds the delivery city and the area and is embedded in pages.
 */
function DrawingFields({
  mode,
  params,
  onClose,
  onSuccess,
  variant,
}: FormComponentProps & { mode: DrawingMode }) {
  const form = useLeadForm({ formKey: mode, params, onSuccess });
  const { labels, placeholders } = FORM_TEXTS;

  return (
    <LeadFormShell
      form={form}
      variant={variant}
      onClose={onClose}
      submitLabel={paramText(params, "submitLabel") ?? FORM_TEXTS.submit[mode]}
      note={FORM_TEXTS.kpNote}
    >
      <TextField
        form={form}
        name="company"
        label={labels.company}
        required
        placeholder={placeholders.company}
        autoComplete="organization"
      />
      <TextField
        form={form}
        name="name"
        label={labels.name}
        required
        placeholder={placeholders.name}
        autoComplete="name"
      />
      <PhoneField form={form} />
      <TextField
        form={form}
        name="email"
        label={labels.email}
        type="email"
        inputMode="email"
        placeholder={placeholders.email}
        autoComplete="email"
      />
      <FileField form={form} label={paramText(params, "fileLabel")} />
      {mode === "full" ? (
        <>
          <TextField
            form={form}
            name="city"
            label={labels.city}
            placeholder={placeholders.city}
            autoComplete="address-level2"
            personal={false}
          />
          <TextField
            form={form}
            name="area"
            label={labels.area}
            inputMode="decimal"
            placeholder={placeholders.area}
            personal={false}
          />
        </>
      ) : null}
      <TextareaField form={form} name="comment" label={labels.comment} />
    </LeadFormShell>
  );
}

export function DrawingForm(props: FormComponentProps) {
  return <DrawingFields {...props} mode="drawing" />;
}

/** Full form of the home page, the hub and the thickness cards (`formType: 'full'`). */
export function FullForm(props: FormComponentProps) {
  return <DrawingFields {...props} mode="full" />;
}
