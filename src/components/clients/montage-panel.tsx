import type { ReactNode } from "react";
import { CtaButtons } from "@/components/blocks/cta-buttons";
import { fill } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext } from "@/components/blocks/types";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * The dark «Монтаж» panel of the hub `/klientam/` (Paper mockup `2560_klientam`, frame
 * `turnkey-panel`): heading and text on the left, the outline-on-dark button («Перейти на
 * inex.su») on the right, aligned to the bottom. From a `cta` block with `tone: primaryDark`
 * (title, body, buttons). Stacks ≤1100 px.
 *
 * The frame itself is `DarkPanel`, shared with «Нужен монтаж «под ключ»?» of the construction
 * pages (mockup `2560_steklyannye-peregorodki`), which reads the document's `inexSuBridge`.
 */

const HEADING_ID = "clients-montage-title";

/** Text of the panel: 19 px secondary-on-dark paragraphs. */
export const DARK_PANEL_TEXT =
  "text-on-navy-2 text-lead-m max-w-[880px] text-pretty [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit [&_p+p]:mt-3";

export interface DarkPanelProps {
  title: string;
  headingId: string;
  /** Text under the heading. */
  children?: ReactNode;
  /** Buttons on the right (bottom-aligned). */
  actions?: ReactNode;
  testId: string;
  className?: string | undefined;
}

export function DarkPanel({
  title,
  headingId,
  children,
  actions,
  testId,
  className,
}: DarkPanelProps) {
  return (
    <section
      {...(title ? { "aria-labelledby": headingId } : {})}
      className={cn(
        "bg-primary-dark text-on-navy flex items-end justify-between gap-10 rounded-xl px-16 py-14 max-lg:px-12 max-lg:py-12 max-md:flex-col max-md:items-start max-md:gap-8 max-sm:px-5 max-sm:py-8",
        className
      )}
      data-testid={testId}
    >
      <div className="flex min-w-0 flex-col gap-5 max-sm:gap-3">
        {title ? (
          <h2 id={headingId} className="ig-h2 text-on-navy m-0">
            {title}
          </h2>
        ) : null}
        {children}
      </div>
      {actions}
    </section>
  );
}

export function MontagePanel({
  block,
  ctx,
  page,
}: {
  block: BlockOf<"cta">;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}) {
  const title = fill(block.title, ctx) || fill(block.heading, ctx);
  return (
    <DarkPanel
      title={title}
      headingId={HEADING_ID}
      testId="clients-montage"
      actions={
        <CtaButtons
          buttons={block.buttons}
          ctx={ctx}
          page={page}
          onDark
          className="shrink-0 max-sm:w-full"
        />
      }
    >
      {block.body ? (
        <div className={DARK_PANEL_TEXT}>
          <RichText data={block.body} ctx={ctx} disableContainer />
        </div>
      ) : null}
    </DarkPanel>
  );
}
