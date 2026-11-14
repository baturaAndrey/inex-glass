import { fill, hasText, renderIcon } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { Container } from "@/components/ig/container";
import type { PlaceholderContext } from "@/lib/domain";

/**
 * «Как мы снижаем риск ошибки» (Paper mockup `2560_zakalennoe-steklo`, frame `risk`): the
 * cards of a `cards` block as light-teal tiles with their Lucide icon (`icon` of the item),
 * title and text. The teksty titles end with a period (they lead into the text there); as
 * stand-alone card titles the period is dropped, as in the mockup.
 *
 * 5 in a row at ≥1366 px, 3 below, 2 ≤1100, 1 on phones.
 */

export interface RiskCardsProps {
  block: BlockOf<"cards">;
  ctx: PlaceholderContext;
  headingId: string;
}

const withoutPeriod = (text: string) => text.replace(/\.\s*$/u, "");

export function RiskCards({ block, ctx, headingId }: RiskCardsProps) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;
  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-section="risk"
    >
      <Container className="flex flex-col gap-8 max-sm:gap-5">
        <h2 id={headingId} className="ig-h2 m-0 text-balance">
          {fill(block.heading, ctx)}
        </h2>
        <ul
          className="m-0 grid list-none grid-cols-5 gap-4 p-0 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-3"
          data-risk-cards=""
        >
          {items.map((item, index) => {
            const text = fill(item.text, ctx);
            return (
              <li
                key={item.id ?? index}
                className="bg-primary-light flex flex-col gap-3.5 rounded-lg p-7 max-sm:p-5"
              >
                {renderIcon(item.icon, {
                  strokeWidth: 1.75,
                  className: "text-brand size-8 shrink-0",
                })}
                <h3 className="m-0 text-[18px] leading-[1.35] font-semibold text-balance">
                  {withoutPeriod(fill(item.title, ctx))}
                </h3>
                {text ? (
                  <p className="text-ink-3 m-0 text-[15px] leading-[1.55] text-pretty">{text}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
