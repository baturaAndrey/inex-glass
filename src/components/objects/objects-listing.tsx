"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ig/button";
import {
  activeFilters,
  buildObjectsHref,
  EMPTY_FILTERS,
  OBJECTS_INITIAL_VISIBLE,
  OBJECTS_LOAD_STEP,
  selectedCount,
  toggleFilterValue,
} from "@/lib/objects/filters";
import type {
  ActiveFilter,
  FilterKey,
  ObjectCardData,
  ObjectsFacets,
  ObjectsFilters,
  ObjectsSort,
} from "@/lib/objects/filters";
import { cn } from "@/lib/utils";
import { ActiveFilters } from "./active-filters";
import { FilterDrawer } from "./filter-drawer";
import { ObjectCard } from "./object-card";
import { ObjectsToolbar } from "./objects-toolbar";

export interface ObjectsListingProps {
  /** Cards of the current server page (up to 24, all in the HTML). */
  items: ObjectCardData[];
  /** Objects matching the filters (all pages). */
  total: number;
  facets: ObjectsFacets;
  filters: ObjectsFilters;
  sort: ObjectsSort;
}

interface ListingState {
  filters: ObjectsFilters;
  sort: ObjectsSort;
}

/** Grid of `Objects.dc.html` (`.g4`): 4 / 3 / 2 / 1 columns at ≥1366 / ≥1101 / ≥600 / <600. */
const GRID =
  "m-0 grid list-none grid-cols-1 gap-6 p-0 max-sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

/**
 * Client part of the listing: toolbar, applied-filter chips, card grid with «Показать ещё»,
 * empty state and the filter drawer.
 *
 * State lives in the URL: every change replaces it (`router.replace`, no scroll) inside a
 * transition and the server re-renders the page with the new slice; `useOptimistic` shows the
 * new checkboxes / sort at once. Changing filters always returns to the first page.
 * «Показать ещё» is a progressive enhancement: all cards of the page are server-rendered, the
 * extra ones carry `hidden` until revealed; the real pagination links sit below the grid.
 */
export function ObjectsListing({ items, total, facets, filters, sort }: ObjectsListingProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<ListingState>({ filters, sort });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Revealed cards belong to one result: a new slice (filters, sort, page) starts at 8 again.
  const itemsKey = items.map((item) => item.id).join(",");
  const [reveal, setReveal] = useState({ key: itemsKey, count: OBJECTS_INITIAL_VISIBLE });
  const visible = reveal.key === itemsKey ? reveal.count : OBJECTS_INITIAL_VISIBLE;
  const listRef = useRef<HTMLUListElement>(null);
  const focusIndex = useRef<number | null>(null);

  // After «Показать ещё» focus moves to the first revealed card, so keyboard users continue there.
  useEffect(() => {
    const index = focusIndex.current;
    if (index === null) return;
    focusIndex.current = null;
    listRef.current?.querySelectorAll<HTMLElement>(":scope > li > a")[index]?.focus();
  }, [visible]);

  const navigate = (next: ListingState) => {
    startTransition(() => {
      setOptimistic(next);
      router.replace(buildObjectsHref({ filters: next.filters, sort: next.sort }), {
        scroll: false,
      });
    });
  };

  const toggle = (key: FilterKey, slug: string) =>
    navigate({
      ...optimistic,
      filters: toggleFilterValue(optimistic.filters, key, slug, facets[key]),
    });
  const remove = (item: ActiveFilter) => toggle(item.key, item.slug);
  const clearFilters = () => navigate({ ...optimistic, filters: EMPTY_FILTERS });
  const changeSort = (next: ObjectsSort) => navigate({ ...optimistic, sort: next });

  const showMore = () => {
    focusIndex.current = visible;
    setReveal({ key: itemsKey, count: visible + OBJECTS_LOAD_STEP });
  };

  const chips = activeFilters(optimistic.filters, facets);
  const hasMore = visible < items.length;

  return (
    <>
      <ObjectsToolbar
        total={total}
        sort={optimistic.sort}
        onSortChange={changeSort}
        selected={selectedCount(optimistic.filters)}
        filtersOpen={drawerOpen}
        onOpenFilters={() => setDrawerOpen(true)}
      />
      <ActiveFilters items={chips} onRemove={remove} onClearAll={clearFilters} />

      {items.length > 0 ? (
        <ul
          ref={listRef}
          className={cn(
            GRID,
            "transition-opacity duration-(--ig-dur-base)",
            isPending && "opacity-60"
          )}
          aria-busy={isPending || undefined}
          data-objects-grid=""
        >
          {items.map((item, index) => (
            <li key={item.id} hidden={index >= visible} className="flex min-w-0 flex-col">
              <ObjectCard object={item} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-surface flex flex-col items-start gap-3 rounded-lg p-10 max-sm:p-6">
          <p className="ig-h5 m-0">Нет объектов по выбранным фильтрам</p>
          <Button variant="secondary" size="s" onClick={clearFilters}>
            Сбросить фильтры
          </Button>
        </div>
      )}

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <Button variant="secondary" onClick={showMore}>
            Показать ещё
          </Button>
        </div>
      ) : null}

      <FilterDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        facets={facets}
        filters={optimistic.filters}
        onToggle={toggle}
        onReset={clearFilters}
        total={total}
        pending={isPending}
      />
    </>
  );
}
