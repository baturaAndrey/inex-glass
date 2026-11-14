import type { ReactNode } from "react";
import type { BlockOf, BlockType, LayoutBlock } from "@/components/blocks/types";

/**
 * Blocks of a page document picked by type and `anchorId` (the routes of `/proektirovanie/` and
 * `/proizvodstvo/` place sections by role). Returns the block and remembers it as used, so the
 * route can render the rest generically.
 */
export function blockPicker(layout: LayoutBlock[]) {
  const used = new Set<LayoutBlock>();
  function pick<T extends BlockType>(type: T, anchor?: string): BlockOf<T> | null {
    const block = layout.find(
      (item) =>
        !used.has(item) &&
        item.blockType === type &&
        (anchor === undefined || ("anchorId" in item && item.anchorId === anchor))
    );
    if (!block) return null;
    used.add(block);
    return block as BlockOf<T>;
  }
  const rest = () => layout.filter((block) => !used.has(block));
  return { pick, rest };
}

/** The sections column of the page: 1920 frame, gutter, 96 / 72 / 48 px between sections. */
export function SectionsStack({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-24 px-(--ig-gutter) pb-24 max-md:gap-[72px] max-md:pb-[72px] max-sm:gap-12 max-sm:pb-12">
      {children}
    </div>
  );
}
