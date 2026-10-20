import { Callout } from "@/components/ig/callout";
import { RichText } from "@/components/rich-text/rich-text";
import { BlockSection, fill, hasText } from "./shared";
import type { BlockProps } from "./types";

/** Highlighted note (`Callout` warning / info) with an optional bulleted list. */
export function CalloutBlock({ block, ctx, section }: BlockProps<"callout">) {
  const items = (block.items ?? []).map((item, index) => (
    // Paragraphs of the item are inlined so the bold lead runs into the text.
    <div key={item.id ?? index} className="[&>p]:inline">
      {hasText(item.lead) ? <strong>{fill(item.lead, ctx)} </strong> : null}
      <RichText data={item.text} ctx={ctx} disableContainer />
    </div>
  ));
  const title = fill(block.title, ctx);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <Callout
        variant={block.tone === "info" ? "info" : "warning"}
        className="max-w-[1100px]"
        {...(title ? { title } : {})}
        {...(items.length > 0 ? { items } : {})}
      >
        <RichText data={block.body} ctx={ctx} disableContainer />
      </Callout>
    </BlockSection>
  );
}
