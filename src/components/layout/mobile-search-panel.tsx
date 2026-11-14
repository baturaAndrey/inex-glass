"use client";

import type { RefObject } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { HeaderSearch } from "./header-search";

export interface MobileSearchPanelProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  label: string;
  placeholder: string;
  /** The icon button outside the dialog: focus returns to it on close. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}

/**
 * Overlay of the phone search (see `MobileSearch` in `./header-search`): the header search form
 * in a Radix Dialog panel at the top of the screen. A separate `next/dynamic` chunk (task 39).
 */
export function MobileSearchPanel({
  open,
  onOpenChange,
  label,
  placeholder,
  triggerRef,
}: MobileSearchPanelProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Esc with the suggestions open closes the list only (the field handles it); the
          // panel closes on the next Esc.
          onEscapeKeyDown={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.getAttribute("aria-expanded") === "true") event.preventDefault();
          }}
          // The trigger is not a `Dialog.Trigger` (it lives outside this lazy chunk): return
          // the focus to it explicitly, as Radix does for its own trigger.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
          className="bg-surface shadow-modal data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 fixed inset-x-0 top-0 z-50 py-3 duration-(--ig-dur-base) outline-none motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <Container className="flex items-center gap-2">
            <HeaderSearch
              label={label}
              placeholder={placeholder}
              className="flex-1"
              autoFocus
              onNavigate={() => onOpenChange(false)}
            />
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Закрыть поиск" className="size-11">
                <X aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </Container>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
