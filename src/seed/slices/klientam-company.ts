import type {
  CtaBlock,
  FormBlock,
  HeroBlock,
  LinkListBlock,
  Page,
  RichTextBlock,
  StepsBlock,
  TableBlock,
} from "@/payload-types";
import {
  CLIENTS_MEDIA_GROUP,
  COMPANY,
  CONTACTS,
  CONTRACTORS,
  DESIGNERS,
  DEVELOPERS,
  FURNITURE,
  HUB,
  TEAM,
  type ClientsImage,
  type PageEntry,
  type StepContent,
  type TableContent,
} from "../content/klientam-company";
import { upsertByPath } from "../context";
import { markdown, paragraphs } from "../lexical";
import { ensureSeedImage } from "../seed-media";
import type { SeedContext } from "../context";
import type { LexicalState } from "../lexical";

/**
 * Seed slice «klientam-company» (task 29): `/klientam/` + 4 segment pages, `/o-kompanii/`,
 * `/o-kompanii/sotrudniki/`, `/kontakty/` — layout, SEO, crumb labels. Copy lives in
 * `../content/klientam-company.ts` (verbatim teksty, see the tests).
 *
 * The «Клиентам» pages (template `segment`) follow the Paper mockups `2560_klientam` and
 * `2560_klientam_podryadchikam` (2026-11, `@/components/clients`): the hero carries the photo
 * of `src/seed/media/clients/` (the hub cards reuse the segment heroes), numbered lists are
 * `steps` blocks, the closing `{условия}` line is a headless rich text (the info note), and a
 * `form` block configures the drawing-form panel at the bottom.
 *
 * Contacts, requisites and the team are NOT seeded here: the globals belong to the globals seed
 * (task 16, SSoT values) and the team starts empty. The slice owns the full content of its pages,
 * including the placeholders the mini-seed created for `/klientam/` and `/o-kompanii/`, so every
 * page is upserted by path with `overwrite: true` (idempotent: a re-run writes the same data).
 */

type HeroButton = NonNullable<HeroBlock["buttons"]>[number];
type LayoutBlock = NonNullable<Page["layout"]>[number];
type PageData = Omit<Page, "id" | "createdAt" | "updatedAt" | "path" | "layout"> & {
  layout: LayoutBlock[];
};

const QUIZ_LABEL = "Рассчитать стоимость";

/* ------------------------------------------------------------------------------------------ */
/* Block builders                                                                             */
/* ------------------------------------------------------------------------------------------ */

const quizButton = (): HeroButton => ({
  label: QUIZ_LABEL,
  kind: "quiz",
  variant: "primary",
  icon: "calculator",
});

/** Secondary «Отправить …» button: the drawing form with the button label as its title. */
const drawingButton = (label: string, params: Record<string, string> = {}): HeroButton => ({
  label,
  kind: "form",
  formKey: "drawing",
  variant: "secondary",
  formParams: { label, ...params },
});

const hero = (
  lead: string,
  buttons: HeroButton[],
  opts: { terms?: boolean; image?: string } = {}
): HeroBlock => ({
  blockType: "hero",
  variant: "ctHero",
  lead: paragraphs(lead),
  buttons,
  showTerms: opts.terms ?? true,
  termsMode: "full",
  ...(opts.image ? { image: opts.image } : {}),
});

/** Media id of a section photo (uploaded on the first run, then reused). */
const clientsImage = (ctx: SeedContext, image: ClientsImage) =>
  ensureSeedImage(ctx, { group: CLIENTS_MEDIA_GROUP, ...image });

/** Numbered step cards (teksty «1. …»); a trailing «→ [link]» is the step link. */
const steps = (heading: string, items: readonly StepContent[]): StepsBlock => ({
  blockType: "steps",
  variant: "horizontal",
  heading,
  items: items.map((item) => ({
    title: item.title,
    ...(item.link
      ? { linkLabel: item.link.label, link: { type: "custom", url: item.link.href } }
      : {}),
  })),
});

/** Configures the drawing-form panel closing every «Клиентам» page. */
const drawingForm = (params: Record<string, string>): FormBlock => ({
  blockType: "form",
  formKey: "drawing",
  variant: "page",
  params,
});

const richText = (content: LexicalState, heading?: string): RichTextBlock => ({
  blockType: "richText",
  heading: heading ?? null,
  content,
  width: "normal",
});

/** Facts table: cards on ≤599 px. */
const table = ({ heading, columns, rows }: TableContent): TableBlock => ({
  blockType: "table",
  heading,
  table: {
    role: "other",
    mobileMode: "cards",
    columns: columns.map((label) => ({ label })),
    rows: rows.map((cells) => ({ cells: cells.map((value) => ({ value })) })),
  },
});

/** One line with a trailing link («Двери, лестницы и монтаж → Перейти на inex.su»). */
const ctaStrip = (heading: string, text: string, url: string, label: string): CtaBlock => ({
  blockType: "cta",
  variant: "strip",
  tone: "light",
  heading,
  body: paragraphs(text),
  link: { type: "custom", url, label },
});

/** Markdown table (rich-text table of the editor), for cells with links and arrows. */
const markdownTable = ({ columns, rows }: Pick<TableContent, "columns" | "rows">): string =>
  [columns, columns.map(() => "---"), ...rows]
    .map((cells) => `| ${cells.join(" | ")} |`)
    .join("\n");

/* ------------------------------------------------------------------------------------------ */
/* Pages                                                                                      */
/* ------------------------------------------------------------------------------------------ */

function pageData(
  entry: PageEntry,
  layout: LayoutBlock[],
  parentId: string | null,
  extra: Partial<PageData> = {}
): PageData {
  return {
    title: entry.title,
    slug: entry.slug,
    template: entry.template,
    breadcrumbLabel: entry.breadcrumbLabel,
    parent: parentId,
    _status: "published",
    seo: {
      h1: entry.seo.h1,
      title: entry.seo.title,
      description: entry.seo.description ?? null,
      noindex: false,
    },
    hideConditions: false,
    hideQuizCta: false,
    ...extra,
    layout,
  };
}

/**
 * Hub: hero with the terms checklist, the segments table (rendered as photo cards — the photos
 * are the segment heroes), the dark «Монтаж» panel with the inex.su button, the drawing form.
 */
async function hubLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const drawing = drawingButton("Отправить чертёж", { source: HUB.drawingSource });
  const hubTable: TableBlock = {
    blockType: "table",
    table: {
      role: "comparison",
      mobileMode: "cards",
      caption: HUB.page.seo.h1,
      // teksty: the first column has no header; the «Подробнее» column has none either. A
      // non-breaking space satisfies the required label without printing anything.
      columns: [{ label: " " }, ...HUB.columns.map((label) => ({ label })), { label: " " }],
      rows: HUB.rows.map((row) => ({
        cells: [
          { value: row.segment, positive: true },
          { value: row.task },
          { value: row.take },
          { value: HUB.moreLabel, href: row.href },
        ],
      })),
    },
  };
  const montage: CtaBlock = {
    blockType: "cta",
    variant: "banner",
    tone: "primaryDark",
    title: HUB.montage.heading,
    body: paragraphs(HUB.montage.text),
    buttons: [
      {
        label: HUB.montage.linkLabel,
        kind: "link",
        variant: "secondary",
        link: { type: "custom", url: HUB.montage.href },
      },
    ],
  };
  return [
    hero(HUB.lead, [quizButton(), drawing], { image: await clientsImage(ctx, HUB.heroImage) }),
    hubTable,
    montage,
    // teksty: [Рассчитать стоимость] [Отправить чертёж] — the hero buttons and the form panel.
    drawingForm({ source: HUB.drawingSource }),
  ];
}

type Segment = typeof CONTRACTORS | typeof FURNITURE | typeof DEVELOPERS | typeof DESIGNERS;

/**
 * Hero of a segment page: its photo, no terms checklist (the closing note carries the
 * conditions), «Рассчитать стоимость» + the page's «Отправить …» button.
 */
async function segmentHero(ctx: SeedContext, s: Segment): Promise<HeroBlock> {
  const buttons = [quizButton(), drawingButton(s.secondaryLabel)];
  return hero(s.lead, buttons, { terms: false, image: await clientsImage(ctx, s.heroImage) });
}

/**
 * The closing «{условия} · {акция_текст}» line as a headless rich text (the info note), then the
 * drawing-form panel (lead caption = the page's button label).
 */
async function segmentClosing(ctx: SeedContext, s: Segment): Promise<LayoutBlock[]> {
  return [richText(await markdown(ctx, s.closing)), drawingForm({ label: s.secondaryLabel })];
}

async function contractorsLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const s = CONTRACTORS;
  return [
    await segmentHero(ctx, s),
    table(s.problems),
    steps(s.start.heading, s.start.steps),
    ...(await segmentClosing(ctx, s)),
  ];
}

async function furnitureLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const s = FURNITURE;
  return [
    await segmentHero(ctx, s),
    richText(await markdown(ctx, s.series.markdown), s.series.heading),
    richText(await markdown(ctx, s.types.markdown), s.types.heading),
    ...(await segmentClosing(ctx, s)),
  ];
}

async function developersLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const s = DEVELOPERS;
  return [
    await segmentHero(ctx, s),
    richText(await markdown(ctx, s.benefits.markdown), s.benefits.heading),
    richText(await markdown(ctx, s.objects.markdown), s.objects.heading),
    ...(await segmentClosing(ctx, s)),
  ];
}

async function designersLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const s = DESIGNERS;
  return [
    await segmentHero(ctx, s),
    // Cells carry links and arrows: a rich-text table (the `table` block has one link per cell).
    richText(await markdown(ctx, markdownTable(s.solutions)), s.solutions.heading),
    steps(s.process.heading, s.process.steps),
    ...(await segmentClosing(ctx, s)),
  ];
}

/** «О компании»: the route appends «Команда» (team not empty) and «Реквизиты». */
async function companyLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const s = COMPANY;
  const companyHero: HeroBlock = {
    ...hero(s.lead, [quizButton(), drawingButton("Отправить чертёж")], { terms: false }),
    // Second lead paragraph of teksty, emphasised (the experience wording is fixed).
    strong: s.experience,
  };
  const clients: LinkListBlock = {
    blockType: "linkList",
    heading: s.clients.heading,
    variant: "chips",
    items: s.clients.items.map((item) => ({
      link: { type: "custom", url: item.href, label: item.label },
    })),
  };
  return [
    companyHero,
    table(s.roles),
    richText(await markdown(ctx, s.about)),
    clients,
    ctaStrip(s.inexSu.heading, s.inexSu.text, s.inexSu.href, s.inexSu.linkLabel),
    ctaStrip(s.objects.heading, s.objects.text, s.objects.href, s.objects.linkLabel),
  ];
}

/** «Команда»: H1, intro and the quiz button; the route adds the grid when the team is not empty. */
function teamLayout(): LayoutBlock[] {
  return [hero(TEAM.intro, [quizButton()], { terms: false })];
}

/** «Контакты»: only the form — the route renders addresses, map and requisites from globals. */
function contactsLayout(): LayoutBlock[] {
  const form: FormBlock = {
    blockType: "form",
    formKey: "contacts",
    variant: "page",
    heading: CONTACTS.form.heading,
    sub: CONTACTS.form.sub,
    submitLabel: CONTACTS.form.submitLabel,
    showContacts: false,
  };
  return [form];
}

/* ------------------------------------------------------------------------------------------ */
/* Seed                                                                                       */
/* ------------------------------------------------------------------------------------------ */

export async function seed(ctx: SeedContext): Promise<void> {
  const ids = new Map<string, string>();
  const write = async (entry: PageEntry, layout: LayoutBlock[], extra: Partial<PageData> = {}) => {
    const parentId = entry.parentPath ? (ids.get(entry.parentPath) ?? null) : null;
    if (entry.parentPath && !parentId) {
      throw new Error(`${entry.path}: родительская страница ${entry.parentPath} не найдена`);
    }
    const { doc } = await upsertByPath(
      ctx,
      "pages",
      entry.path,
      pageData(entry, layout, parentId, extra),
      { overwrite: true }
    );
    ids.set(entry.path, doc.id);
  };

  // Commercial segment pages close with their own «{условия}» line and the form panel, so the
  // frame's «Условия» section and quiz CTA would repeat them (the template renders neither).
  const segmentFrame: Partial<PageData> = { hideConditions: true, hideQuizCta: true };

  await write(HUB.page, await hubLayout(ctx), { hideQuizCta: true });
  await write(CONTRACTORS.page, await contractorsLayout(ctx), segmentFrame);
  await write(FURNITURE.page, await furnitureLayout(ctx), {
    ...segmentFrame,
    quizPrefill: { type: FURNITURE.quizType },
  });
  await write(DEVELOPERS.page, await developersLayout(ctx), segmentFrame);
  await write(DESIGNERS.page, await designersLayout(ctx), segmentFrame);
  await write(COMPANY.page, await companyLayout(ctx));
  // Hero already carries «Рассчитать стоимость»; the page is not commercial.
  await write(TEAM.page, teamLayout(), { hideConditions: true, hideQuizCta: true });
  await write(CONTACTS.page, contactsLayout(), { hideConditions: true, hideQuizCta: true });
}
