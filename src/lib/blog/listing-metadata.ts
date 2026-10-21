import { getArticlesIndex } from "@/lib/cms/articles";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { absoluteUrl, buildMetadata } from "@/lib/seo/metadata";
import type { Page } from "@/payload-types";
import { BLOG_PATH, blogPageHref, isPageInRange, totalPages } from "./pagination";
import type { Metadata } from "next";

/**
 * Metadata of a blog listing page: SEO of the `/blog/` document; pages 2+ get «— страница N»
 * in the title, a self canonical and stay `index, follow`; every page links its neighbours
 * (`rel="prev"` / `rel="next"`).
 */
export async function blogListingMetadata(input: {
  doc: Page;
  page: number;
  total: number;
  placeholders: PlaceholderContext;
}): Promise<Metadata> {
  const { doc, page, total, placeholders } = input;
  const path = blogPageHref(page);
  const metadata = await buildMetadata({
    seo: page === 1 ? doc.seo : { ...doc.seo, canonical: null },
    path,
    fallbackTitle: doc.seo?.h1 || doc.title,
    placeholders,
    ...(page > 1 ? { pagination: { page } } : {}),
  });
  const last = totalPages(total);
  return {
    ...metadata,
    pagination: {
      previous: page > 1 ? absoluteUrl(blogPageHref(page - 1)) : null,
      next: page < last ? absoluteUrl(blogPageHref(page + 1)) : null,
    },
  };
}

/**
 * Metadata of listing page `page`, or `null` when the `/blog/` document is missing or the page
 * is out of range (the route then answers 404).
 */
export async function loadBlogListingMetadata(page: number): Promise<Metadata | null> {
  const [doc, index, placeholders] = await Promise.all([
    getPageByPath(BLOG_PATH),
    getArticlesIndex(),
    getPlaceholderContext(),
  ]);
  if (!doc || !isPageInRange(page, index.length)) return null;
  return blogListingMetadata({ doc, page, total: index.length, placeholders });
}
