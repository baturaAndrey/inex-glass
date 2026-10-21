import type { ThicknessGroup } from "@/payload-types";
import {
  THICKNESS_CTA_LABEL,
  THICKNESS_GROUPS,
  THICKNESS_SEO,
  THICKNESS_VALUES,
} from "../content/thicknesses";
import { mayOverwrite, upsertByField } from "../context";
import { paragraphs } from "../lexical";
import type { SeedContext } from "../context";
import type { Where } from "payload";

/**
 * Seed slice «thicknesses» (task 23): enriches the 4 thickness groups and 8 thicknesses the base
 * seed creates (`--minimal` / `--full`) with the texts of teksty/03 and the SEO / quiz fields of
 * the cards (17-meta). A missing document is created.
 *
 * Natural keys: groups by `label`, thicknesses by `n`. Update rule: an existing document is
 * updated with `--force` or while it is unchanged since the seed's last write (`mayOverwrite`,
 * seed markers in `../marker.ts`); an edited one is skipped with a log line. `indexable` is never
 * set here (the base seed decides: false for 5, 15, 19 mm), nor weight / slug / path (hooks).
 */

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
