import { Compare, type CompareRow } from "@/components/ig/compare";
import { TextLink } from "@/components/ig/text-link";
import { BlockSection, fill, resolveLink } from "./shared";
import type { BlockProps } from "./types";

/** «Сами / через Inex Glass» comparison with a topic column and an optional link below. */
export function CompareBlock({ block, ctx, section }: BlockProps<"compare">) {
  const rows: CompareRow[] = (block.rows ?? []).map((row) => ({
    topic: fill(row.topic, ctx),
    self: fill(row.left, ctx),
    inex: fill(row.right, ctx),
  }));
  if (rows.length === 0) return null;
  const link = resolveLink(block.footLink);
  const heading = fill(block.heading, ctx);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <Compare
        rows={rows}
        {...(block.leftTitle ? { selfTitle: fill(block.leftTitle, ctx) } : {})}
        {...(block.rightTitle ? { inexTitle: fill(block.rightTitle, ctx) } : {})}
        {...(block.topicTitle ? { topicTitle: fill(block.topicTitle, ctx) } : {})}
        {...(heading ? { label: heading } : {})}
      />
      {link?.label ? (
        <p className="mt-8 mb-0">
          <TextLink href={link.href} variant="arrow">
            {link.label}
          </TextLink>
        </p>
      ) : null}
    </BlockSection>
  );
}
