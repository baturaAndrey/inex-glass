"use client";

import { useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DATE_FORMAT_ERROR,
  DATE_PLACEHOLDER,
  formatRuDateFromIso,
  maskRuDate,
  parseRuDate,
} from "./date-mask";
import { Input, type InputProps } from "./input";

export { DATE_FORMAT_ERROR };

export type DatePickerProps = Omit<
  InputProps,
  | "value"
  | "defaultValue"
  | "onChange"
  | "onInvalid"
  | "type"
  | "inputMode"
  | "placeholder"
  | "min"
  | "max"
> & {
  /** ISO `YYYY-MM-DD` or `''`. */
  value: string;
  /** ISO date when the text is a valid date, `''` when the field is cleared or incomplete. */
  onChange: (iso: string) => void;
  /**
   * Earliest suggested date (ISO). Informational only: it is exposed to assistive tech and
   * never blocks input or the native picker (the quiz shows an "urgent" hint instead).
   */
  min?: string | undefined;
  /** Latest selectable date (ISO), applied to the native picker. */
  max?: string | undefined;
  /**
   * Called with `DATE_FORMAT_ERROR` when a complete but impossible date is typed (31.02.2026)
   * or the field is left with an incomplete date. Show it through `Field.error`; clear it on
   * the next `onChange`.
   */
  onInvalid?: ((message: string) => void) | undefined;
  /** Accessible name of the calendar button. */
  pickerLabel?: string | undefined;
  /** Class of the wrapper (`className` goes to the text input). */
  wrapperClassName?: string | undefined;
};

/** `HTMLInputElement.showPicker()` is missing from older browsers and some TS DOM libs. */
type PickerCapableInput = HTMLInputElement & { showPicker?: () => void };

/**
 * Date field with the `дд.мм.гггг` mask and a calendar button that opens the native date
 * picker (hidden `<input type="date">` + `showPicker()` when supported).
 */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  onInvalid,
  pickerLabel = "Выбрать дату в календаре",
  disabled,
  readOnly,
  className,
  wrapperClassName,
  onBlur,
  ...props
}: DatePickerProps) {
  const nativeRef = useRef<PickerCapableInput | null>(null);
  const textRef = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState(() => formatRuDateFromIso(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Sync the text buffer when the parent changes `value` (reset, picker, restored draft).
  // Adjusting state during render avoids an extra effect pass; partial text whose ISO
  // equivalent ('') already matches `value` is kept as the user's work in progress.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== (parseRuDate(text) ?? "")) setText(formatRuDateFromIso(value));
  }

  function emit(iso: string) {
    setSyncedValue(iso);
    if (iso !== value) onChange(iso);
  }

  function handleTextChange(event: ChangeEvent<HTMLInputElement>) {
    const masked = maskRuDate(event.target.value);
    setText(masked);

    const iso = parseRuDate(masked);
    emit(iso ?? "");
    if (!iso && masked.length === DATE_PLACEHOLDER.length) onInvalid?.(DATE_FORMAT_ERROR);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    onBlur?.(event);
    if (text !== "" && !parseRuDate(text)) onInvalid?.(DATE_FORMAT_ERROR);
  }

  function handleNativeChange(event: ChangeEvent<HTMLInputElement>) {
    const iso = event.target.value;
    setText(formatRuDateFromIso(iso));
    emit(iso);
    textRef.current?.focus();
  }

  function openPicker() {
    const native = nativeRef.current;
    if (!native) return;
    try {
      if (typeof native.showPicker === "function") {
        native.showPicker();
        return;
      }
    } catch {
      // showPicker() throws without user activation or in cross-origin iframes; fall through.
    }
    // No picker API: the masked text field is the fallback input method.
    textRef.current?.focus();
  }

  const minHint = min ? formatRuDateFromIso(min) : "";

  return (
    <div data-slot="ig-date-picker" className={cn("relative", wrapperClassName)}>
      <Input
        ref={textRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={DATE_PLACEHOLDER}
        maxLength={DATE_PLACEHOLDER.length}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        disabled={disabled}
        readOnly={readOnly}
        aria-description={minHint ? `Рекомендуемая дата — не раньше ${minHint}` : undefined}
        className={cn("pr-14", className)}
        {...props}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || readOnly}
        aria-label={pickerLabel}
        className={cn(
          "absolute top-1/2 right-1 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-(--ig-r-md) text-text-2 transition-colors",
          "hover:text-primary-pressed disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <CalendarDays aria-hidden="true" className="size-5" />
      </button>
      {/* Native picker source: rendered (not display:none) so that showPicker() can anchor
          to it, but invisible and out of the tab order and the accessibility tree. */}
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        max={max}
        onChange={handleNativeChange}
        disabled={disabled || readOnly}
        className="pointer-events-none absolute right-0 bottom-0 h-px w-px opacity-0"
      />
    </div>
  );
}
