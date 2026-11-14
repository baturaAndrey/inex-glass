import { asMedia, fill, hasText, mediaSrc } from "@/components/blocks/shared";
import type { BlockOf, LayoutBlock } from "@/components/blocks/types";
import type { SubpageLink } from "@/components/how-to-order/subpage-links";
import { getPageByPath } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { pickFirst } from "@/lib/service/page-compose";
import { CLIENTS_HUB_PATH } from "./copy";

/**
 * The client segments of the «Клиентам» section, read from the hub's first `table` block
 * (teksty 17 §3: segment | «Ваша задача» | «Что берём на себя» | «Подробнее» → segment page).
 * The hub renders them as photo cards, every segment page as the sibling tiles, so the labels,
 * order and links are edited in one place. The card photo is the hero photo of the segment page.
 */

export interface ClientSegment {
  key: string;
  /** Segment page. */
  href: string;
  title: string;
  task: string;
  take: string;
  /** Label of the card link («Подробнее»). */
  more: string;
}

export interface ClientSegments {
  /** Column labels of the table: «Ваша задача», «Что берём на себя». */
  taskLabel: string;
  takeLabel: string;
  items: ClientSegment[];
}

/** Columns of the hub table: segment, task, take, link. */
const COLUMN = { title: 0, task: 1, take: 2, more: 3 } as const;

/** Segments of a hub `table` block; rows without a title or a link are skipped. */
export function segmentsOf(block: BlockOf<"table">, ctx: PlaceholderContext): ClientSegments {
  const columns = block.table?.columns ?? [];
  const items = (block.table?.rows ?? []).flatMap((row, index) => {
    const cells = row.cells ?? [];
    const title = fill(cells[COLUMN.title]?.value, ctx);
    // The link sits in the «Подробнее» column; any linked cell will do if the editor moved it.
    const linked = cells[COLUMN.more]?.href ? cells[COLUMN.more] : cells.find((c) => c.href);
    const href = linked?.href?.trim();
    if (!title || !hasText(href)) return [];
    return [
      {
        key: row.id ?? String(index),
        href,
        title,
        task: fill(cells[COLUMN.task]?.value, ctx),
        take: fill(cells[COLUMN.take]?.value, ctx),
        more: fill(linked?.value, ctx),
      },
    ];
  });
  return {
    taskLabel: fill(columns[COLUMN.task]?.label, ctx).trim(),
    takeLabel: fill(columns[COLUMN.take]?.label, ctx).trim(),
    items,
  };
}

/** The segments table of a hub layout (its first `table` block). */
export const findSegmentsTable = (layout: readonly LayoutBlock[] | null | undefined) =>
  pickFirst(layout, "table");

/** Hero photo of a segment page (the photo of its card on the hub); `null` without one. */
export async function segmentPhoto(href: string): Promise<{ src: string; alt: string } | null> {
  const page = await getPageByPath(href);
  const hero = pickFirst(page?.layout, "hero");
  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;
  return media && src ? { src, alt: media.alt?.trim() ?? "" } : null;
}

/** Sibling tiles of the segment pages, read from the hub; `[]` without the hub or its table. */
export async function loadSegmentLinks(ctx: PlaceholderContext): Promise<SubpageLink[]> {
  const hub = await getPageByPath(CLIENTS_HUB_PATH);
  const table = findSegmentsTable(hub?.layout);
  if (!table) return [];
  return segmentsOf(table, ctx).items.map((item) => ({
    key: item.key,
    href: item.href,
    label: item.title,
  }));
}
