import { Section } from "@/components/ig/section";
import { Terms, type TermItem } from "@/components/ig/terms";
import type { ArticleSummary } from "@/lib/blog/articles";
import type { Condition } from "@/payload-types";
import { ARTICLE_GRID_CLASS, ArticleCard } from "./article-card";

const HEADING_ID = "ar-more";

/**
 * The conditions strip under «Читать также» (Article.dc.html): the `termsBar` of the
 * `conditions` global («Заказы от 50 м²», «Срок от 10 рабочих дней…», «КП…», «Цена…»).
 */
export function articleTerms(conditions: Condition | null): TermItem[] {
  return (conditions?.termsBar ?? [])
    .map((item) => item.text?.trim())
    .filter((text): text is string => Boolean(text))
    .map((text) => ({ text }));
}

export interface RelatedArticlesProps {
  articles: readonly ArticleSummary[];
  conditions: Condition | null;
}

/** «Читать также» (3 cards) + the conditions strip, on the page background. */
export function RelatedArticles({ articles, conditions }: RelatedArticlesProps) {
  const terms = articleTerms(conditions);
  if (articles.length === 0 && terms.length === 0) return null;
  return (
    <Section
      variant="bg"
      aria-labelledby={articles.length > 0 ? HEADING_ID : undefined}
      containerClassName="flex flex-col gap-8"
    >
      {articles.length > 0 ? (
        <>
          <h2 id={HEADING_ID} className="ig-h2">
            Читать также
          </h2>
          <ul className={ARTICLE_GRID_CLASS} data-testid="related-articles">
            {articles.map((article) => (
              <li key={article.id} className="flex">
                <ArticleCard article={article} titleAs="h3" details={false} className="w-full" />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Terms items={terms} />
    </Section>
  );
}
