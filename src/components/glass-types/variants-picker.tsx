"use client";

import { useMemo, useState } from "react";
import { useRovingRadioGroup } from "@/components/ig/radio-card";
import { cn } from "@/lib/utils";
import { Swatch, type SwatchData } from "./swatch";

/**
 * «Варианты» of a glass type (`Riflenoe.dc.html`, `.vd-*`): an interactive pattern picker when
 * the variants describe where they are used, otherwise a static grid of samples (tinted colours).
 */

/** One variant, resolved on the server from `glass-types.variants[]`. */
export interface VariantView {
  /** Stable key (`variants[].key`, else the array index). */
  key: string;
  name: string;
  description: string | null;
  /** «Где чаще применяют»; present on at least one variant → the interactive picker. */
  application: string | null;
  swatch: SwatchData;
}

/** Grid of the cards: 5 columns ≥1101, 3 at ≤1100, 2 at ≤599 (`.vd-pats`). */
const GRID_CLASS =
  "m-0 grid list-none grid-cols-5 gap-4 p-0 max-md:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-2.5";

/** Card frame shared by the radio buttons and the static cards (`.vd-pat`). */
const CARD_CLASS =
  "border-line bg-surface text-text flex h-full w-full flex-col gap-3 rounded-lg border-[1.5px] p-3 pb-[18px] text-left";

const NAME_CLASS = "text-h6 font-semibold";
const DESCRIPTION_CLASS = "text-small text-ink-2";

/** `sizes` of a swatch image for `GRID_CLASS`. */
const SWATCH_SIZES = "(max-width: 599px) 50vw, (max-width: 1100px) 33vw, 20vw";

export interface VariantsPickerProps {
  items: VariantView[];
  /** `id` of the section heading that names the radio group. */
  labelledBy: string;
  /** Heading of the right column of the detail panel. */
  applicationHeading?: string | undefined;
}

const DEFAULT_APPLICATION_HEADING = "Где чаще применяют";

/**
 * Radio cards (`role="radiogroup"`, roving tabindex, arrows / Home / End select) and a detail
 * panel announced politely to screen readers. The first variant is selected initially, so the
 * server HTML already shows a complete panel.
 */
export function VariantsPicker({
  items,
  labelledBy,
  applicationHeading = DEFAULT_APPLICATION_HEADING,
}: VariantsPickerProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(items[0]?.key ?? null);
  const options = useMemo(() => items.map((item) => ({ value: item.key })), [items]);
  const itemProps = useRovingRadioGroup(options, selectedKey, setSelectedKey);
  const current = items.find((item) => item.key === selectedKey) ?? items[0];

  if (!current) return null;

  return (
    <div>
      <div role="radiogroup" aria-labelledby={labelledBy} className={GRID_CLASS}>
        {items.map((item, index) => {
          const selected = item.key === current.key;
          return (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={selected}
              data-variant-option={item.key}
              onClick={() => setSelectedKey(item.key)}
              className={cn(
                CARD_CLASS,
                "cursor-pointer transition-[border-color,box-shadow,background-color] duration-(--ig-dur-base)",
                "hover:border-gray-1 hover:shadow-card",
                "focus-visible:border-brand focus-visible:shadow-[var(--ig-focus-ring)] focus-visible:outline-none",
                selected && "border-brand bg-primary-light hover:border-brand"
              )}
              {...itemProps(index)}
            >
              <Swatch swatch={item.swatch} sizes={SWATCH_SIZES} />
              <span className={NAME_CLASS}>{item.name}</span>
              {item.description ? (
                // The short description repeats the panel text; phones show only the names.
                <span className={cn(DESCRIPTION_CLASS, "max-sm:hidden")}>{item.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        aria-live="polite"
        data-variant-detail=""
        className="bg-surface shadow-card mt-6 grid grid-cols-2 gap-6 rounded-xl p-7 max-sm:grid-cols-1 max-sm:p-5"
      >
        <div>
          <h3 className="text-primary-dark text-h5 m-0 mb-2 font-semibold">{current.name}</h3>
          {current.description ? <p className="ig-body m-0">{current.description}</p> : null}
        </div>
        {current.application ? (
          <div>
            <h3 className="text-text-2 text-body m-0 mb-2 font-semibold">{applicationHeading}</h3>
            <p className="ig-body m-0">{current.application}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Static samples (no choice to make): swatch + name + description, e.g. tinted colours. */
export function VariantsGrid({ items }: { items: VariantView[] }) {
  if (items.length === 0) return null;
  return (
    <ul className={GRID_CLASS}>
      {items.map((item) => (
        <li key={item.key} data-variant-card={item.key}>
          <div className={CARD_CLASS}>
            <Swatch swatch={item.swatch} sizes={SWATCH_SIZES} />
            <span className={NAME_CLASS}>{item.name}</span>
            {item.description ? (
              <span className={DESCRIPTION_CLASS}>{item.description}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
