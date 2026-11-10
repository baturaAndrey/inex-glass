import Link from "next/link";
import { ArrowRight, Calculator, CircleDot, FileText } from "lucide-react";
import { resolveLink, type ResolvedLink } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { FormTrigger } from "@/components/forms/form-trigger";
import { Button } from "@/components/ig/button";
import { ObjectsPagination } from "@/components/objects/objects-pagination";
import { PageShell } from "@/components/page/page-shell";
import { QuizLink } from "@/components/page/quiz-cta";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import type { ArticleSummary } from "@/lib/blog/articles";
import { blogPageHref, pageSlice, totalPages } from "@/lib/blog/pagination";
import type { PlaceholderContext } from "@/lib/domain";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { resolveH1 } from "@/lib/seo/metadata";
import type { Page } from "@/payload-types";
import { ARTICLE_GRID_CLASS, ArticleCard, ArticleFeaturedCard } from "./article-card";
import { BLOG_FORM_SOURCE, BlogFormPanel } from "./blog-form-panel";

/**
 * Blog listing `/blog/` and `/blog/page/N/`, restyled to the Paper mockup `2560_blog` (2026-11).
 * One page background, no white header band:
 * 1. hero — crumbs (PageShell), H1, the intro (first `richText` block of the `pages` document
 *    `/blog/`, page 1 only) indented, «Рассчитать стоимость» + «Отправить чертёж»;
 * 2. page 1: the newest article as the wide featured card, the rest in the 3-column grid;
 *    pages 2+: every card in the grid; the round pager (shared with `/obekty/`);
 * 3. page 1: «Инструменты» — the first `linkList` block as light-teal pills in a white panel;
 * 4. cream block — the drawing-form panel.
 */

type RichTextBlock = BlockOf<"richText">;
type LinkListBlock = BlockOf<"linkList">;

const HERO_TITLE_ID = "page-title";
const TOOLS_HEADING_ID = "blog-tools";
const FORM_HEADING_ID = "blog-form-title";
/** Label of the hero's drawing-form button (teksty: «Отправить чертёж»). */
const DRAWING_LABEL = "Отправить чертёж";

function firstBlock<T extends "richText" | "linkList">(
  page: Page,
  type: T
): BlockOf<T> | undefined {
  return page.layout?.find((block): block is BlockOf<T> => block.blockType === type);
}

function Intro({ block, ctx }: { block: RichTextBlock | undefined; ctx: PlaceholderContext }) {
  if (!block) return null;
  return <RichText data={block.content} ctx={ctx} />;
}

/** Icon of a tool pill: the calculator for the weight calculator, a target for the rest. */
const toolIcon = (href: string) => (href.includes("kalkulyator") ? Calculator : CircleDot);

/** «Инструменты» (mockup frame `GO6-0`): pills of the `linkList` block in a white panel. */
function Tools({ block }: { block: LinkListBlock | undefined }) {
  const links = (block?.items ?? [])
    .map((item) => resolveLink(item.link))
    .filter((link): link is ResolvedLink & { label: string } => Boolean(link?.label));
  if (!block || links.length === 0) return null;
  const label = block.label?.trim() || block.heading?.trim() || "";
  return (
    <div
      className="bg-surface border-hairline flex items-center gap-10 rounded-xl border px-10 py-8 max-md:flex-col max-md:items-start max-md:gap-5 max-sm:rounded-lg max-sm:p-5"
      data-testid="blog-tools"
    >
      {label ? (
        <h2 id={TOOLS_HEADING_ID} className="m-0 shrink-0 text-2xl leading-[1.25] font-semibold">
          {label}
        </h2>
      ) : null}
      <ul
        aria-labelledby={label ? TOOLS_HEADING_ID : undefined}
        className="m-0 flex list-none flex-wrap gap-3 p-0 max-sm:w-full max-sm:flex-col"
      >
        {links.map((link) => {
          const Icon = toolIcon(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className="bg-primary-light text-primary-dark hover:bg-line-teal focus-visible:outline-brand flex min-h-14 items-center gap-3 rounded-full px-6 py-3 text-base leading-5 font-medium no-underline transition-colors duration-(--ig-dur-base) focus-visible:outline-2 focus-visible:outline-offset-2 max-sm:rounded-lg max-sm:px-5"
              >
                <Icon
                  aria-hidden="true"
                  strokeWidth={2}
                  className="text-primary-pressed size-5 shrink-0"
                />
                <span className="text-pretty">{link.label}</span>
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={2}
                  className="text-primary-pressed size-[18px] shrink-0 max-sm:ml-auto"
                />
              </Link>
            </li>
          );
        })}
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
  // Page 1 opens with the newest article as the wide card; later pages are grid only.
  const featured = isFirst ? articles[0] : undefined;
  const grid = featured ? articles.slice(1) : articles;

  return (
    <PageShell path={path} breadcrumbs={crumbs} showConditions={false} quiz={false}>
      <ProcessingHero
        title={title}
        titleId={HERO_TITLE_ID}
        lead={isFirst ? <Intro block={firstBlock(doc, "richText")} ctx={ctx} /> : undefined}
        actions={
          <>
            <QuizLink prefill={doc.quizPrefill} src={path} ctx={ctx} />
            <FormTrigger
              formKey="drawing"
              params={{ label: DRAWING_LABEL, source: BLOG_FORM_SOURCE }}
              asChild
            >
              <Button
                variant="secondary"
                size="l"
                leftIcon={<FileText aria-hidden="true" strokeWidth={2} />}
              >
                {DRAWING_LABEL}
              </Button>
            </FormTrigger>
          </>
        }
        indentActions
        actionsGap="tight"
      />

      <section
        aria-label={title}
        className="mx-auto flex w-full max-w-[1920px] flex-col gap-8 px-(--ig-gutter) pt-6 pb-24 max-md:pb-[72px] max-sm:gap-6 max-sm:pt-2 max-sm:pb-12"
      >
        <ul className={ARTICLE_GRID_CLASS} data-testid="article-list">
          {featured ? (
            <li className="col-span-full flex">
              <ArticleFeaturedCard article={featured} className="w-full" />
            </li>
          ) : null}
          {grid.map((article) => (
            <li key={article.id} className="flex">
              <ArticleCard article={article} titleAs="h2" className="w-full" />
            </li>
          ))}
        </ul>
        <ObjectsPagination
          page={page}
          totalPages={totalPages(index.length)}
          hrefFor={blogPageHref}
          className="mt-4 max-sm:mt-2"
        />
        {isFirst ? <Tools block={firstBlock(doc, "linkList")} /> : null}
      </section>

      <BlogFormPanel headingId={FORM_HEADING_ID} />
    </PageShell>
  );
}
