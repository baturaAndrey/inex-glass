import { TextLink } from "@/components/ig/text-link";
import type { ArticleSummary } from "@/lib/blog/articles";
import { BLOG_PATH } from "@/lib/blog/pagination";
import { ARTICLE_GRID_CLASS, ArticleCard } from "./article-card";

const HEADING_ID = "ar-more";

export interface RelatedArticlesProps {
  articles: readonly ArticleSummary[];
}

/**
 * «Читать также» of an article (Paper mockup `2560_blog_statya`, frames `read-also-head` /
 * `read-also`): heading with «Все статьи →» on the right, then the listing cards (3 / 2 / 1
 * columns). Nothing without related articles.
 */
export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-8 max-sm:gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id={HEADING_ID} className="ig-h2 m-0">
          Читать также
        </h2>
        <TextLink href={BLOG_PATH} variant="arrow" className="underline">
          Все статьи
        </TextLink>
      </div>
      <ul className={ARTICLE_GRID_CLASS} data-testid="related-articles">
        {articles.map((article) => (
          <li key={article.id} className="flex">
            <ArticleCard article={article} titleAs="h3" className="w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
