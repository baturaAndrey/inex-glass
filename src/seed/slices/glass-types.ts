import sharp from "sharp";
import type { GlassType } from "@/payload-types";
import {
  GLASS_TYPES_CONTENT,
  link,
  type AboutTableSeed,
  type CalloutItemContent,
  type GlassTypeContent,
  type GlassTypeTableContent,
  type ImageSeed,
  type LayoutContent,
  type SpecSeed,
} from "../content/glass-types";
import { mayOverwrite, SEED_REQUEST_CONTEXT, upsertBySlug } from "../context";
import { markdown } from "../lexical";
import { ensureSeedImage } from "../seed-media";
import { SPEC_COLUMNS } from "./processing";
import type { SeedContext } from "../context";
import type { RequiredDataFromCollectionSlug } from "payload";

/**
 * Seed slice «glass-types» (task 24, page design of the Paper mockups `2560_glass_*`): the eight
 * glass-type pages — матовое, тонированное, крашеное, осветлённое, для мебели, рифлёное, гнутое
 * (`/zakalennoe-steklo/<slug>/`) and триплекс (`/tripleks/`). Copy lives in
 * `../content/glass-types/` (one file per type, section mapping in its `README.md`), photos and
 * diagrams in `../media/glass-types/` (uploaded once, see `../seed-media.ts`).
 *
 * Update rule: an existing document (matched by `slug`) is overwritten only with `--force` or
 * while it is unchanged since the seed's last write (`mayOverwrite` in `../context.ts`, seed
 * markers). Otherwise it is skipped with a log line, so editor changes survive a re-run.
 * `heroImage` is written only when the seed has one: a photo uploaded in the admin survives a
 * forced re-run of a type without a seed photo. Running the slice twice leaves the same eight
 * documents.
 */

type GlassTypeData = RequiredDataFromCollectionSlug<"glass-types">;
type LayoutBlock = NonNullable<GlassType["layout"]>[number];
type TableData = NonNullable<Extract<LayoutBlock, { blockType: "table" }>["table"]>;
type GlassTable = NonNullable<GlassType["tables"]>[number];
type RelatedLink = NonNullable<GlassType["relatedLinks"]>[number];

const COLLECTION = "glass-types";
const MEDIA_GROUP = "glass-types";

/** Media standing in for hero photos until real ones are uploaded (schema: image required). */
export const PENDING_PHOTO_FILENAME = "glass-type-photo-pending.png";
const PENDING_PHOTO_ALT = "Фото готовится";
/** Light grey-green of `.ig-ph`; the template shows the design-system placeholder instead. */
const PENDING_PHOTO_COLOR = { r: 0xdc, g: 0xe7, b: 0xe4 };
const PENDING_PHOTO_SIZE = { width: 600, height: 800 };

/* ------------------------------------------------------------------------------------------ */
/* Helpers                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/**
 * Id of the temporary «photo pending» media (created once, then reused). It is flagged
 * `isPlaceholder`, so the template renders the `.ig-ph` placeholder with the caption and the
 * placeholder report of task 38 lists every page that still waits for a photo.
 */
async function pendingPhotoId(ctx: SeedContext): Promise<string> {
  const { payload } = ctx;
  const found = await payload.find({
    collection: "media",
    // Not by filename: Payload renames an upload whose file already exists in MEDIA_DIR
    // (`…-1.png`), so a filename lookup would miss and create a new record on every run.
    where: {
      and: [
        { isPlaceholder: { equals: true } },
        { alt: { equals: PENDING_PHOTO_ALT } },
        { kind: { equals: "photo" } },
      ],
    },
    sort: "createdAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const existing = found.docs[0];
  if (existing) return existing.id;

  const data = await sharp({
    create: { ...PENDING_PHOTO_SIZE, channels: 3, background: PENDING_PHOTO_COLOR },
  })
    .png()
    .toBuffer();
  const media = await payload.create({
    collection: "media",
    data: { alt: PENDING_PHOTO_ALT, isPlaceholder: true, kind: "photo" },
    file: { data, mimetype: "image/png", name: PENDING_PHOTO_FILENAME, size: data.length },
    overrideAccess: true,
    context: SEED_REQUEST_CONTEXT,
  });
  ctx.log(`media ${PENDING_PHOTO_FILENAME}: создан (временное фото)`);
  return media.id;
}

const imageId = (ctx: SeedContext, image: ImageSeed) =>
  ensureSeedImage(ctx, { group: MEDIA_GROUP, ...image });

async function calloutItems(ctx: SeedContext, items: readonly CalloutItemContent[]) {
  return Promise.all(
    items.map(async (item) => ({
      ...(item.lead ? { lead: item.lead } : {}),
      text: await markdown(ctx, item.text),
    }))
  );
}

const customLink = (target: { label: string; url: string }) => ({
  type: "custom" as const,
  url: target.url,
  label: target.label,
});

/* ------------------------------------------------------------------------------------------ */
/* Tables                                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** A site table → `tables[]` entry / `table` block data. */
function siteTable(table: GlassTypeTableContent): GlassTable {
  return {
    heading: table.heading,
    lead: table.lead ?? null,
    role: table.role,
    mobileMode: table.mobileMode,
    columns: table.columns.map((column) => ({
      label: column.label,
      align: column.align ?? "left",
      numeric: column.numeric ?? false,
    })),
    rows: table.rows.map((cells) => ({
      cells: cells.map((cell) =>
        typeof cell === "string"
          ? { value: cell, positive: false }
          : { value: cell.value, positive: cell.positive ?? false, href: cell.href ?? null }
      ),
    })),
    footnote: table.footnote ?? null,
  };
}

/** Spec tiles → the `tables[]` entry «Параметр | Значение | Пояснение» (`positive` = accent). */
function specsTable(specs: readonly SpecSeed[]): GlassTable {
  return {
    role: "parameters",
    mobileMode: "cards",
    columns: SPEC_COLUMNS.map((label) => ({ label })),
    rows: specs.map((spec) => ({
      cells: [
        { value: spec.label },
        { value: spec.value, positive: spec.accent ?? false },
        { value: spec.text ?? "" },
      ],
    })),
  };
}

/** The comparison table of an «about» section → `table` block data. */
function aboutTable(table: AboutTableSeed): TableData {
  return {
    role: "comparison",
    mobileMode: "cards",
    columns: table.columns.map((label) => ({ label })),
    rows: table.rows.map((cells) => ({ cells: cells.map((value) => ({ value })) })),
    ...(table.highlightColumn ? { highlightColumn: table.highlightColumn } : {}),
    ...(table.footnote ? { footnote: table.footnote } : {}),
  };
}

/* ------------------------------------------------------------------------------------------ */
/* Layout                                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** One seed entry → one or two blocks (an «about» with a panel adds `gallery` or `table`). */
async function layoutBlocks(ctx: SeedContext, block: LayoutContent): Promise<LayoutBlock[]> {
  switch (block.kind) {
    case "richText": {
      const text: LayoutBlock = {
        blockType: "richText",
        ...(block.heading ? { heading: block.heading, headingLevel: "h2" as const } : {}),
        content: await markdown(ctx, block.md),
        width: "normal",
      };
      if (block.figure) {
        const { image, caption } = block.figure;
        return [
          text,
          {
            blockType: "gallery",
            layout: "grid",
            images: [{ image: await imageId(ctx, image), alt: image.alt, caption }],
          },
        ];
      }
      if (block.table) {
        return [
          text,
          { blockType: "table", heading: block.table.caption, table: aboutTable(block.table) },
        ];
      }
      return [text];
    }
    case "callout":
      return [
        {
          blockType: "callout",
          tone: block.tone,
          ...(block.title ? { title: block.title } : {}),
          items: await calloutItems(ctx, block.items),
        },
      ];
    case "cards":
      return [
        {
          blockType: "cards",
          heading: block.heading,
          ...(block.sub ? { sub: block.sub } : {}),
          layout: block.columns === 4 ? "g4" : "g3",
          items: block.items.map((item) => ({
            title: item.title,
            ...(item.text ? { text: item.text } : {}),
            ...(item.href ? { link: { type: "custom" as const, url: item.href } } : {}),
          })),
        },
      ];
    case "table": {
      const { heading, lead, ...table } = siteTable(block.table);
      return [
        {
          blockType: "table",
          ...(heading ? { heading } : {}),
          ...(lead ? { sub: lead } : {}),
          table,
        },
      ];
    }
    case "twoColumns":
      return [
        {
          blockType: "twoColumns",
          left: { heading: block.left.heading, body: await markdown(ctx, block.left.md) },
          ...(block.right
            ? { right: { heading: block.right.heading, body: await markdown(ctx, block.right.md) } }
            : {}),
        },
      ];
  }
}

async function layout(ctx: SeedContext, blocks: readonly LayoutContent[]) {
  const out: LayoutBlock[] = [];
  for (const block of blocks) out.push(...(await layoutBlocks(ctx, block)));
  return out;
}

/* ------------------------------------------------------------------------------------------ */
/* Documents                                                                                  */
/* ------------------------------------------------------------------------------------------ */

/** Ids of the existing glass types by slug (targets of `related`). */
async function glassTypeIds(ctx: SeedContext): Promise<Map<string, string>> {
  const found = await ctx.payload.find({
    collection: COLLECTION,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return new Map(found.docs.map((doc) => [doc.slug ?? "", doc.id]));
}

/**
 * `related` (glass-type links, in order) + `relatedLinks` (other pages); `null` while a related
 * type does not exist yet (first run on an empty database).
 */
function relatedLinks(
  doc: GlassTypeContent,
  ids: ReadonlyMap<string, string>
): RelatedLink[] | null {
  const links: RelatedLink[] = [];
  for (const slug of doc.related ?? []) {
    const id = ids.get(slug);
    if (!id) return null;
    links.push({ link: { type: "doc", doc: { relationTo: COLLECTION, value: id } } });
  }
  for (const target of doc.relatedLinks ?? []) links.push({ link: customLink(target) });
  return links;
}

/** «Что важно знать»: the lead lines, then the button as a lead-less link-only item. */
async function importantItems(ctx: SeedContext, doc: GlassTypeContent) {
  const items = await calloutItems(ctx, doc.importantItems ?? []);
  if (doc.importantButton) {
    items.push({ text: await markdown(ctx, `→ ${link(doc.importantButton)}`) });
  }
  return items;
}

/** Payload data of one document from its content. */
async function buildData(
  ctx: SeedContext,
  doc: GlassTypeContent,
  photoId: () => Promise<string>,
  related: RelatedLink[]
): Promise<GlassTypeData> {
  const heroPhotos = doc.heroPhotoCaptions?.length
    ? await Promise.all(
        doc.heroPhotoCaptions.map(async (caption) => ({ image: await photoId(), caption }))
      )
    : [];

  return {
    title: doc.title,
    slug: doc.slug,
    urlBase: doc.urlBase,
    breadcrumbLabel: doc.breadcrumbLabel,
    order: doc.order,
    showInHub: doc.showInHub,
    _status: "published",
    card: { title: doc.card.title, text: doc.card.text ?? null },
    // Only a seed photo is written: an upload made in the admin survives `--force`.
    ...(doc.heroImage ? { heroImage: await imageId(ctx, doc.heroImage) } : {}),
    intro: await markdown(ctx, doc.intro),
    heroPhotos,
    variantsHeading: doc.variantsHeading ?? "Варианты",
    variants: (doc.variants ?? []).map((variant) => ({
      key: variant.key,
      name: variant.name,
      description: variant.description,
      application: variant.application ?? null,
      swatchKind: variant.swatchKind,
      swatchColor: variant.swatchColor ?? null,
      patternKey: variant.patternKey ?? null,
    })),
    variantsNote: doc.variantsNote ? await markdown(ctx, doc.variantsNote) : null,
    variantsCallout: {
      title: doc.variantsCallout?.title ?? null,
      body: doc.variantsCallout ? await markdown(ctx, doc.variantsCallout.body) : null,
    },
    tables: [
      ...(doc.specs?.length ? [specsTable(doc.specs)] : []),
      ...(doc.tables ?? []).map(siteTable),
    ],
    importantTitle: "Что важно знать до заказа",
    importantItems: await importantItems(ctx, doc),
    limits: {
      thickMin: doc.limits.thickMin ?? null,
      thickMax: doc.limits.thickMax ?? null,
      allowedThicknesses: doc.limits.allowedThicknesses ?? [],
      sizeMinW: doc.limits.sizeMinW ?? null,
      sizeMinH: doc.limits.sizeMinH ?? null,
      sizeMaxW: doc.limits.sizeMaxW ?? null,
      sizeMaxH: doc.limits.sizeMaxH ?? null,
      radius: doc.limits.radius ?? [],
      notes: doc.limits.notes ?? null,
    },
    applications: (doc.applications ?? []).map((item) => ({
      text: item.text,
      ...(item.link ? { link: customLink(item.link) } : {}),
    })),
    relatedLinks: related,
    showSamples: doc.showSamples,
    samplesSnippetKey: "samples",
    showObjects: false,
    faq: await Promise.all(
      (doc.faq ?? []).map(async (item) => ({
        question: item.question,
        answer: await markdown(ctx, item.answer),
      }))
    ),
    layout: await layout(ctx, doc.layout ?? []),
    seo: {
      h1: doc.seo.h1,
      title: doc.seo.title,
      description: doc.seo.description,
      noindex: false,
    },
    quizPrefill: {
      type: doc.quizPrefill.type,
      kind: doc.quizPrefill.kind ?? null,
      ctaLabel: "Рассчитать стоимость",
      secondaryForm: "drawing",
      secondaryLabel: "Отправить чертёж",
    },
  };
}

/**
 * Writes one document. Returns `false` when its `related` targets do not exist yet (first run
 * on an empty database): the caller writes it again after the other types.
 */
async function seedDoc(
  ctx: SeedContext,
  doc: GlassTypeContent,
  ids: ReadonlyMap<string, string>,
  photoId: () => Promise<string>
): Promise<boolean> {
  const where = { slug: { equals: doc.slug } };
  if (!(await mayOverwrite(ctx, COLLECTION, where, doc.slug))) return true;

  const related = relatedLinks(doc, ids);
  const { doc: saved } = await upsertBySlug(
    ctx,
    COLLECTION,
    { ...(await buildData(ctx, doc, photoId, related ?? [])), slug: doc.slug },
    { overwrite: true }
  );
  if (saved.path !== doc.path) {
    throw new Error(`glass-types ${doc.slug}: path ${saved.path ?? "—"}, ожидался ${doc.path}`);
  }
  return related !== null;
}

/* ------------------------------------------------------------------------------------------ */
/* Slice                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export async function seed(ctx: SeedContext): Promise<void> {
  // The pending-photo media is created lazily: only when a document is actually written.
  let photo: Promise<string> | null = null;
  const photoId = () => (photo ??= pendingPhotoId(ctx));

  let ids = await glassTypeIds(ctx);
  const pending: GlassTypeContent[] = [];
  for (const doc of GLASS_TYPES_CONTENT) {
    if (!(await seedDoc(ctx, doc, ids, photoId))) pending.push(doc);
  }
  // First run on an empty database: `related` of the earlier types named later ones.
  if (pending.length > 0) {
    ids = await glassTypeIds(ctx);
    for (const doc of pending) await seedDoc(ctx, doc, ids, photoId);
  }
}
