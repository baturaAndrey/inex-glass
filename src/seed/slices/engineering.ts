import type {
  CalloutBlock,
  CardsBlock,
  CompareBlock,
  CtaBlock,
  FormBlock,
  HeroBlock,
  Page,
  StepsBlock,
  TableBlock,
} from "@/payload-types";
import {
  DESIGN,
  ENGINEERING_ANCHORS as A,
  OBJECTS_PATH,
  PRODUCTION,
  type EngineeringPageEntry,
  type FactColumn,
  type FeatureCard,
  type StepEntry,
} from "../content/engineering";
import { upsertByPath } from "../context";
import { markdown, paragraphs } from "../lexical";
import type { SeedContext } from "../context";

/**
 * Seed slice «engineering»: `/proektirovanie/` and `/proizvodstvo/` (Paper mockups
 * `2560_proektirovanie` / `2560_proizvodstvo`, 2026-11-12). Copy lives in
 * `../content/engineering.ts`. Both are fixed-path routes (`(site)/_fixed/<path>/page.tsx`) that
 * place the blocks of the document by `anchorId` (`ENGINEERING_ANCHORS`):
 *
 * - `hero` — H1 (from SEO), lead, buttons; the photo slot shows a placeholder until `image`;
 * - `table#facts` — the facts strip (column labels; row 1 values, row 2 notes);
 * - `cards`, `compare`, `steps`, `table`, `cta`, `callout` — the sections of the mockup;
 * - `form` — the drawing-form panel in the cream block (heading, sub, `bullets[0]` = the note).
 *
 * Card text (`what`, `workshop`): the first lines are the description, lines starting with
 * `- ` are bullets (`**bold**` allowed). Photos are not seeded: editors upload them into `image`.
 *
 * `/proektirovanie/` used to be a «Как заказать» subpage (slice `how-to-order`); this slice owns
 * it now and overwrites it by path (template stays `service`, unused by the fixed route).
 */

type HeroButton = NonNullable<HeroBlock["buttons"]>[number];
type LayoutBlock = NonNullable<Page["layout"]>[number];
type PageData = Omit<Page, "id" | "createdAt" | "updatedAt" | "path" | "layout"> & {
  layout: LayoutBlock[];
};

const customLink = (url: string, label?: string) => ({
  type: "custom" as const,
  url,
  ...(label ? { label } : {}),
});

const quizButton = (variant: "primary" | "secondary" = "primary"): HeroButton => ({
  label: "Рассчитать стоимость",
  kind: "quiz",
  variant,
  icon: "calculator",
});

const formButton = (
  label: string,
  source: string,
  variant: "primary" | "secondary"
): HeroButton => ({
  label,
  kind: "form",
  formKey: "drawing",
  variant,
  icon: "file-text",
  formParams: { label, source, submitLabel: label },
});

const hero = (lead: readonly string[], buttons: HeroButton[]): HeroBlock => ({
  blockType: "hero",
  variant: "ctHero",
  lead: paragraphs(...lead),
  buttons,
  showTerms: false,
  termsMode: "full",
});

/** Facts strip: labels as columns, values in row 1, notes (if any) in row 2. */
const facts = (columns: readonly FactColumn[]): TableBlock => {
  const notes = columns.map((column) => column.note ?? "");
  return {
    blockType: "table",
    anchorId: A.facts,
    table: {
      role: "other",
      mobileMode: "cards",
      columns: columns.map((column) => ({ label: column.label })),
      rows: [
        { cells: columns.map((column) => ({ value: column.value })) },
        ...(notes.some(Boolean) ? [{ cells: notes.map((value) => ({ value })) }] : []),
      ],
    },
  };
};

const table = (
  anchorId: string,
  heading: string,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
  footnote?: string
): TableBlock => ({
  blockType: "table",
  anchorId,
  heading,
  table: {
    role: "other",
    mobileMode: "cards",
    columns: columns.map((label) => ({ label })),
    rows: rows.map((cells) => ({ cells: cells.map((value) => ({ value })) })),
    ...(footnote ? { footnote } : {}),
  },
});

/** Card text: description lines, then `- ` bullets. */
const cardText = (card: FeatureCard) =>
  [card.text, ...card.bullets.map((bullet) => `- ${bullet}`)].filter(Boolean).join("\n");

const featureCards = (
  anchorId: string,
  heading: string,
  items: readonly FeatureCard[],
  sub?: string
): CardsBlock => ({
  blockType: "cards",
  anchorId,
  heading,
  ...(sub ? { sub } : {}),
  layout: "g3",
  items: items.map((item) => ({
    title: item.title,
    text: cardText(item),
    ...(item.link ? { link: customLink(item.link.href, item.link.label) } : {}),
  })),
});

const steps = (anchorId: string, heading: string, items: readonly StepEntry[]): StepsBlock => ({
  blockType: "steps",
  anchorId,
  heading,
  variant: "horizontal",
  items: items.map((item) => ({
    title: item.title,
    text: item.text,
    ...(item.link ? { linkLabel: item.link.label, link: customLink(item.link.href) } : {}),
  })),
});

function pageData(entry: EngineeringPageEntry, layout: LayoutBlock[]): PageData {
  return {
    title: entry.title,
    slug: entry.slug,
    template: "service",
    breadcrumbLabel: entry.breadcrumbLabel,
    parent: null,
    _status: "published",
    seo: {
      h1: entry.seo.h1,
      title: entry.seo.title,
      description: entry.seo.description,
      noindex: false,
    },
    // The routes close with their own form panel; the frame's «Условия» and quiz CTA would
    // repeat it.
    hideConditions: true,
    hideQuizCta: true,
    layout,
  };
}

function designLayout(): LayoutBlock[] {
  const d = DESIGN;
  const levels: CompareBlock = {
    blockType: "compare",
    anchorId: A.levels,
    heading: d.levels.heading,
    sub: d.levels.sub,
    topicTitle: "",
    leftTitle: d.levels.left,
    rightTitle: d.levels.right,
    rows: d.levels.rows.map((row) => ({ ...row })),
  };
  const team: CtaBlock = {
    blockType: "cta",
    anchorId: A.team,
    variant: "banner",
    tone: "primaryDark",
    heading: d.team.heading,
    title: d.team.title,
    body: paragraphs(d.team.text),
  };
  const form: FormBlock = {
    blockType: "form",
    formKey: "drawing",
    variant: "page",
    heading: d.form.heading,
    sub: d.form.sub,
    bullets: [{ text: d.form.note }],
    submitLabel: d.form.submitLabel,
    params: { source: d.form.source, label: d.form.submitLabel },
  };
  return [
    hero(d.lead, [
      formButton(d.taskLabel, d.heroSource, "primary"),
      {
        label: d.objectsLabel,
        kind: "link",
        variant: "secondary",
        link: customLink(OBJECTS_PATH),
      },
    ]),
    facts(d.facts),
    {
      blockType: "cards",
      anchorId: A.problems,
      heading: d.problems.heading,
      layout: "g3",
      items: d.problems.items.map((item) => ({ ...item })),
    },
    levels,
    featureCards(A.what, d.what.heading, d.what.items, d.what.sub),
    table(A.scope, d.scope.heading, d.scope.columns, d.scope.rows, d.scope.footnote),
    team,
    steps(A.process, d.process.heading, d.process.items),
    form,
  ].map((block) => block as LayoutBlock);
}

async function productionLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const p = PRODUCTION;
  const crane: CalloutBlock = {
    blockType: "callout",
    anchorId: A.crane,
    tone: "info",
    icon: "info",
    body: await markdown(ctx, p.zones.crane),
  };
  const montage: CtaBlock = {
    blockType: "cta",
    anchorId: A.montage,
    variant: "banner",
    tone: "light",
    title: p.montage.title,
    body: paragraphs(p.montage.text),
    buttons: [formButton(p.projectLabel, p.montageSource, "primary"), quizButton("secondary")],
  };
  const form: FormBlock = {
    blockType: "form",
    formKey: "full",
    variant: "page",
    heading: p.form.heading,
    submitLabel: p.form.submitLabel,
    params: { source: p.form.source, label: p.form.submitLabel },
  };
  return [
    hero([p.lead], [quizButton(), formButton(p.projectLabel, p.heroSource, "secondary")]),
    facts(p.facts),
    featureCards(A.workshop, p.workshop.heading, p.workshop.items),
    {
      blockType: "cards",
      anchorId: A.zones,
      heading: p.zones.heading,
      sub: p.zones.sub,
      layout: "g4",
      items: p.zones.items.map((item) => ({ ...item })),
    },
    crane,
    table(A.partners, p.partners.heading, p.partners.columns, p.partners.rows),
    steps(A.flow, p.flow.heading, p.flow.items),
    {
      blockType: "cards",
      anchorId: A.site,
      heading: p.site.heading,
      sub: p.site.location,
      layout: "g3",
      items: p.site.photos.map((title) => ({ title })),
    },
    montage,
    form,
  ].map((block) => block as LayoutBlock);
}

export async function seed(ctx: SeedContext): Promise<void> {
  for (const [entry, layout] of [
    [DESIGN.page, designLayout()],
    [PRODUCTION.page, await productionLayout(ctx)],
  ] as const) {
    await upsertByPath(ctx, "pages", entry.path, pageData(entry, layout), { overwrite: true });
  }
}
