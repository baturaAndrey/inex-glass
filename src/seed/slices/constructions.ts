import type { QuizTypeId } from "@/lib/domain";
import type { Construction } from "@/payload-types";
import {
  CONSTRUCTIONS,
  type ConstructionSeed,
  type FaqSeed,
  type LayoutSeed,
} from "../content/constructions";
import { mayOverwrite, upsertBySlug } from "../context";
import { getEditorConfig, markdownToLexical, type LexicalState } from "../lexical";
import type { SeedContext } from "../context";
import type { RequiredDataFromCollectionSlug } from "payload";

/**
 * Seed slice «constructions» (task 26): the hub `/steklyannye-konstrukcii/` and six root
 * construction pages (`../content/constructions.ts`), published.
 *
 * Idempotent by `slug`. An existing document is updated only with `--force` or while it is
 * unchanged since the seed's last write (`mayOverwrite` in `../context.ts`, seed markers —
 * e.g. the mini-seed stub of `steklyannye-peregorodki`); otherwise it is skipped with a log
 * line, so editor changes survive a re-run. `productTag` links an EXISTING `products` record
 * (matched by `quizType`); the slice never creates taxonomy records or objects.
 */

type LayoutBlock = NonNullable<Construction["layout"]>[number];
type ConstructionData = RequiredDataFromCollectionSlug<"constructions">;

type Md = (markdown: string) => LexicalState;

function layoutBlock(block: LayoutSeed, md: Md): LayoutBlock {
  switch (block.type) {
    case "richText":
      return {
        blockType: "richText",
        ...(block.heading ? { heading: block.heading } : {}),
        ...(block.anchorId ? { anchorId: block.anchorId } : {}),
        width: block.width ?? "normal",
        content: md(block.md),
      };
    case "table":
      return {
        blockType: "table",
        heading: block.heading,
        ...(block.sub ? { sub: block.sub } : {}),
        ...(block.anchorId ? { anchorId: block.anchorId } : {}),
        table: {
          ...(block.table.caption ? { caption: block.table.caption } : {}),
          role: "other",
          mobileMode: "cards",
          columns: block.table.columns.map((label) => ({ label, align: "left" as const })),
          rows: block.table.rows.map((cells) => ({ cells: cells.map((value) => ({ value })) })),
          ...(block.table.footnote ? { footnote: block.table.footnote } : {}),
        },
      };
    case "callout":
      return {
        blockType: "callout",
        ...(block.heading ? { heading: block.heading } : {}),
        tone: block.tone,
        ...(block.title ? { title: block.title } : {}),
        body: md(block.md),
      };
    case "cards":
      return {
        blockType: "cards",
        heading: block.heading,
        layout: block.layout,
        items: block.items.map((item) => ({
          title: item.title,
          text: item.text,
          link: { type: "custom" as const, url: item.url },
        })),
      };
  }
}

const faqItems = (faq: FaqSeed[], md: Md) =>
  faq.map((item) => ({ question: item.question, answer: md(item.answer) }));

/** Id of the `products` record of a quiz type, if the taxonomy already has it. */
async function findProductId(ctx: SeedContext, quizType: QuizTypeId): Promise<string | null> {
  const { docs } = await ctx.payload.find({
    collection: "products",
    where: { quizType: { equals: quizType } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return docs[0]?.id ? String(docs[0].id) : null;
}

/** Collection data of one seed document (relations resolved by the caller). */
export function constructionData(
  item: ConstructionSeed,
  md: Md,
  productId: string | null
): ConstructionData {
  return {
    title: item.title,
    slug: item.slug,
    kind: item.kind,
    group: item.group,
    parent: null,
    order: item.order,
    breadcrumbLabel: item.breadcrumbLabel,
    card: { title: item.card.title, text: item.card.text },
    seo: { ...item.seo, noindex: false },
    intro: md(item.intro),
    ctaPrimaryLabel: item.ctaPrimaryLabel,
    ctaSecondaryLabel: item.ctaSecondaryLabel ?? null,
    secondaryFormKey: item.secondaryFormKey,
    quizPrefill: {
      type: item.quizType,
      ctaLabel: item.ctaPrimaryLabel,
      secondaryForm: item.secondaryFormKey,
      secondaryLabel: item.ctaSecondaryLabel ?? null,
    },
    // Only link a product that exists; otherwise keep whatever the document has.
    ...(productId ? { productTag: productId } : {}),
    systemsHeading: item.systemsHeading ?? null,
    systemsLayout: item.systemsLayout ?? "cards",
    systems: (item.systems ?? []).map((system) => ({
      name: system.name,
      subtitle: system.subtitle ?? null,
      whereFits: system.whereFits ?? null,
      important: system.important ?? null,
      howHeld: system.howHeld ?? null,
      requiresInGlass: system.requiresInGlass ?? null,
      schemeSvg: system.schemeSvg ?? null,
    })),
    profileSystems: (item.profileSystems ?? []).map((name) => ({ name })),
    glassHeading: item.glassHeading ?? null,
    glassBullets: (item.glassBullets ?? []).map((body) => ({ body: md(body) })),
    riskCallout: item.riskCallout
      ? { enabled: true, title: item.riskCallout.title, body: md(item.riskCallout.body) }
      : { enabled: false },
    documents: item.documents ? md(item.documents) : null,
    objectsHeading: item.objectsHeading ?? null,
    whoDoesWhat: item.whoDoesWhat
      ? {
          enabled: true,
          leftItems: item.whoDoesWhat.left.map((text) => ({ text })),
          rightItems: item.whoDoesWhat.right.map((text) => ({ text })),
        }
      : { enabled: false },
    inexSuBridge: item.inexSuBridge ? { enabled: true, ...item.inexSuBridge } : { enabled: false },
    snowCalcBlock: item.snowCalcBlock
      ? {
          enabled: true,
          title: item.snowCalcBlock.title,
          body: md(item.snowCalcBlock.body),
          sideText: item.snowCalcBlock.sideText,
          ctaLabel: item.snowCalcBlock.ctaLabel,
        }
      : { enabled: false },
    showShowerConfigs: item.showShowerConfigs ?? false,
    faq: faqItems(item.faq ?? [], md),
    layout: item.layout.map((block) => layoutBlock(block, md)),
    _status: "published",
  };
}

export async function seed(ctx: SeedContext): Promise<void> {
  const editorConfig = await getEditorConfig(ctx.payload);
  const md: Md = (markdown) => markdownToLexical(markdown, editorConfig);

  for (const item of CONSTRUCTIONS) {
    const where = { slug: { equals: item.slug } };
    if (!(await mayOverwrite(ctx, "constructions", where, item.slug))) continue;
    const productId = item.productQuizType ? await findProductId(ctx, item.productQuizType) : null;
    if (item.productQuizType && !productId) {
      ctx.log(
        `constructions ${item.slug}: нет записи products (${item.productQuizType}), productTag не задан`
      );
    }
    await upsertBySlug(ctx, "constructions", constructionData(item, md, productId), {
      overwrite: true,
    });
  }
}
