import { CtaButtons } from "@/components/blocks/cta-buttons";
import { BlockImage, asMedia, fill, hasText } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, BlockSectionInfo } from "@/components/blocks/types";
import { Section } from "@/components/ig/section";
import { RichText } from "@/components/rich-text/rich-text";
import type { PlaceholderContext } from "@/lib/domain";
import { cn } from "@/lib/utils";

/** Caption of a photo slot until the workshop photo is uploaded (mockup). */
const PHOTO_PLACEHOLDER = "Фото цеха";

const EYEBROW = "text-[13px] leading-4 font-semibold tracking-[0.08em] uppercase m-0";

/** A value without digits («ОТК») is a word, not a number: shown in the accent tone. */
const isWordValue = (value: string) => !/\d/.test(value);

export interface HomeProductionProps {
  /**
   * `cta` block (anchor `production`, `tone: primaryDark`): `heading` = eyebrow, `title` = H2,
   * `body` = lead, `buttons` = the white button on the right.
   */
  block: BlockOf<"cta">;
  section: BlockSectionInfo;
  /** `stats` block (anchor `production-stats`): the figures row. */
  stats?: BlockOf<"stats"> | undefined;
  /** `cards` block (anchor `production-photos`): photo cards (`title`, optional `image`). */
  photos?: BlockOf<"cards"> | undefined;
  ctx: PlaceholderContext;
  page: BlockPageContext;
}

/**
 * Home block «Производство» (Paper `2560_home`, frame `production`, 2026-11-12): a deep-teal
 * accent block within the 1920 frame — eyebrow, H2, lead and the button; a row of four figures
 * split by hairlines; four workshop photo cards (placeholders until photos are uploaded).
 * Figures go 2×2 and photos two per row ≤1100 px.
 */
export function HomeProduction({ block, section, stats, photos, ctx, page }: HomeProductionProps) {
  const eyebrow = fill(block.heading, ctx);
  const title = fill(block.title, ctx);
  const figures = (stats?.items ?? []).filter((item) => hasText(item.value));
  const cards = (photos?.items ?? []).filter((item) => hasText(item.title));

  return (
    <Section
      variant="primary-dark"
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={title ? section.headingId : undefined}
      className="scroll-mt-24"
      containerClassName="flex flex-col gap-14 max-md:gap-10 max-sm:gap-8"
      data-testid="home-production"
    >
      <div className="flex items-end justify-between gap-20 max-md:flex-col max-md:items-start max-md:gap-8">
        <div className="flex max-w-[760px] flex-col gap-6 max-sm:gap-4">
          {eyebrow ? <p className={cn(EYEBROW, "text-line-teal")}>{eyebrow}</p> : null}
          {title ? (
            <h2 id={section.headingId} className="ig-h2 text-on-navy m-0 text-balance">
              {title}
            </h2>
          ) : null}
          {block.body ? (
            <div className="text-on-navy-2 text-[17px] leading-[1.55] [&_p]:m-0">
              <RichText data={block.body} ctx={ctx} disableContainer />
            </div>
          ) : null}
        </div>
        <CtaButtons
          buttons={block.buttons}
          ctx={ctx}
          page={page}
          className="[&_.ig-btn--secondary]:border-surface [&_.ig-btn--secondary]:text-primary-dark shrink-0 max-sm:w-full"
        />
      </div>

      {figures.length > 0 ? (
        <dl className="m-0 grid grid-cols-4 border-t border-white/15 max-md:grid-cols-2 max-md:gap-y-8">
          {figures.map((item, index) => (
            <div
              key={item.id ?? index}
              className={cn(
                "flex flex-col-reverse justify-end gap-2.5 px-8 pt-8 first:pl-0 last:pr-0",
                "border-white/15 not-first:border-l",
                "max-md:px-6 max-md:odd:border-l-0 max-md:odd:pl-0 max-md:even:pr-0 max-sm:px-4 max-sm:pt-6"
              )}
            >
              <dt className="text-on-navy-2 text-[15px] leading-normal max-sm:text-sm">
                {fill(item.text, ctx)}
              </dt>
              <dd
                className={cn(
                  "text-stat m-0 font-bold tracking-[-0.02em] whitespace-nowrap tabular-nums max-lg:text-[40px] max-md:text-[48px] max-sm:text-[26px] lg:text-[56px]",
                  isWordValue(item.value) ? "text-line-teal" : "text-on-navy"
                )}
              >
                {fill(item.value, ctx)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {cards.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-4 gap-6 p-0 max-md:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-5">
          {cards.map((item, index) => {
            const media = asMedia(item.image);
            return (
              <li key={item.id ?? index} className="flex flex-col gap-4 max-sm:gap-2.5">
                {media ? (
                  <BlockImage
                    media={media}
                    size="card"
                    sizes="(max-width: 1100px) 50vw, 25vw"
                    frameClassName="aspect-[427/300] rounded-lg"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="text-on-navy-2 grid aspect-[427/300] place-items-center rounded-lg bg-white/5 text-xs leading-4 font-medium tracking-[0.06em] uppercase"
                  >
                    {PHOTO_PLACEHOLDER}
                  </div>
                )}
                <h3 className="text-on-navy m-0 text-lg leading-[1.3] font-semibold max-sm:text-[15px]">
                  {fill(item.title, ctx)}
                </h3>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}
