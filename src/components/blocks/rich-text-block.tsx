import { RichText } from "@/components/rich-text/rich-text";
import { cn } from "@/lib/utils";
import { BlockSection } from "./shared";
import type { BlockOf, BlockProps } from "./types";

/** Text column width; the paragraphs themselves keep a ≈72ch measure. */
const WIDTH_CLASS: Record<NonNullable<BlockOf<"richText">["width"]>, string> = {
  narrow: "max-w-[720px]",
  normal: "max-w-[900px]",
  wide: "max-w-none",
};

/** Free text (Lexical) with placeholders substituted in every text node. */
export function RichTextBlock({ block, ctx, section }: BlockProps<"richText">) {
  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <RichText
        data={block.content}
        ctx={ctx}
        className={cn(WIDTH_CLASS[block.width ?? "normal"])}
      />
    </BlockSection>
  );
}
