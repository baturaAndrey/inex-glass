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
import type { FormComponentProps } from "./form-dialog-provider";

/** Form of the «Контакты» page («Отправьте чертёж»); «Имя» is added because the schema needs `name`. */
export function ContactsForm({ params, onClose, onSuccess, variant }: FormComponentProps) {
  const form = useLeadForm({ formKey: "contacts", params, onSuccess });
  const { labels, placeholders } = FORM_TEXTS;

  return (
    <LeadFormShell
      form={form}
      variant={variant}
      onClose={onClose}
      submitLabel={paramText(params, "submitLabel") ?? FORM_TEXTS.submit.contacts}
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
      <TextareaField form={form} name="comment" label={labels.comment} />
    </LeadFormShell>
  );
}
