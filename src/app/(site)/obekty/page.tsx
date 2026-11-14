import { permanentRedirect } from "next/navigation";
import { ObjectsListingView } from "@/components/objects/objects-listing-view";
import { getObjectsIndex } from "@/lib/cms/objects";
import { getPageByPath } from "@/lib/cms/queries";
import {
  buildFacets,
  filterObjects,
  hasFilterParams,
  isFilteredQuery,
  knownSlugsOf,
  OBJECTS_BASE_PATH,
  objectsPagePath,
  parseObjectsQuery,
  totalPagesOf,
} from "@/lib/objects/filters";
import type { RawSearchParams } from "@/lib/objects/filters";
import { objectsListingMetadata } from "@/lib/objects/listing-metadata";
import type { Metadata } from "next";

/**
 * `/obekty/` — page 1 of the portfolio and every FILTERED page (`?product=&type=&city=&sort=`,
 * `&page=N`). Dynamic because of `searchParams`; the data comes from the cached index.
 * Unfiltered pages 2+ live at `/obekty/page/N/` (ISR): `/obekty/?page=N` without filters
 * redirects there permanently. Any filter / sort parameter → `noindex, follow`, canonical
 * `/obekty/`.
 */

type SearchParams = Promise<RawSearchParams>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [raw, index] = await Promise.all([searchParams, getObjectsIndex()]);
  return objectsListingMetadata({
    page: 1,
    totalPages: totalPagesOf(index.length),
    filtered: hasFilterParams(raw),
  });
}

export default async function ObjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const [raw, doc, index] = await Promise.all([
    searchParams,
    getPageByPath(OBJECTS_BASE_PATH),
    getObjectsIndex(),
  ]);
  // Unknown slugs are dropped: only taxonomies of published objects can filter.
  const query = parseObjectsQuery(raw, knownSlugsOf(buildFacets(index)));

  // Unfiltered pages have their own indexable URLs.
  if (!isFilteredQuery(query) && query.page > 1) {
    permanentRedirect(objectsPagePath(query.page));
  }

  // A filtered page number beyond the result (e.g. after narrowing) shows the last page.
  const filteredTotal = filterObjects(index, query.filters).length;
  const page = Math.min(query.page, Math.max(totalPagesOf(filteredTotal), 1));

  return <ObjectsListingView doc={doc} index={index} query={query} page={page} />;
}
