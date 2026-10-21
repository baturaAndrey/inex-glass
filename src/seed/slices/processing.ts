import type { Page, ProcessingService } from "@/payload-types";
import {
  HUB,
  HUB_PATH,
  SERVICES,
  type CellSeed,
  type LayoutSeed,
  type ServiceSeed,
  type TableSeed,
} from "../content/processing";
import { upsertByPath, upsertBySlug, type SeedContext } from "../context";
import { markdown, paragraphs } from "../lexical";
import type { CollectionSlug, Where } from "payload";

/**
 * Seed slice «processing» (task 25): the hub `/obrabotka-stekla/` (`pages`, template `hub`) and
 * the six `processing-services`. Texts live in `../content/processing.ts`.
 *
 * Update rule: an existing document is rewritten only with `--force` or while it is pristine —
 * `updatedAt` within `PRISTINE_WINDOW_MS` of `createdAt` (created by the mini-seed or by this
 * slice and never edited). Otherwise it is skipped with a log line, so editor changes survive.
 */

type LayoutBlock = NonNullable<Page["layout"]>[number];
type ServiceTable = NonNullable<ProcessingService["tables"]>[number];
type TableData = NonNullable<Extract<LayoutBlock, { blockType: "table" }>["table"]>;
type CtaButton = NonNullable<Extract<LayoutBlock, { blockType: "cta" }>["buttons"]>[number];

/** A document saved within this time after its creation was never edited by a person. */
const PRISTINE_WINDOW_MS = 2000;

/* ------------------------------------------------------------------------------------------ */
/* Converters                                                                                 */
/* ------------------------------------------------------------------------------------------ */

function cell(value: CellSeed) {
  return typeof value === "string" ? { value } : { value: value.value, href: value.href ?? null };
}

/** Table data shared by the `table` block and the `tables[]` field of services. */
function tableData(table: TableSeed): Omit<TableData, "caption" | "highlightColumn"> {
  return {
    role: table.role ?? "parameters",
    mobileMode: "cards",
    columns: table.columns.map((label) => ({ label })),
    rows: table.rows.map((cells) => ({ cells: cells.map(cell) })),
    ...(table.footnote ? { footnote: table.footnote } : {}),
  };
}

function serviceTable(table: TableSeed): ServiceTable {
  return {
    ...(table.heading ? { heading: table.heading } : {}),
    ...(table.lead ? { lead: table.lead } : {}),
    ...tableData(table),
  };
}

async function layoutBlock(ctx: SeedContext, seed: LayoutSeed): Promise<LayoutBlock> {
  switch (seed.blockType) {
    case "richText":
      return {
        blockType: "richText",
        ...(seed.heading ? { heading: seed.heading } : {}),
        content: await markdown(ctx, seed.md),
      };
    case "table":
      return {
        blockType: "table",
        ...(seed.heading ? { heading: seed.heading } : {}),
        ...(seed.sub ? { sub: seed.sub } : {}),
        table: tableData(seed.table),
      };
    case "callout": {
      const items = [];
      for (const item of seed.items ?? []) {
        items.push({
          ...(item.lead ? { lead: item.lead } : {}),
          text: await markdown(ctx, item.md),
        });
      }
      return {
        blockType: "callout",
        tone: seed.tone,
        ...(seed.title ? { title: seed.title } : {}),
        ...(seed.md ? { body: await markdown(ctx, seed.md) } : {}),
        ...(items.length > 0 ? { items } : {}),
      };
    }
    case "holesCalculator":
      return {
        blockType: "holesCalculator",
        heading: seed.heading,
        ...(seed.sub ? { sub: seed.sub } : {}),
        anchorId: seed.anchorId,
        defaultThickness: seed.defaultThickness,
        showScheme: true,
        ...(seed.note ? { note: seed.note } : {}),
      };
  }
}

async function layout(ctx: SeedContext, seeds: readonly LayoutSeed[]): Promise<LayoutBlock[]> {
  const blocks: LayoutBlock[] = [];
  for (const seed of seeds) blocks.push(await layoutBlock(ctx, seed));
  return blocks;
}

/* ------------------------------------------------------------------------------------------ */
/* Update rule                                                                                */
/* ------------------------------------------------------------------------------------------ */

/**
 * `true` → the upsert may overwrite: `--force`, no document yet, or a pristine one. Logs the
 * reason when an edited document is kept.
 */
async function mayOverwrite(
  ctx: SeedContext,
  collection: CollectionSlug,
  where: Where,
  label: string
): Promise<boolean> {
  if (ctx.force) return true;
  const found = await ctx.payload.find({
    collection,
    where,
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    // Drafts count too: an editor's unpublished changes must not be overwritten either.
    draft: true,
  });
  const doc = found.docs[0] as { createdAt?: string; updatedAt?: string } | undefined;
  if (!doc) return true;
  const created = Date.parse(doc.createdAt ?? "");
  const updated = Date.parse(doc.updatedAt ?? "");
  const pristine =
    Number.isFinite(created) &&
    Number.isFinite(updated) &&
    Math.abs(updated - created) < PRISTINE_WINDOW_MS;
  if (!pristine)
    ctx.log(`${collection} ${label}: изменён после создания — пропуск (перезапись: --force)`);
  return pristine;
}

/* ------------------------------------------------------------------------------------------ */
/* Documents                                                                                  */
/* ------------------------------------------------------------------------------------------ */

async function seedService(ctx: SeedContext, service: ServiceSeed): Promise<void> {
  const overwrite = await mayOverwrite(
    ctx,
    "processing-services",
    { slug: { equals: service.slug } },
    service.slug
  );
  if (!overwrite) return;

  const faq = [];
  for (const item of service.faq ?? []) {
    faq.push({ question: item.question, answer: await markdown(ctx, item.answerMd) });
  }
  const callouts = [];
  for (const callout of service.callouts ?? []) {
    callouts.push({
      tone: callout.tone,
      title: callout.title,
      body: await markdown(ctx, callout.md),
    });
  }

  await upsertBySlug(
    ctx,
    "processing-services",
    {
      title: service.title,
      slug: service.slug,
      order: service.order,
      card: { title: service.cardTitle, text: service.keyLimit },
      keyLimit: service.keyLimit,
      intro: await markdown(ctx, service.introMd),
      tables: service.tables.map(serviceTable),
      howToSpecify: service.howToSpecifyMd ? await markdown(ctx, service.howToSpecifyMd) : null,
      importantItems: [],
      callouts,
      hasHoleCalculator: service.hasHoleCalculator ?? false,
      ctaPrimaryLabel: null,
      ctaSecondaryLabel: service.ctaSecondaryLabel ?? null,
      relatedLinks: [],
      faq,
      layout: await layout(ctx, service.layout),
      seo: { ...service.seo, noindex: false },
      quizPrefill: {
        type: service.quizType,
        ctaLabel: "Рассчитать стоимость",
        secondaryForm: service.secondaryForm ?? "drawing",
        ...(service.ctaSecondaryLabel ? { secondaryLabel: service.ctaSecondaryLabel } : {}),
      },
    },
    { overwrite: true }
  );
}

/** Hero + final CTA buttons of the hub: quiz + «Отправить чертёж» (form `drawing`). */
function hubButtons(): CtaButton[] {
  return [
    { label: HUB.primaryLabel, kind: "quiz", variant: "primary", icon: "calculator" },
    {
      label: HUB.secondaryLabel,
      kind: "form",
      variant: "secondary",
      icon: "file-text",
      formKey: "drawing",
      formParams: { label: HUB.secondaryLabel, source: HUB.slug },
    },
  ];
}

async function seedHub(ctx: SeedContext): Promise<void> {
  const overwrite = await mayOverwrite(ctx, "pages", { path: { equals: HUB_PATH } }, HUB_PATH);
  if (!overwrite) return;

  // The route inserts the operations table right after the first block (the hero).
  const blocks: LayoutBlock[] = [
    {
      blockType: "hero",
      variant: "p5Top",
      lead: paragraphs(HUB.lead),
      buttons: hubButtons(),
      showTerms: true,
    },
    ...(await layout(ctx, HUB.layout)),
    { blockType: "cta", variant: "buttons", buttons: hubButtons() },
  ];

  await upsertByPath(
    ctx,
    "pages",
    HUB_PATH,
    {
      title: HUB.title,
      template: "hub",
      slug: HUB.slug,
      breadcrumbLabel: HUB.breadcrumb,
      _status: "published",
      layout: blocks,
      seo: { ...HUB.seo, noindex: false },
      quizPrefill: { type: "tempered" },
      // The layout ends with its own CTA block: no second quiz button under the conditions.
      hideQuizCta: true,
    },
    { overwrite: true }
  );
}

/** Seed slice «processing»: hub + six services (`pnpm seed --only=processing [--force]`). */
export async function seed(ctx: SeedContext): Promise<void> {
  for (const service of SERVICES) await seedService(ctx, service);
  await seedHub(ctx);
}
