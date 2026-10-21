import type { ThicknessGroup } from "@/payload-types";
import {
  THICKNESS_CTA_LABEL,
  THICKNESS_GROUPS,
  THICKNESS_SEO,
  THICKNESS_VALUES,
} from "../content/thicknesses";
import { upsertByField } from "../context";
import { paragraphs } from "../lexical";
import type { SeedContext } from "../context";
import type { CollectionSlug, Where } from "payload";

/**
 * Seed slice «thicknesses» (task 23): enriches the 4 thickness groups and 8 thicknesses the base
 * seed creates (`--minimal` / `--full`) with the texts of teksty/03 and the SEO / quiz fields of
 * the cards (17-meta). A missing document is created.
 *
 * Natural keys: groups by `label`, thicknesses by `n`. Update rule: an existing document is
 * updated with `--force` or while it is still untouched (`updatedAt` within 2 s of `createdAt` —
 * written once by a seed); an edited one is skipped with a log line. `indexable` is never set
 * here (the base seed decides: false for 5, 15, 19 mm), nor weight / slug / path (hooks).
 */

/** A document saved once (by a seed) has `updatedAt ≈ createdAt`; an editor's save moves it. */
const PRISTINE_WINDOW_MS = 2000;

/**
 * Whether the slice may overwrite the document matching `where`: always with `--force`, when
 * it does not exist yet, or while it is untouched. Logs the skip otherwise.
 */
export async function mayOverwrite(
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
  if (!pristine) {
    ctx.log(`${collection} ${label}: изменён в админке — пропуск (используйте --force)`);
  }
  return pristine;
}

type FaqItems = NonNullable<ThicknessGroup["faq"]>;

const faq = (pairs: ReadonlyArray<readonly [string, string]>): FaqItems =>
  pairs.map(([question, answer]) => ({ question, answer: paragraphs(answer) }));

/** Upserts the groups; returns their ids by label (also for skipped, existing groups). */
async function seedGroups(ctx: SeedContext): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const group of THICKNESS_GROUPS) {
    const where: Where = { label: { equals: group.label } };
    const overwrite = await mayOverwrite(ctx, "thickness-groups", where, group.label);
    const { doc } = await upsertByField(
      ctx,
      "thickness-groups",
      where,
      {
        label: group.label,
        slug: group.slug,
        order: group.order,
        podborText: paragraphs(group.podbor),
        obrabotkaText: paragraphs(group.obrabotka),
        faq: faq(group.faq),
      },
      { overwrite, label: group.label }
    );
    ids.set(group.label, doc.id);
  }
  return ids;
}

async function seedThicknessCards(ctx: SeedContext, groupIds: Map<string, string>): Promise<void> {
  for (const item of THICKNESS_VALUES) {
    const groupId = groupIds.get(item.groupLabel);
    if (!groupId) throw new Error(`группа толщин «${item.groupLabel}» не найдена`);
    const label = `${item.n} мм`;
    const where: Where = { n: { equals: item.n } };
    const overwrite = await mayOverwrite(ctx, "thicknesses", where, label);
    await upsertByField(
      ctx,
      "thicknesses",
      where,
      {
        n: item.n,
        group: groupId,
        kindsText: item.kindsText,
        // `null` clears a stale override; the template then uses the size of `tech-params`.
        sizeText: item.sizeText ?? null,
        seo: { ...THICKNESS_SEO },
        // `thickness` is derived from `n` by the collection hook.
        quizPrefill: { type: "tempered", ctaLabel: THICKNESS_CTA_LABEL },
      },
      { overwrite, label }
    );
  }
}

export async function seed(ctx: SeedContext): Promise<void> {
  const groupIds = await seedGroups(ctx);
  await seedThicknessCards(ctx, groupIds);
}
