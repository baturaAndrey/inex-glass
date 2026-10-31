import { cache } from "react";
import { compareArticles, pickRelated, type ArticleSummary } from "@/lib/blog/articles";
import { collectionTag } from "@/lib/cache-tags";
import type { Article, Media } from "@/payload-types";
import { cached } from "./cache";
import { getPayloadClient } from "./payload";
import { DOC_DEPTH, getDocBySlug } from "./queries";

export type { ArticleSummary };

/**
 * Blog loaders (task 31). Articles are read as an anonymous visitor (published only), cached
 * under `collection:articles` (+ `collection:media` for the card images) and invalidated by the
 * collection hooks (`src/payload/hooks/revalidate.ts`).
 */

/** Upper bound of the listing query; the blog has dozens of articles, not thousands. */
const MAX_ARTICLES = 1000;
/** Card image + `related` → summaries need populated media, nothing deeper. */
const SUMMARY_DEPTH = 1;

const asMedia = (value: unknown): Media | null =>
  typeof value === "object" && value !== null && typeof (value as Media).url === "string"
    ? (value as Media)
    : null;

function toSummary(doc: Article): ArticleSummary {
  return {
    id: String(doc.id),
    slug: doc.slug,
    title: doc.title,
    path: doc.path ?? `/blog/${doc.slug}/`,
    datePublished: doc.datePublished ?? null,
    description: doc.card?.text?.trim() || doc.seo?.description?.trim() || "",
    readingTimeMinutes: doc.readingTimeMinutes ?? null,
    image: asMedia(doc.card?.image) ?? asMedia(doc.heroImage),
  };
}

const loadArticlesIndex = cached(
  async (): Promise<ArticleSummary[]> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: "articles",
      where: { _status: { equals: "published" } },
      limit: MAX_ARTICLES,
      pagination: false,
      depth: SUMMARY_DEPTH,
      sort: "-datePublished",
      select: {
        title: true,
        slug: true,
        path: true,
        datePublished: true,
        readingTimeMinutes: true,
        heroImage: true,
        card: { text: true, image: true },
        seo: { description: true },
      },
      overrideAccess: false,
    });
    return (docs as Article[]).map(toSummary).sort(compareArticles);
  },
  ["cms", "articles-index"],
  { tags: [collectionTag("articles"), collectionTag("media")] }
);

/** All published articles in listing order (per-request memo over the data cache). */
export const getArticlesIndex = cache(loadArticlesIndex);

/** Published article by slug with the body, related articles and media populated. */
export const getArticleBySlug = cache((slug: string): Promise<Article | null> =>
  getDocBySlug("articles", slug, { depth: DOC_DEPTH })
);

/** «Читать также» cards of an article (see `pickRelated`). */
export async function getRelatedArticles(
  article: Pick<Article, "id" | "related">
): Promise<ArticleSummary[]> {
  return pickRelated(article, await getArticlesIndex());
}
