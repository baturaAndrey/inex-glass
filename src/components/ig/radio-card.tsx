"use client";

import {
  useRef,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Roving tabindex for radio groups (shared with ChipGroup in single mode)
 * -----------------------------------------------------------------------------------------------*/

type RovingOption = { value: string; disabled?: boolean | undefined };

/** Props each radio item receives from `useRovingRadioGroup`. */
export type RovingItemProps = {
  ref: Ref<HTMLButtonElement>;
  tabIndex: 0 | -1;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown"]);
const PREV_KEYS = new Set(["ArrowLeft", "ArrowUp"]);

/**
 * WAI-ARIA radio group keyboard model: only one item is in the tab order (the selected one,
 * otherwise the first enabled one); arrows move focus *and* select, wrapping around and
 * skipping disabled items; Home/End jump to the first/last enabled item.
 */
export function useRovingRadioGroup(
  options: readonly RovingOption[],
  value: string | null,
  onSelect: (value: string) => void
): (index: number) => RovingItemProps {
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
  const tabStop = selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !option.disabled);

  function findEnabled(from: number, step: 1 | -1): number {
    const count = options.length;
    for (let offset = 1; offset <= count; offset += 1) {
      const index = (((from + step * offset) % count) + count) % count;
      if (!options[index]?.disabled) return index;
    }
    return from;
  }

  function moveTo(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onSelect(option.value);
    itemsRef.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    let target: number | null = null;
    if (NEXT_KEYS.has(event.key)) target = findEnabled(index, 1);
    else if (PREV_KEYS.has(event.key)) target = findEnabled(index, -1);
    else if (event.key === "Home") target = findEnabled(-1, 1);
    else if (event.key === "End") target = findEnabled(options.length, -1);

    if (target === null) return;
    event.preventDefault();
    moveTo(target);
  }

  return (index) => ({
    ref: (element: HTMLButtonElement | null) => {
      itemsRef.current[index] = element;
    },
    tabIndex: index === tabStop ? 0 : -1,
    onKeyDown: (event) => handleKeyDown(event, index),
  });
}

/* -------------------------------------------------------------------------------------------------
 * RadioCard
 * -----------------------------------------------------------------------------------------------*/

export type RadioCardProps = Omit<
  ComponentPropsWithRef<"button">,
  "title" | "onSelect" | "role" | "children" | "type"
> & {
  selected: boolean;
  onSelect: () => void;
  /** Lucide icon, rendered 24 px inside `.ig-radio-card__icon`. */
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
};

/** Selectable card (`.ig-radio-card`) with the round radio mark in the top-right corner. */
export function RadioCard({
  selected,
  onSelect,
  icon,
  title,
  sub,
  disabled,
  className,
  onClick,
  ...props
}: RadioCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-slot="ig-radio-card"
      disabled={disabled}
      className={cn(
        "ig-radio-card",
        selected && "is-selected",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSelect();
      }}
      {...props}
    >
      <span className="ig-radio-card__mark" aria-hidden="true" />
      {icon ? (
        <span className="ig-radio-card__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {/* Keep the title clear of the radio mark (22 px + 16 px inset). */}
      <span className="ig-radio-card__title pr-7">{title}</span>
      {sub ? <span className="ig-radio-card__sub">{sub}</span> : null}
    </button>
  );
}

/* -------------------------------------------------------------------------------------------------
 * RadioCardGroup
 * -----------------------------------------------------------------------------------------------*/

export type RadioCardOption = {
  value: string;
  title: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean | undefined;
};

export type RadioCardColumns = 2 | 3 | 4;

/**
 * Grid columns: 4 ≥1366 (lg), 3 ≥1101 (md), 2 ≥600 (sm); on phones `mobileColumns`.
 * Literal class strings so that Tailwind sees them.
 */
const COLUMN_CLASS: Record<RadioCardColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 md:grid-cols-3",
  4: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};

const MOBILE_COLUMN_CLASS: Record<1 | 2, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
};

export type RadioCardGroupProps = {
  value: string | null;
  onChange: (value: string) => void;
  options: readonly RadioCardOption[];
  /** Accessible name of the group (or use `aria-labelledby`). */
  ariaLabel?: string | undefined;
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;
  /** Columns at the widest breakpoint. Default 4. */
  columns?: RadioCardColumns | undefined;
  /** Columns below 600 px: 2 (default, e.g. glass thickness) or 1 for long titles. */
  mobileColumns?: 1 | 2 | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
};

/** Single-choice group of `RadioCard`s (`role="radiogroup"`, roving tabindex, arrow keys). */
export function RadioCardGroup({
  value,
  onChange,
  options,
  ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  columns = 4,
  mobileColumns = 2,
  disabled = false,
  className,
}: RadioCardGroupProps) {
  const effectiveOptions = disabled
    ? options.map((option) => ({ ...option, disabled: true }))
    : options;
  const getItemProps = useRovingRadioGroup(effectiveOptions, value, onChange);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || undefined}
      data-slot="ig-radio-card-group"
      className={cn(
        "grid gap-2 sm:gap-3",
        MOBILE_COLUMN_CLASS[mobileColumns],
        COLUMN_CLASS[columns],
        className
      )}
    >
      {effectiveOptions.map((option, index) => (
        <RadioCard
          key={option.value}
          selected={option.value === value}
          onSelect={() => onChange(option.value)}
          icon={option.icon}
          title={option.title}
          sub={option.sub}
          disabled={option.disabled}
          {...getItemProps(index)}
        />
      ))}
    </div>
  );
}
