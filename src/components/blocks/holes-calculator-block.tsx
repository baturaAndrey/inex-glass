import { DEFAULT_HOLES_THICKNESS } from "@/components/calculators/holes-calculator-model";
import { HolesCalculator } from "@/components/calculators/lazy";
import { buildQuizHref, prefillToQuizParams } from "@/components/page/quiz-cta";
import { THICKNESSES, isThickness, type Thickness } from "@/lib/domain";
import { BlockSection, fill, hasText } from "./shared";
import type { BlockPageContext, BlockProps } from "./types";

/** Anchor of the calculator section when the editor set none (`#kalkulyator`). */
export const HOLES_CALCULATOR_ANCHOR = "kalkulyator";

/** CMS select value («10») → thickness; unknown or empty → the default 10 mm. */
function toThickness(value: string | null | undefined): Thickness {
  const n = Number(value);
  return isThickness(n) ? n : DEFAULT_HOLES_THICKNESS;
}

/** Last path segment: `/obrabotka-stekla/otverstiya-i-vyrezy/` → `otverstiya-i-vyrezy`. */
function pageSlug(path: string | undefined): string | undefined {
  return path?.split("/").filter(Boolean).at(-1);
}

/**
 * Quiz URL per thickness, with the page pre-fill and `src` (masked by `buildQuizHref`). Built
 * here, on the server: the quiz-link module is not part of the client bundle.
 */
function quizHrefsByThickness(page: BlockPageContext | undefined): Record<string, string> {
  const base = prefillToQuizParams(page?.quizPrefill, page?.path);
  return Object.fromEntries(
    THICKNESSES.map((t) => [String(t), buildQuizHref({ ...base, thick: t })])
  );
}

/**
 * Block `holesCalculator` (ГОСТ 30698-2014): section with the anchor `#kalkulyator` by default,
 * heading / sub of the block and the client `HolesCalculator`. Used on
 * `/obrabotka-stekla/otverstiya-i-vyrezy/` and on any `pages` layout (e.g. the tolerances page).
 */
export function HolesCalculatorBlock({ block, ctx, section, page }: BlockProps<"holesCalculator">) {
  const anchorId = hasText(block.anchorId) ? block.anchorId : HOLES_CALCULATOR_ANCHOR;

  return (
    <BlockSection block={{ ...block, anchorId }} section={section} ctx={ctx}>
      <HolesCalculatorWidget block={block} ctx={ctx} page={page} />
    </BlockSection>
  );
}

/**
 * The calculator of a `holesCalculator` block without its section chrome: for templates that
 * place it inside their own layout (the «Как заказать» subpage article).
 */
export function HolesCalculatorWidget({
  block,
  ctx,
  page,
  className,
}: Pick<BlockProps<"holesCalculator">, "block" | "ctx" | "page"> & {
  className?: string | undefined;
}) {
  const note = fill(block.note, ctx);
  const ctaLabel = fill(block.ctaLabel, ctx);
  return (
    <HolesCalculator
      defaultThickness={toThickness(block.defaultThickness)}
      showScheme={block.showScheme !== false}
      note={note || undefined}
      ctaLabel={ctaLabel || undefined}
      quizHrefs={ctaLabel ? quizHrefsByThickness(page) : undefined}
      source={pageSlug(page?.path)}
      className={className}
    />
  );
}
