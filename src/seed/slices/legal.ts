import type { Page, RichTextBlock, TableBlock } from "@/payload-types";
import { CONSENT, POLICY, type LegalPage } from "../content/legal";
import { upsertByPath } from "../context";
import { markdown } from "../lexical";
import type { SeedContext } from "../context";
import type { LexicalState } from "../lexical";

/**
 * Seed slice «legal» (task 29): the personal-data policy and the consent, template `legal`,
 * published (form checkboxes link to them), `noindex, follow`, without the «Условия» section, the
 * quiz CTA and hero buttons (no hero at all: the catch-all renders the plain H1). Copy lives in
 * `../content/legal.ts` — the lawyer's draft with its `[…]` fields kept as they are.
 *
 * Both pages were created as placeholders by the mini-seed; the slice owns their full content
 * and upserts them with `overwrite: true` (idempotent).
 */

type LayoutBlock = NonNullable<Page["layout"]>[number];

/** One continuous document: every block on the page background (no bg ↔ sf stripes). */
const BACKGROUND = "bg" as const;

const richText = (content: LexicalState): RichTextBlock => ({
  blockType: "richText",
  background: BACKGROUND,
  content,
  width: "normal",
});

function pageData(entry: LegalPage, layout: LayoutBlock[]) {
  return {
    title: entry.title,
    slug: entry.slug,
    template: "legal" as const,
    breadcrumbLabel: entry.breadcrumbLabel,
    _status: "published" as const,
    hideConditions: true,
    hideQuizCta: true,
    seo: {
      h1: entry.seo.h1,
      title: entry.seo.title,
      description: entry.seo.description,
      noindex: true,
    },
    layout,
  };
}

async function policyLayout(ctx: SeedContext): Promise<LayoutBlock[]> {
  const purposes: TableBlock = {
    blockType: "table",
    heading: POLICY.purposes.heading,
    background: BACKGROUND,
    table: {
      role: "other",
      mobileMode: "cards",
      caption: POLICY.purposes.heading,
      columns: POLICY.purposes.columns.map((label) => ({ label })),
      rows: POLICY.purposes.rows.map((cells) => ({ cells: cells.map((value) => ({ value })) })),
    },
  };
  return [
    richText(await markdown(ctx, POLICY.intro)),
    purposes,
    richText(await markdown(ctx, POLICY.body)),
  ];
}

export async function seed(ctx: SeedContext): Promise<void> {
  await upsertByPath(
    ctx,
    "pages",
    POLICY.page.path,
    pageData(POLICY.page, await policyLayout(ctx)),
    { overwrite: true }
  );
  await upsertByPath(
    ctx,
    "pages",
    CONSENT.page.path,
    pageData(CONSENT.page, [richText(await markdown(ctx, CONSENT.body))]),
    { overwrite: true }
  );
}
