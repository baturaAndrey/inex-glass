import { Fragment, type ReactNode } from "react";
import { CtaButtons } from "@/components/blocks/cta-buttons";
import {
  HOLES_CALCULATOR_ANCHOR,
  HolesCalculatorWidget,
} from "@/components/blocks/holes-calculator-block";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import { Container } from "@/components/ig/container";
import { isH2, lexicalFromNodes, rootNodes, slugifyHeading, type TocItem } from "@/lib/blog/toc";
import type { PlaceholderContext } from "@/lib/domain";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import {
  ArticleCallout,
  ArticleNote,
  ArticleRichText,
  ArticleSteps,
  ArticleTable,
} from "./article-pieces";
import { SubpageToc } from "./subpage-toc";

/**
 * Article of a «Как заказать» subpage (Paper mockup `2560_kak-zakazat_trebovaniya`, frame
 * `article`): the «На странице» card on the left (sticky ≥1101 px), the content on the right as
 * H2 sections 80 px apart.
 *
 * `buildArticle` turns the page `layout` into those sections, generically for every subpage:
 *
 * | Block                         | Article                                                   |
 * |-------------------------------|-----------------------------------------------------------|
 * | `richText`                    | split by its H2 (and its `heading`): one section per H2   |
 * | `table`                       | white table card; its `heading` opens a section           |
 * | `steps`                       | numbered cards; its `heading` opens a section             |
 * | headless `richText` after `steps` | the white info note under the cards                   |
 * | `callout`                     | light-teal / warning note                                 |
 * | `holesCalculator`             | the calculator (`#kalkulyator`)                           |
 * | `cta`                         | the buttons row                                           |
 * | `hero`, `form`                | not here: hero and drawing-form panel of the template     |
 * | anything else                 | after the article, as on any page (`trailing`)            |
 *
 * Content without a heading joins the section before it (the intro, if none yet). A page may
 * replace the rendering of single blocks (`override`) or put sections first (`lead`).
 */

/** A piece of the article: a `title` opens a new H2 section, otherwise the content joins the last one. */
export interface ArticlePiece {
  title?: string | undefined;
  /** Anchor of the H2; generated from the title (transliterated) when omitted. */
  id?: string | undefined;
  content?: ReactNode;
}

export interface ArticleSectionData {
  key: string;
  heading: TocItem | null;
  content: ReactNode[];
}

export interface BuildArticleOptions {
  layout: readonly LayoutBlock[];
  ctx: PlaceholderContext;
  page: BlockPageContext;
  /** Sections before the layout's (page-specific content, e.g. the file formats). */
  lead?: readonly ArticlePiece[] | undefined;
  /** Page-specific rendering of a block; `null` → the generic rendering. */
  override?: ((block: LayoutBlock) => ArticlePiece[] | null) | undefined;
}

export interface BuiltArticle {
  sections: ArticleSectionData[];
  /** Blocks the article does not render (they follow it as ordinary page sections). */
  trailing: LayoutBlock[];
}

/** Blocks the subpage template renders outside the article. */
const TEMPLATE_BLOCKS: ReadonlySet<LayoutBlock["blockType"]> = new Set(["hero", "form"]);

const plainText = (node: unknown) => lexicalToPlainText({ root: node }).replace(/\s+/g, " ").trim();

/** A `richText` block split into pieces: its heading, the text before the first H2, one per H2. */
function richTextPieces(
  block: Extract<LayoutBlock, { blockType: "richText" }>,
  ctx: PlaceholderContext
) {
  const pieces: ArticlePiece[] = [];
  const heading = fill(block.heading, ctx);
  if (heading) pieces.push({ title: heading });
  let run: ReturnType<typeof rootNodes> = [];
  let title: string | undefined;
  const flush = () => {
    if (title === undefined && run.length === 0) return;
    pieces.push({
      title,
      content: run.length > 0 ? <ArticleRichText data={lexicalFromNodes(run)} ctx={ctx} /> : null,
    });
    run = [];
    title = undefined;
  };
  for (const node of rootNodes(block.content)) {
    if (isH2(node)) {
      flush();
      title = plainText(node);
    } else {
      run.push(node);
    }
  }
  flush();
  return pieces;
}

/** `true` for a rich-text block without a heading and without H2 (a plain paragraph run). */
function isPlainText(block: LayoutBlock): block is Extract<LayoutBlock, { blockType: "richText" }> {
  return (
    block.blockType === "richText" &&
    !hasText(block.heading) &&
    !rootNodes(block.content).some(isH2)
  );
}

function genericPieces(
  block: LayoutBlock,
  previous: LayoutBlock | undefined,
  ctx: PlaceholderContext,
  page: BlockPageContext
): ArticlePiece[] | null {
  switch (block.blockType) {
    case "richText":
      // The responsibility line under the check steps (mockup `sec-check`).
      if (previous?.blockType === "steps" && isPlainText(block)) {
        return [{ content: <ArticleNote data={block.content} ctx={ctx} /> }];
      }
      return richTextPieces(block, ctx);
    case "table": {
      const heading = fill(block.heading, ctx);
      return [{ title: heading || undefined, content: <ArticleTable block={block} ctx={ctx} /> }];
    }
    case "steps": {
      const heading = fill(block.heading, ctx);
      return [{ title: heading || undefined, content: <ArticleSteps block={block} ctx={ctx} /> }];
    }
    case "callout":
      return [{ content: <ArticleCallout block={block} ctx={ctx} /> }];
    case "holesCalculator": {
      const anchorId = hasText(block.anchorId) ? block.anchorId.trim() : HOLES_CALCULATOR_ANCHOR;
      return [
        {
          content: (
            <div id={anchorId} className="scroll-mt-24">
              {/* The content column is narrower than a page: scheme beside the controls only ≥1536 px. */}
              <HolesCalculatorWidget
                block={block}
                ctx={ctx}
                page={page}
                className="lg:grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
              />
            </div>
          ),
        },
      ];
    }
    case "cta":
      return [{ content: <CtaButtons buttons={block.buttons} ctx={ctx} page={page} /> }];
    default:
      return null;
  }
}

export function buildArticle({
  layout,
  ctx,
  page,
  lead,
  override,
}: BuildArticleOptions): BuiltArticle {
  const used = new Set<string>();
  const sections: ArticleSectionData[] = [];
  const trailing: LayoutBlock[] = [];

  const add = (piece: ArticlePiece) => {
    if (piece.title) {
      const id = piece.id ?? slugifyHeading(piece.title, used);
      if (piece.id) used.add(piece.id);
      sections.push({ key: id, heading: { id, text: piece.title }, content: [] });
    } else if (sections.length === 0) {
      sections.push({ key: "intro", heading: null, content: [] });
    }
    if (piece.content) sections.at(-1)!.content.push(piece.content);
  };

  lead?.forEach(add);
  layout.forEach((block, index) => {
    if (TEMPLATE_BLOCKS.has(block.blockType)) return;
    const pieces = override?.(block) ?? genericPieces(block, layout[index - 1], ctx, page);
    if (pieces === null) trailing.push(block);
    else pieces.forEach(add);
  });

  return {
    sections: sections.filter((section) => section.heading || section.content.length > 0),
    trailing,
  };
}

/** Minimum number of H2 for the «На странице» card. */
const MIN_TOC_ITEMS = 2;

export function SubpageArticle({ sections }: { sections: readonly ArticleSectionData[] }) {
  if (sections.length === 0) return null;
  const toc = sections.flatMap((section) => (section.heading ? [section.heading] : []));
  const showToc = toc.length >= MIN_TOC_ITEMS;

  return (
    <div className="mx-auto w-full max-w-[1920px]" data-testid="subpage-article">
      <Container className="flex items-start gap-16 pt-16 pb-24 max-lg:gap-10 max-md:flex-col max-md:gap-8 max-md:pt-12 max-md:pb-16 max-sm:gap-6 max-sm:pt-8 max-sm:pb-12">
        {showToc ? (
          <aside className="w-[320px] shrink-0 max-lg:w-[280px] max-md:w-full md:sticky md:top-[calc(var(--ig-header-compact-h)+24px)]">
            <SubpageToc items={toc} />
          </aside>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-20 max-md:w-full max-md:gap-16 max-sm:gap-12">
          {sections.map((section) =>
            section.heading ? (
              <section
                key={section.key}
                aria-labelledby={section.heading.id}
                className="flex min-w-0 flex-col gap-6 max-sm:gap-4"
              >
                <h2 id={section.heading.id} className="ig-h2 m-0 scroll-mt-24 text-balance">
                  {section.heading.text}
                </h2>
                {section.content.map((node, index) => (
                  <Fragment key={index}>{node}</Fragment>
                ))}
              </section>
            ) : (
              <div key={section.key} className="flex min-w-0 flex-col gap-6 max-sm:gap-4">
                {section.content.map((node, index) => (
                  <Fragment key={index}>{node}</Fragment>
                ))}
              </div>
            )
          )}
        </div>
      </Container>
    </div>
  );
}
