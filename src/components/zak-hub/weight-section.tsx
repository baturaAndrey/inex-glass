import { CtaButtons } from "@/components/blocks/cta-buttons";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext } from "@/components/blocks/types";
import { Container } from "@/components/ig/container";
import { formatNumber, REQUEST_ONLY_THICKNESSES, WEIGHT_TABLE } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import { thicknessLabel } from "@/lib/thickness-view";
import { cn } from "@/lib/utils";
import { SplitIntro } from "./split-intro";

/**
 * «Как выбрать толщину» (Paper mockup `2560_zakalennoe-steklo`, frame `thickness`), from a
 * `table` block: heading, sub, footnote and the buttons of the companion `cta` block
 * (`weights-cta`) on the left; on the right a white panel with one bar per thickness, its length
 * proportional to the weight of 1 m². The weights come from `WEIGHT_TABLE` of the domain library
 * (2,5 kg per mm per m²); the block only provides the column labels.
 *
 * The bars are drawn, but the numbers are real text: a list of «thickness — weight» pairs that
 * screen readers read as such. The request-only thicknesses (15, 19 mm) get the darker bar.
 */

const DEFAULT_COLUMNS = ["Толщина", "Вес, кг/м²"] as const;

export interface WeightSectionProps {
  block: BlockOf<"table">;
  /** Companion `cta` block with the buttons («Подобрать толщину под нагрузку», calculator). */
  companion?: BlockOf<"cta"> | undefined;
  ctx: PlaceholderContext;
  headingId: string;
  page?: BlockPageContext | undefined;
}

const MAX_WEIGHT = Math.max(...WEIGHT_TABLE.map((row) => row.kgPerM2));

/** Bar length in % of the heaviest glass, rounded to whole percent. */
const barWidth = (kg: number) => `${Math.round((kg / MAX_WEIGHT) * 100)}%`;

export function WeightSection({ block, companion, ctx, headingId, page }: WeightSectionProps) {
  const labels = (block.table?.columns ?? []).map((column) => fill(column.label, ctx));
  const thicknessColumn = labels[0] || DEFAULT_COLUMNS[0];
  const weightColumn = labels[1] || DEFAULT_COLUMNS[1];
  const footnote = fill(block.table?.footnote, ctx);

  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-section="weights"
    >
      <Container className="flex items-start gap-16 max-md:flex-col max-md:gap-8">
        <SplitIntro
          heading={fill(block.heading, ctx)}
          headingId={headingId}
          sub={fill(block.sub, ctx)}
        >
          {footnote ? <p className="text-text-2 m-0 text-base leading-[1.55]">{footnote}</p> : null}
          {companion ? (
            <CtaButtons
              buttons={companion.buttons}
              ctx={ctx}
              page={page}
              size="m"
              className="pt-2"
            />
          ) : null}
        </SplitIntro>

        <div className="bg-surface border-hairline flex w-full min-w-0 flex-col gap-3.5 rounded-xl border px-10 py-8 max-sm:rounded-lg max-sm:px-5 max-sm:py-5">
          <div
            aria-hidden="true"
            className="text-text-2 flex justify-between pb-1.5 text-[13px] leading-4 font-medium tracking-[0.06em] uppercase"
          >
            <span>{thicknessColumn}</span>
            <span>{weightColumn}</span>
          </div>
          <dl className="m-0 flex flex-col gap-3.5" data-weights="">
            {WEIGHT_TABLE.map(({ thickness, kgPerM2 }) => (
              <div
                key={thickness}
                className="flex items-center gap-5 max-sm:gap-3"
                data-weight-row={thickness}
              >
                <dt className="w-16 shrink-0 text-[17px] leading-[1.3] font-semibold max-sm:w-14 max-sm:text-base">
                  {thicknessLabel(thickness)}
                </dt>
                <dd className="m-0 flex min-w-0 flex-1 items-center gap-5 max-sm:gap-3">
                  <span aria-hidden="true" className="bg-well h-3 min-w-0 flex-1 rounded-full">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        REQUEST_ONLY_THICKNESSES.includes(thickness)
                          ? "bg-primary-pressed"
                          : "bg-brand"
                      )}
                      // Width is data (kg per m²), not a colour: the only inline style here.
                      style={{ width: barWidth(kgPerM2) }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-[17px] leading-[1.3] font-semibold tabular-nums max-sm:w-11 max-sm:text-base">
                    {formatNumber(kgPerM2)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
