import sharp from "sharp";
import type { CalloutBlock, GlassType, RichTextBlock } from "@/payload-types";
import {
  GLASS_TYPES_CONTENT,
  layoutBackgrounds,
  type CalloutItemContent,
  type GlassTypeContent,
  type LayoutContent,
} from "../content/glass-types";
import { mayOverwrite, SEED_REQUEST_CONTEXT, upsertBySlug } from "../context";
import { markdown } from "../lexical";
import type { SeedContext } from "../context";
import type { RequiredDataFromCollectionSlug } from "payload";

/**
 * Seed slice «glass-types» (task 24): the eight glass-type pages — матовое, тонированное,
 * крашеное, осветлённое, для мебели, рифлёное, гнутое (`/zakalennoe-steklo/<slug>/`) and триплекс
 * (`/tripleks/`). Copy lives in `../content/glass-types.ts` (verbatim teksty, meta from 17-meta).
 *
 * Update rule: an existing document (matched by `slug`) is overwritten only with `--force` or
 * while it is unchanged since the seed's last write (`mayOverwrite` in `../context.ts`, seed
 * markers). Otherwise it is skipped with a log line, so editor changes survive a re-run.
 * Running the slice twice leaves the same eight documents.
 */

type GlassTypeData = RequiredDataFromCollectionSlug<"glass-types">;
type GlassTypeLayout = NonNullable<GlassType["layout"]>;

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

async function calloutItems(ctx: SeedContext, items: CalloutItemContent[]) {
  return Promise.all(
    items.map(async (item) => ({
      ...(item.lead ? { lead: item.lead } : {}),
      text: await markdown(ctx, item.text),
    }))
  );
}

async function layoutBlock(
  ctx: SeedContext,
  block: LayoutContent,
  background: "bg" | "sf"
): Promise<RichTextBlock | CalloutBlock> {
  if (block.kind === "richText") {
    return {
      blockType: "richText",
      background,
      ...(block.heading ? { heading: block.heading, headingLevel: "h2" as const } : {}),
      content: await markdown(ctx, block.md),
      width: "normal",
    };
  }
  return {
    blockType: "callout",
    background,
    tone: block.tone,
    ...(block.title ? { title: block.title } : {}),
    items: await calloutItems(ctx, block.items),
  };
}

const customLink = (target: { label: string; url: string }) => ({
  type: "custom" as const,
  url: target.url,
  label: target.label,
});

/** Payload data of one document from its content. */
async function buildData(
  ctx: SeedContext,
  doc: GlassTypeContent,
  photoId: () => Promise<string>
): Promise<GlassTypeData> {
  const backgrounds = layoutBackgrounds(doc);
  const layout: GlassTypeLayout = await Promise.all(
    (doc.layout ?? []).map((block, index) => layoutBlock(ctx, block, backgrounds[index] ?? "bg"))
  );
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
    tables: (doc.tables ?? []).map((table) => ({
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
    })),
    importantTitle: "Что важно знать до заказа",
    importantItems: await calloutItems(ctx, doc.importantItems ?? []),
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
    relatedLinks: (doc.relatedLinks ?? []).map((target) => ({ link: customLink(target) })),
    showSamples: doc.showSamples,
    samplesSnippetKey: "samples",
    showObjects: false,
    faq: await Promise.all(
      (doc.faq ?? []).map(async (item) => ({
        question: item.question,
        answer: await markdown(ctx, item.answer),
      }))
    ),
    layout,
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

/* ------------------------------------------------------------------------------------------ */
/* Slice                                                                                      */
/* ------------------------------------------------------------------------------------------ */

export async function seed(ctx: SeedContext): Promise<void> {
  // The pending-photo media is created lazily: only when a document is actually written.
  let photo: Promise<string> | null = null;
  const photoId = () => (photo ??= pendingPhotoId(ctx));

  for (const doc of GLASS_TYPES_CONTENT) {
    const where = { slug: { equals: doc.slug } };
    if (!(await mayOverwrite(ctx, "glass-types", where, doc.slug))) continue;

    const { doc: saved } = await upsertBySlug(
      ctx,
      "glass-types",
      { ...(await buildData(ctx, doc, photoId)), slug: doc.slug },
      { overwrite: true }
    );
    if (saved.path !== doc.path) {
      throw new Error(`glass-types ${doc.slug}: path ${saved.path ?? "—"}, ожидался ${doc.path}`);
    }
  }
}
