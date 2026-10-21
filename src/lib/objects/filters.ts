import { z } from "zod";

/**
 * Portfolio listing `/obekty/` — pure functions (no Next / Payload imports): query parsing and
 * building, filtering, sorting, pagination, facets and the «Другие объекты» pick.
 *
 * URL scheme (decision of task 30, see the report for task 36):
 * - `/obekty/` — page 1; `/obekty/page/N/` — unfiltered pages N ≥ 2 (ISR, indexable);
 * - filters in the query of `/obekty/`: `product`, `type`, `city` — comma-separated slug lists
 *   (`?type=tc,arena&city=chelyabinsk`), `sort` — `new` (default, never written) | `az` | `city`;
 * - pages of a FILTERED result: `/obekty/?type=tc&page=2` (`page` is only written with filters:
 *   the ISR route `/obekty/page/N/` cannot read the query). Filtered URLs are `noindex, follow`
 *   with the canonical `/obekty/`.
 */

export const OBJECTS_BASE_PATH = "/obekty/";
/** Cards per server page (all of them are in the HTML). */
export const OBJECTS_PAGE_SIZE = 24;
/** Cards visible before «Показать ещё». */
export const OBJECTS_INITIAL_VISIBLE = 8;
/** Cards revealed by one «Показать ещё». */
export const OBJECTS_LOAD_STEP = 8;
/** Cards in «Другие объекты». */
export const RELATED_OBJECTS_LIMIT = 4;
/** Slug reserved by the pagination segment `/obekty/page/N/`. */
export const RESERVED_OBJECT_SLUG = "page";

export const FILTER_KEYS = ["product", "type", "city"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

export const SORT_VALUES = ["new", "az", "city"] as const;
export type ObjectsSort = (typeof SORT_VALUES)[number];
export const DEFAULT_SORT: ObjectsSort = "new";

export const SORT_LABELS: Readonly<Record<ObjectsSort, string>> = {
  new: "Сначала новые",
  az: "По алфавиту",
  city: "По городу",
};

export const FILTER_LABELS: Readonly<Record<FilterKey, string>> = {
  product: "Изделие",
  type: "Тип объекта",
  city: "Город",
};

/** Query keys whose presence makes a listing URL a filtered (noindex) one. */
export const FILTER_QUERY_KEYS = [...FILTER_KEYS, "sort"] as const;
const PAGE_QUERY_KEY = "page";

/** More values than any facet can have — protects against absurd query strings. */
const MAX_VALUES_PER_FILTER = 50;
const SLUG_VALUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------------------------
// Data shapes
// ---------------------------------------------------------------------------------------------

export interface TaxonomyRef {
  slug: string;
  name: string;
  /** `order` of the taxonomy document (facet order). */
  order?: number | null | undefined;
}

export interface ObjectPhoto {
  /** Site-relative URL (`/api/media/file/…`). */
  src: string;
  alt: string;
  width?: number | null | undefined;
  height?: number | null | undefined;
}

/** Card data of a published object: everything the listing, filters and related cards need. */
export interface ObjectCardData {
  id: string;
  slug: string;
  href: string;
  name: string;
  city: TaxonomyRef | null;
  type: TaxonomyRef | null;
  products: TaxonomyRef[];
  /** Card chips: editor `chips[]`, otherwise generated from the first spec rows (max 3). */
  chips: string[];
  photo: ObjectPhoto | null;
  /** ISO date of «Сначала новые»: `sortDate`, otherwise `createdAt`. */
  sortDate: string;
  /** Hand-picked «Похожие объекты» (ids, in the editor's order). */
  related: string[];
}

export type ObjectsFilters = Readonly<Record<FilterKey, readonly string[]>>;

export interface ObjectsQuery {
  filters: ObjectsFilters;
  sort: ObjectsSort;
  /** 1-based page of a filtered result (`?page=`); unfiltered pages live at `/obekty/page/N/`. */
  page: number;
}

export interface FacetOption {
  slug: string;
  name: string;
  count: number;
}

export type ObjectsFacets = Readonly<Record<FilterKey, readonly FacetOption[]>>;

export type RawSearchParams = Readonly<Record<string, string | string[] | undefined>>;

export const EMPTY_FILTERS: ObjectsFilters = { product: [], type: [], city: [] };

// ---------------------------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------------------------

/** A query value may repeat (`?type=a&type=b`); both forms are accepted. */
const rawValue = z.union([z.string(), z.array(z.string())]).optional();

/** Comma-separated slug list → unique, valid slugs in the given order. Garbage → `[]`. */
const slugList = rawValue
  .transform((value) => {
    const parts = (Array.isArray(value) ? value : value === undefined ? [] : [value])
      .flatMap((item) => item.split(","))
      .map((item) => item.trim().toLowerCase())
      .filter((item) => SLUG_VALUE.test(item));
    return [...new Set(parts)].slice(0, MAX_VALUES_PER_FILTER);
  })
  .catch([]);

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const sortSchema = z.preprocess(firstValue, z.enum(SORT_VALUES)).catch(DEFAULT_SORT);

const pageSchema = z
  .preprocess(
    firstValue,
    z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .transform(Number)
  )
  .catch(1);

const querySchema = z.object({
  product: slugList,
  type: slugList,
  city: slugList,
  sort: sortSchema,
  page: pageSchema,
});

/** Known slugs per filter (published facets); values outside them are dropped. */
export type KnownSlugs = Readonly<Record<FilterKey, ReadonlySet<string>>>;

/** Facets → the sets of slugs accepted by `parseObjectsQuery`. */
export function knownSlugsOf(facets: ObjectsFacets): KnownSlugs {
  return {
    product: new Set(facets.product.map((option) => option.slug)),
    type: new Set(facets.type.map((option) => option.slug)),
    city: new Set(facets.city.map((option) => option.slug)),
  };
}

/**
 * `searchParams` → listing state. Never throws: unknown keys are ignored, malformed values fall
 * back to the defaults (zod `.catch`), unknown slugs are dropped when `known` is given.
 */
export function parseObjectsQuery(raw: RawSearchParams, known?: KnownSlugs): ObjectsQuery {
  const parsed = querySchema.parse({
    product: raw.product,
    type: raw.type,
    city: raw.city,
    sort: raw.sort,
    page: raw[PAGE_QUERY_KEY],
  });
  const keep = (key: FilterKey, values: string[]) =>
    known ? values.filter((value) => known[key].has(value)) : values;
  return {
    filters: {
      product: keep("product", parsed.product),
      type: keep("type", parsed.type),
      city: keep("city", parsed.city),
    },
    sort: parsed.sort,
    page: parsed.page,
  };
}

/**
 * `true` when the URL carries any filter or sort parameter — even an empty / unknown one.
 * Such URLs are `noindex, follow` with the canonical `/obekty/` (SEO rule of the task).
 */
export function hasFilterParams(raw: RawSearchParams): boolean {
  return FILTER_QUERY_KEYS.some((key) => raw[key] !== undefined);
}

/** At least one filter value or a non-default sort: the URL needs a query. */
export function isFilteredQuery(query: Pick<ObjectsQuery, "filters" | "sort">): boolean {
  return query.sort !== DEFAULT_SORT || selectedCount(query.filters) > 0;
}

/** Number of selected filter values (badge of the «Фильтры» button). */
export function selectedCount(filters: ObjectsFilters): number {
  return FILTER_KEYS.reduce((sum, key) => sum + filters[key].length, 0);
}

// ---------------------------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------------------------

/** Path of an UNFILTERED listing page: `/obekty/` or `/obekty/page/N/`. */
export function objectsPagePath(page: number): string {
  return page > 1 ? `${OBJECTS_BASE_PATH}page/${page}/` : OBJECTS_BASE_PATH;
}

export interface ObjectsHrefState {
  filters?: ObjectsFilters | undefined;
  sort?: ObjectsSort | undefined;
  page?: number | undefined;
}

/**
 * Listing URL for a state. Without filters and sort: `/obekty/` / `/obekty/page/N/`. Otherwise
 * `/obekty/?product=…&type=…&city=…&sort=…&page=N` — fixed key order, commas kept readable,
 * empty lists, `sort=new` and `page=1` omitted.
 */
export function buildObjectsHref(state: ObjectsHrefState = {}): string {
  const filters = state.filters ?? EMPTY_FILTERS;
  const sort = state.sort ?? DEFAULT_SORT;
  const page = Number.isInteger(state.page) && (state.page ?? 1) > 1 ? (state.page as number) : 1;

  const parts: string[] = [];
  for (const key of FILTER_KEYS) {
    const values = filters[key].filter((value) => SLUG_VALUE.test(value));
    // Slugs are `[a-z0-9-]`: nothing to encode, and the comma stays readable.
    if (values.length > 0) parts.push(`${key}=${values.join(",")}`);
  }
  if (sort !== DEFAULT_SORT) parts.push(`sort=${sort}`);
  if (parts.length === 0) return objectsPagePath(page);
  if (page > 1) parts.push(`${PAGE_QUERY_KEY}=${page}`);
  return `${OBJECTS_BASE_PATH}?${parts.join("&")}`;
}

/** Filters with one value toggled (the order of `options` is kept when given). */
export function toggleFilterValue(
  filters: ObjectsFilters,
  key: FilterKey,
  slug: string,
  options?: readonly FacetOption[]
): ObjectsFilters {
  const current = filters[key];
  const isOn = current.includes(slug);
  let next = isOn ? current.filter((value) => value !== slug) : [...current, slug];
  if (options) {
    const order = new Map(options.map((option, index) => [option.slug, index]));
    next = [...next].sort(
      (a, b) =>
        (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER)
    );
  }
  return { ...filters, [key]: next };
}

// ---------------------------------------------------------------------------------------------
// Filtering, sorting, pagination
// ---------------------------------------------------------------------------------------------

/** AND between filter groups, OR inside a group; an empty group does not filter. */
export function filterObjects<T extends ObjectCardData>(
  items: readonly T[],
  filters: ObjectsFilters
): T[] {
  const { product, type, city } = filters;
  return items.filter((item) => {
    if (product.length > 0 && !item.products.some((ref) => product.includes(ref.slug))) {
      return false;
    }
    if (type.length > 0 && (!item.type || !type.includes(item.type.slug))) return false;
    if (city.length > 0 && (!item.city || !city.includes(item.city.slug))) return false;
    return true;
  });
}

const collator = new Intl.Collator("ru", { sensitivity: "base", numeric: true });

/** Quotes and leading punctuation are ignored by «По алфавиту»: «РМК-Арена» sorts under «Р». */
const SORT_IGNORED = /[«»"„“”'‘’]/g;

/** Name as compared by the `az` sort. */
export function sortableName(name: string): string {
  return name.replace(SORT_IGNORED, "").replace(/\s+/g, " ").trim();
}

const byName = (a: ObjectCardData, b: ObjectCardData) =>
  collator.compare(sortableName(a.name), sortableName(b.name));

const timeOf = (iso: string) => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? 0 : time;
};

/** Newest first; equal dates by name. */
const byNewest = (a: ObjectCardData, b: ObjectCardData) =>
  timeOf(b.sortDate) - timeOf(a.sortDate) || byName(a, b);

/** By city name; objects without a city go last; same city by name. */
const byCity = (a: ObjectCardData, b: ObjectCardData) => {
  if (!a.city && !b.city) return byName(a, b);
  if (!a.city) return 1;
  if (!b.city) return -1;
  return collator.compare(a.city.name, b.city.name) || byName(a, b);
};

const COMPARATORS: Readonly<Record<ObjectsSort, (a: ObjectCardData, b: ObjectCardData) => number>> =
  {
    new: byNewest,
    az: byName,
    city: byCity,
  };

/** Sorted copy (the input is never mutated: it is the cached index). */
export function sortObjects<T extends ObjectCardData>(items: readonly T[], sort: ObjectsSort): T[] {
  return [...items].sort(COMPARATORS[sort]);
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

/** Number of pages for `total` items (0 for an empty list). */
export function totalPagesOf(total: number, size = OBJECTS_PAGE_SIZE): number {
  return total > 0 ? Math.ceil(total / size) : 0;
}

/** Items of a 1-based page; a page outside `1..totalPages` gives an empty slice. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  size = OBJECTS_PAGE_SIZE
): PageSlice<T> {
  const total = items.length;
  const totalPages = totalPagesOf(total, size);
  const valid = Number.isInteger(page) && page >= 1 && page <= totalPages;
  const start = (page - 1) * size;
  return {
    items: valid ? items.slice(start, start + size) : [],
    page,
    totalPages,
    total,
  };
}

/** Filter + sort + slice in one call (the listing routes). */
export function selectObjects(
  items: readonly ObjectCardData[],
  query: Pick<ObjectsQuery, "filters" | "sort">,
  page: number
): PageSlice<ObjectCardData> {
  return paginate(sortObjects(filterObjects(items, query.filters), query.sort), page);
}

// ---------------------------------------------------------------------------------------------
// Facets and active filters
// ---------------------------------------------------------------------------------------------

/** Taxonomies of a card per filter key. */
function refsOf(item: ObjectCardData, key: FilterKey): TaxonomyRef[] {
  if (key === "product") return item.products;
  const ref = key === "type" ? item.type : item.city;
  return ref ? [ref] : [];
}

/**
 * Drawer facets: only taxonomies used by at least one published object, with the number of
 * objects; ordered by the taxonomy `order`, then by name.
 */
export function buildFacets(items: readonly ObjectCardData[]): ObjectsFacets {
  const build = (key: FilterKey): FacetOption[] => {
    const bySlug = new Map<string, { ref: TaxonomyRef; count: number }>();
    for (const item of items) {
      for (const ref of refsOf(item, key)) {
        const entry = bySlug.get(ref.slug);
        if (entry) entry.count += 1;
        else bySlug.set(ref.slug, { ref, count: 1 });
      }
    }
    return [...bySlug.values()]
      .sort(
        (a, b) =>
          (a.ref.order ?? Number.MAX_SAFE_INTEGER) - (b.ref.order ?? Number.MAX_SAFE_INTEGER) ||
          collator.compare(a.ref.name, b.ref.name)
      )
      .map(({ ref, count }) => ({ slug: ref.slug, name: ref.name, count }));
  };
  return { product: build("product"), type: build("type"), city: build("city") };
}

export interface ActiveFilter {
  key: FilterKey;
  slug: string;
  label: string;
}

/** Chips above the grid, in the order product → type → city. */
export function activeFilters(filters: ObjectsFilters, facets: ObjectsFacets): ActiveFilter[] {
  return FILTER_KEYS.flatMap((key) =>
    filters[key].map((slug) => ({
      key,
      slug,
      label: facets[key].find((option) => option.slug === slug)?.name ?? slug,
    }))
  );
}

// ---------------------------------------------------------------------------------------------
// «Другие объекты»
// ---------------------------------------------------------------------------------------------

/**
 * Up to `limit` related cards: the object's hand-picked `related[]` (published ones, in the
 * editor's order); when none of them is published — automatically: objects sharing a product,
 * then sharing the type, then the newest. The object itself is never included.
 */
export function pickRelated(
  current: Pick<ObjectCardData, "id" | "products" | "type" | "related">,
  index: readonly ObjectCardData[],
  limit = RELATED_OBJECTS_LIMIT
): ObjectCardData[] {
  const others = index.filter((item) => item.id !== current.id);
  const byId = new Map(others.map((item) => [item.id, item]));
  const manual = current.related
    .map((id) => byId.get(id))
    .filter((item): item is ObjectCardData => item !== undefined);
  if (manual.length > 0) return manual.slice(0, limit);

  const productSlugs = new Set(current.products.map((ref) => ref.slug));
  const typeSlug = current.type?.slug ?? null;
  const rank = (item: ObjectCardData) => {
    if (item.products.some((ref) => productSlugs.has(ref.slug))) return 0;
    if (typeSlug !== null && item.type?.slug === typeSlug) return 1;
    return 2;
  };
  return [...others].sort((a, b) => rank(a) - rank(b) || byNewest(a, b)).slice(0, limit);
}
