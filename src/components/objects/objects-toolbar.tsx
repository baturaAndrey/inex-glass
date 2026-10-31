"use client";

import { useId } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ig/button";
import { Select } from "@/components/ig/select";
import { pluralObjects } from "@/lib/domain/plural";
import { SORT_LABELS, SORT_VALUES } from "@/lib/objects/filters";
import type { ObjectsSort } from "@/lib/objects/filters";

export interface ObjectsToolbarProps {
  total: number;
  sort: ObjectsSort;
  onSortChange: (sort: ObjectsSort) => void;
  /** Selected filter values (badge on «Фильтры»). */
  selected: number;
  filtersOpen: boolean;
  onOpenFilters: () => void;
}

const isSort = (value: string): value is ObjectsSort =>
  (SORT_VALUES as readonly string[]).includes(value);

/** «11 объектов» + sort select + «Фильтры» button (prototype `.ob-bar`). */
export function ObjectsToolbar({
  total,
  sort,
  onSortChange,
  selected,
  filtersOpen,
  onOpenFilters,
}: ObjectsToolbarProps) {
  const sortId = useId();
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <p
        className="m-0 text-[18px] leading-[1.3] font-semibold"
        aria-live="polite"
        data-objects-count=""
      >
        {`${total} ${pluralObjects(total)}`}
      </p>
      <div className="flex flex-wrap items-center gap-3 max-sm:w-full">
        <div className="flex items-center gap-2.5 max-sm:flex-1">
          <label htmlFor={sortId} className="text-text-2 text-[14px] leading-[1.3] max-sm:sr-only">
            Сортировка
          </label>
          <Select
            id={sortId}
            value={sort}
            onChange={(event) => {
              if (isSort(event.target.value)) onSortChange(event.target.value);
            }}
            className="h-12 w-[220px] max-sm:w-full"
          >
            {SORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="secondary"
          aria-expanded={filtersOpen}
          aria-haspopup="dialog"
          onClick={onOpenFilters}
          leftIcon={<SlidersHorizontal aria-hidden="true" strokeWidth={2} />}
        >
          Фильтры
          {selected > 0 ? (
            <>
              <span
                aria-hidden="true"
                className="bg-primary inline-grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-[12px] leading-none font-semibold text-white"
              >
                {selected}
              </span>
              <span className="sr-only">, выбрано значений: {selected}</span>
            </>
          ) : null}
        </Button>
      </div>
    </div>
  );
}
