import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { BlockSection, fill } from "./shared";
import type { BlockOf, BlockProps } from "./types";

type Column = BlockOf<"twoColumns">["left"];

function ColumnContent({
  column,
  ctx,
  level,
}: {
  column: Column;
  ctx: PlaceholderContext;
  level: "h3" | "h4";
}) {
  const heading = fill(column?.heading, ctx);
  const Heading = level;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {heading ? <Heading className={level === "h3" ? "ig-h3" : "ig-h4"}>{heading}</Heading> : null}
      <RichText data={column?.body} ctx={ctx} />
    </div>
  );
}

/** Two rich-text columns (stacked ≤1100 px). */
export function TwoColumnsBlock({ block, ctx, section }: BlockProps<"twoColumns">) {
  if (!block.left?.body && !block.right?.body) return null;
  // Column headings sit one level under the block heading.
  const level = block.heading && block.headingLevel === "h3" ? "h4" : "h3";
  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="grid grid-cols-2 gap-12 max-md:grid-cols-1 max-md:gap-8">
        <ColumnContent column={block.left} ctx={ctx} level={level} />
        <ColumnContent column={block.right} ctx={ctx} level={level} />
      </div>
    </BlockSection>
  );
}
