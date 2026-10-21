"use client";

import { Button } from "@/components/ig/button";
import { Drawer } from "@/components/ig/drawer";
import { pluralObjects } from "@/lib/domain/plural";
import { FILTER_KEYS, FILTER_LABELS } from "@/lib/objects/filters";
import type { FacetOption, FilterKey, ObjectsFacets, ObjectsFilters } from "@/lib/objects/filters";

export interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facets: ObjectsFacets;
  filters: ObjectsFilters;
  onToggle: (key: FilterKey, slug: string) => void;
  onReset: () => void;
  /** Objects matching the current filters («Показать 11 объектов»). */
  total: number;
  /** A filter change is being applied (the total is about to update). */
  pending?: boolean | undefined;
}

/**
 * Right-hand filter drawer (prototype `.ob-drawer`) on the design-system `Drawer`: Radix focus
 * trap, Esc / overlay close, focus back on «Фильтры». Every checkbox applies at once (the URL is
 * replaced by the listing); the footer button only closes the panel.
 */
export function FilterDrawer({
  open,
  onOpenChange,
  facets,
  filters,
  onToggle,
  onReset,
  total,
  pending,
}: FilterDrawerProps) {
  const groups = FILTER_KEYS.filter((key) => facets[key].length > 0);
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Фильтры"
      className="max-sm:w-full"
      footer={
        <>
          <Button variant="ghost" onClick={onReset}>
            Сбросить
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            aria-busy={pending || undefined}
            onClick={() => onOpenChange(false)}
          >
            {`Показать ${total} ${pluralObjects(total)}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {groups.map((key) => (
          <fieldset
            key={key}
            className="border-line m-0 flex min-w-0 flex-col gap-3 border-0 border-b p-0 pb-5 last:border-b-0"
          >
            <legend className="ig-label mb-3 p-0">{FILTER_LABELS[key]}</legend>
            {facets[key].map((option) => (
              <FilterCheckbox
                key={option.slug}
                option={option}
                checked={filters[key].includes(option.slug)}
                onChange={() => onToggle(key, option.slug)}
              />
            ))}
          </fieldset>
        ))}
      </div>
    </Drawer>
  );
}

interface FilterCheckboxProps {
  option: FacetOption;
  checked: boolean;
  onChange: () => void;
}

/** Native checkbox in the `.ig-check` style with the number of objects. */
function FilterCheckbox({ option, checked, onChange }: FilterCheckboxProps) {
  return (
    <label className="ig-check text-text items-center text-[15px]">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="min-w-0 flex-1">{option.name}</span>
      <span className="text-text-2 text-[13px] tabular-nums" aria-hidden="true">
        {option.count}
      </span>
    </label>
  );
}
