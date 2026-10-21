import Link from "next/link";
import { fill, hasText, isExternalHref, resolveLink } from "@/components/blocks/shared";
import type { BlockOf, BlockSectionInfo } from "@/components/blocks/types";
import { Button } from "@/components/ig/button";
import type { PlaceholderContext } from "@/lib/domain";
import { CtSection } from "./ct-cards-section";

/**
 * «Что проверить до заказа» (`.ct-ol` of `ZakHub.dc.html`), stored as a `steps` block: the sub
 * paragraph, numbered cards «**title** text» in two columns (one ≤1100; number circle 44 → 36 px)
 * and the block's link buttons as small secondary buttons.
 */

export interface NumberedChecklistProps {
  block: BlockOf<"steps">;
  ctx: PlaceholderContext;
  section: BlockSectionInfo;
}

export function NumberedChecklist({ block, ctx, section }: NumberedChecklistProps) {
  const items = (block.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;
  const links = (block.buttons ?? [])
    .map((button) => ({ button, link: resolveLink(button.link) }))
    .filter(({ button, link }) => hasText(button.label) && link !== null);

  return (
    <CtSection
      variant={section.variant}
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      heading={fill(block.heading, ctx) || undefined}
      headingId={section.headingId}
      lead={fill(block.sub, ctx) || undefined}
    >
      <ol className="m-0 grid list-none grid-cols-2 gap-x-8 gap-y-4 p-0 max-md:grid-cols-1">
        {items.map((item, index) => {
          const text = fill(item.text, ctx);
          return (
            <li
              key={item.id ?? index}
              className="bg-surface shadow-card grid grid-cols-[44px_1fr] items-start gap-3.5 rounded-lg p-5 text-base leading-[1.55] max-md:grid-cols-[36px_1fr] max-md:p-4"
            >
              <span
                aria-hidden="true"
                className="bg-primary-light text-primary-dark grid size-11 place-items-center rounded-full text-lg leading-none font-bold max-md:size-9 max-md:text-[15px]"
              >
                {index + 1}
              </span>
              <span>
                <b>{fill(item.title, ctx)}</b>
                {text ? ` ${text}` : null}
              </span>
            </li>
          );
        })}
      </ol>

      {links.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2.5 max-sm:flex-col max-sm:[&_.ig-btn]:w-full">
          {links.map(({ button, link }, index) => {
            const href = link?.href ?? "";
            const label = fill(button.label, ctx);
            return (
              <Button key={button.id ?? index} asChild variant="secondary" size="s">
                {isExternalHref(href) ? (
                  <a href={href} rel="noopener noreferrer">
                    {label}
                  </a>
                ) : (
                  <Link href={href}>{label}</Link>
                )}
              </Button>
            );
          })}
        </div>
      ) : null}
    </CtSection>
  );
}
