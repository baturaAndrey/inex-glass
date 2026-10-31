import type { ReactNode } from "react";
import {
  PageHero,
  PageHeroStat,
  PageHeroTerm,
  type PageHeroVariant,
} from "@/components/ig/page-hero";
import { QuizCta } from "@/components/page/quiz-cta";
import { getConditions } from "@/lib/cms/globals";
import type { PlaceholderContext } from "@/lib/domain";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import { CtaButtons } from "./cta-buttons";
import { BlockImage, asMedia, fill, hasText, mediaSrc } from "./shared";
import type { BlockOf, BlockPageContext, BlockProps } from "./types";

const VARIANT: Record<BlockOf<"hero">["variant"], PageHeroVariant> = {
  ctHero: "ct-hero",
  p5Top: "p5-top",
  home: "home",
};

/** Copy that must not be invented: an empty H1 is visibly marked for the editor. */
const MISSING_TEXT = "[…]";

/** Terms strip from the `conditions` global (full or short list). */
async function heroTerms(mode: BlockOf<"hero">["termsMode"], ctx: PlaceholderContext) {
  const conditions = await getConditions();
  const items =
    mode === "short" && conditions?.termsBarShort?.length
      ? conditions.termsBarShort
      : (conditions?.termsBar ?? []);
  const texts = items.map((item) => fill(item.text, ctx)).filter(Boolean);
  if (texts.length === 0) return null;
  return texts.map((text, index) => <PageHeroTerm key={index}>{text}</PageHeroTerm>);
}

/**
 * Default actions when the editor set no buttons: «Рассчитать стоимость» (quiz with the page
 * pre-fill) + the secondary form from `quizPrefill.secondaryForm` (drawing by default).
 */
function DefaultActions({
  page,
  ctx,
}: {
  page: BlockPageContext | undefined;
  ctx: PlaceholderContext;
}) {
  const prefill = page?.quizPrefill;
  return (
    <QuizCta
      prefill={prefill}
      src={page?.path ?? ""}
      label={fill(prefill?.ctaLabel, ctx) || undefined}
      className="contents"
    />
  );
}

/**
 * Photo column of the catalog hero: the main image or the first photos; `null` without any, so
 * the hero drops the column instead of keeping an empty 520 px track that squeezes the H1.
 * A plain function (not a component) because the caller needs to know whether it rendered.
 */
function heroAside(block: BlockOf<"hero">): ReactNode {
  const main = asMedia(block.image);
  if (main) {
    return (
      <BlockImage
        media={main}
        alt={block.imageAlt}
        size="hero"
        sizes="(max-width: 1100px) 100vw, 520px"
        frameClassName="rounded-xl"
      />
    );
  }
  const photos = (block.photos ?? [])
    .map((photo) => ({ media: asMedia(photo.image), caption: photo.caption }))
    .filter(
      (
        photo
      ): photo is {
        media: NonNullable<ReturnType<typeof asMedia>>;
        caption: string | null | undefined;
      } => photo.media !== null
    )
    .slice(0, 2);
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3">
      {photos.map((photo, index) => (
        <figure key={index} className="m-0 flex flex-col gap-2">
          <BlockImage
            media={photo.media}
            size="card"
            sizes="(max-width: 1100px) 50vw, 260px"
            frameClassName="rounded-lg"
          />
          {hasText(photo.caption) ? (
            <figcaption className="text-small text-text-2">{photo.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

/**
 * First screen: the page's only H1 (`titleOverride` → document H1), lead, facts, buttons and the
 * terms strip from the `conditions` global. Not wrapped in a section: the hero is the page top.
 */
export async function HeroBlock({ block, ctx, page }: BlockProps<"hero">) {
  const variant = VARIANT[block.variant] ?? "ct-hero";
  const title = fill(block.titleOverride, ctx) || fill(page?.title, ctx) || MISSING_TEXT;
  const lead = fill(lexicalToPlainText(block.lead), ctx);
  const eyebrow = (block.eyebrow ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
  const terms = block.showTerms === false ? null : await heroTerms(block.termsMode, ctx);
  const hasButtons = (block.buttons ?? []).some((button) => hasText(button.label));
  const homeImage = variant === "home" ? asMedia(block.image) : null;
  const homeSrc = homeImage ? mediaSrc(homeImage, "hero") : null;
  const stats = (block.stats ?? []).filter((stat) => hasText(stat.value));

  return (
    <PageHero
      variant={variant}
      title={title}
      eyebrow={eyebrow}
      lead={lead || undefined}
      facts={fill(block.facts, ctx) || undefined}
      strong={fill(block.strong, ctx) || undefined}
      actions={
        hasButtons ? (
          <CtaButtons buttons={block.buttons} ctx={ctx} page={page} className="contents" />
        ) : (
          <DefaultActions page={page} ctx={ctx} />
        )
      }
      terms={terms ?? undefined}
      aside={variant === "ct-hero" ? (heroAside(block) ?? undefined) : undefined}
      {...(homeImage && homeSrc
        ? { media: { src: homeSrc, alt: fill(block.imageAlt, ctx) || homeImage.alt || "" } }
        : {})}
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
    >
      {hasText(block.bigNumber) ? (
        <p className="ig-stat text-primary-dark m-0 tabular-nums" aria-hidden="true">
          {fill(block.bigNumber, ctx)}&nbsp;мм
        </p>
      ) : null}
    </PageHero>
  );
}
