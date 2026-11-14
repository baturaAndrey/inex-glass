import { CtaButtons } from "@/components/blocks/cta-buttons";
import { BlockSection, fill } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { Steps } from "@/components/ig/steps";

/**
 * Block 7 — «Как заказать»: white panel with the 6 steps (6 / 3 / 1 columns), the footnote and
 * the «Отправить чертёж» button under a divider (button full width on phones).
 */
export function HomeOrderSteps({ block, ctx, section, page }: BlockProps<"steps">) {
  const steps = (block.items ?? []).map((item) => ({
    title: fill(item.title, ctx),
    text: fill(item.text, ctx) || undefined,
  }));
  if (steps.length === 0) return null;
  const footnote = fill(block.footnote, ctx);
  const hasButtons = (block.buttons ?? []).length > 0;

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <div className="bg-surface flex flex-col gap-8 rounded-xl p-9 shadow-[0_2px_8px_rgba(28,31,34,.06)] max-sm:gap-6 max-sm:p-5">
        <Steps steps={steps} columns={6} />
        {footnote || hasButtons ? (
          <div className="border-hairline flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t pt-7 max-sm:flex-col max-sm:items-stretch">
            {footnote ? <p className="ig-body m-0 font-medium">{footnote}</p> : null}
            <CtaButtons buttons={block.buttons} ctx={ctx} page={page} size="m" />
          </div>
        ) : null}
      </div>
    </BlockSection>
  );
}
