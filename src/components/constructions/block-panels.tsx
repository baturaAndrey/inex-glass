import type { ReactNode } from "react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { fill } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import { PANEL_HEADING, WHITE_PANEL } from "@/components/company/company-pieces";
import { ArticleCallout, ArticleTable } from "@/components/how-to-order/article-pieces";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { PanelRow, TextPanel, WarningPanel } from "./detail-panels";

/**
 * Layout blocks of a construction / glazing page in the Paper panel language (mockups
 * `2560_steklyannye-peregorodki`, `2560_osteklenie`): every block becomes a white panel inside
 * the page container — consecutive rich-text blocks two per row, a table as a panel with the
 * site table card, a warning callout as the warning block. Other block kinds (rare in these
 * documents) keep their own rendering, so nothing an editor adds is lost.
 */

export interface BlockPanelsProps {
  blocks: readonly LayoutBlock[];
  ctx: PlaceholderContext;
  page: BlockPageContext;
  /** Prefix of the heading ids (unique per call on a page). */
  idPrefix: string;
}

function TablePanel({
  block,
  ctx,
  headingId,
}: {
  block: BlockOf<"table">;
  ctx: PlaceholderContext;
  headingId: string;
}) {
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);
  return (
    <section
      {...(heading ? { "aria-labelledby": headingId } : {})}
      className={cn(WHITE_PANEL, "gap-6")}
      data-testid="construction-table"
    >
      {heading || sub ? (
        <div className="flex flex-col gap-3">
          {heading ? (
            <h2 id={headingId} className={PANEL_HEADING}>
              {heading}
            </h2>
          ) : null}
          {sub ? (
            <p className="text-ink-3 m-0 text-[17px] leading-[1.55] max-sm:text-base">{sub}</p>
          ) : null}
        </div>
      ) : null}
      <ArticleTable block={block} ctx={ctx} caption={heading || undefined} />
    </section>
  );
}

function CalloutPanel({
  block,
  ctx,
  headingId,
}: {
  block: BlockOf<"callout">;
  ctx: PlaceholderContext;
  headingId: string;
}) {
  const title = fill(block.title, ctx) || fill(block.heading, ctx);
  // Lead + text items (glazing pages) or an info note keep the note rendering of the site.
  if (block.tone === "info" || (block.items ?? []).length > 0) {
    const heading = fill(block.heading, ctx);
    return (
      <section
        {...(heading ? { "aria-labelledby": headingId } : {})}
        className={cn(WHITE_PANEL, "gap-5")}
      >
        {heading ? (
          <h2 id={headingId} className={PANEL_HEADING}>
            {heading}
          </h2>
        ) : null}
        <ArticleCallout block={block} ctx={ctx} />
      </section>
    );
  }
  return <WarningPanel title={title} headingId={headingId} body={block.body} ctx={ctx} />;
}

export function BlockPanels({ blocks, ctx, page, idPrefix }: BlockPanelsProps) {
  const out: ReactNode[] = [];
  let pending: Array<{ block: BlockOf<"richText">; index: number }> = [];

  const flush = () => {
    if (pending.length === 0) return;
    const row = pending;
    pending = [];
    out.push(
      <PanelRow key={`row-${row[0]!.index}`} count={row.length}>
        {row.map(({ block, index }) => (
          <TextPanel
            key={block.id ?? index}
            heading={fill(block.heading, ctx) || null}
            headingId={`${idPrefix}-${index}`}
            body={block.content}
            ctx={ctx}
          />
        ))}
      </PanelRow>
    );
  };

  blocks.forEach((block, index) => {
    if (block.blockType === "richText") {
      pending.push({ block, index });
      if (pending.length === 2) flush();
      return;
    }
    flush();
    const headingId = `${idPrefix}-${index}`;
    if (block.blockType === "table") {
      out.push(
        <TablePanel key={block.id ?? index} block={block} ctx={ctx} headingId={headingId} />
      );
    } else if (block.blockType === "callout") {
      out.push(
        <CalloutPanel key={block.id ?? index} block={block} ctx={ctx} headingId={headingId} />
      );
    } else {
      out.push(<RenderBlocks key={block.id ?? index} blocks={[block]} ctx={ctx} page={page} />);
    }
  });
  flush();

  return <>{out}</>;
}
