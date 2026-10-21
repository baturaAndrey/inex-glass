"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";

/**
 * Site-wide modal for the forms (drawing, callback, sample, load, contacts, full): one context
 * and one Radix Dialog for the whole page. Open it with `useFormDialog().openForm(key, params)`
 * or declaratively with `<FormTrigger formKey="callback">`.
 *
 * Radix gives the focus trap, Esc / overlay / close-button dismissal and the scroll lock; focus
 * returns to the trigger (`useReturnFocus`). ≤599 px — full screen, otherwise a centred card
 * (`max-w-lg` for the callback form, `max-w-2xl` for the two-column ones). Title:
 * `params.title ?? params.label ?? DEFAULT_FORM_TITLES[key]`. The modal's form components live in
 * `./modal-forms` (static, imported only by the dialog); the dialog itself is `./form-dialog`, a
 * lazy chunk (task 39): it is loaded on the first `openForm()`, so Radix Dialog and the forms stay
 * out of the JS of pages where no form is opened. Inline (page) forms use `./registry`.
 */

export type FormKey = "drawing" | "callback" | "sample" | "load" | "contacts" | "full";

export const FORM_KEYS: readonly FormKey[] = [
  "drawing",
  "callback",
  "sample",
  "load",
  "contacts",
  "full",
];

export interface FormParams {
  /** Button / source label, e.g. «Отправить проект» (sent with the lead). */
  label?: string;
  /** Where the form was opened from (page path or block name). */
  source?: string;
  /** Accepted file extensions for the drawing form, lower case without a dot: `['dwg', 'dxf', 'pdf']`. */
  accept?: string[];
  /** Overrides the default dialog title. */
  title?: string;
  [key: string]: unknown;
}

export interface FormComponentProps {
  params: FormParams;
  onClose(): void;
  onSuccess?(): void;
  variant: "modal" | "page";
}

export const DEFAULT_FORM_TITLES: Readonly<Record<FormKey, string>> = {
  callback: "Заказать звонок",
  drawing: "Отправить чертёж",
  sample: "Заказать образец",
  load: "Подобрать под нагрузку",
  contacts: "Отправить заявку",
  full: "Отправить заявку",
};

export interface FormDialogContextValue {
  openForm(key: FormKey, params?: FormParams): void;
  closeForm(): void;
  openKey: FormKey | null;
}

const FormDialogContext = createContext<FormDialogContextValue | null>(null);

/** Outside the provider (should not happen on the site) triggers do nothing instead of crashing. */
const NOOP_CONTEXT: FormDialogContextValue = {
  openForm(key) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`useFormDialog: openForm("${key}") called outside <FormDialogProvider>.`);
    }
  },
  closeForm() {},
  openKey: null,
};

export function useFormDialog(): FormDialogContextValue {
  return useContext(FormDialogContext) ?? NOOP_CONTEXT;
}

const loadFormDialog = () => import("./form-dialog");

/** No server markup: the dialog exists only after the first `openForm()` in the browser. */
const FormDialog = dynamic(() => loadFormDialog().then((mod) => mod.FormDialog), { ssr: false });

/**
 * Starts loading the dialog chunk ahead of the click (hover / focus of a trigger), so the first
 * open does not wait for the network. Safe to call repeatedly: the module loads once.
 */
export function preloadFormDialog(): void {
  void loadFormDialog();
}

interface ActiveForm {
  key: FormKey;
  params: FormParams;
}

export function FormDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after closing so the content stays rendered during the exit animation.
  const [active, setActive] = useState<ActiveForm | null>(null);

  const openForm = useCallback((key: FormKey, params: FormParams = {}) => {
    setActive({ key, params });
    setOpen(true);
  }, []);
  const closeForm = useCallback(() => setOpen(false), []);

  const value = useMemo<FormDialogContextValue>(
    () => ({ openForm, closeForm, openKey: open && active ? active.key : null }),
    [openForm, closeForm, open, active]
  );

  return (
    <FormDialogContext.Provider value={value}>
      {children}
      {active ? (
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          formKey={active.key}
          params={active.params}
          onClose={closeForm}
        />
      ) : null}
    </FormDialogContext.Provider>
  );
}
