import { fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { Container } from "@/components/ig/container";
import type { PlaceholderContext } from "@/lib/domain";
import { SectionLink } from "./section-link";
import { SplitIntro } from "./split-intro";

/**
 * «Что проверить до заказа» (Paper mockup `2560_zakalennoe-steklo`, frame `checklist`), stored
 * as a `steps` block: the heading, the sub paragraph and the block's link buttons as arrow links
 * on the left; the items as numbered rows («01» … «07», **title** text) in a white panel on the
 * right. Stacks ≤1100 px.
 */

export interface NumberedChecklistProps {
  block: BlockOf<"steps">;
  ctx: PlaceholderContext;
  headingId: string;
}

const twoDigits = (index: number) => String(index + 1).padStart(2, "0");

export function NumberedChecklist({ block, ctx, headingId }: NumberedChecklistProps) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;
  const links = (block.buttons ?? []).flatMap((button) => {
    const link = resolveLink(button.link);
    const label = fill(button.label, ctx);
    return link && label ? [{ key: button.id ?? label, href: link.href, label }] : [];
  });

  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={headingId}
      className="scroll-mt-24 py-16 max-md:py-12 max-sm:py-8"
      data-section="checklist"
    >
      <Container className="flex items-start gap-16 max-md:flex-col max-md:gap-8">
        <SplitIntro
          heading={fill(block.heading, ctx)}
          headingId={headingId}
          sub={fill(block.sub, ctx)}
        >
          {links.length > 0 ? (
            <ul className="m-0 flex list-none flex-col p-0 pt-1">
              {links.map((link) => (
                <li key={link.key}>
                  <SectionLink href={link.href}>{link.label}</SectionLink>
                </li>
              ))}
            </ul>
          ) : null}
        </SplitIntro>
        <ol className="bg-surface border-hairline m-0 flex w-full min-w-0 list-none flex-col rounded-xl border px-10 py-4 max-sm:rounded-lg max-sm:px-5 max-sm:py-2">
          {items.map((item, index) => {
            const text = fill(item.text, ctx);
            return (
              <li
                key={item.id ?? index}
                className="border-hairline flex gap-6 border-b py-[22px] last:border-b-0 max-sm:gap-4 max-sm:py-4"
              >
                <span
                  aria-hidden="true"
                  className="text-brand w-11 shrink-0 text-[24px] leading-[1.3] font-bold tabular-nums max-sm:w-8 max-sm:text-[20px]"
                >
                  {twoDigits(index)}
                </span>
                <span className="text-ink-3 text-[17px] leading-[1.55] max-sm:text-base">
                  <b className="text-text font-semibold">{fill(item.title, ctx)}</b>
                  {text ? ` ${text}` : null}
                </span>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
