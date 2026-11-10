"use client";

import { useId } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Select } from "@/components/ig/select";
import {
  buildObjectsHref,
  FILTER_LABELS,
  SORT_LABELS,
  SORT_VALUES,
  toggleFilterValue,
} from "@/lib/objects/filters";
import type {
  FacetOption,
  FilterKey,
  ObjectsFacets,
  ObjectsFilters,
  ObjectsSort,
} from "@/lib/objects/filters";
import { cn } from "@/lib/utils";

export interface ObjectsFilterPanelProps {
  facets: ObjectsFacets;
  filters: ObjectsFilters;
  sort: ObjectsSort;
  /** Objects matching the filters («Найдено: N»). */
  total: number;
  /** Applies a new filter state (URL replace in a transition, see `ObjectsListing`). */
  onFiltersChange: (filters: ObjectsFilters) => void;
  onSortChange: (sort: ObjectsSort) => void;
  className?: string | undefined;
}

/** «Все» of a pill row (Paper mockup `2560_obekty`). */
const ALL_LABEL = "Все";
const ALL_CITIES_LABEL = "Все города";
/** Value of the city select when several cities are chosen (only reachable via URL / drawer). */
const MULTI_CITY_VALUE = "__multi";

const PILL =
  "inline-flex min-h-10 items-center rounded-full border px-4.5 py-2.5 text-[15px] leading-[18px] font-medium no-underline transition-colors duration-200 focus-visible:outline-brand focus-visible:outline-2 focus-visible:outline-offset-2";
const PILL_IDLE = "border-line bg-surface text-text hover:border-brand hover:text-primary-pressed";
const PILL_ACTIVE = "border-primary bg-primary text-white hover:bg-primary-hover";

const ROW = "flex items-center gap-6 border-hairline [&+&]:border-t [&+&]:pt-5";
const ROW_LABEL = "ig-label text-text-2 w-35 shrink-0";

const isSort = (value: string): value is ObjectsSort =>
  (SORT_VALUES as readonly string[]).includes(value);

/**
 * Desktop filters of the listing (≥1101 px, Paper mockup `2560_obekty`, frame `filters`): a white
 * panel with the rows «Изделие» and «Тип объекта» as pills (several values of a row may be on,
 * «Все» clears the row) and «Город» as a select, plus the sort and «Найдено: N».
 *
 * Pills are real links to the filtered URL (`buildObjectsHref`), so they work and can be opened
 * without JavaScript; with it, a click goes through `onFiltersChange` (optimistic state, no
 * scroll). Below 1101 px the listing shows the toolbar + drawer instead.
 */
export function ObjectsFilterPanel({
  facets,
  filters,
  sort,
  total,
  onFiltersChange,
  onSortChange,
  className,
}: ObjectsFilterPanelProps) {
  const cityId = useId();
  const sortId = useId();
  const cityValue =
    filters.city.length === 0
      ? ""
      : filters.city.length === 1
        ? (filters.city[0] ?? "")
        : MULTI_CITY_VALUE;
  const multiCityLabel = facets.city
    .filter((option) => filters.city.includes(option.slug))
    .map((option) => option.name)
    .join(", ");

  return (
    <div
      className={cn(
        "bg-surface border-hairline flex flex-col gap-5 rounded-xl border px-10 py-8 max-lg:px-8 max-lg:py-6",
        className
      )}
      data-objects-filters=""
    >
      {(["product", "type"] as const).map((key) =>
        facets[key].length > 0 ? (
          <PillRow
            key={key}
            filterKey={key}
            options={facets[key]}
            filters={filters}
            sort={sort}
            onFiltersChange={onFiltersChange}
          />
        ) : null
      )}

      <div className={cn(ROW, "justify-between")}>
        <div className="flex items-center gap-6">
          {facets.city.length > 0 ? (
            <>
              <label htmlFor={cityId} className={ROW_LABEL}>
                {FILTER_LABELS.city}
              </label>
              <Select
                id={cityId}
                value={cityValue}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === MULTI_CITY_VALUE) return;
                  onFiltersChange({ ...filters, city: value ? [value] : [] });
                }}
                // «Все города» is a real choice, not a placeholder: regular text colour.
                className="has-[option[value='']:checked]:text-text h-12 w-[320px] max-lg:w-[260px]"
              >
                <option value="">{ALL_CITIES_LABEL}</option>
                {cityValue === MULTI_CITY_VALUE ? (
                  <option value={MULTI_CITY_VALUE} disabled>
                    {multiCityLabel}
                  </option>
                ) : null}
                {facets.city.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <label htmlFor={sortId} className="text-text-2 text-[14px] leading-[1.3]">
              Сортировка
            </label>
            <Select
              id={sortId}
              value={sort}
              onChange={(event) => {
                if (isSort(event.target.value)) onSortChange(event.target.value);
              }}
              className="h-12 w-[200px]"
            >
              {SORT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {SORT_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <p
            className="text-text-2 m-0 text-[15px] leading-[18px] tabular-nums"
            aria-live="polite"
            data-objects-count=""
          >
            {`Найдено: ${total}`}
          </p>
        </div>
      </div>
    </div>
  );
}

interface PillRowProps {
  filterKey: Exclude<FilterKey, "city">;
  options: readonly FacetOption[];
  filters: ObjectsFilters;
  sort: ObjectsSort;
  onFiltersChange: (filters: ObjectsFilters) => void;
}

/** A labelled row of filter pills: «Все» + one pill per facet value. */
function PillRow({ filterKey, options, filters, sort, onFiltersChange }: PillRowProps) {
  const labelId = useId();
  const selected = filters[filterKey];
  const cleared: ObjectsFilters = { ...filters, [filterKey]: [] };

  /** Plain clicks go through the client state; modified clicks (new tab) keep the link. */
  const follow = (next: ObjectsFilters) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onFiltersChange(next);
  };

  return (
    <div className={ROW}>
      <span id={labelId} className={ROW_LABEL}>
        {FILTER_LABELS[filterKey]}
      </span>
      <ul aria-labelledby={labelId} className="m-0 flex list-none flex-wrap gap-2 p-0">
        <li>
          <Pill
            href={buildObjectsHref({ filters: cleared, sort })}
            active={selected.length === 0}
            onClick={follow(cleared)}
          >
            {ALL_LABEL}
          </Pill>
        </li>
        {options.map((option) => {
          const next = toggleFilterValue(filters, filterKey, option.slug, options);
          return (
            <li key={option.slug}>
              <Pill
                href={buildObjectsHref({ filters: next, sort })}
                active={selected.includes(option.slug)}
                onClick={follow(next)}
              >
                {option.name}
              </Pill>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface PillProps {
  href: string;
  active: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  children: string;
}

function Pill({ href, active, onClick, children }: PillProps) {
  return (
    <Link
      href={href}
      scroll={false}
      replace
      prefetch={false}
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(PILL, active ? PILL_ACTIVE : PILL_IDLE)}
      data-filter-pill=""
    >
      {children}
    </Link>
  );
}
