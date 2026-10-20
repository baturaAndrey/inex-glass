"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ig/button";
import { useReturnFocus } from "@/components/ig/use-return-focus";
import { cn } from "@/lib/utils";
import { FORM_REGISTRY } from "./registry";

/**
 * Site-wide modal for the forms (drawing, callback, sample, load, contacts, full): one context
 * and one Radix Dialog for the whole page. Open it with `useFormDialog().openForm(key, params)`
 * or declaratively with `<FormTrigger formKey="callback">`.
 *
 * Radix gives the focus trap, Esc / overlay / close-button dismissal and the scroll lock; focus
 * returns to the trigger (`useReturnFocus`). ≤599 px — full screen, otherwise a centred
 * `max-w-lg` card. The form components live in `./registry` (stubs until task 21).
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

interface ActiveForm {
  key: FormKey;
  params: FormParams;
}

export function FormDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after closing so the content stays rendered during the exit animation.
  const [active, setActive] = useState<ActiveForm | null>(null);
  const returnFocus = useReturnFocus(open);

  const openForm = useCallback((key: FormKey, params: FormParams = {}) => {
    setActive({ key, params });
    setOpen(true);
  }, []);
  const closeForm = useCallback(() => setOpen(false), []);

  const value = useMemo<FormDialogContextValue>(
    () => ({ openForm, closeForm, openKey: open && active ? active.key : null }),
    [openForm, closeForm, open, active]
  );

  const FormComponent = active ? FORM_REGISTRY[active.key] : null;
  const title = active ? active.params.title?.trim() || DEFAULT_FORM_TITLES[active.key] : "";

  return (
    <FormDialogContext.Provider value={value}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none" />
          <DialogPrimitive.Content
            {...returnFocus}
            aria-describedby={undefined}
            data-form-key={active?.key}
            className={cn(
              "bg-surface text-text shadow-modal fixed z-50 flex flex-col outline-none",
              "ease-ig data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-(--ig-dur-base) motion-reduce:animate-none",
              // ≤599: full screen; otherwise a centred card.
              "max-sm:inset-0 max-sm:h-dvh max-sm:w-full",
              "sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-48px)] sm:w-[calc(100%-48px)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg",
              "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
            )}
          >
            <div className="flex flex-none items-start justify-between gap-4 px-6 pt-5 pb-2 max-sm:px-4">
              <DialogPrimitive.Title className="ig-h4 m-0 pt-2">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Закрыть" className="-mr-2">
                  <X aria-hidden="true" strokeWidth={2} />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-6 max-sm:px-4">
              {FormComponent && active ? (
                <FormComponent params={active.params} onClose={closeForm} variant="modal" />
              ) : null}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </FormDialogContext.Provider>
  );
}
