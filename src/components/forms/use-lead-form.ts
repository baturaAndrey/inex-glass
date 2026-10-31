"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { reachGoal } from "@/components/analytics/reach-goal";
import { formatErrorText, sizeErrorText } from "@/components/ig/file-upload";
import { getLeadAttribution } from "@/lib/client/attribution";
import { fetchFormToken, submitLead, SubmitError, useFormToken } from "@/lib/client/submit-lead";
import {
  ALLOWED_DRAWING_EXT,
  MAX_UPLOAD_BYTES,
  uploadFile,
  UploadFailure,
} from "@/lib/client/upload-file";
import { FORM_TEXTS, glassKindForVid } from "./form-texts";
import {
  buildLeadBody,
  CONSENT_KEY,
  mapServerFieldErrors,
  orderedErrorKeys,
  validateLead,
} from "./lead-body";
import type { FormKey, FormParams } from "./form-dialog-provider";
import type { LeadErrors, LeadFieldName, LeadValues } from "./lead-body";

/**
 * State and behaviour of one site form (task 21): values, validation with the domain schema,
 * the immediate file upload, anti-spam (form token + honeypot), submission, Metrika goals.
 * Markup lives in `form-shell.tsx` and the form components.
 */

export type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; name: string; size: number; progress?: number | undefined }
  | { kind: "done"; name: string; size: number; token: string };

export interface UseLeadFormOptions {
  formKey: FormKey;
  params: FormParams;
  /** Called once after a successful submission (the modal uses it). */
  onSuccess?: (() => void) | undefined;
}

export interface LeadFormState {
  formKey: FormKey;
  /** DOM id of a control: `fieldId('phone')`, `fieldId('consent')`. */
  fieldId: (name: LeadFieldName | typeof CONSENT_KEY) => string;
  values: LeadValues;
  setValue: (name: LeadFieldName, value: string) => void;
  consent: boolean;
  setConsent: (checked: boolean) => void;
  honeypot: string;
  setHoneypot: (value: string) => void;
  errors: LeadErrors;
  /** Extensions accepted by the file field (subset of DWG / DXF / PDF). */
  accept: readonly string[];
  upload: UploadState;
  uploadError: string | null;
  selectFile: (file: File) => void;
  clearFile: () => void;
  /** File rejected locally by `FileUpload` (it shows the message itself). */
  rejectFile: () => void;
  uploading: boolean;
  submitting: boolean;
  done: boolean;
  /** The generic «Не удалось отправить заявку…» banner is shown. */
  submitFailed: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * `params.accept` (`['dwg','pdf']`, `['.dwg']` or the CMS string `".dwg,.pdf"`) narrowed to the
 * extensions the server accepts for forms; default all three.
 */
export function acceptedExtensions(accept: unknown): readonly string[] {
  const allowed: readonly string[] = ALLOWED_DRAWING_EXT;
  const list: unknown = typeof accept === "string" ? accept.split(",") : accept;
  if (!Array.isArray(list)) return allowed;
  const narrowed = [
    ...new Set(
      list
        .filter((ext): ext is string => typeof ext === "string")
        .map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
        .filter((ext) => allowed.includes(ext))
    ),
  ];
  return narrowed.length > 0 ? narrowed : allowed;
}

function initialValues(formKey: FormKey, params: FormParams): LeadValues {
  if (formKey === "sample") {
    const glassKind = glassKindForVid(params.vid);
    return glassKind ? { glassKind } : {};
  }
  return {};
}

/** Server code of a valid token younger than the anti-spam minimum (3 s). */
const TOO_FAST = "too_fast";
/** Wait before the single automatic retry of a `too_fast` answer. */
const TOO_FAST_RETRY_MS = 3100;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * `submitLead` with one automatic retry when the server says the token is too young: a fast
 * visitor (callback form: two fields) must not see an error for typing quickly. The same token
 * stays valid, so the retry simply waits the window out.
 */
async function sendWithRetry(body: Record<string, unknown>): Promise<void> {
  try {
    await submitLead(body);
  } catch (error) {
    if (!(error instanceof SubmitError) || error.serverCode !== TOO_FAST) throw error;
    await delay(TOO_FAST_RETRY_MS);
    await submitLead(body);
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Where the form was opened from: the trigger's `source`, else the current path. */
function sourceOf(params: FormParams): string {
  const source = typeof params.source === "string" ? params.source.trim() : "";
  return source || window.location.pathname;
}

export function useLeadForm({ formKey, params, onSuccess }: UseLeadFormOptions): LeadFormState {
  const baseId = useId();
  const { token, refresh } = useFormToken();
  const [values, setValues] = useState<LeadValues>(() => initialValues(formKey, params));
  const [consent, setConsentState] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<LeadErrors>({});
  const [upload, setUpload] = useState<UploadState>({ kind: "idle" });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  // Synchronous guard against double submission (Enter in a field while a request is running).
  const submittingRef = useRef(false);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const accept = acceptedExtensions(params.accept);

  useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
    },
    []
  );

  const fieldId = useCallback(
    (name: LeadFieldName | typeof CONSENT_KEY) => `${baseId}-${name}`,
    [baseId]
  );

  const clearError = (key: keyof LeadErrors) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const setValue = (name: LeadFieldName, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    clearError(name);
  };

  const setConsent = (checked: boolean) => {
    setConsentState(checked);
    if (checked) clearError(CONSENT_KEY);
  };

  /** Focuses the first invalid control after React has rendered the messages. */
  const focusFirstError = (next: LeadErrors) => {
    const [first] = orderedErrorKeys(formKey, next);
    if (!first) return;
    window.requestAnimationFrame(() => {
      document.getElementById(fieldId(first))?.focus();
    });
  };

  const selectFile = (file: File) => {
    uploadAbortRef.current?.abort();
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setUploadError(null);
    setUpload({ kind: "uploading", name: file.name, size: file.size });

    uploadFile(file, {
      signal: controller.signal,
      formToken: token,
      purpose: "form",
      onProgress: (progress) =>
        setUpload((current) => (current.kind === "uploading" ? { ...current, progress } : current)),
    })
      .then((uploaded) => {
        if (controller.signal.aborted) return;
        setUpload({
          kind: "done",
          name: uploaded.name,
          size: uploaded.size,
          token: uploaded.token,
        });
        reachGoal("file_upload", { ext: uploaded.ext, form: formKey });
      })
      .catch((error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        setUpload({ kind: "idle" });
        const code = error instanceof UploadFailure ? error.code : "server";
        setUploadError(
          code === "format"
            ? formatErrorText(accept)
            : code === "size"
              ? sizeErrorText(MAX_UPLOAD_BYTES)
              : FORM_TEXTS.uploadErrorText
        );
      })
      .finally(() => {
        if (uploadAbortRef.current === controller) uploadAbortRef.current = null;
      });
  };

  const clearFile = () => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setUpload({ kind: "idle" });
    setUploadError(null);
  };

  const rejectFile = () => {
    clearFile();
  };

  const uploading = upload.kind === "uploading";

  async function submit() {
    const validation = validateLead(formKey, values, consent, params);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      focusFirstError(validation);
      return;
    }
    setErrors({});

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitFailed(false);
    const source = sourceOf(params);
    try {
      // The mount-time token may still be on its way (slow network): fetch one now instead of
      // failing; `sendWithRetry` absorbs the 3-second anti-spam window of a fresh token.
      const formToken = token ?? (await fetchFormToken());
      const attribution = await getLeadAttribution(window.location.pathname);
      const body = buildLeadBody(formKey, values, params, {
        entryPage: attribution.entryPage,
        utm: attribution.utm,
        metrikaClientId: attribution.metrikaClientId,
        attribution: attribution.extra,
        formToken,
        consent,
        honeypot,
        uploadTokens: upload.kind === "done" ? [upload.token] : [],
        source,
      });
      await sendWithRetry(body);
      reachGoal("form_submit", { form: formKey, source });
      setDone(true);
      onSuccess?.();
    } catch (error) {
      if (error instanceof SubmitError) {
        if (error.code === "token" && error.serverCode !== TOO_FAST) void refresh();
        if (error.code === "validation") {
          const fieldErrors = mapServerFieldErrors(formKey, error.fieldErrors);
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            focusFirstError(fieldErrors);
            return;
          }
        }
      }
      setSubmitFailed(true);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || uploading || done) return;
    void submit();
  };

  return {
    formKey,
    fieldId,
    values,
    setValue,
    consent,
    setConsent,
    honeypot,
    setHoneypot,
    errors,
    accept,
    upload,
    uploadError,
    selectFile,
    clearFile,
    rejectFile,
    uploading,
    submitting,
    done,
    submitFailed,
    handleSubmit,
  };
}
