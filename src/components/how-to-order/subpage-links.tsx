import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, LayoutBlock } from "@/components/blocks/types";
import { getPageByPath } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { HOW_TO_ORDER_HUB_PATH, HOW_TO_ORDER_TEMPLATE_COPY, SUBPAGES_ANCHOR } from "./copy";

/**
 * Link cards to the «Как заказать» subpages (Paper mockups: hub frame `subpages`, subpage frame
 * `info` → `subpages`): white cards with the title and an arrow; on a subpage its own card is
 * primary-dark (`aria-current="page"`). 4 columns → 2 at ≤1100 px → 1 at ≤599 px.
 *
 * The list is the hub's `linkList` block with the anchor `subpages` (labels and order are edited
 * there), so the hub and every subpage show the same cards.
 */

export interface SubpageLink {
  key: string;
  href: string;
  label: string;
}

/** The subpage links of the hub's `linkList` block (`#subpages`). */
export function subpageLinksOf(block: BlockOf<"linkList">, ctx: PlaceholderContext): SubpageLink[] {
  return (block.items ?? []).flatMap((item, index) => {
    const link = resolveLink(item.link);
    const label = link ? fill(link.label, ctx) : "";
    return link && label ? [{ key: item.id ?? String(index), href: link.href, label }] : [];
  });
}

/** The hub's subpages block: the `linkList` with the anchor `subpages`. */
export function findSubpagesBlock(
  layout: readonly LayoutBlock[] | null | undefined
): BlockOf<"linkList"> | null {
  const block = (layout ?? []).find(
    (item) =>
      item.blockType === "linkList" &&
      hasText(item.anchorId) &&
      item.anchorId.trim() === SUBPAGES_ANCHOR
  );
  return (block as BlockOf<"linkList"> | undefined) ?? null;
}

/** Subpage links read from the hub document (for the subpages); `[]` without the hub or block. */
export async function loadSubpageLinks(ctx: PlaceholderContext): Promise<SubpageLink[]> {
  const hub = await getPageByPath(HOW_TO_ORDER_HUB_PATH);
  const block = findSubpagesBlock(hub?.layout);
  return block ? subpageLinksOf(block, ctx) : [];
}

export function SubpageLinks({
  links,
  currentPath,
}: {
  links: readonly SubpageLink[];
  /** Path of the page showing the grid: its card is highlighted. */
  currentPath?: string | undefined;
}) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={HOW_TO_ORDER_TEMPLATE_COPY.subpages} id={SUBPAGES_ANCHOR}>
      <ul
        className="m-0 grid list-none grid-cols-4 gap-4 p-0 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3"
        data-testid="subpage-links"
      >
        {links.map((link) => {
          const current = link.href === currentPath;
          return (
            <li key={link.key} className="flex">
              <Link
                href={link.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "group/card flex min-h-24 w-full items-center justify-between gap-4 rounded-lg border px-6 py-4 text-lg leading-[1.3] font-semibold no-underline transition-shadow duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 max-sm:min-h-16 max-sm:px-5 max-sm:text-base",
                  current
                    ? "bg-primary-dark border-primary-dark focus-visible:outline-brand text-white hover:text-white"
                    : "bg-surface border-hairline text-text hover:text-text hover:shadow-card-hover focus-visible:outline-brand"
                )}
              >
                {link.label}
                <ArrowRight
                  aria-hidden="true"
                  strokeWidth={2}
                  className={cn(
                    "ease-ig size-5 shrink-0 transition-transform duration-200 group-hover/card:translate-x-0.5 motion-reduce:transition-none",
                    current ? "text-line-teal" : "text-brand"
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
