import { CtaButtons } from "@/components/blocks/cta-buttons";
import { asMedia, fill, hasText, mediaSrc } from "@/components/blocks/shared";
import type { BlockProps } from "@/components/blocks/types";
import { PageHero, PageHeroStat, PageHeroTerm } from "@/components/ig/page-hero";
import { getConditions } from "@/lib/cms/globals";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";

/** Temporary hero photo of task 05 (replaced by real media in task 38). */
export const HOME_HERO_FALLBACK_SRC = "/images/hero-glass-temp.jpg";

/** H1 placeholder when the document has none: copy is never invented. */
const MISSING_TEXT = "[…]";

/**
 * Layout tweak of `PageHero variant="home"` for this page, as a descendant selector (the
 * primitive itself is owned by task 05): below 1536 px the terms strip wraps inside the text
 * column, otherwise its last item runs over the photo at 1366 (review note of wave 2).
 */
const HERO_TWEAKS = "[&_div.text-micro]:max-xl:max-w-[560px] [&_div.text-micro]:max-md:max-w-none";

/** Terms strip from `conditions.termsBar` (or the short list), texts with placeholders. */
async function heroTerms(block: BlockProps<"hero">["block"], ctx: BlockProps<"hero">["ctx"]) {
  if (block.showTerms === false) return undefined;
  const conditions = await getConditions();
  const items =
    block.termsMode === "short" && conditions?.termsBarShort?.length
      ? conditions.termsBarShort
      : (conditions?.termsBar ?? []);
  const texts = items.map((item) => fill(item.text, ctx)).filter(Boolean);
  if (texts.length === 0) return undefined;
  return texts.map((text, index) => <PageHeroTerm key={index}>{text}</PageHeroTerm>);
}

/**
 * Block 1 — first screen: eyebrow → caps H1 (`seo.h1`) → lead → frosted stats → terms →
 * buttons. The photo is the block image or the temporary hero photo, preloaded by `PageHero`.
 */
export async function HomeHero({ block, ctx, page }: BlockProps<"hero">) {
  const title = fill(block.titleOverride, ctx) || fill(page?.title, ctx) || MISSING_TEXT;
  const lead = fill(lexicalToPlainText(block.lead), ctx);
  const eyebrow = (block.eyebrow ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  const stats = (block.stats ?? []).filter((stat) => hasText(stat.value));
  const image = asMedia(block.image);
  const src = (image ? mediaSrc(image, "hero") : null) ?? HOME_HERO_FALLBACK_SRC;
  const alt = fill(block.imageAlt, ctx) || image?.alt || "";

  return (
    <PageHero
      variant="home"
      className={HERO_TWEAKS}
      title={title}
      eyebrow={eyebrow}
      lead={lead || undefined}
      media={{ src, alt }}
      stats={
        stats.length > 0
          ? stats.map((stat, index) => (
              <PageHeroStat
                key={stat.id ?? index}
                value={fill(stat.value, ctx)}
                text={fill(stat.text, ctx)}
              />
            ))
          : undefined
      }
      terms={await heroTerms(block, ctx)}
      actions={<CtaButtons buttons={block.buttons} ctx={ctx} page={page} className="contents" />}
    />
  );
}
