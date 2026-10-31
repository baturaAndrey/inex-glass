"use client";

import type { ComponentPropsWithoutRef, FocusEvent, MouseEvent, PointerEvent } from "react";
import { Slot } from "@radix-ui/react-slot";
import { preloadFormDialog, useFormDialog } from "./form-dialog-provider";
import type { FormKey, FormParams } from "./form-dialog-provider";

export type FormTriggerProps = Omit<ComponentPropsWithoutRef<"button">, "type"> & {
  formKey: FormKey;
  params?: FormParams | undefined;
  /** Merge the behaviour into the single child (e.g. `<Button>`) instead of rendering a button. */
  asChild?: boolean;
};

/**
 * Opens a form in the site-wide modal (`FormDialogProvider`).
 *
 * `<FormTrigger formKey="callback" asChild><Button>Заказать звонок</Button></FormTrigger>`.
 * Without `asChild` renders a plain `<button type="button">`. A child `onClick` that calls
 * `preventDefault()` cancels opening. Hover / focus preloads the dialog chunk (task 39).
 */
export function FormTrigger({
  formKey,
  params,
  asChild = false,
  onClick,
  onPointerEnter,
  onFocus,
  ...props
}: FormTriggerProps) {
  const { openForm } = useFormDialog();

  const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    onPointerEnter?.(event);
    preloadFormDialog();
  };
  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    onFocus?.(event);
    preloadFormDialog();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    openForm(formKey, params);
  };

  if (asChild) {
    return (
      <Slot
        aria-haspopup="dialog"
        data-form-trigger={formKey}
        {...props}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onFocus={handleFocus}
      />
    );
  }
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      data-form-trigger={formKey}
      {...props}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onFocus={handleFocus}
    />
  );
}
