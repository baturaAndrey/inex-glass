import { Card } from "@/components/ig/card";
import { listPublished } from "@/lib/cms/queries";
import { formatDateRu } from "@/lib/domain";
import { docUrl } from "@/lib/seo/doc-url";
import { cn } from "@/lib/utils";
import type { Article } from "@/payload-types";
import { BlockSection, CARD_GRID, CardMedia, fill } from "./shared";
import type { BlockOf, BlockProps } from "./types";
import type { Where } from "payload";

const DEFAULT_LIMIT = 4;
const ARTICLE_LABEL = "Статья";

async function loadArticles(block: BlockOf<"articlesFeed">, limit: number): Promise<Article[]> {
  if (block.mode === "manual") {
    return (block.articles ?? [])
      .filter((doc): doc is Article => typeof doc === "object" && doc !== null)
      .filter((doc) => doc._status !== "draft")
      .slice(0, limit);
  }
  const featured = block.mode !== "latest";
  const where: Where | undefined = featured ? { featuredOnHome: { equals: true } } : undefined;
  const result = await listPublished("articles", {
    limit,
    sort: featured ? "homeOrder" : "-datePublished",
    ...(where ? { where } : {}),
  });
  return result.docs as Article[];
}

/** Blog feed with simplified article cards (image, title, teaser, date). */
export async function ArticlesFeedBlock({ block, ctx, section }: BlockProps<"articlesFeed">) {
  const limit = block.limit ?? DEFAULT_LIMIT;
  const articles = await loadArticles(block, limit);
  const cards = articles.flatMap((doc) => {
    const href = docUrl("articles", doc);
    return href ? [{ doc, href }] : [];
  });
  if (cards.length === 0) return null;
  const columns = limit % 3 === 0 ? 3 : 4;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul className={cn(CARD_GRID[columns], "m-0 list-none p-0")}>
        {cards.map(({ doc, href }) => (
          <li key={doc.id} className="flex">
            <Card
              className="w-full"
              href={href}
              eyebrow={ARTICLE_LABEL}
              title={fill(doc.card?.title, ctx) || fill(doc.title, ctx)}
              sub={fill(doc.card?.text, ctx) || undefined}
              image={<CardMedia image={doc.card?.image ?? doc.heroImage} columns={columns} />}
              footer={
                doc.datePublished ? (
                  <time dateTime={doc.datePublished} className="text-small text-text-2">
                    {formatDateRu(doc.datePublished)}
                  </time>
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </BlockSection>
  );
}
