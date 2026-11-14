"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ig/button";
import { useReturnFocus } from "@/components/ig/use-return-focus";
import { cn } from "@/lib/utils";
import { DEFAULT_FORM_TITLES } from "./form-dialog-provider";
import { MODAL_FORMS } from "./modal-forms";
import type { FormKey, FormParams } from "./form-dialog-provider";

/** Two-column forms get a wider dialog (`max-w-2xl`); the callback form keeps `max-w-lg`. */
const WIDE_FORMS: ReadonlySet<FormKey> = new Set(["drawing", "sample", "load", "contacts", "full"]);

export interface FormDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  formKey: FormKey;
  params: FormParams;
  onClose(): void;
}

/**
 * The modal of `FormDialogProvider`: Radix Dialog chrome + the form of `./modal-forms`.
 *
 * A separate `next/dynamic` chunk (task 39): the provider sits in the site layout, and Radix
 * Dialog (focus trap, scroll lock, portal) would otherwise ship in the JS of every page although
 * most visits never open a form. The provider mounts it on the first `openForm()` and keeps it
 * mounted afterwards, so later opens and the exit animation behave as before.
 */
export function FormDialog({ open, onOpenChange, formKey, params, onClose }: FormDialogProps) {
  const returnFocus = useReturnFocus(open);
  const FormComponent = MODAL_FORMS[formKey];
  // `label` doubles as the title so pages can open «Отправить планировку», «Загрузить чертёж
  // DWG / DXF», … with one parameter; an explicit `title` still wins.
  const title = params.title?.trim() || params.label?.trim() || DEFAULT_FORM_TITLES[formKey];
  const width = WIDE_FORMS.has(formKey) ? "sm:max-w-2xl" : "sm:max-w-lg";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none" />
        <DialogPrimitive.Content
          {...returnFocus}
          aria-describedby={undefined}
          data-form-key={formKey}
          className={cn(
            "bg-surface text-text shadow-modal fixed z-50 flex flex-col outline-none",
            "ease-ig data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-(--ig-dur-base) motion-reduce:animate-none",
            // ≤599: full screen; otherwise a centred card.
            "max-sm:inset-0 max-sm:h-dvh max-sm:w-full",
            "sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-48px)] sm:w-[calc(100%-48px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg",
            width,
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
          {/* ≤599 no bottom padding: the form's footer sticks to the bottom edge itself. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-6 max-sm:px-4 max-sm:pb-0">
            <FormComponent params={params} onClose={onClose} variant="modal" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
