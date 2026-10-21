import { findGlazingMirrorsRoute } from "@/lib/cms/glazing-mirrors-routes";
import type { GlazingMirrorsRoute } from "@/lib/cms/glazing-mirrors-routes";
import type { QuizTypeId } from "@/lib/domain";
import type { Construction } from "@/payload-types";
import {
  GLAZING_MIRRORS_CONTENT,
  OBJECTS_HEADING,
  QUIZ_CTA_LABEL,
} from "../content/glazing-mirrors";
import { upsertBySlug } from "../context";
import { markdown } from "../lexical";
import type {
  GlazingMirrorsPageContent,
  LayoutContent,
  LayoutSlot,
} from "../content/glazing-mirrors";
import type { SeedContext } from "../context";
import type { LexicalState } from "../lexical";
import type { RequiredDataFromCollectionSlug } from "payload";

/**
 * Seed slice «glazing-mirrors» (task 27): the 9 `constructions` documents of «Остекление»
 * (`/osteklenie/` + 5 children) and «Зеркала» (`/zerkala/` + 2 children).
 *
 * - Content: `src/seed/content/glazing-mirrors.ts` (verbatim teksty, checked by the test).
 * - Idempotent upsert by `slug`: an existing document is skipped unless `--force`, so editor
 *   changes survive a re-run; fields the slice does not set are never touched.
 * - Hubs first: children get the hub as `parent`, and the collection hook computes their
 *   path (`/osteklenie/fasadov/`). The resulting path is verified against the route table.
 * - `productTag`: the product tag of the page's quiz type when that record exists (created by
 *   the reference data); products are never created here.
 */

type ConstructionData = RequiredDataFromCollectionSlug<"constructions">;
type LayoutBlock = NonNullable<Construction["layout"]>[number];

/** Markdown → Lexical; injected so the builder is testable without a Payload instance. */
export type MarkdownConverter = (md: string) => Promise<LexicalState>;

/** Product tag (`products.quizType`) per page; pages without an own product stay untagged. */
const PRODUCT_TAG_TYPE: Readonly<Record<string, QuizTypeId>> = {
  "/osteklenie/fasadov/": "facade",
  "/osteklenie/spajdernoe/": "facade",
  "/osteklenie/verand-terras-besedok/": "verandas",
  "/zerkala/": "mirrors",
  "/zerkala/dlya-zalov/": "mirrors",
  "/zerkala/dlya-salonov/": "mirrors",
};

/** `anchorId` of a template slot block (`slot-objects-1`), see the task-26 template. */
function slotAnchor(slot: LayoutSlot | undefined, index: number): string | undefined {
  return slot ? `slot-${slot}-${index + 1}` : undefined;
}

async function buildBlock(
  block: LayoutContent,
  index: number,
  md: MarkdownConverter
): Promise<LayoutBlock> {
  switch (block.type) {
    case "richText": {
      const anchorId = slotAnchor(block.slot, index);
      return {
        blockType: "richText",
        ...(block.heading ? { heading: block.heading } : {}),
        ...(anchorId ? { anchorId } : {}),
        content: await md(block.markdown),
        width: "normal",
      };
    }
    case "table":
      return {
        blockType: "table",
        ...(block.heading ? { heading: block.heading } : {}),
        table: {
          role: "other",
          mobileMode: "cards",
          columns: block.columns.map((label) => ({ label })),
          rows: block.rows.map((cells) => ({
            cells: cells.map((cell) => ({
              value: cell.value,
              ...(cell.href ? { href: cell.href } : {}),
            })),
          })),
        },
      };
    case "cards":
      return {
        blockType: "cards",
        heading: block.heading,
        layout: "g3",
        items: block.items.map((item) => ({
          title: item.title,
          text: item.text,
          link: { type: "custom", url: item.href },
        })),
      };
    case "callout": {
      const items = await Promise.all(
        (block.items ?? []).map(async (item) => ({
          lead: item.lead,
          text: await md(item.markdown),
        }))
      );
      return {
        blockType: "callout",
        ...(block.heading ? { heading: block.heading } : {}),
        tone: block.tone,
        ...(block.title ? { title: block.title } : {}),
        ...(block.markdown ? { body: await md(block.markdown) } : {}),
        ...(items.length > 0 ? { items } : {}),
      };
    }
  }
}

export interface BuildOptions {
  md: MarkdownConverter;
  /** Id of the hub document (children only). */
  parentId?: string | null;
  productTagId?: string | null;
}

/** `constructions` document data of one page (pure apart from the injected converter). */
export async function buildConstructionData(
  page: GlazingMirrorsPageContent,
  route: GlazingMirrorsRoute,
  { md, parentId = null, productTagId = null }: BuildOptions
): Promise<ConstructionData> {
  const layout = await Promise.all(page.layout.map((block, index) => buildBlock(block, index, md)));
  const hasObjectsSlot = page.layout.some(
    (block) => block.type === "richText" && block.slot === "objects"
  );

  return {
    title: page.title,
    kind: route.kind,
    group: route.section === "osteklenie" ? "glazing" : "mirrors",
    parent: parentId,
    slug: route.docSlug,
    breadcrumbLabel: route.label,
    order: page.order,
    productTag: productTagId,
    card: { title: route.label, ...(page.card ? { text: page.card.text } : {}) },
    intro: await md(page.intro),
    ctaPrimaryLabel: QUIZ_CTA_LABEL,
    ctaSecondaryLabel: page.secondaryLabel,
    secondaryFormKey: "drawing",
    ...(page.systems
      ? {
          systemsHeading: page.systemsHeading ?? null,
          systemsLayout: "cards" as const,
          systems: page.systems.map((system) => ({
            name: system.name,
            ...(system.subtitle ? { subtitle: system.subtitle } : {}),
            ...(system.whereFits ? { whereFits: system.whereFits } : {}),
          })),
        }
      : {}),
    ...(page.profileSystems
      ? { profileSystems: page.profileSystems.map((name) => ({ name })) }
      : {}),
    ...(page.glassBullets
      ? {
          glassHeading: page.glassHeading ?? null,
          glassBullets: await Promise.all(
            page.glassBullets.map(async (bullet) => ({ body: await md(bullet) }))
          ),
        }
      : {}),
    ...(hasObjectsSlot ? { objectsHeading: OBJECTS_HEADING } : {}),
    inexSuBridge: page.inexSuBridge
      ? {
          enabled: true,
          title: page.inexSuBridge.title,
          buttonLabel: page.inexSuBridge.buttonLabel,
          url: page.inexSuBridge.url,
        }
      : { enabled: false },
    layout,
    seo: { h1: page.seo.h1, title: page.seo.title, description: page.seo.description },
    quizPrefill: {
      type: route.quizType,
      ctaLabel: QUIZ_CTA_LABEL,
      secondaryForm: "drawing",
      secondaryLabel: page.secondaryLabel,
    },
    _status: "published",
  };
}

/** Route of a content page; a page outside the route table is a content bug. */
function routeOf(page: GlazingMirrorsPageContent): GlazingMirrorsRoute {
  const route = findGlazingMirrorsRoute(page.path);
  if (!route) throw new Error(`glazing-mirrors: ${page.path} нет в GLAZING_MIRRORS_ROUTES`);
  return route;
}

/** Ids of the product tags by quiz type (only existing records). */
async function loadProductTags(ctx: SeedContext): Promise<Map<string, string>> {
  const { docs } = await ctx.payload.find({
    collection: "products",
    where: { quizType: { in: [...new Set(Object.values(PRODUCT_TAG_TYPE))] } },
    limit: 50,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  const tags = new Map<string, string>();
  for (const doc of docs) if (doc.quizType) tags.set(doc.quizType, String(doc.id));
  return tags;
}

export async function seed(ctx: SeedContext): Promise<void> {
  const md: MarkdownConverter = (source) => markdown(ctx, source);
  const productTags = await loadProductTags(ctx);
  const hubIds = new Map<string, string>();

  for (const page of GLAZING_MIRRORS_CONTENT) {
    const route = routeOf(page);
    const parentId = route.parentSlug ? hubIds.get(route.parentSlug) : null;
    if (parentId === undefined) {
      throw new Error(`glazing-mirrors: хаб ${route.parentSlug} должен идти раньше ${route.path}`);
    }
    const productType = PRODUCT_TAG_TYPE[route.path];
    const data = await buildConstructionData(page, route, {
      md,
      parentId,
      productTagId: productType ? (productTags.get(productType) ?? null) : null,
    });

    const { doc } = await upsertBySlug(ctx, "constructions", { ...data, slug: route.docSlug });
    if (route.kind === "hub") hubIds.set(route.docSlug, String(doc.id));
    if (doc.path !== route.path) {
      ctx.log(
        `constructions ${route.docSlug}: адрес ${doc.path ?? "—"} вместо ${route.path} — проверьте родителя и слаг`
      );
    }
  }
}
