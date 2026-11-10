import type { Page, ProcessingService } from "@/payload-types";
import {
  HUB,
  HUB_PATH,
  SERVICES,
  type CellSeed,
  type ImageSeed,
  type LayoutSeed,
  type ProcessingSlug,
  type ServiceSeed,
  type SpecSeed,
  type TableSeed,
} from "../content/processing";
import { mayOverwrite, upsertByPath, upsertBySlug, type SeedContext } from "../context";
import { markdown, paragraphs } from "../lexical";
import { ensureSeedImage } from "../seed-media";

/**
 * Seed slice «processing» (task 25, service pages of the Paper mockups 2026-11): the hub
 * `/obrabotka-stekla/` (`pages`, template `hub`) and the six `processing-services`. Texts live
 * in `../content/processing/` (one file per service, section mapping in its `README.md`), the
 * photos and diagrams in `../media/processing/` (uploaded once, see `../seed-media.ts`).
 *
 * Update rule: an existing document is rewritten only with `--force` or while it is unchanged
 * since the seed's last write (`mayOverwrite` in `../context.ts`, seed markers). Otherwise it is
 * skipped with a log line, so editor changes survive.
 */

type LayoutBlock = NonNullable<Page["layout"]>[number];
type ServiceTable = NonNullable<ProcessingService["tables"]>[number];
type RelatedLink = NonNullable<ProcessingService["relatedLinks"]>[number];
type TableData = NonNullable<Extract<LayoutBlock, { blockType: "table" }>["table"]>;
type CtaButton = NonNullable<Extract<LayoutBlock, { blockType: "cta" }>["buttons"]>[number];

const MEDIA_GROUP = "processing";
const COLLECTION = "processing-services";

/** Columns of the specs table (`tables[0]`): one row per tile. */
export const SPEC_COLUMNS = ["Параметр", "Значение", "Пояснение"] as const;

const imageId = (ctx: SeedContext, image: ImageSeed) =>
  ensureSeedImage(ctx, { group: MEDIA_GROUP, ...image });

/* ------------------------------------------------------------------------------------------ */
/* Converters                                                                                 */
/* ------------------------------------------------------------------------------------------ */

function cell(value: CellSeed) {
  if (typeof value === "string") return { value };
  return {
    value: value.value,
    href: value.href ?? null,
    ...(value.positive ? { positive: true } : {}),
  };
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

/** Spec tiles → `tables[0]`: label | value (`positive` = the accent tile) | description. */
function specsTable(specs: readonly SpecSeed[]): ServiceTable {
  return tableData({
    role: "parameters",
    columns: [...SPEC_COLUMNS],
    rows: specs.map((spec) => [
      spec.label,
      { value: spec.value, ...(spec.accent ? { positive: true } : {}) },
      spec.text ?? "",
    ]),
  });
}

/** One seed entry → one or two blocks (`richText` with a figure adds the `gallery` block). */
async function layoutBlocks(ctx: SeedContext, seed: LayoutSeed): Promise<LayoutBlock[]> {
  switch (seed.blockType) {
    case "richText": {
      const text: LayoutBlock = {
        blockType: "richText",
        ...(seed.heading ? { heading: seed.heading } : {}),
        content: await markdown(ctx, seed.md),
      };
      if (!seed.figure) return [text];
      const { image, caption } = seed.figure;
      return [
        text,
        {
          blockType: "gallery",
          layout: "grid",
          images: [
            {
              image: await imageId(ctx, image),
              alt: image.alt,
              ...(caption ? { caption } : {}),
            },
          ],
        },
      ];
    }
    case "table":
      return [
        {
          blockType: "table",
          ...(seed.heading ? { heading: seed.heading } : {}),
          ...(seed.sub ? { sub: seed.sub } : {}),
          table: tableData(seed.table),
        },
      ];
    case "callout": {
      const items = [];
      for (const item of seed.items ?? []) {
        items.push({
          ...(item.lead ? { lead: item.lead } : {}),
          text: await markdown(ctx, item.md),
        });
      }
      return [
        {
          blockType: "callout",
          tone: seed.tone,
          ...(seed.title ? { title: seed.title } : {}),
          ...(seed.md ? { body: await markdown(ctx, seed.md) } : {}),
          ...(items.length > 0 ? { items } : {}),
        },
      ];
    }
    case "holesCalculator":
      return [
        {
          blockType: "holesCalculator",
          heading: seed.heading,
          ...(seed.sub ? { sub: seed.sub } : {}),
          anchorId: seed.anchorId,
          defaultThickness: seed.defaultThickness,
          showScheme: true,
          ...(seed.note ? { note: seed.note } : {}),
        },
      ];
    case "cards": {
      const items = [];
      for (const item of seed.items) {
        items.push({
          title: item.title,
          ...(item.text ? { text: item.text } : {}),
          ...(item.href ? { link: { type: "custom" as const, url: item.href } } : {}),
          ...(item.image ? { image: await imageId(ctx, item.image) } : {}),
        });
      }
      return [
        {
          blockType: "cards",
          heading: seed.heading,
          ...(seed.sub ? { sub: seed.sub } : {}),
          layout: seed.columns === 4 ? "g4" : "g3",
          items,
        },
      ];
    }
    case "twoColumns":
      return [
        {
          blockType: "twoColumns",
          left: { heading: seed.left.heading, body: await markdown(ctx, seed.left.md) },
          ...(seed.right
            ? { right: { heading: seed.right.heading, body: await markdown(ctx, seed.right.md) } }
            : {}),
        },
      ];
  }
}

async function layout(ctx: SeedContext, seeds: readonly LayoutSeed[]): Promise<LayoutBlock[]> {
  const blocks: LayoutBlock[] = [];
  for (const seed of seeds) blocks.push(...(await layoutBlocks(ctx, seed)));
  return blocks;
}

/* ------------------------------------------------------------------------------------------ */
/* Documents                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/** Ids of the existing services by slug (targets of `relatedLinks`). */
async function serviceIds(ctx: SeedContext): Promise<Map<string, string>> {
  const found = await ctx.payload.find({
    collection: COLLECTION,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return new Map(found.docs.map((doc) => [doc.slug ?? "", doc.id]));
}

/** `related` → `relatedLinks` (document links); `null` while a target does not exist yet. */
function relatedLinks(
  related: readonly ProcessingSlug[] | undefined,
  ids: ReadonlyMap<string, string>
): RelatedLink[] | null {
  const links: RelatedLink[] = [];
  for (const slug of related ?? []) {
    const id = ids.get(slug);
    if (!id) return null;
    links.push({ link: { type: "doc", doc: { relationTo: COLLECTION, value: id } } });
  }
  return links;
}

/**
 * Writes one service. Returns `false` when its `related` targets do not exist yet (first run on
 * an empty database): the caller writes it again after the other services.
 */
async function seedService(
  ctx: SeedContext,
  service: ServiceSeed,
  ids: ReadonlyMap<string, string>
): Promise<boolean> {
  const overwrite = await mayOverwrite(
    ctx,
    COLLECTION,
    { slug: { equals: service.slug } },
    service.slug
  );
  if (!overwrite) return true;

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
  const related = relatedLinks(service.related, ids);

  await upsertBySlug(
    ctx,
    COLLECTION,
    {
      title: service.title,
      slug: service.slug,
      order: service.order,
      card: { title: service.cardTitle, text: service.keyLimit },
      keyLimit: service.keyLimit,
      // `card.image` is not passed: the update keeps the card illustration attached later.
      heroImage: await imageId(ctx, service.image),
      intro: await markdown(ctx, service.introMd),
      tables: service.specs?.length ? [specsTable(service.specs)] : [],
      howToSpecify: service.howToSpecifyMd ? await markdown(ctx, service.howToSpecifyMd) : null,
      importantItems: [],
      callouts,
      hasHoleCalculator: service.hasHoleCalculator ?? false,
      ctaPrimaryLabel: null,
      ctaSecondaryLabel: service.ctaSecondaryLabel ?? null,
      relatedLinks: related ?? [],
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
  return related !== null;
}

/** Hero buttons of the hub: quiz + «Отправить чертёж» (form `drawing`). */
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

  // The route inserts the service cards right after the first block (the hero) and renders the
  // `twoColumns` panels as the info block that closes the page (Paper mockup: no final buttons,
  // no conditions section — the hero carries both).
  const blocks: LayoutBlock[] = [
    {
      blockType: "hero",
      variant: "p5Top",
      lead: paragraphs(HUB.lead),
      buttons: hubButtons(),
      showTerms: true,
      image: await imageId(ctx, HUB.heroImage),
    },
    ...(await layout(ctx, HUB.layout)),
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
      // The info block closes the page and meets the footer: no conditions, no quiz CTA.
      hideConditions: true,
      hideQuizCta: true,
    },
    { overwrite: true }
  );
}

/** Seed slice «processing»: hub + six services (`pnpm seed --only=processing [--force]`). */
export async function seed(ctx: SeedContext): Promise<void> {
  let ids = await serviceIds(ctx);
  const pending: ServiceSeed[] = [];
  for (const service of SERVICES) {
    if (!(await seedService(ctx, service, ids))) pending.push(service);
  }
  // First run on an empty database: `related` of the earlier services named later ones.
  if (pending.length > 0) {
    ids = await serviceIds(ctx);
    for (const service of pending) await seedService(ctx, service, ids);
  }
  await seedHub(ctx);
}
