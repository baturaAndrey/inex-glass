import { Card } from "@/components/ig/card";
import { cn } from "@/lib/utils";
import { BlockSection, CARD_GRID, CardMedia, fill, resolveLink } from "./shared";
import type { BlockOf, BlockProps } from "./types";

type CardsLayout = NonNullable<BlockOf<"cards">["layout"]>;

/** Prototype layouts → grid width: catalog/thickness cards are 4-up, the rest 3-up. */
const LAYOUT_COLUMNS: Record<CardsLayout, 3 | 4> = {
  g3: 3,
  g4: 4,
  ctCards: 4,
  p5Cards: 3,
  seg: 4,
};

const TONE_CLASS = {
  default: undefined,
  negative: "bg-warning-bg",
  accent: "bg-primary-light",
} as const;

/** Grid of hand-made cards; a card with a link becomes a link card. */
export function CardsBlock({ block, ctx, section }: BlockProps<"cards">) {
  const items = block.items ?? [];
  if (items.length === 0) return null;
  const columns = LAYOUT_COLUMNS[block.layout ?? "g3"];

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul className={cn(CARD_GRID[columns], "m-0 list-none p-0")}>
        {items.map((item, index) => {
          const link = resolveLink(item.link);
          const priceHint = fill(item.priceHint, ctx);
          return (
            <li key={item.id ?? index} className="flex">
              <Card
                className={cn("w-full", TONE_CLASS[item.tone ?? "default"])}
                title={fill(item.title, ctx)}
                sub={fill(item.text, ctx) || undefined}
                image={<CardMedia image={item.image} icon={item.icon} columns={columns} />}
                footer={
                  priceHint ? (
                    <span className="text-primary-dark font-semibold tabular-nums">
                      {priceHint}
                    </span>
                  ) : undefined
                }
                {...(link ? { href: link.href } : {})}
              />
            </li>
          );
        })}
      </ul>
    </BlockSection>
  );
}
