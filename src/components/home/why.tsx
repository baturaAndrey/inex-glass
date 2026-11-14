import { fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { Compare } from "@/components/ig/compare";
import { Container } from "@/components/ig/container";
import { TextLink } from "@/components/ig/text-link";

/**
 * Block 2 — «Почему через нас, а не напрямую с завода»: row comparison (topic / by yourself /
 * through Inex Glass); ≤760 px every row becomes a «Сами → Через Inex Glass» card. Sits on the
 * page background like every section (the former teal «glass» gradient was dropped in the
 * revised mockup); the table keeps its own white panel.
 */
export function HomeWhy({ block, ctx, section }: BlockProps<"compare">) {
  const heading = fill(block.heading, ctx);
  const sub = fill(block.sub, ctx);
  const rows = (block.rows ?? []).map((row) => ({
    topic: fill(row.topic, ctx),
    self: fill(row.left, ctx),
    inex: fill(row.right, ctx),
  }));
  const footLink = resolveLink(block.footLink);
  const footLabel = footLink?.label ? fill(footLink.label, ctx) : "";

  return (
    <section
      id={hasText(block.anchorId) ? block.anchorId : undefined}
      aria-labelledby={heading ? section.headingId : undefined}
      className="scroll-mt-24 py-24 max-md:py-[72px] max-sm:py-12"
    >
      <Container className="flex flex-col gap-10 max-[761px]:gap-6">
        {heading || sub ? (
          <div className="flex flex-wrap items-end justify-between gap-x-16 gap-y-6">
            {heading ? (
              <h2
                id={section.headingId}
                className="ig-h2 text-primary-dark m-0 max-w-[760px] text-balance"
              >
                {heading}
              </h2>
            ) : null}
            {sub ? (
              <p className="m-0 max-w-[560px] text-lg leading-normal text-[#1F2A2E] max-[761px]:text-base">
                {sub}
              </p>
            ) : null}
          </div>
        ) : null}
        {rows.length > 0 ? (
          <Compare
            rows={rows}
            topicTitle={fill(block.topicTitle, ctx) || undefined}
            selfTitle={fill(block.leftTitle, ctx) || undefined}
            inexTitle={fill(block.rightTitle, ctx) || undefined}
          />
        ) : null}
        {footLink && footLabel ? (
          <div>
            <TextLink
              href={footLink.href}
              variant="arrow"
              className="text-primary-dark hover:text-primary-pressed font-semibold"
            >
              {footLabel}
            </TextLink>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
