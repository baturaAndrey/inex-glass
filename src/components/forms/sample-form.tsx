"use client";

import {
  LeadFormShell,
  PhoneField,
  SelectField,
  TextareaField,
  TextField,
  useLeadForm,
} from "./form-shell";
import { FORM_TEXTS, SAMPLE_GLASS_KINDS } from "./form-texts";
import { paramText } from "./lead-body";
import type { FormComponentProps } from "./form-dialog-provider";

const GLASS_KIND_OPTIONS = SAMPLE_GLASS_KINDS.map((kind) => kind.value);

/**
 * «Заказать образец». `params.vid` of a glass-type page (`matte`, `tinted`, …) pre-selects
 * «Вид стекла». «Адрес или город» is optional (coordinator decision).
 */
export function SampleForm({ params, onClose, onSuccess, variant }: FormComponentProps) {
  const form = useLeadForm({ formKey: "sample", params, onSuccess });
  const { labels, placeholders } = FORM_TEXTS;

  return (
    <LeadFormShell
      form={form}
      variant={variant}
      onClose={onClose}
      submitLabel={paramText(params, "submitLabel") ?? FORM_TEXTS.submit.sample}
      intro={<p className="m-0">{FORM_TEXTS.sample.intro}</p>}
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
      <SelectField
        form={form}
        name="glassKind"
        label={labels.glassKind}
        options={GLASS_KIND_OPTIONS}
        placeholder={FORM_TEXTS.sample.glassKindPlaceholder}
      />
      <TextField
        form={form}
        name="address"
        label={labels.address}
        placeholder={placeholders.city}
        autoComplete="street-address"
      />
      <TextareaField form={form} name="comment" label={labels.comment} />
    </LeadFormShell>
  );
}
