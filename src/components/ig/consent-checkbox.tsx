"use client";

import { useId } from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Error shown when the form is submitted without consent (verbatim, teksty/05-kviz.md). The same
 * constant the lead schemas use, so the client and the server never drift apart.
 */
export { CONSENT_MESSAGE as CONSENT_ERROR } from "@/lib/domain/contact-fields";

export const CONSENT_URL = "/soglasie-na-obrabotku-personalnyh-dannyh/";
export const PRIVACY_POLICY_URL = "/politika-konfidencialnosti/";

const LINK_CLASS =
  "text-primary-pressed underline underline-offset-2 decoration-1 transition-colors hover:text-primary-dark";

export type ConsentCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** `true` — red border only; a string — red border plus the error text under the checkbox. */
  error?: boolean | string | null | undefined;
  id?: string | undefined;
  name?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
};

/**
 * Personal-data consent checkbox (`.ig-check`) with the legally required wording
 * (teksty/15-politika-pdn.md §3). Always controlled and unchecked by default: the parent
 * owns `checked` and must never pre-tick it.
 */
export function ConsentCheckbox({
  checked,
  onCheckedChange,
  error,
  id,
  name,
  disabled,
  className,
}: ConsentCheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(error);
  const errorText = typeof error === "string" ? error : null;

  return (
    <div data-slot="ig-consent" className={cn("flex flex-col gap-1.5", className)}>
      {/* Links inside the label open the documents; activating them does not toggle the box. */}
      <label className={cn("ig-check", invalid && "is-error")} htmlFor={inputId}>
        <input
          type="checkbox"
          id={inputId}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onCheckedChange(event.target.checked)}
          aria-required="true"
          aria-invalid={invalid || undefined}
          aria-describedby={errorText ? errorId : undefined}
        />
        <span>
          Даю{" "}
          <a href={CONSENT_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            согласие на обработку персональных данных
          </a>{" "}
          и ознакомлен с{" "}
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            политикой обработки персональных данных
          </a>
        </span>
      </label>
      <div id={errorId} aria-live="polite" className={errorText ? "ig-field__error" : "-mt-1.5"}>
        {errorText ? (
          <>
            <TriangleAlert aria-hidden="true" />
            <span>{errorText}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
