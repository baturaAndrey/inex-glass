import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { Placeholder } from "@/components/ig/placeholder";
import { cn } from "@/lib/utils";

/** Photo frame of the construction cards (`.ph-wide` of the prototype). */
const PHOTO_RATIO = "16/10";

/**
 * Block 5 — «Конструкции из стекла для объектов»: 3 / 2 / 1 columns of link cards, photo 16:10
 * (placeholder until task 38) with the title and the arrow in one row.
 */
export function HomeConstructionCards({ block, ctx, section }: BlockProps<"cards">) {
  const cards = (block.items ?? []).flatMap((item) => {
    const link = resolveLink(item.link);
    return link ? [{ item, href: link.href }] : [];
  });
  if (cards.length === 0) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul className={cn(CARD_GRID[3], "m-0 list-none p-0")}>
        {cards.map(({ item, href }, index) => {
          const media = asMedia(item.image);
          return (
            <li key={item.id ?? index} className="flex">
              <Link href={href} className="ig-card w-full">
                {media ? (
                  <BlockImage
                    media={media}
                    size="card"
                    sizes={CARD_IMAGE_SIZES[3]}
                    frameClassName="aspect-[16/10]"
                  />
                ) : (
                  <Placeholder ratio={PHOTO_RATIO} />
                )}
                <div className="ig-card__body flex-row items-center justify-between gap-4">
                  <h3 className="ig-card__title">{fill(item.title, ctx)}</h3>
                  <span className="ig-card__arrow" aria-hidden="true">
                    <ArrowRight strokeWidth={2} />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </BlockSection>
  );
}
