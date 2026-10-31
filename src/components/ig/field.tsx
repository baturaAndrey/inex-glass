"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** What a `Field` tells the control inside it. */
export type FieldContextValue = {
  /** `id` of the control (the label's `htmlFor`). */
  id: string;
  /**
   * `id` of the label element. Group controls (`ChipGroup`, `RadioCardGroup`, `FileUpload`)
   * cannot be targeted by `<label for>`; they reference the label with `aria-labelledby`.
   */
  labelId: string;
  /** Space-separated ids of the hint and the error, or `undefined` when there are none. */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

export const FieldContext = createContext<FieldContextValue | null>(null);

/** Joins `aria-describedby` id lists, skipping empty parts; `undefined` when nothing is left. */
export function joinIds(...ids: (string | null | false | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(" ").trim();
  return joined || undefined;
}

/** Explicit props of a control that override what the surrounding `Field` provides. */
export type FieldControlOverrides = {
  id?: string | undefined;
  "aria-describedby"?: string | undefined;
  invalid?: boolean | undefined;
  required?: boolean | undefined;
};

/** Attributes a form control spreads onto its native element. */
export type FieldControlProps = {
  id: string | undefined;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  "aria-required": true | undefined;
  /** Whether to add the visual `is-error` class. */
  invalid: boolean;
};

/**
 * Accessibility wiring for controls (`Input`, `Textarea`, `Select`, `PhoneInput`, `DatePicker`).
 * Inside a `Field` it returns the field's id, `aria-describedby` (hint + error), `aria-invalid`
 * and `aria-required`; outside it the control works on its own props only.
 * Explicit props win over the context; describedby ids are merged.
 */
export function useFieldControl(overrides: FieldControlOverrides = {}): FieldControlProps {
  const field = useContext(FieldContext);
  const invalid = overrides.invalid ?? field?.invalid ?? false;
  const required = overrides.required ?? field?.required ?? false;

  return {
    id: overrides.id ?? field?.id,
    "aria-describedby": joinIds(field?.describedBy, overrides["aria-describedby"]),
    "aria-invalid": invalid || undefined,
    "aria-required": required || undefined,
    invalid,
  };
}

/** Attributes a group control (radiogroup, group of chips, upload zone) takes from a `Field`. */
export type FieldGroupProps = {
  "aria-labelledby": string | undefined;
  "aria-describedby": string | undefined;
};

/**
 * Accessible name/description of a GROUP control inside a `Field` (`<Field group>`): the label
 * is referenced through `aria-labelledby` (a `<label for>` cannot name a `div`), the hint and
 * the error through `aria-describedby`. An explicit `aria-label` / `aria-labelledby` wins.
 */
export function useFieldGroup(overrides: {
  ariaLabel?: string | undefined;
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;
}): FieldGroupProps {
  const field = useContext(FieldContext);
  const labelledBy =
    overrides["aria-labelledby"] ?? (overrides.ariaLabel ? undefined : field?.labelId);
  return {
    "aria-labelledby": labelledBy,
    "aria-describedby": joinIds(field?.describedBy, overrides["aria-describedby"]),
  };
}

/** Normalises the native `aria-invalid` attribute value to a boolean (or `undefined` if unset). */
export function ariaInvalidToBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  return value !== false && value !== "false";
}

export type FieldProps = {
  label: ReactNode;
  /** Red asterisk (decorative); the control gets `aria-required`. */
  required?: boolean | undefined;
  /** Grey "— необязательно" note after the label. */
  optional?: boolean | undefined;
  hint?: ReactNode;
  /** Error text under the control; makes the control `aria-invalid` and red. */
  error?: string | null | undefined;
  /** Use an existing control id instead of a generated one. */
  htmlFor?: string | undefined;
  /**
   * The child is a group (`ChipGroup`, `RadioCardGroup`, `FileUpload`): the label renders as a
   * `<span id>` that the group references via `aria-labelledby` instead of `<label for>`.
   */
  group?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
};

/**
 * Labelled form field (`.ig-field`): label, control, hint and error.
 * Focus management on submit errors is the consumer form's job; the error element id is
 * exposed through `aria-describedby` of the control.
 */
export function Field({
  label,
  required = false,
  optional = false,
  hint,
  error,
  htmlFor,
  group = false,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const hasHint = hint !== undefined && hint !== null && hint !== false;
  const hasError = Boolean(error);

  const context: FieldContextValue = {
    id,
    labelId,
    describedBy: joinIds(hasHint && hintId, hasError && errorId),
    invalid: hasError,
    required,
  };

  const labelContent = (
    <>
      {label}
      {required ? (
        <>
          {" "}
          <span className="ig-req" aria-hidden="true">
            *
          </span>
        </>
      ) : null}
      {optional && !required ? (
        <>
          {" "}
          <span className="ig-field__opt">— необязательно</span>
        </>
      ) : null}
    </>
  );

  return (
    <div data-slot="ig-field" className={cn("ig-field", className)}>
      {group ? (
        <span id={labelId} className="ig-field__label">
          {labelContent}
        </span>
      ) : (
        <label htmlFor={id} id={labelId} className="ig-field__label">
          {labelContent}
        </label>
      )}
      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>
      {hasHint ? (
        <div id={hintId} className="ig-field__hint">
          {hint}
        </div>
      ) : null}
      {/* The live region stays mounted so that a newly shown error is announced reliably;
          while empty it cancels the flex gap (6px) so the layout does not shift. */}
      <div id={errorId} aria-live="polite" className={hasError ? "ig-field__error" : "-mt-1.5"}>
        {hasError ? (
          <>
            <TriangleAlert aria-hidden="true" />
            <span>{error}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
