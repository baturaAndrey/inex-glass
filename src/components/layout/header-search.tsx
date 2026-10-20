"use client";

import { useId, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { Input } from "@/components/ig/input";
import { cn } from "@/lib/utils";
import { SEARCH_PATH } from "./nav-defaults";

export interface HeaderSearchProps {
  /** Visually hidden label, «Поиск по сайту». */
  label: string;
  placeholder: string;
  className?: string | undefined;
  /** Focus the field on mount (mobile overlay). */
  autoFocus?: boolean;
}

/**
 * Site search form: `GET /poisk/?q=…`. Works without JS. The results page and suggestions
 * come with task-35 (until then `/poisk/` answers 404 — expected).
 */
export function HeaderSearch({
  label,
  placeholder,
  className,
  autoFocus = false,
}: HeaderSearchProps) {
  const id = useId();
  return (
    <form
      action={SEARCH_PATH}
      method="get"
      role="search"
      className={cn("relative flex min-w-0", className)}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="text-text-2 pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
      />
      <Input
        id={id}
        name="q"
        type="search"
        autoComplete="off"
        enterKeyHint="search"
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-11 w-full rounded-full pl-11"
      />
    </form>
  );
}

export type MobileSearchProps = Omit<HeaderSearchProps, "autoFocus">;

/**
 * Phone (≤599 px) search: an icon button opening a panel at the top of the screen with the same
 * form. Radix Dialog: focus trap, Esc / overlay close, focus returns to the button.
 */
export function MobileSearch({ label, placeholder, className }: MobileSearchProps) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className={cn("size-11", className)}>
          <Search aria-hidden="true" />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="bg-surface shadow-modal data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 fixed inset-x-0 top-0 z-50 py-3 duration-(--ig-dur-base) outline-none motion-reduce:animate-none"
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          <Container className="flex items-center gap-2">
            <HeaderSearch label={label} placeholder={placeholder} className="flex-1" autoFocus />
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
