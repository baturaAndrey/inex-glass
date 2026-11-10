import { RichText } from "@/components/rich-text/rich-text";
import { lexicalFromNodes, splitChunks, splitSections, type ArticleChunk } from "@/lib/blog/toc";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Article text (Paper mockup `2560_blog_statya`). The Lexical root is split by H2 (`toc.ts`): every
 * H2 is rendered here with the anchor the table of contents links to, the nodes between them go
 * through the site `RichText` renderer; tables are rendered on their own by the same renderer
 * (`DataTable`: zebra table on desktop, one `.ig-mcard` per row on ≤599 px).
 */

/**
 * Typography of the article text (Paper mockup `2560_blog_statya`, frame `content`): 18/1.65 in
 * ink-3 (16 on phones); ordered lists with round numbered badges (primary, white digits), bullets
 * as teal dots; bold run-ins of list items in the main text colour; links primary-pressed and
 * underlined at the size of the text around them. Descendant utilities override the generic
 * `RichText` classes (`ig-body`, 72ch measure): the column is already narrow (≤970 px).
 */
const TEXT_CLASS = cn(
  "flex min-w-0 flex-col gap-6 max-sm:gap-4",
  "[&_p]:text-ink-3 [&_p]:max-w-none [&_p]:text-lg [&_p]:leading-[1.65] max-sm:[&_p]:text-base",
  "[&_li]:text-ink-3 [&_li_strong]:text-text [&_li_strong]:font-semibold",
  "[&_.ig-link]:inline [&_.ig-link]:text-[length:inherit] [&_.ig-link]:leading-[inherit]",
  // Ordered lists: a CSS counter in a 32 px primary circle.
  "[&_ol]:max-w-none [&_ol]:list-none [&_ol]:gap-3.5 [&_ol]:pl-0 [&_ol]:text-lg [&_ol]:leading-[1.6] [&_ol]:[counter-reset:ar-step]",
  "[&_ol>li]:relative [&_ol>li]:min-h-8 [&_ol>li]:pl-12 [&_ol>li]:[counter-increment:ar-step]",
  "[&_ol>li]:before:bg-primary [&_ol>li]:before:absolute [&_ol>li]:before:top-0 [&_ol>li]:before:left-0 [&_ol>li]:before:grid [&_ol>li]:before:size-8 [&_ol>li]:before:place-items-center [&_ol>li]:before:rounded-full [&_ol>li]:before:text-[15px] [&_ol>li]:before:leading-none [&_ol>li]:before:font-semibold [&_ol>li]:before:text-white [&_ol>li]:before:tabular-nums [&_ol>li]:before:content-[counter(ar-step)]",
  // Bullets: 8 px brand dots on the first line.
  "[&_ul]:max-w-none [&_ul]:list-none [&_ul]:gap-3 [&_ul]:pl-0 [&_ul]:text-lg [&_ul]:leading-[1.65]",
  "[&_ul>li]:relative [&_ul>li]:pl-7 [&_ul>li]:before:bg-brand [&_ul>li]:before:absolute [&_ul>li]:before:top-[0.62em] [&_ul>li]:before:left-1.5 [&_ul>li]:before:size-2 [&_ul>li]:before:rounded-full [&_ul>li]:before:content-['']",
  "max-sm:[&_ol]:text-base max-sm:[&_ul]:text-base max-sm:[&_ol>li]:pl-11"
);

/** H2 of the article: 32/700 (24 on phones), clear of the sticky header when jumped to. */
const H2_CLASS =
  "m-0 mt-4 scroll-mt-24 text-[32px] leading-[1.2] font-bold text-balance first:mt-0 max-sm:mt-2 max-sm:text-2xl";

function Chunk({ chunk, ctx }: { chunk: ArticleChunk; ctx: PlaceholderContext }) {
  // Tables go through the shared rich-text table (`DataTable`) outside `TEXT_CLASS`, so the
  // article paragraph typography does not leak into the cells.
  if (chunk.kind === "table") return <RichText data={lexicalFromNodes([chunk.node])} ctx={ctx} />;
  return <RichText data={lexicalFromNodes(chunk.nodes)} ctx={ctx} className={TEXT_CLASS} />;
}

export interface ArticleBodyProps {
  body: unknown;
  ctx: PlaceholderContext;
  className?: string | undefined;
}

export function ArticleBody({ body, ctx, className }: ArticleBodyProps) {
  const sections = splitSections(body);
  return (
    <div className={cn("flex min-w-0 flex-col gap-6 max-sm:gap-4", className)}>
      {sections.map((section, sectionIndex) => (
        <div key={section.heading?.id ?? `intro-${sectionIndex}`} className="contents">
          {section.heading ? (
            <h2 id={section.heading.id} className={H2_CLASS}>
              {section.heading.text}
            </h2>
          ) : null}
          {splitChunks(section.nodes).map((chunk, chunkIndex) => (
            <Chunk key={chunkIndex} chunk={chunk} ctx={ctx} />
          ))}
        </div>
      ))}
    </div>
  );
}
