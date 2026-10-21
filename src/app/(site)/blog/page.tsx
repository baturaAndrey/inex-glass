import { BlogListingView } from "@/components/blog/blog-listing-view";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { loadBlogListingMetadata } from "@/lib/blog/listing-metadata";
import { BLOG_PATH } from "@/lib/blog/pagination";
import { getArticlesIndex } from "@/lib/cms/articles";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath } from "@/lib/cms/queries";
import type { Metadata } from "next";

/** `/blog/` — page 1 of the blog listing (`pages` document `/blog/`, template `listing`). */

/** Fixed URL, no request data: ISR like the catch-all. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return (await loadBlogListingMetadata(1)) ?? NOT_FOUND_METADATA;
}

export default async function BlogPage() {
  const [doc, index, ctx] = await Promise.all([
    getPageByPath(BLOG_PATH),
    getArticlesIndex(),
    getPlaceholderContext(),
  ]);
  if (!doc) return <NotFoundResponse />;
  return <BlogListingView doc={doc} index={index} page={1} ctx={ctx} />;
}
