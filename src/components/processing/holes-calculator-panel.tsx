import { HOLES_CALCULATOR_ANCHOR } from "@/components/blocks/holes-calculator-block";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { DEFAULT_HOLES_THICKNESS } from "@/components/calculators/holes-calculator-model";
import { Container } from "@/components/ig/container";
import { isThickness, type Thickness } from "@/lib/domain";
import { HolesDistanceCalculator } from "./holes-distance-calculator";

/**
 * The `holesCalculator` block on a service page (Paper mockup `2560_service_otverstiya`, frame
 * «holes-calculator»): a light-teal panel — micro caps label, H2 and sub on the left; thickness
 * select, the `t · 2t · 6t` line, four white result tiles and the note on the right
 * (`HolesDistanceCalculator`, the only client part).
 *
 * Only the service template renders this panel; on other pages (tolerances page) the block keeps
 * the site-wide `HolesCalculatorBlock` (chips, scheme, diameter field). The panel shows no scheme
 * (the page's «about» diagram carries it) and no diameter field (the diameter tolerances are a
 * how-to-order panel), so `showScheme` and `ctaLabel` of the block are not used here.
 */

/** Micro caps label above the heading (mockup copy; the block has no field for it). */
const PANEL_LABEL = "Калькулятор отверстий";

/** CMS select value («10») → thickness; unknown or empty → the default 10 mm. */
function toThickness(value: string | null | undefined): Thickness {
  const n = Number(value);
  return isThickness(n) ? n : DEFAULT_HOLES_THICKNESS;
}

/** Last path segment: `/obrabotka-stekla/otverstiya-i-vyrezy/` → `otverstiya-i-vyrezy`. */
function pageSlug(path: string | undefined): string | undefined {
  return path?.split("/").filter(Boolean).at(-1);
}

export function HolesCalculatorPanel({ block, ctx, section, page }: BlockProps<"holesCalculator">) {
  const anchorId = hasText(block.anchorId) ? block.anchorId : HOLES_CALCULATOR_ANCHOR;
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);
  const note = fill(block.note, ctx);

  return (
    <section
      id={anchorId}
      aria-labelledby={heading ? section.headingId : undefined}
      aria-label={heading ? undefined : PANEL_LABEL}
      className="scroll-mt-24 pt-8 pb-16 max-md:pb-12 max-sm:pt-4 max-sm:pb-8"
      data-testid="processing-holes-calculator"
    >
      <Container>
        <div className="bg-primary-light border-line-teal flex gap-16 rounded-xl border p-12 max-xl:flex-col max-xl:gap-8 max-md:p-8 max-sm:gap-6 max-sm:p-5">
          <div className="flex shrink-0 flex-col gap-4 xl:w-[520px]">
            <p className="text-micro text-primary-pressed m-0 tracking-[0.06em] uppercase">
              {PANEL_LABEL}
            </p>
            {heading ? (
              <h2 id={section.headingId} className="ig-h3 text-primary-dark m-0 text-balance">
                {heading}
              </h2>
            ) : null}
            {sub ? (
              <p className="text-lead text-ink-3 m-0 max-w-[640px] text-pretty">{sub}</p>
            ) : null}
          </div>
          <HolesDistanceCalculator
            defaultThickness={toThickness(block.defaultThickness)}
            note={note || undefined}
            source={pageSlug(page?.path)}
          />
        </div>
      </Container>
    </section>
  );
}
