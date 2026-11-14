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
import { paramText, paramThickness, thicknessLabel } from "./lead-body";
import type { FormComponentProps } from "./form-dialog-provider";

/**
 * «Подобрать под нагрузку»: the construction description first, then contacts and an optional
 * file. `params.thickness` (opened from a thickness card) is shown and sent with the lead.
 */
export function LoadForm({ params, onClose, onSuccess, variant }: FormComponentProps) {
  const form = useLeadForm({ formKey: "load", params, onSuccess });
  const { labels, placeholders } = FORM_TEXTS;
  const thickness = paramThickness(params);

  return (
    <LeadFormShell
      form={form}
      variant={variant}
      onClose={onClose}
      submitLabel={paramText(params, "submitLabel") ?? FORM_TEXTS.submit.load}
      intro={
        <>
          <p className="m-0">{FORM_TEXTS.load.intro}</p>
          {thickness !== null ? (
            <p className="text-primary-dark m-0 font-semibold">{thicknessLabel(thickness)}</p>
          ) : null}
        </>
      }
    >
      <TextareaField form={form} name="description" label={labels.description} required />
      <TextField form={form} name="sizes" label={labels.sizes} personal={false} />
      <TextField form={form} name="mounting" label={labels.mounting} personal={false} />
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
    </LeadFormShell>
  );
}
