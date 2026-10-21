"use client";

import { X } from "lucide-react";
import { Chip } from "@/components/ig/chip";
import type { ActiveFilter } from "@/lib/objects/filters";

export interface ActiveFiltersProps {
  items: readonly ActiveFilter[];
  onRemove: (item: ActiveFilter) => void;
  onClearAll: () => void;
}

/**
 * Applied filters above the grid (prototype `.ob-active`): each chip is a button that removes
 * its value, plus «Сбросить всё». Renders nothing without filters.
 */
export function ActiveFilters({ items, onRemove, onClearAll }: ActiveFiltersProps) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" data-active-filters="">
      {items.map((item) => (
        <Chip
          key={`${item.key}:${item.slug}`}
          onClick={() => onRemove(item)}
          aria-label={`Убрать фильтр ${item.label}`}
          className="bg-primary-light border-line-teal text-primary-dark hover:border-brand"
        >
          {item.label}
          <X aria-hidden="true" strokeWidth={2.5} />
        </Chip>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ig-link ml-2 cursor-pointer border-0 bg-transparent p-0 text-[14px]"
      >
        Сбросить всё
      </button>
    </div>
  );
}
