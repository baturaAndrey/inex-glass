import {
  BlockImage,
  BlockSection,
  CARD_GRID,
  CARD_IMAGE_SIZES,
  asMedia,
  fill,
  resolveLink,
} from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { Card } from "@/components/ig/card";
import { Placeholder } from "@/components/ig/placeholder";
import { cn } from "@/lib/utils";

/** Caption of the illustration placeholder (prototype). */
const ILLUSTRATION_LABEL = "иллюстрация";

/**
 * Block 9 — «Полезное для инженеров»: 4 link cards to tools and articles, 16:9 illustration
 * (placeholder until task 38), 19 px title and a short description.
 */
export function HomeUsefulCards({ block, ctx, section }: BlockProps<"cards">) {
  const cards = (block.items ?? []).flatMap((item) => {
    const link = resolveLink(item.link);
    return link ? [{ item, href: link.href }] : [];
  });
  if (cards.length === 0) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul className={cn(CARD_GRID[4], "m-0 list-none p-0")}>
        {cards.map(({ item, href }, index) => {
          const media = asMedia(item.image);
          return (
            <li key={item.id ?? index} className="flex">
              <Card
                className="w-full [&_.ig-card__title]:text-[19px]"
                href={href}
                arrow={false}
                title={fill(item.title, ctx)}
                sub={fill(item.text, ctx) || undefined}
                image={
                  media ? (
                    <BlockImage
                      media={media}
                      size="card"
                      sizes={CARD_IMAGE_SIZES[4]}
                      frameClassName="aspect-video"
                    />
                  ) : (
                    <Placeholder ratio="16/9" label={ILLUSTRATION_LABEL} />
                  )
                }
              />
            </li>
          );
        })}
      </ul>
    </BlockSection>
  );
}
