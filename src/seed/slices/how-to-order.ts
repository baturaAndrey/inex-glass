import type { LayoutBlock } from "@/components/blocks/types";
import type { CtaBlock, Page } from "@/payload-types";
import { HOW_TO_ORDER_PAGES, HUB_PATH } from "../content/how-to-order";
import { upsertByPath } from "../context";
import { markdown } from "../lexical";
import type {
  ServiceBlock,
  ServiceButton,
  ServiceCell,
  ServicePageSeed,
} from "../content/how-to-order";
import type { SeedContext } from "../context";

/**
 * Seed slice «how-to-order» (task 28): the «Как заказать» hub, its eight child pages and
 * `/proektirovanie/` — 10 published `pages` documents. Content lives in
 * `src/seed/content/how-to-order.ts`; this file only maps it onto the block schema
 * (`src/payload/blocks/*`).
 *
 * Idempotent upsert by `path`. The hub was created as a placeholder by the mini-seed (task 16),
 * so this slice takes it over (`overwrite: true`); the other pages follow `--force`, so editor
 * changes survive a plain re-run.
 */

type HeroButton = NonNullable<CtaBlock["buttons"]>[number];
type BlockBuilder = (ctx: SeedContext, block: ServiceBlock) => Promise<LayoutBlock>;

const DEFAULT_HOLES_THICKNESS = "10";

function button(spec: ServiceButton): HeroButton {
  switch (spec.kind) {
    case "quiz":
      return { label: spec.label, kind: "quiz", variant: "primary", icon: "calculator" };
    case "form":
      return {
        label: spec.label,
        kind: "form",
        variant: spec.variant ?? "primary",
        icon: spec.icon ?? "file-text",
        formKey: "drawing",
        formParams: { label: spec.label, source: spec.source },
      };
    case "link":
      return {
        label: spec.label,
        kind: "link",
        variant: "primary",
        ...(spec.icon ? { icon: spec.icon } : {}),
        link: { type: "custom", url: spec.url },
      };
  }
}

function cell(spec: ServiceCell) {
  return typeof spec === "string" ? { value: spec } : { value: spec.value, href: spec.href };
}

const toBlock: BlockBuilder = async (ctx, block) => {
  switch (block.type) {
    case "hero":
      return {
        blockType: "hero",
        variant: "p5Top",
        // The «Условия» section of the page frame closes every page; no strip in the hero.
        showTerms: false,
        ...(block.lead ? { lead: await markdown(ctx, block.lead) } : {}),
        buttons: block.buttons.map(button),
      };
    case "richText":
      return {
        blockType: "richText",
        ...(block.heading ? { heading: block.heading } : {}),
        content: await markdown(ctx, block.markdown),
        width: block.width ?? "normal",
      };
    case "table": {
      const numeric = new Set(block.numeric ?? []);
      return {
        blockType: "table",
        ...(block.heading ? { heading: block.heading } : {}),
        table: {
          role: "parameters",
          mobileMode: "cards",
          columns: block.columns.map((label, index) => ({
            label,
            align: numeric.has(index) ? "right" : "left",
            numeric: numeric.has(index),
          })),
          rows: block.rows.map((row) => ({ cells: row.map(cell) })),
          ...(block.footnote ? { footnote: block.footnote } : {}),
        },
      };
    }
    case "callout":
      return {
        blockType: "callout",
        tone: block.tone,
        ...(block.title ? { title: block.title } : {}),
        ...(block.body ? { body: await markdown(ctx, block.body) } : {}),
        items: await Promise.all(
          (block.items ?? []).map(async (item) => ({ text: await markdown(ctx, item) }))
        ),
      };
    case "steps":
      return {
        blockType: "steps",
        variant: "vertical",
        ...(block.heading ? { heading: block.heading } : {}),
        items: block.items.map((item) => ({
          title: item.title,
          ...(item.text ? { text: item.text } : {}),
          ...(item.link
            ? { linkLabel: item.link.label, link: { type: "custom", url: item.link.url } }
            : {}),
        })),
      };
    case "holesCalculator":
      return { blockType: "holesCalculator", defaultThickness: DEFAULT_HOLES_THICKNESS };
    case "download":
      return {
        blockType: "download",
        variant: "list",
        items: block.items.map((item) => ({ title: item.title })),
      };
    case "cta":
      return {
        blockType: "cta",
        variant: "buttons",
        tone: "light",
        buttons: block.buttons.map(button),
      };
    case "form":
      return {
        blockType: "form",
        formKey: "drawing",
        variant: "page",
        params: { label: block.label, source: block.source, accept: block.accept.join(",") },
      };
  }
};

async function pageData(
  ctx: SeedContext,
  spec: ServicePageSeed,
  parentId: string | null
): Promise<Omit<Page, "id" | "createdAt" | "updatedAt">> {
  const layout: LayoutBlock[] = [];
  for (const block of spec.layout) layout.push(await toBlock(ctx, block));
  return {
    title: spec.seo.h1,
    slug: spec.slug,
    template: spec.template,
    breadcrumbLabel: spec.breadcrumbLabel,
    ...(parentId ? { parent: parentId } : {}),
    seo: { ...spec.seo, noindex: false },
    layout,
    hideConditions: false,
    hideQuizCta: spec.hideQuizCta,
    _status: "published",
  };
}

export async function seed(ctx: SeedContext): Promise<void> {
  let hubId: string | null = null;
  for (const spec of HOW_TO_ORDER_PAGES) {
    if (spec.child && !hubId) {
      throw new Error(`how-to-order: ${spec.path} — хаб ${HUB_PATH} ещё не создан`);
    }
    const data = await pageData(ctx, spec, spec.child ? hubId : null);
    const isHub = spec.path === HUB_PATH;
    const { doc } = await upsertByPath(ctx, "pages", spec.path, data, {
      // The mini-seed placeholder of the hub is replaced by the real page.
      ...(isHub ? { overwrite: true } : {}),
    });
    if (isHub) hubId = String(doc.id);
  }
}
