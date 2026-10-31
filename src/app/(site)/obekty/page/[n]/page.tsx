import { permanentRedirect } from "next/navigation";
import { ObjectsListingView } from "@/components/objects/objects-listing-view";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { getObjectsIndex } from "@/lib/cms/objects";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  OBJECTS_BASE_PATH,
  totalPagesOf,
} from "@/lib/objects/filters";
import { objectsListingMetadata } from "@/lib/objects/listing-metadata";
import type { Metadata } from "next";

/**
 * `/obekty/page/N/` — unfiltered listing pages 2…N (ISR, indexable, self canonical,
 * «— страница N» in the title). `/obekty/page/1/` → permanent redirect to `/obekty/`;
 * a non-canonical number (`02`, `abc`, `0`) or a page beyond the last → 404.
 *
 * The route is static, so it cannot see the query: filtered pages are served by `/obekty/`
 * (`?type=…&page=N`), which is where the listing UI and the pagination of a filtered result
 * link to.
 */

type Params = Promise<{ n: string }>;

/** No DB at build time: pages render on first request, then ISR. */
export function generateStaticParams(): Array<{ n: string }> {
  return [];
}
export const dynamicParams = true;
export const revalidate = 3600;

/** Canonical page number of the segment or `null` (`1` is valid here and redirected). */
function pageNumberOf(segment: string): number | null {
  return /^[1-9]\d{0,5}$/.test(segment) ? Number(segment) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const [{ n }, index] = await Promise.all([params, getObjectsIndex()]);
  const page = pageNumberOf(n);
  const totalPages = totalPagesOf(index.length);
  if (page === null || page < 2 || page > totalPages) return NOT_FOUND_METADATA;
  return objectsListingMetadata({ page, totalPages, filtered: false });
}

export default async function ObjectsPaginatedPage({ params }: { params: Params }) {
  const { n } = await params;
  const page = pageNumberOf(n);
  if (page === 1) permanentRedirect(OBJECTS_BASE_PATH);

  const [doc, index] = await Promise.all([getPageByPath(OBJECTS_BASE_PATH), getObjectsIndex()]);
  if (page === null || page > totalPagesOf(index.length)) {
    await redirectIfExists(`${OBJECTS_BASE_PATH}page/${n}/`);
    return <NotFoundResponse />;
  }

  return (
    <ObjectsListingView
      doc={doc}
      index={index}
      query={{ filters: EMPTY_FILTERS, sort: DEFAULT_SORT }}
      page={page}
    />
  );
}
