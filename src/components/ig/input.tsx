"use client";

import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";
import { ariaInvalidToBoolean, useFieldControl } from "./field";

export type InputProps = ComponentPropsWithRef<"input"> & {
  /** Error state without a surrounding `Field` (inside a `Field` it follows `Field.error`). */
  invalid?: boolean | undefined;
};

/**
 * Text input of the design system (`.ig-input`, 48 px high, radius 10).
 * Inside a `Field` it picks up the id, `aria-describedby`, `aria-invalid` and `aria-required`.
 */
export function Input({
  className,
  invalid,
  id,
  required,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const { invalid: isInvalid, ...control } = useFieldControl({
    id,
    "aria-describedby": ariaDescribedBy,
    invalid: invalid ?? ariaInvalidToBoolean(ariaInvalid),
    required,
  });

  return (
    <input
      data-slot="ig-input"
      required={required}
      className={cn("ig-input", isInvalid && "is-error", className)}
      {...control}
      {...props}
    />
  );
}
