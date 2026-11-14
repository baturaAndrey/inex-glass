"use client";

import { useLayoutEffect, useRef, type ChangeEvent, type ClipboardEvent } from "react";
import { Input, type InputProps } from "./input";
import {
  PHONE_NATIONAL_LENGTH,
  PHONE_PLACEHOLDER,
  formatPhoneMask,
  phoneDigits,
  toE164,
} from "./phone-mask";

/** Shown when the user starts with the trunk/country prefix (`7`/`8`) and nothing else yet. */
const PREFIX_ONLY = "+7 (";

export type PhoneInputProps = Omit<
  InputProps,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode" | "autoComplete" | "placeholder"
> & {
  /** Masked value, e.g. `+7 (900) 123-45-67` (or `''`). */
  value: string;
  /** Receives the masked value and the E.164 number (`null` until all 10 digits are entered). */
  onChange: (masked: string, e164: string | null) => void;
};

/** Index in `masked` right after its `count`-th national digit (the `+7` prefix is skipped). */
function caretAfterDigits(masked: string, count: number): number {
  if (count <= 0) return Math.min(masked.length, PREFIX_ONLY.length);
  let seen = 0;
  // The national part starts after "+7 (" — the "7" of the country code is not counted.
  for (let index = PREFIX_ONLY.length; index < masked.length; index += 1) {
    if (/\d/.test(masked.charAt(index))) {
      seen += 1;
      if (seen === count) return index + 1;
    }
  }
  return masked.length;
}

/** National digits before the caret position in a raw (unformatted) input value. */
function digitsBefore(raw: string, caret: number): number {
  return phoneDigits(raw.slice(0, caret)).length;
}

/**
 * Russian phone field with the `+7 (___) ___-__-__` mask (`type="tel"`, `autoComplete="tel"`).
 * Accepts pasted `8 900 123-45-67`, `+7(900)…`, `79001234567`; Backspace over a mask
 * character deletes the digit before it; the caret is kept in place for edits mid-string.
 */
export function PhoneInput({ value, onChange, onPaste, ref, ...props }: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Caret position to restore after React re-renders the reformatted value.
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (input && caret !== null && document.activeElement === input) {
      input.setSelectionRange(caret, caret);
    }
  });

  function commit(raw: string, caretDigits: number | null) {
    let digits = phoneDigits(raw);
    const previousDigits = phoneDigits(value);

    // Deleting a mask character ("-", ") ") changes no digits; remove the digit before it.
    if (digits === previousDigits && raw.length < value.length && caretDigits !== null) {
      if (caretDigits > 0) {
        digits = digits.slice(0, caretDigits - 1) + digits.slice(caretDigits);
        caretDigits -= 1;
      }
    }

    // A lone "7"/"8" typed into an empty field is the country/trunk prefix: show "+7 (".
    const prefixOnly = digits === "" && /^\+?[78]$/.test(raw.trim());
    const masked = prefixOnly ? PREFIX_ONLY : formatPhoneMask(digits);

    if (caretDigits !== null && caretDigits < digits.length) {
      pendingCaret.current = caretAfterDigits(masked, caretDigits);
    }
    onChange(masked, toE164(masked));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { value: raw, selectionStart } = event.target;
    commit(raw, selectionStart === null ? null : digitsBefore(raw, selectionStart));
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    onPaste?.(event);
    if (event.defaultPrevented) return;

    const pasted = event.clipboardData.getData("text");
    // A whole number replaces the field regardless of the selection ("8 900 123-45-67").
    if (phoneDigits(pasted).length >= PHONE_NATIONAL_LENGTH) {
      event.preventDefault();
      commit(pasted, null);
    }
  }

  return (
    <Input
      ref={(element) => {
        inputRef.current = element;
        if (typeof ref === "function") return ref(element);
        if (ref) ref.current = element;
        return undefined;
      }}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={PHONE_PLACEHOLDER}
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      {...props}
    />
  );
}
