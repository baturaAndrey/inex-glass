"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ariaInvalidToBoolean, useFieldControl } from "./field";

export type SelectProps = ComponentPropsWithRef<"select"> & {
  /** Text of a first, disabled option shown while nothing is chosen (value `""`). */
  placeholder?: string | undefined;
  /** Error state without a surrounding `Field` (inside a `Field` it follows `Field.error`). */
  invalid?: boolean | undefined;
  /** `<option>` / `<optgroup>` elements. */
  children?: ReactNode;
};

/** Native select with the design-system chevron (`.ig-select`). */
export function Select({
  className,
  invalid,
  id,
  required,
  placeholder,
  children,
  value,
  defaultValue,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  const { invalid: isInvalid, ...control } = useFieldControl({
    id,
    "aria-describedby": ariaDescribedBy,
    invalid: invalid ?? ariaInvalidToBoolean(ariaInvalid),
    required,
  });

  // Without an explicit value the browser would pick the first enabled option and the
  // placeholder would never be visible; start uncontrolled selects on the placeholder.
  const valueProps =
    value !== undefined
      ? { value }
      : { defaultValue: defaultValue ?? (placeholder !== undefined ? "" : undefined) };

  return (
    <select
      data-slot="ig-select"
      required={required}
      className={cn(
        "ig-select",
        // The placeholder option is shown in the muted placeholder colour; real options keep
        // the regular text colour inside the dropdown list.
        "has-[option[value='']:checked]:text-muted [&_option]:text-text",
        // components.css styles only `.ig-input[disabled]`.
        "disabled:cursor-not-allowed disabled:bg-well disabled:text-muted",
        isInvalid && "is-error",
        className
      )}
      {...control}
      {...valueProps}
      {...props}
    >
      {placeholder !== undefined ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {children}
    </select>
  );
}
