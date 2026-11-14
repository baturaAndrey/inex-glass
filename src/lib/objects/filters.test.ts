import { describe, expect, it } from "vitest";
import {
  activeFilters,
  buildFacets,
  buildObjectsHref,
  EMPTY_FILTERS,
  filterObjects,
  hasFilterParams,
  isFilteredQuery,
  knownSlugsOf,
  OBJECTS_PAGE_SIZE,
  objectsPagePath,
  paginate,
  parseObjectsQuery,
  pickRelated,
  selectedCount,
  selectObjects,
  sortObjects,
  toggleFilterValue,
  totalPagesOf,
} from "./filters";
import type { ObjectCardData, TaxonomyRef } from "./filters";

const CHEL: TaxonomyRef = { slug: "chelyabinsk", name: "Челябинск", order: 10 };
const OMSK: TaxonomyRef = { slug: "omsk", name: "Омск", order: 20 };
const SURGUT: TaxonomyRef = { slug: "surgut", name: "Сургут", order: 30 };
const TC: TaxonomyRef = { slug: "tc", name: "ТЦ", order: 10 };
const ARENA: TaxonomyRef = { slug: "arena", name: "Арена", order: 20 };
const BANK: TaxonomyRef = { slug: "bank", name: "Банк", order: 30 };
const PART: TaxonomyRef = { slug: "peregorodki", name: "Перегородки", order: 10 };
const RAIL: TaxonomyRef = { slug: "ograzhdeniya", name: "Ограждения", order: 20 };
const FAC: TaxonomyRef = { slug: "fasady", name: "Фасады", order: 30 };

function card(
  id: string,
  name: string,
  extra: Partial<Omit<ObjectCardData, "id" | "name">> = {}
): ObjectCardData {
  return {
    id,
    slug: id,
    href: `/obekty/${id}/`,
    name,
    city: null,
    type: null,
    products: [],
    chips: [],
    photo: null,
    sortDate: "2024-01-01T12:00:00.000Z",
    related: [],
    ...extra,
  };
}

const ITEMS: ObjectCardData[] = [
  card("a", "«РМК-Арена»", {
    city: CHEL,
    type: ARENA,
    products: [RAIL],
    sortDate: "2024-05-01T12:00:00.000Z",
  }),
  card("b", "ТРЦ «Алмаз»", {
    city: CHEL,
    type: TC,
    products: [PART, RAIL],
    sortDate: "2023-05-01T12:00:00.000Z",
  }),
  card("c", "Сбербанк (Ишим)", {
    city: null,
    type: BANK,
    products: [FAC],
    sortDate: "2025-01-01T12:00:00.000Z",
  }),
  card("d", "Аэропорт Челябинск", {
    city: OMSK,
    type: TC,
    products: [PART],
    sortDate: "2022-01-01T12:00:00.000Z",
  }),
  card("e", "Главное управление «Сургутнефтегаз»", {
    city: SURGUT,
    type: BANK,
    products: [FAC, PART],
    sortDate: "2021-01-01T12:00:00.000Z",
  }),
];

describe("parseObjectsQuery", () => {
  it("parses comma lists, repeated keys, sort and page", () => {
    const query = parseObjectsQuery({
      type: "tc,arena",
      city: ["chelyabinsk", "omsk,chelyabinsk"],
      sort: "az",
      page: "2",
    });
    expect(query.filters).toEqual({
      product: [],
      type: ["tc", "arena"],
      city: ["chelyabinsk", "omsk"],
    });
    expect(query.sort).toBe("az");
    expect(query.page).toBe(2);
  });

  it("ignores garbage: invalid slugs, unknown sort, bad page, unknown keys", () => {
    const query = parseObjectsQuery({
      product: "Перегородки,<script>,  ,ok-slug,--",
      type: "",
      sort: "price",
      page: "-3",
      utm_source: "x",
    });
    expect(query).toEqual({
      filters: { product: ["ok-slug"], type: [], city: [] },
      sort: "new",
      page: 1,
    });
    expect(parseObjectsQuery({ page: "02" }).page).toBe(1);
    expect(parseObjectsQuery({ page: "abc" }).page).toBe(1);
    expect(parseObjectsQuery({ sort: ["city", "az"] }).sort).toBe("city");
  });

  it("drops slugs that are not among the published facets", () => {
    const known = knownSlugsOf(buildFacets(ITEMS));
    const query = parseObjectsQuery(
      { type: "tc,airport", city: "moscow", product: "fasady" },
      known
    );
    expect(query.filters).toEqual({ product: ["fasady"], type: ["tc"], city: [] });
  });

  it("lower-cases values", () => {
    expect(parseObjectsQuery({ type: "TC" }).filters.type).toEqual(["tc"]);
  });
});

describe("hasFilterParams / isFilteredQuery / selectedCount", () => {
  it("detects any filter or sort key, even empty", () => {
    expect(hasFilterParams({})).toBe(false);
    expect(hasFilterParams({ utm_source: "x", page: "2" })).toBe(false);
    expect(hasFilterParams({ sort: "new" })).toBe(true);
    expect(hasFilterParams({ city: "" })).toBe(true);
  });

  it("counts selected values and treats the default sort as unfiltered", () => {
    expect(isFilteredQuery({ filters: EMPTY_FILTERS, sort: "new" })).toBe(false);
    expect(isFilteredQuery({ filters: EMPTY_FILTERS, sort: "az" })).toBe(true);
    const filters = { product: ["a"], type: ["b", "c"], city: [] };
    expect(isFilteredQuery({ filters, sort: "new" })).toBe(true);
    expect(selectedCount(filters)).toBe(3);
  });
});

describe("buildObjectsHref", () => {
  it("unfiltered pages use the path scheme", () => {
    expect(buildObjectsHref()).toBe("/obekty/");
    expect(buildObjectsHref({ page: 1 })).toBe("/obekty/");
    expect(buildObjectsHref({ page: 3 })).toBe("/obekty/page/3/");
    expect(objectsPagePath(2)).toBe("/obekty/page/2/");
  });

  it("writes filters in a fixed order, keeps commas, omits sort=new, empty lists and page 1", () => {
    expect(
      buildObjectsHref({
        filters: { product: [], type: ["tc", "arena"], city: ["chelyabinsk"] },
        sort: "new",
      })
    ).toBe("/obekty/?type=tc,arena&city=chelyabinsk");
    expect(buildObjectsHref({ filters: EMPTY_FILTERS, sort: "az" })).toBe("/obekty/?sort=az");
    expect(
      buildObjectsHref({
        filters: { product: ["fasady"], type: [], city: [] },
        sort: "city",
        page: 2,
      })
    ).toBe("/obekty/?product=fasady&sort=city&page=2");
  });

  it("round-trips through parseObjectsQuery", () => {
    const filters = { product: ["fasady"], type: ["tc"], city: ["omsk", "surgut"] };
    const href = buildObjectsHref({ filters, sort: "az", page: 2 });
    const params = Object.fromEntries(new URL(href, "http://x").searchParams);
    expect(parseObjectsQuery(params)).toEqual({ filters, sort: "az", page: 2 });
  });
});

describe("toggleFilterValue", () => {
  it("adds and removes values keeping the option order", () => {
    const options = buildFacets(ITEMS).type;
    const on = toggleFilterValue(EMPTY_FILTERS, "type", "bank", options);
    const both = toggleFilterValue(on, "type", "tc", options);
    expect(both.type).toEqual(["tc", "bank"]);
    expect(toggleFilterValue(both, "type", "tc", options).type).toEqual(["bank"]);
  });
});

describe("filterObjects", () => {
  const ids = (items: ObjectCardData[]) => items.map((item) => item.id).sort();

  it("filters by each axis", () => {
    expect(ids(filterObjects(ITEMS, { ...EMPTY_FILTERS, product: ["fasady"] }))).toEqual([
      "c",
      "e",
    ]);
    expect(ids(filterObjects(ITEMS, { ...EMPTY_FILTERS, type: ["tc"] }))).toEqual(["b", "d"]);
    expect(ids(filterObjects(ITEMS, { ...EMPTY_FILTERS, city: ["chelyabinsk"] }))).toEqual([
      "a",
      "b",
    ]);
  });

  it("OR inside a group, AND between groups", () => {
    expect(ids(filterObjects(ITEMS, { ...EMPTY_FILTERS, type: ["tc", "arena"] }))).toEqual([
      "a",
      "b",
      "d",
    ]);
    expect(
      ids(
        filterObjects(ITEMS, {
          product: ["peregorodki"],
          type: ["tc", "bank"],
          city: ["chelyabinsk"],
        })
      )
    ).toEqual(["b"]);
  });

  it("an object without a city never matches a city filter", () => {
    expect(ids(filterObjects(ITEMS, { ...EMPTY_FILTERS, city: ["omsk", "surgut"] }))).toEqual([
      "d",
      "e",
    ]);
  });

  it("no filters → everything", () => {
    expect(filterObjects(ITEMS, EMPTY_FILTERS)).toHaveLength(ITEMS.length);
  });
});

describe("sortObjects", () => {
  const names = (items: ObjectCardData[]) => items.map((item) => item.id);

  it("new: sortDate descending, input not mutated", () => {
    const copy = [...ITEMS];
    expect(names(sortObjects(ITEMS, "new"))).toEqual(["c", "a", "b", "d", "e"]);
    expect(ITEMS).toEqual(copy);
  });

  it("az: Russian collation ignoring «» and quotes", () => {
    expect(names(sortObjects(ITEMS, "az"))).toEqual(["d", "e", "a", "c", "b"]);
  });

  it("city: by city name, objects without a city last", () => {
    const sorted = sortObjects(ITEMS, "city");
    expect(names(sorted)).toEqual(["d", "e", "a", "b", "c"]);
    expect(sorted.at(-1)?.city).toBeNull();
  });
});

describe("paginate", () => {
  const many = (n: number) => Array.from({ length: n }, (_, index) => index);

  it("24 items fit one page, 25 need two", () => {
    expect(OBJECTS_PAGE_SIZE).toBe(24);
    expect(paginate(many(24), 1)).toMatchObject({ totalPages: 1, total: 24 });
    expect(paginate(many(24), 1).items).toHaveLength(24);
    const two = paginate(many(25), 2);
    expect(two).toMatchObject({ totalPages: 2, total: 25, items: [24] });
  });

  it("pages outside the range are empty; no items → 0 pages", () => {
    expect(paginate(many(30), 3).items).toEqual([]);
    expect(paginate(many(30), 0).items).toEqual([]);
    expect(totalPagesOf(0)).toBe(0);
    expect(paginate([], 1)).toMatchObject({ totalPages: 0, items: [] });
  });

  it("selectObjects filters, sorts and slices", () => {
    const slice = selectObjects(
      ITEMS,
      { filters: { ...EMPTY_FILTERS, type: ["tc"] }, sort: "az" },
      1
    );
    expect(slice.items.map((item) => item.id)).toEqual(["d", "b"]);
    expect(slice.total).toBe(2);
  });
});

describe("facets and active filters", () => {
  it("only used taxonomies with counts, by order", () => {
    const facets = buildFacets(ITEMS);
    expect(facets.product).toEqual([
      { slug: "peregorodki", name: "Перегородки", count: 3 },
      { slug: "ograzhdeniya", name: "Ограждения", count: 2 },
      { slug: "fasady", name: "Фасады", count: 2 },
    ]);
    expect(facets.city.map((option) => option.slug)).toEqual(["chelyabinsk", "omsk", "surgut"]);
    expect(facets.type.find((option) => option.slug === "tc")?.count).toBe(2);
  });

  it("chips carry the taxonomy names", () => {
    const facets = buildFacets(ITEMS);
    expect(
      activeFilters({ product: [], type: ["arena"], city: ["omsk"] }, facets).map(
        (item) => item.label
      )
    ).toEqual(["Арена", "Омск"]);
  });
});

describe("pickRelated", () => {
  it("prefers hand-picked related objects (published ones, in order, max 4, never self)", () => {
    const current = { ...ITEMS[0]!, related: ["missing", "d", "a", "b"] };
    expect(pickRelated(current, ITEMS).map((item) => item.id)).toEqual(["d", "b"]);
  });

  it("auto: shared product, then shared type, then newest", () => {
    const current = card("x", "X", { products: [RAIL], type: BANK });
    // RAIL: a, b (newest first) → BANK: c, e (newest first)
    expect(pickRelated(current, ITEMS).map((item) => item.id)).toEqual(["a", "b", "c", "e"]);
  });

  it("excludes the object itself and respects the limit", () => {
    const related = pickRelated(ITEMS[1]!, ITEMS, 2);
    expect(related).toHaveLength(2);
    expect(related.map((item) => item.id)).not.toContain("b");
  });
});
