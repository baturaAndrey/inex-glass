import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath } from "@/lib/cms/queries";
import { absoluteUrl, buildMetadata } from "@/lib/seo/metadata";
import type { Media, Page } from "@/payload-types";
import { OBJECTS_BASE_PATH } from "./filters";
import { LISTING_DESCRIPTION, LISTING_TITLE, listingSeo } from "./seo";
import type { Metadata } from "next";

function ogImageOf(doc: Page | null): { url: string; alt?: string | null } | null {
  const image = doc?.seo?.ogImage;
  if (!image || typeof image === "string") return null;
  const media = image as Media;
  return media.url ? { url: media.url, alt: media.alt ?? null } : null;
}

export interface ListingMetadataInput {
  page: number;
  totalPages: number;
  /** The URL carries filter / sort parameters. */
  filtered: boolean;
}

/**
 * `generateMetadata` of `/obekty/` and `/obekty/page/N/`: title / description of the CMS
 * document `/obekty/` (fallback — the 17-meta values), the rules of `listingSeo` (noindex +
 * canonical `/obekty/` for filters, «— страница N» and self canonical for pages 2+) and
 * `rel="prev"` / `rel="next"`.
 */
export async function objectsListingMetadata(input: ListingMetadataInput): Promise<Metadata> {
  const [doc, placeholders] = await Promise.all([
    getPageByPath(OBJECTS_BASE_PATH),
    getPlaceholderContext(),
  ]);
  const rules = listingSeo(input);

  const metadata = await buildMetadata({
    // The 17-meta title has no brand suffix: never let the fallback add one.
    seo: { ...doc?.seo, title: doc?.seo?.title || LISTING_TITLE },
    path: rules.path,
    fallbackTitle: LISTING_TITLE,
    fallbackDescription: LISTING_DESCRIPTION,
    placeholders,
    image: ogImageOf(doc),
    pagination: rules.titlePage ? { page: rules.titlePage } : undefined,
    forceNoindex: rules.noindex,
    canonicalOverride: rules.canonical,
  });

  if (!rules.previous && !rules.next) return metadata;
  return {
    ...metadata,
    pagination: {
      previous: rules.previous ? absoluteUrl(rules.previous) : null,
      next: rules.next ? absoluteUrl(rules.next) : null,
    },
  };
}
