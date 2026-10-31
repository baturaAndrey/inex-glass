import { permanentRedirect } from "next/navigation";
import { BlogListingView } from "@/components/blog/blog-listing-view";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { loadBlogListingMetadata } from "@/lib/blog/listing-metadata";
import { BLOG_PATH, isPageInRange, parsePageParam } from "@/lib/blog/pagination";
import { getArticlesIndex } from "@/lib/cms/articles";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import type { Metadata } from "next";

/**
 * `/blog/page/N/` — listing pages 2…N (ISR, indexable, self canonical, «— страница N» in the
 * title). `/blog/page/1/` → permanent redirect to `/blog/`; a non-canonical number (`02`, `abc`)
 * or a page beyond the last → 404.
 */

type Params = Promise<{ n: string }>;

/** No DB at build time: pages render on first request, then ISR. */
export function generateStaticParams(): Array<{ n: string }> {
  return [];
}
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const page = parsePageParam((await params).n);
  if (page === null || page < 2) return NOT_FOUND_METADATA;
  return (await loadBlogListingMetadata(page)) ?? NOT_FOUND_METADATA;
}

export default async function BlogPaginatedPage({ params }: { params: Params }) {
  const { n } = await params;
  const page = parsePageParam(n);
  if (page === 1) permanentRedirect(BLOG_PATH);

  const [doc, index, ctx] = await Promise.all([
    getPageByPath(BLOG_PATH),
    getArticlesIndex(),
    getPlaceholderContext(),
  ]);
  if (page === null || !doc || !isPageInRange(page, index.length)) {
    await redirectIfExists(`${BLOG_PATH}page/${n}/`);
    return <NotFoundResponse />;
  }
  return <BlogListingView doc={doc} index={index} page={page} ctx={ctx} />;
}
