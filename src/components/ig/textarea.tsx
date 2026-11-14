"use client";

import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";
import { ariaInvalidToBoolean, useFieldControl } from "./field";

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
  /** Error state without a surrounding `Field` (inside a `Field` it follows `Field.error`). */
  invalid?: boolean | undefined;
};

/** Multi-line input (`.ig-textarea`: min-height 112 px, vertical resize). */
export function Textarea({
  className,
  invalid,
  id,
  required,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) {
  const { invalid: isInvalid, ...control } = useFieldControl({
    id,
    "aria-describedby": ariaDescribedBy,
    invalid: invalid ?? ariaInvalidToBoolean(ariaInvalid),
    required,
  });

  return (
    <textarea
      data-slot="ig-textarea"
      required={required}
      className={cn(
        "ig-textarea",
        // components.css styles only `.ig-input[disabled]`.
        "disabled:cursor-not-allowed disabled:bg-well disabled:text-muted",
        isInvalid && "is-error",
        className
      )}
      {...control}
      {...props}
    />
  );
}
