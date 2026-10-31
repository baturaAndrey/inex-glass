import type { BlockOf, BlockSectionInfo } from "@/components/blocks/types";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { CtCardsSection } from "./ct-cards-section";

/**
 * «Виды закалённого стекла» (`#vidy`): link cards of the glass types (`cards` block, layout
 * `ctCards`; «Прозрачное» has no page and is a plain card) and the «Рядом: Триплекс · Обработка
 * стекла · Стеклянные конструкции» line from the companion `richText` block (`vidy-bridge`).
 */

export const KINDS_ANCHOR = "vidy";

export interface KindsSectionProps {
  block: BlockOf<"cards">;
  bridge?: BlockOf<"richText"> | undefined;
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
}

export function KindsSection({ block, bridge, ctx, section }: KindsSectionProps) {
  const withAnchor: BlockOf<"cards"> = { ...block, anchorId: block.anchorId || KINDS_ANCHOR };
  return (
    <CtCardsSection
      block={withAnchor}
      ctx={ctx}
      section={section}
      footer={
        bridge?.content ? (
          <div className="mt-6 text-base leading-[1.4] font-medium" data-kinds-bridge="">
            <RichText data={bridge.content} ctx={ctx} className="gap-2 [&_p]:m-0" />
          </div>
        ) : undefined
      }
    />
  );
}
