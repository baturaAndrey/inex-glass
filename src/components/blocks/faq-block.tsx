import { Faq } from "@/components/ig/faq";
import { RichText } from "@/components/rich-text/rich-text";
import { JsonLd, faqLd } from "@/lib/seo/jsonld";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import { BlockSection, fill } from "./shared";
import type { BlockOf, BlockPageContext, BlockProps } from "./types";

/** Questions a FAQ block renders: its own (`inline`) or the document's (`doc`), blanks skipped. */
export function faqBlockItems(block: BlockOf<"faq">, page: BlockPageContext | undefined) {
  const source = (block.mode === "inline" ? block.items : page?.faq) ?? [];
  return source.filter((item) => item.question.trim() !== "");
}

/**
 * Index of the layout block that emits the page's single `FAQPage` JSON-LD: the first FAQ block
 * that renders questions (an empty one renders nothing). `-1` when there is none.
 */
export function faqJsonLdIndex(
  blocks: ReadonlyArray<{ blockType?: unknown }>,
  page: BlockPageContext | undefined
): number {
  return blocks.findIndex(
    (block) => block.blockType === "faq" && faqBlockItems(block as BlockOf<"faq">, page).length > 0
  );
}

/**
 * FAQ accordion + `FAQPage` JSON-LD. Mode `doc` reads the document's own «Частые вопросы»
 * (`page.faq`, passed by the page to `RenderBlocks`), `inline` — the block's questions.
 * Placeholders are substituted both in the markup and in the JSON-LD plain text.
 * Only one FAQ block per page emits the JSON-LD (`section.faqJsonLd`, set by `RenderBlocks`).
 */
export function FaqBlock({ block, ctx, section, page }: BlockProps<"faq">) {
  const items = faqBlockItems(block, page);
  if (items.length === 0) return null;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <Faq
        className="max-w-[1100px]"
        headingLevel={block.heading && block.headingLevel === "h3" ? 4 : 3}
        items={items.map((item) => ({
          question: fill(item.question, ctx),
          answer: <RichText data={item.answer} ctx={ctx} />,
        }))}
      />
      {section.faqJsonLd === false ? null : (
        <JsonLd
          data={faqLd(
            items.map((item) => ({
              question: fill(item.question, ctx),
              answer: fill(lexicalToPlainText(item.answer), ctx),
            }))
          )}
        />
      )}
    </BlockSection>
  );
}
