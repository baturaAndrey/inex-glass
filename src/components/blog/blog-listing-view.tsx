import { resolveLink, type ResolvedLink } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { Section } from "@/components/ig/section";
import { TextLink } from "@/components/ig/text-link";
import { PageShell } from "@/components/page/page-shell";
import { RichText } from "@/components/rich-text/rich-text";
import type { ArticleSummary } from "@/lib/blog/articles";
import { blogPageHref, pageSlice } from "@/lib/blog/pagination";
import type { PlaceholderContext } from "@/lib/domain";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { resolveH1 } from "@/lib/seo/metadata";
import type { Page } from "@/payload-types";
import { ARTICLE_GRID_CLASS, ArticleCard } from "./article-card";
import { BlogPageTop } from "./blog-page-top";
import { BlogPagination } from "./blog-pagination";

/**
 * Blog listing `/blog/` and `/blog/page/N/` (task 31, no prototype of its own: the article top
 * band + the card grid). The `pages` document `/blog/` (template `listing`) supplies the H1 / SEO,
 * the intro (its first `richText` block) and the tools links (its first `linkList` block); both are
 * shown on page 1 only.
 */

type RichTextBlock = BlockOf<"richText">;
type LinkListBlock = BlockOf<"linkList">;

const TOOLS_HEADING_ID = "blog-tools";

function firstBlock<T extends "richText" | "linkList">(
  page: Page,
  type: T
): BlockOf<T> | undefined {
  return page.layout?.find((block): block is BlockOf<T> => block.blockType === type);
}

function Intro({ block, ctx }: { block: RichTextBlock | undefined; ctx: PlaceholderContext }) {
  if (!block) return null;
  return (
    <RichText
      data={block.content}
      ctx={ctx}
      className="text-ink-3 max-w-[820px] [&_p]:max-w-none [&_p]:text-[20px] [&_p]:leading-normal max-sm:[&_p]:text-[17px]"
    />
  );
}

/** «Инструменты:» — arrow links of the `linkList` block. */
function Tools({ block }: { block: LinkListBlock | undefined }) {
  const links = (block?.items ?? [])
    .map((item) => resolveLink(item.link))
    .filter((link): link is ResolvedLink & { label: string } => Boolean(link?.label));
  if (!block || links.length === 0) return null;
  const label = block.label?.trim() || block.heading?.trim() || "";
  return (
    <div
      className="border-line mt-14 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t pt-8 max-sm:mt-10 max-sm:pt-6"
      data-testid="blog-tools"
    >
      {label ? (
        <h2 id={TOOLS_HEADING_ID} className="ig-h5 m-0">
          {label}
        </h2>
      ) : null}
      <ul
        aria-labelledby={label ? TOOLS_HEADING_ID : undefined}
        className="m-0 flex list-none flex-wrap gap-x-8 gap-y-3 p-0"
      >
        {links.map((link) => (
          <li key={link.href}>
            <TextLink href={link.href} variant="arrow">
              {link.label}
            </TextLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BlogListingViewProps {
  doc: Page;
  index: readonly ArticleSummary[];
  /** 1-based page number (already validated by the route). */
  page: number;
  ctx: PlaceholderContext;
}

export function BlogListingView({ doc, index, page, ctx }: BlogListingViewProps) {
  const path = blogPageHref(page);
  const title = resolveH1(doc.seo, doc.title, ctx);
  const crumbs = buildBreadcrumbs(path, { lastLabel: doc.breadcrumbLabel || undefined });
  const articles = pageSlice(index, page);
  const isFirst = page === 1;

  return (
    <PageShell path={path} breadcrumbs={crumbs} hideBreadcrumbs showConditions={false} quiz={false}>
      <BlogPageTop crumbs={crumbs} title={title}>
        {isFirst ? <Intro block={firstBlock(doc, "richText")} ctx={ctx} /> : null}
      </BlogPageTop>
      <Section variant="bg" aria-label={title}>
        <ul className={ARTICLE_GRID_CLASS} data-testid="article-list">
          {articles.map((article) => (
            <li key={article.id} className="flex">
              <ArticleCard article={article} titleAs="h2" className="w-full" />
            </li>
          ))}
        </ul>
        <BlogPagination current={page} total={index.length} className="mt-12 max-sm:mt-8" />
        {isFirst ? <Tools block={firstBlock(doc, "linkList")} /> : null}
      </Section>
    </PageShell>
  );
}
