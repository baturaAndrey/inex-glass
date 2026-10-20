import { Steps, type StepItem } from "@/components/ig/steps";
import { TextLink } from "@/components/ig/text-link";
import { CtaButtons } from "./cta-buttons";
import { BlockSection, fill, hasText, resolveLink } from "./shared";
import type { BlockProps } from "./types";

/** Vertical layout: one step per row at every width. */
const VERTICAL_COLUMNS = 1;

/** Process steps with optional per-step links, a footnote and buttons under the list. */
export function StepsBlock({ block, ctx, section, page }: BlockProps<"steps">) {
  const steps: StepItem[] = (block.items ?? []).map((item) => {
    const text = fill(item.text, ctx);
    const link = resolveLink(item.link);
    const linkLabel = fill(item.linkLabel, ctx) || link?.label;
    return {
      title: fill(item.title, ctx),
      text:
        text || (link && linkLabel) ? (
          <>
            {text}
            {link && linkLabel ? (
              <>
                {text ? " " : null}
                <TextLink href={link.href} variant="arrow">
                  {linkLabel}
                </TextLink>
              </>
            ) : null}
          </>
        ) : undefined,
    };
  });
  if (steps.length === 0) return null;
  const footnote = fill(block.footnote, ctx);

  return (
    <BlockSection block={block} section={section} ctx={ctx}>
      <Steps
        steps={steps}
        {...(block.variant === "vertical" ? { columns: VERTICAL_COLUMNS } : {})}
      />
      {hasText(footnote) ? <p className="text-small text-text-2 mt-8 mb-0">{footnote}</p> : null}
      <CtaButtons buttons={block.buttons} ctx={ctx} page={page} className="mt-8" />
    </BlockSection>
  );
}
