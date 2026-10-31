import { CtaButtons } from "@/components/blocks/cta-buttons";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, BlockSectionInfo } from "@/components/blocks/types";
import { DataTable } from "@/components/ig/data-table";
import { formatNumber, WEIGHT_TABLE } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import { thicknessLabel } from "@/lib/thickness-view";
import { CtParagraph, CtSection } from "./ct-cards-section";

/**
 * «Как выбрать толщину»: sub paragraph, the «Толщина / Вес, кг/м²» table and its footnote from a
 * `table` block, buttons from the companion `cta` block (`weights-cta`). The weights are not
 * stored in the CMS: they come from `WEIGHT_TABLE` of the domain library (2,5 kg per mm per m²);
 * the block only provides the column labels.
 */

const DEFAULT_COLUMNS = ["Толщина", "Вес, кг/м²"] as const;

export interface WeightSectionProps {
  block: BlockOf<"table">;
  /** Companion `cta` block with the buttons («Подобрать толщину под нагрузку», calculator). */
  companion?: BlockOf<"cta"> | undefined;
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
  page?: BlockPageContext | undefined;
}

export function WeightSection({ block, companion, ctx, section, page }: WeightSectionProps) {
  const labels = (block.table?.columns ?? []).map((column) => fill(column.label, ctx));
  const thicknessColumn = labels[0] || DEFAULT_COLUMNS[0];
  const weightColumn = labels[1] || DEFAULT_COLUMNS[1];
  const footnote = fill(block.table?.footnote, ctx);
  const caption = fill(block.table?.caption, ctx);

  return (
    <CtSection
      variant={section.variant}
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      heading={fill(block.heading, ctx) || undefined}
      headingId={section.headingId}
      lead={fill(block.sub, ctx) || undefined}
    >
      <DataTable
        className="max-w-[900px]"
        {...(caption ? { caption } : {})}
        columns={[
          { key: "thickness", label: thicknessColumn },
          { key: "weight", label: weightColumn, numeric: true },
        ]}
        rows={WEIGHT_TABLE.map(({ thickness, kgPerM2 }) => ({
          thickness: thicknessLabel(thickness),
          weight: formatNumber(kgPerM2),
        }))}
      />
      {footnote ? <CtParagraph className="mt-4">{footnote}</CtParagraph> : null}
      {companion ? (
        <CtaButtons buttons={companion.buttons} ctx={ctx} page={page} size="m" className="mt-2" />
      ) : null}
    </CtSection>
  );
}
