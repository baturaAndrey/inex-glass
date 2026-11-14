import { PricesTableSection } from "@/components/zak-hub/prices-table-section";
import { fill } from "./shared";
import type { BlockProps } from "./types";

/**
 * `pricesTable` block: the price table of the `prices` global (45-day rule, «по запросу» for
 * 15/19 mm), «Входит / Считается отдельно» and the «Что нужно учесть» callout — the same
 * section as on the hub, so it works on any page an editor puts it on. Anchor `ceny` by default.
 *
 * The block's `sub` is the caption above the table (placeholders `{дата_цен}`, `{акция_текст}`);
 * without it the caption of the `prices` global is used.
 */
export function PricesTableBlock({ block, ctx, section }: BlockProps<"pricesTable">) {
  return (
    <PricesTableSection
      ctx={ctx}
      variant={section.variant}
      headingId={section.headingId}
      heading={fill(block.heading, ctx) || undefined}
      anchorId={block.anchorId ?? undefined}
      captionTemplate={block.sub}
      layout={block.variant}
      showCaption={block.showCaption}
      showPromo={block.showPromo}
      showWeight={block.showWeight}
      showIncluded={block.showIncluded}
      showCallout={block.calloutFromConditions}
    />
  );
}
