import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlockSection, CARD_GRID, fill, resolveLink } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { cn } from "@/lib/utils";
import { renderHomeIcon } from "./home-icons";

/** Link label of a segment card (prototype microcopy); hidden on phones. */
const MORE_LABEL = "Подробнее";

const SEGMENT_CLASS =
  "flex min-h-[220px] w-full flex-col gap-5 rounded-lg bg-bg p-7 text-text no-underline transition-[background-color,box-shadow,transform] duration-200 ease-ig hover:-translate-y-0.5 hover:bg-surface hover:text-text hover:shadow-card-hover motion-reduce:hover:translate-y-0 max-sm:min-h-0 max-sm:gap-3 max-sm:p-5";

/**
 * Block 6 — «С кем мы работаем»: 4 segment cards (icon in a 56 px tile, title, description,
 * «Подробнее →» except on phones) linking to the «Для кого» pages.
 */
export function HomeSegments({ block, ctx, section }: BlockProps<"cards">) {
  const cards = (block.items ?? []).flatMap((item) => {
    const link = resolveLink(item.link);
    return link ? [{ item, href: link.href }] : [];
  });
  if (cards.length === 0) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <ul className={cn(CARD_GRID[4], "m-0 list-none p-0")}>
        {cards.map(({ item, href }, index) => {
          const icon = renderHomeIcon(item.icon, { className: "size-7" });
          return (
            <li key={item.id ?? index} className="flex">
              <Link href={href} className={SEGMENT_CLASS}>
                {icon ? (
                  <span className="bg-primary-light text-primary-pressed grid size-14 flex-none place-items-center rounded-[14px] max-sm:size-12">
                    {icon}
                  </span>
                ) : null}
                <h3 className="m-0 text-xl leading-[1.3] font-semibold max-sm:text-[17px]">
                  {fill(item.title, ctx)}
                </h3>
                {item.text ? (
                  <p className="text-text-2 m-0 text-[15px] leading-normal max-sm:text-sm">
                    {fill(item.text, ctx)}
                  </p>
                ) : null}
                <span className="text-primary-pressed mt-auto inline-flex items-center gap-1.5 text-[15px] leading-[1.3] font-medium max-sm:hidden">
                  {MORE_LABEL}
                  <ArrowRight aria-hidden="true" className="size-[18px]" strokeWidth={2} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </BlockSection>
  );
}
