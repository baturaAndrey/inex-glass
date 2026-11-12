import { Check } from "lucide-react";
import { CtaButtons } from "@/components/blocks/cta-buttons";
import { BlockImage, asMedia, fill, hasText } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, BlockSectionInfo } from "@/components/blocks/types";
import { Placeholder } from "@/components/ig/placeholder";
import { Section } from "@/components/ig/section";
import { splitFirstList } from "@/components/rich-text/lexical-parts";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/** Label of a level card, numbered by position («Уровень 1», «Уровень 2»): mockup microcopy. */
const LEVEL_LABEL = "Уровень";
/** Caption of the illustration placeholder until an image is uploaded (mockup). */
const MEDIA_PLACEHOLDER = "3D-модель узла / фрагмент чертежа";

const EYEBROW = "text-[13px] leading-4 font-semibold tracking-[0.08em] uppercase m-0";

export interface HomeDesignProps {
  /** `cta` block (anchor `design`): `heading` = eyebrow, `title` = H2, `body` = lead + checklist. */
  block: BlockOf<"cta">;
  section: BlockSectionInfo;
  /**
   * `cards` block (anchor `design-levels`): the level cards (`title`, `text`, `priceHint` = the
   * bottom line of deliverables, `tone: accent` = dark card). The image of the first card, when
   * uploaded, replaces the illustration placeholder above the cards.
   */
  levels?: BlockOf<"cards"> | undefined;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}

/**
 * Home block «Проектирование» (Paper `2560_home`, frame `design`, 2026-11-12): text column
 * (eyebrow, H2, lead, checklist, buttons) on the left, the illustration and two level cards on
 * the right. Stacks ≤1100 px.
 */
export function HomeDesign({ block, section, levels, ctx, page }: HomeDesignProps) {
  const eyebrow = fill(block.heading, ctx);
  const title = fill(block.title, ctx);
  const { before, items, after } = splitFirstList(block.body);
  const cards = (levels?.items ?? []).filter((item) => hasText(item.title));
  const media = asMedia(cards[0]?.image);

  return (
    <Section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={title ? section.headingId : undefined}
      className="scroll-mt-24"
      containerClassName="grid grid-cols-[460px_minmax(0,1fr)] items-start gap-16 xl:grid-cols-[560px_minmax(0,1fr)] xl:gap-20 max-lg:grid-cols-[400px_minmax(0,1fr)] max-lg:gap-12 max-md:grid-cols-1 max-md:gap-10"
      data-testid="home-design"
    >
      <div className="flex flex-col gap-6 max-sm:gap-5">
        {eyebrow ? <p className={cn(EYEBROW, "text-primary-pressed")}>{eyebrow}</p> : null}
        {title ? (
          <h2 id={section.headingId} className="ig-h2 text-text m-0 max-w-[460px] text-balance">
            {title}
          </h2>
        ) : null}
        {before ? (
          <div className="text-text-2 text-[17px] leading-[1.55] [&_p]:m-0">
            <RichText data={before} ctx={ctx} disableContainer />
          </div>
        ) : null}
        {items.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-3.5 py-2 pl-0">
            {items.map((item, index) => (
              <li key={index} className="text-text flex items-start gap-3 text-[17px] leading-6">
                <Check
                  aria-hidden="true"
                  className="text-brand mt-px size-[22px] flex-none"
                  strokeWidth={2.2}
                />
                <div className="[&_p]:m-0">
                  <RichText data={item} ctx={ctx} disableContainer />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {after ? (
          <div className="text-text-2 text-base [&_p]:m-0">
            <RichText data={after} ctx={ctx} disableContainer />
          </div>
        ) : null}
        <CtaButtons
          buttons={block.buttons}
          ctx={ctx}
          page={page}
          size="m"
          className="[&_.ig-btn--ghost]:text-primary-pressed items-center gap-x-2 pt-2 xl:flex-nowrap"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-6 max-sm:gap-4">
        {media ? (
          <BlockImage
            media={media}
            sizes="(max-width: 1100px) 100vw, 60vw"
            frameClassName="aspect-auto h-[360px] rounded-lg max-md:h-auto max-md:aspect-[16/9]"
          />
        ) : (
          <Placeholder
            ratio="16/9"
            label={MEDIA_PLACEHOLDER}
            className="aspect-auto h-[360px] rounded-lg max-md:aspect-[16/9] max-md:h-auto"
          />
        )}
        {cards.length > 0 ? (
          <ul className="m-0 grid list-none grid-cols-2 gap-6 p-0 max-sm:grid-cols-1 max-sm:gap-4">
            {cards.map((item, index) => {
              const dark = item.tone === "accent";
              return (
                <li
                  key={item.id ?? index}
                  className={cn(
                    "flex flex-col gap-3.5 rounded-lg p-8 max-sm:p-6",
                    dark ? "bg-primary-dark text-on-navy" : "bg-surface text-text"
                  )}
                >
                  <p className={cn(EYEBROW, dark ? "text-line-teal" : "text-text-2")}>
                    {`${LEVEL_LABEL} ${index + 1}`}
                  </p>
                  <h3 className="ig-h4 m-0 max-xl:text-xl max-xl:leading-[1.3]">
                    {fill(item.title, ctx)}
                  </h3>
                  {hasText(item.text) ? (
                    <p
                      className={cn(
                        "m-0 text-[15px] leading-normal",
                        dark ? "text-on-navy-2" : "text-text-2"
                      )}
                    >
                      {fill(item.text, ctx)}
                    </p>
                  ) : null}
                  {hasText(item.priceHint) ? (
                    <p className="m-0 pt-1.5 text-[15px] leading-normal font-medium">
                      {fill(item.priceHint, ctx)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Section>
  );
}
