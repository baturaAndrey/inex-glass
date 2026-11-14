import { StatsTiles, type StatItem } from "@/components/ig/stats-tiles";
import { BlockSection, fill } from "./shared";
import type { BlockProps } from "./types";

/**
 * Figures. Frosted glass is reserved for the home hero (task 22), so the `glass` variant
 * renders as regular tiles here; `plain` drops the tile frame.
 */
export function StatsBlock({ block, ctx, section }: BlockProps<"stats">) {
  const items: StatItem[] = (block.items ?? [])
    .map((item) => ({ value: fill(item.value, ctx), text: fill(item.text, ctx) }))
    .filter((item) => item.value !== "");
  if (items.length === 0) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <StatsTiles
        items={items}
        className={block.variant === "plain" ? "border-0 bg-transparent shadow-none" : undefined}
      />
    </BlockSection>
  );
}
