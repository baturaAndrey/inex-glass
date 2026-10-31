"use client";

import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { useReturnFocus } from "./use-return-focus";

export type DrawerSide = "right" | "left" | "bottom";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: DrawerSide;
  /** Required: visible panel heading and the dialog's accessible name. */
  title: ReactNode;
  description?: ReactNode;
  /** Pinned footer, e.g. «Применить» / «Сбросить» buttons. */
  footer?: ReactNode;
  /** Width of a side panel; `w-[420px] max-w-full` by default (full screen ≤599 px). */
  widthClassName?: string;
  children?: ReactNode;
  className?: string | undefined;
}

const DEFAULT_WIDTH = "w-[420px] max-w-full";

/** Placement + slide animation per side (tw-animate-css, 200 ms). */
const SIDE_CLASS: Record<DrawerSide, string> = {
  right:
    "inset-y-0 right-0 h-dvh max-sm:w-full data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
  left: "inset-y-0 left-0 h-dvh max-sm:w-full data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
};

/**
 * Slide-out panel on Radix Dialog: focus trap, Esc / overlay click close, focus returns to
 * the trigger. Scrollable body, pinned footer. Used for the mobile menu (task-14) and
 * object filters (task-30). Animations are dropped with `prefers-reduced-motion`.
 */
export function Drawer({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  footer,
  widthClassName,
  children,
  className,
}: DrawerProps) {
  const returnFocus = useReturnFocus(open);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 duration-(--ig-dur-base) motion-reduce:animate-none" />
        <DialogPrimitive.Content
          {...returnFocus}
          // Without a description Radix would warn about a missing `aria-describedby`.
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "bg-surface text-text shadow-modal fixed z-50 flex flex-col outline-none",
            "ease-ig data-[state=closed]:animate-out data-[state=open]:animate-in duration-(--ig-dur-base) motion-reduce:animate-none",
            side !== "bottom" && (widthClassName ?? DEFAULT_WIDTH),
            SIDE_CLASS[side],
            className
          )}
        >
          <div className="border-line flex flex-none items-start justify-between gap-4 border-b px-6 py-4 max-sm:px-4">
            <div className="flex min-w-0 flex-col gap-1 pt-2.5">
              <DialogPrimitive.Title className="ig-h5">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="ig-small text-text-2">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Закрыть" className="-mr-2">
                <X aria-hidden="true" strokeWidth={2} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4">
            {children}
          </div>

          {footer ? (
            <div className="border-line flex flex-none flex-wrap gap-3 border-t px-6 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] max-sm:px-4 max-sm:[&>.ig-btn]:flex-1">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
