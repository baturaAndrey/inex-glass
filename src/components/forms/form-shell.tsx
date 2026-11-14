"use client";

import { useEffect, useId, useRef } from "react";
import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ig/button";
import { ConsentCheckbox } from "@/components/ig/consent-checkbox";
import { Field } from "@/components/ig/field";
import { acceptedFormatLabels, FileUpload, formatFileSize } from "@/components/ig/file-upload";
import { Input } from "@/components/ig/input";
import { PhoneInput } from "@/components/ig/phone-input";
import { Select } from "@/components/ig/select";
import { Textarea } from "@/components/ig/textarea";
import { telHref } from "@/components/layout/nav-data";
import { MAX_UPLOAD_BYTES } from "@/lib/client/upload-file";
import { cn } from "@/lib/utils";
import { FORM_TEXTS, PHONE_PLACEHOLDER } from "./form-texts";
import { CONSENT_KEY } from "./lead-body";
import { phoneFromPage, splitAroundPhone, useFormsConfig } from "./use-forms-config";
import type { LeadFieldName } from "./lead-body";
import type { LeadFormState } from "./use-lead-form";

export { useLeadForm } from "./use-lead-form";
export type { LeadFormState } from "./use-lead-form";

/**
 * Shared shell of the site forms (task 21): field grid, honeypot, consent, error banner, the
 * submit footer and the thank-you screen. The form components only list their fields.
 *
 * In the modal (`variant="modal"`) the footer sticks to the bottom of the full-screen dialog on
 * ≤599 px; the dialog title comes from `FormDialogProvider`, so the shell renders no heading.
 */

/** Class of the contact inputs: Metrika Webvisor must not record what is typed (task 19). */
const NO_RECORD = "ym-disable-keys";
/** Grid item spanning both columns. */
const WIDE = "@md:col-span-2";

// ---------------------------------------------------------------------------------------------
// Thank-you screen and error banner
// ---------------------------------------------------------------------------------------------

export interface FormThanksProps {
  title: string;
  text: string;
  /** Shows the «Закрыть» button (modal). */
  onClose?: (() => void) | undefined;
  className?: string | undefined;
}

/** «Спасибо, заявка принята»: replaces the form; the heading takes focus. */
export function FormThanks({ title, text, onClose, className }: FormThanksProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      data-slot="form-thanks"
      aria-live="polite"
      className={cn("flex flex-col items-start gap-4 py-2", className)}
    >
      <span
        aria-hidden="true"
        className="bg-primary-light text-primary-pressed grid size-14 place-items-center rounded-full"
      >
        <Check className="size-7" strokeWidth={2.5} />
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="ig-h4 m-0 outline-none">
        {title}
      </h3>
      <p className="ig-body text-text-2 m-0 max-w-[560px]">{text}</p>
      {onClose ? (
        <Button variant="secondary" onClick={onClose}>
          {FORM_TEXTS.closeLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** «Не удалось отправить заявку. Попробуйте ещё раз или позвоните: <tel>». */
export function SubmitErrorBanner({ text, phone }: { text: string; phone: string }) {
  // The banner appears only after a failed submission (never server-rendered), so the page's
  // `tel:` link can be read during render.
  const parts = splitAroundPhone(text, phone || phoneFromPage());
  return (
    <div
      role="alert"
      data-slot="form-submit-error"
      className="bg-danger-bg text-danger-text text-small flex items-start gap-3 rounded-md p-4"
    >
      <TriangleAlert aria-hidden="true" strokeWidth={2} className="mt-0.5 size-5 flex-none" />
      <p className="m-0">
        {parts ? (
          <>
            {parts.before}
            <a
              href={telHref(parts.phone)}
              className="font-semibold whitespace-nowrap underline underline-offset-2"
            >
              {parts.phone}
            </a>
            {parts.after}
          </>
        ) : (
          text.replace(PHONE_PLACEHOLDER, "").trim()
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------------------------

interface FieldBaseProps {
  form: LeadFormState;
  name: LeadFieldName;
  label: string;
  required?: boolean | undefined;
  /** Spans both grid columns. */
  wide?: boolean | undefined;
}

export interface TextFieldProps extends FieldBaseProps {
  placeholder?: string | undefined;
  type?: HTMLInputTypeAttribute | undefined;
  inputMode?: "text" | "email" | "numeric" | "decimal" | undefined;
  autoComplete?: string | undefined;
  /** Contact data: hidden from Webvisor. */
  personal?: boolean | undefined;
}

export function TextField({
  form,
  name,
  label,
  required,
  wide,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  personal = true,
}: TextFieldProps) {
  return (
    <Field
      label={label}
      required={required}
      error={form.errors[name]}
      htmlFor={form.fieldId(name)}
      className={wide ? WIDE : undefined}
    >
      <Input
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        value={form.values[name] ?? ""}
        onChange={(event) => form.setValue(name, event.target.value)}
        className={personal ? NO_RECORD : undefined}
      />
    </Field>
  );
}

export function PhoneField({ form, wide }: { form: LeadFormState; wide?: boolean | undefined }) {
  return (
    <Field
      label={FORM_TEXTS.labels.phone}
      required
      error={form.errors.phone}
      htmlFor={form.fieldId("phone")}
      className={wide ? WIDE : undefined}
    >
      <PhoneInput
        name="phone"
        required
        value={form.values.phone ?? ""}
        onChange={(masked) => form.setValue("phone", masked)}
        className={NO_RECORD}
      />
    </Field>
  );
}

export interface TextareaFieldProps extends FieldBaseProps {
  placeholder?: string | undefined;
  rows?: number | undefined;
}

export function TextareaField({
  form,
  name,
  label,
  required,
  wide = true,
  placeholder,
  rows,
}: TextareaFieldProps) {
  return (
    <Field
      label={label}
      required={required}
      error={form.errors[name]}
      htmlFor={form.fieldId(name)}
      className={wide ? WIDE : undefined}
    >
      <Textarea
        name={name}
        required={required}
        rows={rows}
        placeholder={placeholder}
        value={form.values[name] ?? ""}
        onChange={(event) => form.setValue(name, event.target.value)}
        className={NO_RECORD}
      />
    </Field>
  );
}

export interface SelectFieldProps extends FieldBaseProps {
  options: readonly string[];
  placeholder?: string | undefined;
}

export function SelectField({
  form,
  name,
  label,
  required,
  wide,
  options,
  placeholder,
}: SelectFieldProps) {
  return (
    <Field
      label={label}
      required={required}
      error={form.errors[name]}
      htmlFor={form.fieldId(name)}
      className={wide ? WIDE : undefined}
    >
      <Select
        name={name}
        required={required}
        placeholder={placeholder}
        value={form.values[name] ?? ""}
        onChange={(event) => form.setValue(name, event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** «DWG, DXF, PDF · до 50 МБ» (the prototypes' hint lists the formats with commas). */
export function uploadHint(accept: readonly string[]): string {
  return `${acceptedFormatLabels(accept).join(", ")} · до ${formatFileSize(MAX_UPLOAD_BYTES)}`;
}

/** One drawing file, uploaded right after selection; its token goes into `uploadTokens`. */
export function FileField({ form, label }: { form: LeadFormState; label?: string | undefined }) {
  const { upload } = form;
  return (
    // `group`: the drop zone is named by the label via `aria-labelledby` (no `<label for>`).
    <Field label={label || FORM_TEXTS.labels.file} group className={WIDE}>
      <FileUpload
        name="file"
        accept={form.accept}
        maxBytes={MAX_UPLOAD_BYTES}
        value={upload.kind === "done" ? { name: upload.name, size: upload.size } : null}
        uploading={
          upload.kind === "uploading"
            ? { name: upload.name, size: upload.size, progress: upload.progress }
            : null
        }
        onSelect={form.selectFile}
        onClear={form.clearFile}
        onReject={form.rejectFile}
        error={form.uploadError}
        hint={uploadHint(form.accept)}
        disabled={form.submitting}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------------------------

/** Off-screen anti-spam field: people never see or fill it; bots usually do. */
function Honeypot({ form }: { form: LeadFormState }) {
  const id = useId();
  return (
    <div aria-hidden="true" className="absolute top-0 -left-[10000px] h-px w-px overflow-hidden">
      <label htmlFor={id}>Сайт компании</label>
      <input
        id={id}
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        value={form.honeypot}
        onChange={(event) => form.setHoneypot(event.target.value)}
      />
    </div>
  );
}

export interface LeadFormShellProps {
  form: LeadFormState;
  variant: "modal" | "page";
  submitLabel: string;
  onClose: () => void;
  /** Text above the fields (sample, load). */
  intro?: ReactNode;
  /** Small print next to / under the submit button. */
  note?: ReactNode;
  /** Fields, laid out in a 1/2-column grid (`wide` fields span both columns). */
  children: ReactNode;
  className?: string | undefined;
}

export function LeadFormShell({
  form,
  variant,
  submitLabel,
  onClose,
  intro,
  note,
  children,
  className,
}: LeadFormShellProps) {
  const config = useFormsConfig();
  const isModal = variant === "modal";

  if (form.done) {
    return (
      <FormThanks
        title={config.thankYouTitle}
        text={config.thankYouText}
        onClose={isModal ? onClose : undefined}
        className={className}
      />
    );
  }

  const blocked = !form.consent || form.uploading;

  return (
    <form
      noValidate
      data-form-key={form.formKey}
      onSubmit={form.handleSubmit}
      aria-busy={form.submitting || undefined}
      className={cn("@container relative flex flex-col gap-5", className)}
    >
      {intro ? <div className="ig-body text-text-2 flex flex-col gap-2">{intro}</div> : null}
      <div className="grid grid-cols-1 gap-5 max-sm:gap-4 @md:grid-cols-2">{children}</div>
      <Honeypot form={form} />
      <ConsentCheckbox
        id={form.fieldId(CONSENT_KEY)}
        name="consent"
        checked={form.consent}
        onCheckedChange={form.setConsent}
        error={form.errors.consent}
      />
      {form.submitFailed ? (
        <SubmitErrorBanner text={config.submitErrorText} phone={config.phone} />
      ) : null}
      <div
        data-slot="form-footer"
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-3",
          isModal &&
            "bg-surface border-hairline max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:border-t max-sm:px-4 max-sm:pt-3 max-sm:pb-[calc(12px+env(safe-area-inset-bottom))]"
        )}
      >
        <Button
          type="submit"
          size="l"
          loading={form.submitting}
          aria-disabled={blocked || undefined}
          className="max-sm:w-full"
        >
          {submitLabel}
        </Button>
        {note ? <span className="ig-small text-text-2">{note}</span> : null}
      </div>
    </form>
  );
}
