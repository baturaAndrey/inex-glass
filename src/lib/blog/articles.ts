import type { Article, Media } from "@/payload-types";

/**
 * Pure helpers of the blog listing and «Читать также» (no Next / Payload imports, unit-tested).
 * Loaders: `@/lib/cms/articles`.
 */

/** Article fields of the listing / «Читать также» cards. */
export interface ArticleSummary {
  id: string;
  slug: string;
  title: string;
  path: string;
  /** ISO date or `null` (drafts are never listed, but the field is optional in the schema). */
  datePublished: string | null;
  /** Card teaser: `card.text`, otherwise the SEO description. */
  description: string;
  readingTimeMinutes: number | null;
  /** Card image (`card.image` → `heroImage`), populated. */
  image: Media | null;
}

/** Collator for title ties (Russian alphabetical order). */
const TITLE_COLLATOR = new Intl.Collator("ru");

/** Listing order: `datePublished` descending (no date last), ties by title. */
export function compareArticles(a: ArticleSummary, b: ArticleSummary): number {
  const da = a.datePublished ? Date.parse(a.datePublished) : Number.NEGATIVE_INFINITY;
  const db = b.datePublished ? Date.parse(b.datePublished) : Number.NEGATIVE_INFINITY;
  if (da !== db) return db > da ? 1 : -1;
  return TITLE_COLLATOR.compare(a.title, b.title);
}

/** Number of «Читать также» cards. */
export const RELATED_COUNT = 3;

/**
 * «Читать также»: the article's `related` (published ones, in the editor's order), topped up
 * with the newest other articles up to `count`; never the article itself, no duplicates.
 * Pure: works on the listing index.
 */
export function pickRelated(
  article: Pick<Article, "id" | "related">,
  index: readonly ArticleSummary[],
  count: number = RELATED_COUNT
): ArticleSummary[] {
  const selfId = String(article.id);
  const byId = new Map(index.map((item) => [item.id, item]));
  const picked: ArticleSummary[] = [];
  const seen = new Set<string>([selfId]);
  const add = (item: ArticleSummary | undefined) => {
    if (!item || seen.has(item.id) || picked.length >= count) return;
    seen.add(item.id);
    picked.push(item);
  };
  for (const entry of article.related ?? []) {
    add(byId.get(typeof entry === "string" ? entry : String(entry.id)));
  }
  for (const item of index) add(item);
  return picked;
}
