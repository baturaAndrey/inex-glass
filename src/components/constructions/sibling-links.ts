import { fill, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, LayoutBlock } from "@/components/blocks/types";
import type { SubpageLink } from "@/components/how-to-order/subpage-links";
import { resolveConstruction } from "@/lib/cms/construction-queries";
import { findGlazingMirrorsRoute, glazingMirrorsHub } from "@/lib/cms/glazing-mirrors-routes";
import type { PlaceholderContext } from "@/lib/domain";
import { resolveSeoText } from "@/lib/seo/metadata";

/**
 * Sibling navigation of the glazing / mirrors subpages: the tiles at the bottom of the cream block
 * link the other subpages of the same hub. Labels and order are the hub's own photo cards (its
 * first `cards` block, edited in the CMS) — only the cards that lead to a page under the hub
 * («Козырьки» of «Остекление» lives elsewhere, «Гостиницы и офисы» of «Зеркала» has no page).
 */

export interface SiblingNav {
  /** Accessible name of the navigation: the hub's breadcrumb label («Остекление», «Зеркала»). */
  label: string;
  links: SubpageLink[];
}

/** Path without its trailing slash, for prefix checks (`/osteklenie/` → `/osteklenie`). */
const trimSlash = (path: string) => path.replace(/\/+$/, "");

/** Pure part: the sibling links of a hub's cards block (exported for tests). */
export function siblingLinksOf(
  cards: BlockOf<"cards"> | null | undefined,
  hubPath: string,
  ctx: PlaceholderContext
): SubpageLink[] {
  const prefix = `${trimSlash(hubPath)}/`;
  return (cards?.items ?? []).flatMap((item, index) => {
    const href = resolveLink(item.link)?.href ?? "";
    const label = fill(item.title, ctx);
    const isChild = href.startsWith(prefix) && trimSlash(href) !== trimSlash(hubPath);
    return isChild && label ? [{ key: item.id ?? String(index), href, label }] : [];
  });
}

/** Sibling navigation of a subpage path; `null` outside the glazing / mirrors subpages. */
export async function loadSiblingNav(
  path: string,
  ctx: PlaceholderContext
): Promise<SiblingNav | null> {
  const route = findGlazingMirrorsRoute(path);
  if (!route || route.kind !== "construction") return null;
  const hubRoute = glazingMirrorsHub(route.section);
  const hub = await resolveConstruction({ path: hubRoute.path });
  if (!hub) return null;
  const cards = ((hub.layout ?? []) as LayoutBlock[]).find(
    (block): block is BlockOf<"cards"> => block.blockType === "cards"
  );
  const links = siblingLinksOf(cards, hub.path ?? hubRoute.path, ctx);
  if (links.length === 0) return null;
  return {
    label: resolveSeoText(hub.breadcrumbLabel || hub.title, ctx) || hubRoute.label,
    links,
  };
}
