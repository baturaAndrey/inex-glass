import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BlockHead, fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { Section } from "@/components/ig/section";
import { cn } from "@/lib/utils";

const TILE_BASE =
  "flex min-h-[132px] flex-col justify-between gap-7 rounded-lg px-[22px] pt-[22px] pb-5 text-lg leading-[1.3] font-semibold no-underline transition-[background-color,color,transform] duration-200 ease-ig hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 max-sm:min-h-[112px] max-sm:gap-4 max-sm:p-4 max-sm:text-[15px] [&_svg]:size-[22px] [&_svg]:self-end";

const TILE_TONE = {
  default:
    "bg-bg text-text hover:bg-primary-light hover:text-primary-dark [&_svg]:text-primary-pressed",
  accent: "bg-primary-dark text-white hover:bg-primary-pressed hover:text-white",
} as const;

/**
 * Block 4 — «Вся обработка — до закалки»: heading and paragraph on the left (≤440 px), link
 * tiles on the right: 4 / 3 / 2 columns; the accent tile (`tone: accent`) is the holes calculator.
 * One column layout ≤1365.
 */
export function HomeProcessingTiles({ block, ctx, section }: BlockProps<"cards">) {
  const tiles = (block.items ?? []).flatMap((item) => {
    const link = resolveLink(item.link);
    return link ? [{ item, href: link.href }] : [];
  });
  const heading = fill(block.heading, ctx);

  return (
    <Section
      variant={section.variant}
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={heading ? section.headingId : undefined}
      className="scroll-mt-24"
      containerClassName="grid grid-cols-[minmax(0,440px)_minmax(0,1fr)] items-start gap-12 max-lg:grid-cols-1 max-lg:gap-8"
    >
      <div className="flex flex-col gap-5">
        {heading ? (
          <BlockHead
            title={heading}
            level={block.headingLevel}
            id={section.headingId}
            className="mb-0 max-sm:mb-0"
          />
        ) : null}
        {hasText(block.sub) ? (
          <p className="text-lead m-0 max-w-[620px] text-pretty text-(color:--ig-section-sub)">
            {fill(block.sub, ctx)}
          </p>
        ) : null}
      </div>
      {tiles.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:gap-2.5">
          {tiles.map(({ item, href }, index) => (
            <li key={item.id ?? index} className="flex">
              <Link
                href={href}
                className={cn(
                  TILE_BASE,
                  TILE_TONE[item.tone === "accent" ? "accent" : "default"],
                  "w-full"
                )}
              >
                <span>{fill(item.title, ctx)}</span>
                <ArrowUpRight aria-hidden="true" strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Section>
  );
}
