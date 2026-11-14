import type {
  CardsBlock,
  CompareBlock,
  CtaBlock,
  FormBlock,
  HeroBlock,
  ObjectsFeedBlock,
  Page,
  StatsBlock,
  StepsBlock,
} from "@/payload-types";
import {
  HOME_CONSTRUCTIONS,
  HOME_DESIGN,
  HOME_FORM,
  HOME_GLASS,
  HOME_HERO,
  HOME_OBJECTS,
  HOME_PATH,
  HOME_PROCESSING,
  HOME_PRODUCTION,
  HOME_SEGMENTS,
  HOME_SEO,
  HOME_SLUG,
  HOME_SOURCES,
  HOME_STEPS,
  HOME_TITLE,
  HOME_USEFUL,
  HOME_WHY,
} from "../content/home";
import { mayOverwrite, upsertByField } from "../context";
import { markdown } from "../lexical";
import { ensureSeedImage } from "../seed-media";
import type { HomeImage } from "../content/home";
import type { SeedContext } from "../context";

/**
 * Seed slice «home» (task 22): the `pages` document with `isHome: true` and its 16 blocks.
 * The home template (`src/components/home/home-page.tsx`) finds the sections by `blockType`
 * (`hero`, `form`) or by `anchorId` (the rest), so the anchors below are part of the contract.
 *
 * Update rule: the document is created when missing; an existing one is overwritten only with
 * `--force` or while it is unchanged since the seed's last write (`mayOverwrite` in
 * `../context.ts`, seed markers). An edited home page is skipped with a log line.
 * The slice never creates objects or globals; it uploads the hero and card photos once
 * (`../seed-media.ts`; a photo shared with another page reuses that page's media document).
 * `--force` rewrites the whole layout, so the card images replace whatever an earlier run or
 * `scripts/attach-generated-media.ts` attached (the generated `gen-*` placeholders).
 */

/** Anchors of the home sections — read by the template. */
export const HOME_ANCHORS = {
  why: "why",
  design: "design",
  designLevels: "design-levels",
  production: "production",
  productionStats: "production-stats",
  productionPhotos: "production-photos",
  glass: "glass",
  processing: "processing",
  constructions: "constructions",
  segments: "segments",
  steps: "steps",
  objects: "objects",
  objectsFallback: "objects-fallback",
  useful: "useful",
} as const;

type LayoutBlock = NonNullable<Page["layout"]>[number];
type CtaButton = NonNullable<HeroBlock["buttons"]>[number];
type CardItem = NonNullable<CardsBlock["items"]>[number];

const customLink = (url: string) => ({ type: "custom" as const, url });

const drawingButton = (source: string, variant: "primary" | "secondary"): CtaButton => ({
  label: HOME_HERO.drawingLabel,
  kind: "form",
  formKey: "drawing",
  formParams: { label: HOME_HERO.drawingLabel, source },
  variant,
  icon: "file-text",
});

const card = (
  item: { title: string; text?: string; url: string },
  extra: Partial<CardItem> = {}
): CardItem => ({
  title: item.title,
  ...(item.text ? { text: item.text } : {}),
  link: customLink(item.url),
  ...extra,
});

/** `image` of a card: the id of the seed photo's media document (uploaded on the first run). */
const cardImage = async (ctx: SeedContext, image: HomeImage): Promise<Partial<CardItem>> => ({
  image: await ensureSeedImage(ctx, image),
});

/** Card with the photo of the item when it has one (sequential: uploads are not parallelised). */
async function imageCard(
  ctx: SeedContext,
  item: { title: string; text?: string; url: string; image?: HomeImage },
  extra: Partial<CardItem> = {}
): Promise<CardItem> {
  return card(item, { ...extra, ...(item.image ? await cardImage(ctx, item.image) : {}) });
}

/** Maps the items one after another (each may upload a photo). */
async function mapSequential<T, R>(
  items: readonly T[],
  map: (item: T) => Promise<R>
): Promise<R[]> {
  const result: R[] = [];
  for (const item of items) result.push(await map(item));
  return result;
}

/** The 16 blocks of the home page, in display order. */
export async function buildHomeLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const hero: HeroBlock = {
    blockType: "hero",
    variant: "home",
    eyebrow: HOME_HERO.eyebrow.map((text) => ({ text })),
    lead: await markdown(ctx, HOME_HERO.lead),
    stats: HOME_HERO.stats.map((stat) => ({ ...stat })),
    showTerms: true,
    termsMode: "full",
    image: await ensureSeedImage(ctx, { ...HOME_HERO.image, alt: HOME_HERO.imageAlt }),
    imageAlt: HOME_HERO.imageAlt,
    buttons: [
      {
        label: HOME_HERO.quizLabel,
        kind: "quiz",
        variant: "primary",
        icon: "calculator",
      },
      drawingButton(HOME_SOURCES.hero, "secondary"),
    ],
  };

  const why: CompareBlock = {
    blockType: "compare",
    anchorId: HOME_ANCHORS.why,
    background: "auto",
    heading: HOME_WHY.heading,
    sub: HOME_WHY.sub,
    topicTitle: HOME_WHY.topicTitle,
    leftTitle: HOME_WHY.leftTitle,
    rightTitle: HOME_WHY.rightTitle,
    rows: HOME_WHY.rows.map((row) => ({ ...row })),
    footLink: { ...customLink(HOME_WHY.footLink.url), label: HOME_WHY.footLink.label },
  };

  const designBody = [
    HOME_DESIGN.lead,
    HOME_DESIGN.checklist.map((item) => `- ${item}`).join("\n"),
  ].join("\n\n");

  const design: CtaBlock = {
    blockType: "cta",
    anchorId: HOME_ANCHORS.design,
    background: "bg",
    variant: "buttons",
    tone: "light",
    heading: HOME_DESIGN.eyebrow,
    title: HOME_DESIGN.heading,
    body: await markdown(ctx, designBody),
    buttons: [
      {
        label: HOME_DESIGN.moreLabel,
        kind: "link",
        variant: "primary",
        icon: "arrow-right",
        link: customLink(HOME_DESIGN.moreUrl),
      },
      {
        label: HOME_DESIGN.taskLabel,
        kind: "form",
        formKey: "drawing",
        formParams: { label: HOME_DESIGN.taskLabel, source: HOME_SOURCES.design },
        variant: "ghost",
      },
    ],
  };

  // The template shows the image of the first level card only (`design.tsx`).
  const designImage = await cardImage(ctx, HOME_DESIGN.image);
  const designLevels: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.designLevels,
    background: "bg",
    layout: "g3",
    items: HOME_DESIGN.levels.map((level, index) => ({
      title: level.title,
      text: level.text,
      priceHint: level.bottom,
      tone: level.dark ? "accent" : "default",
      ...(index === 0 ? designImage : {}),
    })),
  };

  const production: CtaBlock = {
    blockType: "cta",
    anchorId: HOME_ANCHORS.production,
    background: "primaryDark",
    variant: "buttons",
    tone: "primaryDark",
    heading: HOME_PRODUCTION.eyebrow,
    title: HOME_PRODUCTION.heading,
    body: await markdown(ctx, HOME_PRODUCTION.lead),
    buttons: [
      {
        label: HOME_PRODUCTION.moreLabel,
        kind: "link",
        variant: "secondary",
        icon: "arrow-right",
        link: customLink(HOME_PRODUCTION.moreUrl),
      },
    ],
  };

  const productionStats: StatsBlock = {
    blockType: "stats",
    anchorId: HOME_ANCHORS.productionStats,
    background: "primaryDark",
    variant: "plain",
    items: HOME_PRODUCTION.stats.map((stat) => ({ ...stat })),
  };

  const productionPhotos: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.productionPhotos,
    background: "primaryDark",
    layout: "g4",
    items: await mapSequential(HOME_PRODUCTION.photos, async (photo) => ({
      title: photo.title,
      ...(await cardImage(ctx, photo.image)),
    })),
  };

  const glass: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.glass,
    background: "bg",
    layout: "g4",
    heading: HOME_GLASS.heading,
    // No `sub`: the price footnote comes from the `prices.caption` global (see HomeGlassCards).
    sub: null,
    items: await mapSequential(HOME_GLASS.items, (item) =>
      imageCard(ctx, item, "priceHint" in item ? { priceHint: item.priceHint } : {})
    ),
  };

  const processing: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.processing,
    background: "sf",
    layout: "g4",
    heading: HOME_PROCESSING.heading,
    sub: HOME_PROCESSING.sub,
    items: [
      ...HOME_PROCESSING.tiles.map((tile) => card(tile)),
      card(HOME_PROCESSING.accent, { tone: "accent" }),
    ],
  };

  const constructions: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.constructions,
    background: "bg",
    layout: "g3",
    heading: HOME_CONSTRUCTIONS.heading,
    sub: HOME_CONSTRUCTIONS.sub,
    items: await mapSequential(HOME_CONSTRUCTIONS.items, (item) => imageCard(ctx, item)),
  };

  const segments: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.segments,
    background: "sf",
    layout: "seg",
    heading: HOME_SEGMENTS.heading,
    items: HOME_SEGMENTS.items.map((item) => card(item, { icon: item.icon })),
  };

  const steps: StepsBlock = {
    blockType: "steps",
    anchorId: HOME_ANCHORS.steps,
    background: "bg",
    variant: "horizontal",
    heading: HOME_STEPS.heading,
    items: HOME_STEPS.items.map((item) => ({ ...item })),
    footnote: HOME_STEPS.footnote,
    buttons: [drawingButton(HOME_SOURCES.steps, "primary")],
  };

  const objects: ObjectsFeedBlock = {
    blockType: "objectsFeed",
    anchorId: HOME_ANCHORS.objects,
    background: "sf",
    heading: HOME_OBJECTS.heading,
    sub: HOME_OBJECTS.sub,
    mode: "featured",
    limit: HOME_OBJECTS.limit,
    showAllLink: true,
    allLinkLabel: HOME_OBJECTS.allLinkLabel,
  };

  const objectsFallback: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.objectsFallback,
    background: "sf",
    layout: "g4",
    items: HOME_OBJECTS.fallback.map((title) => ({ title })),
  };

  const useful: CardsBlock = {
    blockType: "cards",
    anchorId: HOME_ANCHORS.useful,
    background: "bg",
    layout: "g4",
    heading: HOME_USEFUL.heading,
    items: await mapSequential(HOME_USEFUL.items, (item) => imageCard(ctx, item)),
  };

  const form: FormBlock = {
    blockType: "form",
    formKey: "full",
    variant: "page",
    heading: HOME_FORM.heading,
    bullets: HOME_FORM.bullets.map((text) => ({ text })),
    showContacts: true,
    submitLabel: HOME_FORM.submitLabel,
  };

  return [
    hero,
    why,
    design,
    designLevels,
    production,
    productionStats,
    productionPhotos,
    glass,
    processing,
    constructions,
    segments,
    steps,
    objects,
    objectsFallback,
    useful,
    form,
  ];
}

export async function seed(ctx: SeedContext): Promise<void> {
  const overwrite = await mayOverwrite(ctx, "pages", { isHome: { equals: true } }, HOME_PATH);
  if (!overwrite) return;

  await upsertByField(
    ctx,
    "pages",
    { isHome: { equals: true } },
    {
      title: HOME_TITLE,
      slug: HOME_SLUG,
      template: "home",
      isHome: true,
      _status: "published",
      seo: { ...HOME_SEO },
      quizPrefill: { type: "tempered" },
      hideConditions: true,
      hideQuizCta: true,
      layout: await buildHomeLayout(ctx),
    },
    { overwrite, label: HOME_PATH }
  );
}
