import { RichText } from "@/components/rich-text/rich-text";
import {
  lexicalFromNodes,
  splitChunks,
  splitSections,
  type ArticleChunk,
} from "@/lib/blog/toc";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Article text (`.ar-text` of Article.dc.html). The Lexical root is split by H2 (`toc.ts`): every
 * H2 is rendered here with the anchor the table of contents links to, the nodes between them go
 * through the site `RichText` renderer; tables are rendered on their own by the same renderer
 * (`DataTable`: zebra table on desktop, one `.ig-mcard` per row on ≤599 px).
 */

/**
 * Typography of `.ar-text`: 18/1.65 (16 on phones), lists with 12 px gaps and primary-pressed
 * markers. Descendant utilities override the generic `RichText` classes (`ig-body`, 72ch measure):
 * the article column is already narrow (≤760 px).
 */
const TEXT_CLASS = cn(
  "flex min-w-0 flex-col gap-4",
  "[&_p]:max-w-none [&_p]:text-[18px] [&_p]:leading-[1.65] max-sm:[&_p]:text-base",
  "[&_ol]:max-w-none [&_ol]:gap-3 [&_ol]:text-[18px] [&_ol]:leading-[1.65] [&_ol]:marker:font-bold [&_ol]:marker:text-primary-pressed",
  "[&_ul]:max-w-none [&_ul]:gap-3 [&_ul]:text-[18px] [&_ul]:leading-[1.65] [&_ul]:marker:text-primary-pressed",
  "max-sm:[&_ol]:text-base max-sm:[&_ul]:text-base"
);

/** H2 of the article: 32/700 (24 on phones), clear of the sticky header when jumped to. */
const H2_CLASS =
  "m-0 mt-8 scroll-mt-24 text-[32px] leading-[1.2] font-bold text-balance first:mt-0 max-sm:mt-5 max-sm:text-2xl";

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
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
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
