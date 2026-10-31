import { fill, hasText, resolveLink } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { Compare } from "@/components/ig/compare";
import { Container } from "@/components/ig/container";
import { TextLink } from "@/components/ig/text-link";

/**
 * «Glass» background of the section (`.why` of `Home.dc.html`). The table itself sits on a white
 * .95 panel without `backdrop-filter`: frosted glass is reserved for the hero stats.
 */
const WHY_BACKGROUND =
  "bg-[radial-gradient(55%_70%_at_62%_38%,rgba(232,242,239,.95)_0%,rgba(232,242,239,0)_70%),radial-gradient(40%_60%_at_12%_85%,rgba(210,230,225,.7)_0%,rgba(210,230,225,0)_70%),linear-gradient(135deg,#5A968E_0%,#A9CBC5_42%,#C9DEDA_58%,#6FA39B_100%)]";

/**
 * Block 2 — «Почему через нас, а не напрямую с завода»: 8-row comparison (topic / by yourself /
 * through Inex Glass); ≤760 px every row becomes a «Сами → Через Inex Glass» card.
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
      className={`${WHY_BACKGROUND} scroll-mt-24 py-24 max-md:py-[72px] max-sm:py-12`}
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
