"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Chip } from "./chip";
import { useFieldGroup } from "./field";
import { useRovingRadioGroup } from "./radio-card";

export type ChipOption = {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean | undefined;
};

type ChipGroupBaseProps = {
  options: readonly ChipOption[];
  /** Accessible name of the group (or use `aria-labelledby`). */
  ariaLabel?: string | undefined;
  "aria-labelledby"?: string | undefined;
  "aria-describedby"?: string | undefined;
  className?: string | undefined;
};

export type ChipGroupSingleProps = ChipGroupBaseProps & {
  mode: "single";
  value: string | null;
  onChange: (value: string | null) => void;
  /** Clicking the selected chip again clears the value (`null`). */
  allowClear?: boolean | undefined;
};

export type ChipGroupMultipleProps = ChipGroupBaseProps & {
  mode: "multiple";
  value: readonly string[];
  onChange: (value: string[]) => void;
};

export type ChipGroupProps = ChipGroupSingleProps | ChipGroupMultipleProps;

/**
 * Group of choice chips (`.ig-chips`).
 * - `single`: `role="radiogroup"`; chips are `role="radio"` with `aria-checked`, roving tabindex,
 *   arrow keys select and focus.
 * - `multiple`: `role="group"`; chips are toggle buttons with `aria-pressed`, Tab moves between them.
 */
export function ChipGroup(props: ChipGroupProps) {
  return props.mode === "single" ? (
    <SingleChipGroup {...props} />
  ) : (
    <MultipleChipGroup {...props} />
  );
}

/** Inside `<Field group>` the group is named by the field label (`aria-labelledby`). */
function useGroupAttributes(props: ChipGroupBaseProps) {
  const fieldGroup = useFieldGroup(props);
  return {
    "aria-label": props.ariaLabel,
    ...fieldGroup,
    "data-slot": "ig-chip-group",
    className: cn("ig-chips", props.className),
  };
}

function SingleChipGroup(props: ChipGroupSingleProps) {
  const { options, value, onChange, allowClear = false } = props;
  const getItemProps = useRovingRadioGroup(options, value, onChange);
  const groupAttrs = useGroupAttributes(props);

  return (
    <div role="radiogroup" {...groupAttrs}>
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <Chip
            key={option.value}
            role="radio"
            aria-checked={checked}
            active={checked}
            icon={option.icon}
            disabled={option.disabled}
            onClick={() => onChange(checked && allowClear ? null : option.value)}
            {...getItemProps(index)}
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}

function MultipleChipGroup(props: ChipGroupMultipleProps) {
  const { options, value, onChange } = props;
  const groupAttrs = useGroupAttributes(props);

  function toggle(optionValue: string) {
    const isOn = value.includes(optionValue);
    // Keep the order of `options` rather than the order of clicks.
    const next = options
      .map((option) => option.value)
      .filter((item) => (item === optionValue ? !isOn : value.includes(item)));
    onChange(next);
  }

  return (
    <div role="group" {...groupAttrs}>
      {options.map((option) => (
        <Chip
          key={option.value}
          active={value.includes(option.value)}
          icon={option.icon}
          disabled={option.disabled}
          onClick={() => toggle(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  );
}
