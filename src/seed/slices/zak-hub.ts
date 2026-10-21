import type {
  CardsBlock,
  CtaBlock,
  FaqBlock,
  FormBlock,
  HeroBlock,
  ObjectsFeedBlock,
  Page,
  PricesTableBlock,
  RichTextBlock,
  StepsBlock,
  TableBlock,
} from "@/payload-types";
import {
  HUB_ANCHORS,
  HUB_FORM_SOURCE_LABEL,
  HUB_PATH,
  HUB_SOURCE,
  ZAK_HUB,
} from "../content/zak-hub";
import { upsertByPath } from "../context";
import { markdown } from "../lexical";
import { mayOverwrite } from "./thicknesses";
import type { HubCard, HubLink } from "../content/zak-hub";
import type { SeedContext } from "../context";

/**
 * Seed slice «zak-hub» (task 23): the hub `/zakalennoe-steklo/` (`pages`, `template: 'hub'`) with
 * its 12 sections and the companion blocks read by them (`weights-cta`, `vidy-bridge`,
 * `sroki-cta`). `HubPage` (`src/components/zak-hub/hub-page.tsx`) picks the section components
 * by `blockType` + `anchorId` (`HUB_ANCHORS`), so the anchors are part of the contract.
 *
 * Every section has an explicit background (the prototype rhythm `bg` ↔ `sf`); the objects feed
 * shares the background of «Для кого» (the prototype pairs them: «Для кого + 3–4 объекта»), so
 * the rhythm holds whether or not published objects exist.
 *
 * Update rule: created when missing; an existing document is overwritten with `--force` or while
 * it is still untouched (the mini-seed stub); an edited hub is skipped with a log line.
 */

type LayoutBlock = NonNullable<Page["layout"]>[number];
type CtaButton = NonNullable<HeroBlock["buttons"]>[number];
type CardItem = NonNullable<CardsBlock["items"]>[number];

const customLink = (url: string) => ({ type: "custom" as const, url });

const linkButton = (link: HubLink, variant: "primary" | "secondary" = "secondary"): CtaButton => ({
  label: link.label,
  kind: "link",
  variant,
  link: customLink(link.url),
});

const formParams = (label: string) => ({ label, source: HUB_SOURCE });

const cards = (items: readonly HubCard[]): CardItem[] =>
  items.map((item) => ({
    title: item.title,
    text: item.text,
    ...(item.url ? { link: customLink(item.url) } : {}),
  }));

const cardsBlock = (
  heading: string,
  anchorId: string,
  background: "bg" | "sf",
  items: readonly HubCard[]
): CardsBlock => ({
  blockType: "cards",
  heading,
  anchorId,
  background,
  layout: "ctCards",
  items: cards(items),
});

async function buildLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const { hero, prices, checklist, risk, weights, kinds, processing, timing, audiences, faq } =
    ZAK_HUB;

  const heroBlock: HeroBlock = {
    blockType: "hero",
    variant: "ctHero",
    facts: hero.facts,
    strong: hero.strong,
    showTerms: true,
    termsMode: "full",
    buttons: [
      { label: hero.quizLabel, kind: "quiz", variant: "primary", icon: "calculator" },
      {
        label: hero.drawingLabel,
        kind: "form",
        formKey: "drawing",
        formParams: formParams(hero.drawingLabel),
        variant: "secondary",
        icon: "file-text",
      },
    ],
  };

  const pricesBlock: PricesTableBlock = {
    blockType: "pricesTable",
    heading: prices.heading,
    // The caption above the table (teksty/02 wording, placeholders filled at render time).
    sub: prices.caption,
    anchorId: HUB_ANCHORS.prices,
    background: "sf",
    variant: "table",
    showIncluded: true,
    showCaption: true,
    showPromo: true,
    showWeight: true,
    calloutFromConditions: true,
  };

  const checklistBlock: StepsBlock = {
    blockType: "steps",
    heading: checklist.heading,
    sub: checklist.sub,
    anchorId: HUB_ANCHORS.checklist,
    background: "bg",
    variant: "vertical",
    items: checklist.items.map((item) => ({ title: item.title, text: item.text })),
    buttons: checklist.links.map((link) => linkButton(link)),
  };

  const weightsBlock: TableBlock = {
    blockType: "table",
    heading: weights.heading,
    sub: weights.sub,
    anchorId: HUB_ANCHORS.weights,
    background: "bg",
    // Column labels and footnote only: the weights come from the domain library at render.
    table: {
      role: "parameters",
      mobileMode: "cards",
      columns: weights.columns.map((label, index) => ({ label, numeric: index > 0 })),
      footnote: weights.footnote,
    },
  };

  const weightsCta: CtaBlock = {
    blockType: "cta",
    anchorId: HUB_ANCHORS.weightsCta,
    variant: "buttons",
    tone: "light",
    buttons: [
      {
        label: weights.loadLabel,
        kind: "form",
        formKey: "load",
        formParams: formParams(weights.loadLabel),
        variant: "primary",
      },
      linkButton(weights.calculator),
    ],
  };

  const kindsBridge: RichTextBlock = {
    blockType: "richText",
    anchorId: HUB_ANCHORS.kindsBridge,
    content: await markdown(ctx, kinds.bridge),
    width: "normal",
  };

  const timingBlock: RichTextBlock = {
    blockType: "richText",
    heading: timing.heading,
    anchorId: HUB_ANCHORS.timing,
    background: "sf",
    content: await markdown(ctx, timing.markdown),
    width: "normal",
  };

  const timingCta: CtaBlock = {
    blockType: "cta",
    anchorId: HUB_ANCHORS.timingCta,
    variant: "buttons",
    tone: "light",
    buttons: timing.links.map((link) => linkButton(link)),
  };

  const objectsBlock: ObjectsFeedBlock = {
    blockType: "objectsFeed",
    anchorId: HUB_ANCHORS.objects,
    background: "bg",
    mode: "featured",
    limit: 4,
    showAllLink: true,
  };

  const faqItems: NonNullable<FaqBlock["items"]> = [];
  for (const [question, answer] of faq.items) {
    faqItems.push({ question, answer: await markdown(ctx, answer) });
  }
  const faqBlock: FaqBlock = {
    blockType: "faq",
    heading: faq.heading,
    anchorId: HUB_ANCHORS.faq,
    background: "sf",
    mode: "inline",
    items: faqItems,
  };

  const formBlock: FormBlock = {
    blockType: "form",
    anchorId: HUB_ANCHORS.form,
    formKey: "full",
    variant: "page",
    // Place id for analytics / CRM filters + a readable caption for the manager.
    params: { source: HUB_SOURCE },
    sourceLabel: HUB_FORM_SOURCE_LABEL,
  };

  return [
    heroBlock,
    pricesBlock,
    checklistBlock,
    cardsBlock(risk.heading, HUB_ANCHORS.risk, "sf", risk.items),
    weightsBlock,
    weightsCta,
    cardsBlock(kinds.heading, HUB_ANCHORS.kinds, "sf", kinds.items),
    kindsBridge,
    cardsBlock(processing.heading, HUB_ANCHORS.processing, "bg", processing.items),
    timingBlock,
    timingCta,
    cardsBlock(audiences.heading, HUB_ANCHORS.audiences, "bg", audiences.items),
    objectsBlock,
    faqBlock,
    formBlock,
  ];
}

export async function seed(ctx: SeedContext): Promise<void> {
  const where = { path: { equals: HUB_PATH } };
  if (!(await mayOverwrite(ctx, "pages", where, HUB_PATH))) return;

  await upsertByPath(
    ctx,
    "pages",
    HUB_PATH,
    {
      title: ZAK_HUB.title,
      slug: ZAK_HUB.slug,
      template: "hub",
      _status: "published",
      quizPrefill: { type: "tempered" },
      seo: { ...ZAK_HUB.seo },
      layout: await buildLayout(ctx),
    },
    { overwrite: true }
  );
}
