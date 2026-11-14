import { CtaButtons } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, mediaSrc } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { CLIENTS_FORM_ANCHOR, CLIENTS_TEMPLATE_COPY } from "@/components/clients/copy";
import { drawingPanelParams } from "@/components/clients/drawing-params";
import { MontagePanel } from "@/components/clients/montage-panel";
import { SegmentCards, type SegmentCardItem } from "@/components/clients/segment-cards";
import { findSegmentsTable, segmentPhoto, segmentsOf } from "@/components/clients/segments";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getConditions } from "@/lib/cms/globals";
import type { PlaceholderContext } from "@/lib/domain";
import { pickFirst, withExplicitBackgrounds } from "@/lib/service/page-compose";
import type { ServicePageData } from "@/lib/service/service-page";

/**
 * Hub `/klientam/` «С кем мы работаем» (a `pages` document with the template «Сегмент»),
 * restyled to the Paper mockup `2560_klientam` (2026-11). Blocks are placed by role:
 *
 * - `hero` → photo hero: H1, lead, the terms checklist of the `conditions` global (`showTerms`),
 *   «Рассчитать стоимость» / «Отправить чертёж»;
 * - first `table` → the segment cards (segment, «Ваша задача», «Что берём на себя»,
 *   «Подробнее»); the card photo is the hero photo of the segment page;
 * - first `cta` with `tone: primaryDark` → the dark «Монтаж» panel (inex.su button);
 * - first `form` → the drawing-form panel in the cream block (heading, lead params).
 *
 * Any other block renders after the panel, as on any page. The frame's «Условия» strip and quiz
 * CTA are off: the hero lists the terms and carries both actions, the form closes the page.
 */

const FORM_HEADING_ID = "clients-form-title";

/** Terms checklist of the hero: the full terms bar of the `conditions` global. */
async function heroTerms(ctx: PlaceholderContext): Promise<string[]> {
  const conditions = await getConditions();
  return (conditions?.termsBar ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
}

export async function ClientsHubPage({ data }: { data: ServicePageData }) {
  const { page, path, placeholders: ctx, blockPage, title, breadcrumbLabel } = data;
  const layout = page.layout ?? [];
  const hero = pickFirst(layout, "hero");
  const table = findSegmentsTable(layout);
  const montage =
    (layout.find((block) => block.blockType === "cta" && block.tone === "primaryDark") as
      BlockOf<"cta"> | undefined) ?? null;
  const form = pickFirst(layout, "form");
  const used = new Set<unknown>([hero, table, montage, form]);
  const rest = layout.filter((block) => !used.has(block));

  const segments = table ? segmentsOf(table, ctx) : null;
  const [terms, photos] = await Promise.all([
    hero?.showTerms ? heroTerms(ctx) : Promise.resolve([]),
    Promise.all((segments?.items ?? []).map((item) => segmentPhoto(item.href))),
  ]);
  const cards: SegmentCardItem[] = (segments?.items ?? []).map((item, index) => ({
    ...item,
    photo: photos[index] ?? null,
  }));

  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;

  return (
    <PageShell path={path} breadcrumbLabel={breadcrumbLabel} showConditions={false} quiz={false}>
      <ProcessingHero
        title={(hero ? fill(hero.titleOverride, ctx) : "") || title}
        lead={hero?.lead ? <RichText data={hero.lead} ctx={ctx} /> : undefined}
        terms={terms}
        actions={
          hero ? (
            <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="contents" />
          ) : null
        }
        media={media && src ? { src, alt: media.alt?.trim() ?? "" } : null}
        indentActions
      />

      {cards.length > 0 || montage ? (
        <section
          aria-label={CLIENTS_TEMPLATE_COPY.segments}
          className="mx-auto flex w-full max-w-[1920px] flex-col gap-10 px-(--ig-gutter) py-16 max-md:gap-8 max-md:py-12 max-sm:gap-6 max-sm:py-8"
          data-section="segments"
        >
          {segments ? <SegmentCards segments={segments} items={cards} /> : null}
          {montage ? <MontagePanel block={montage} ctx={ctx} page={blockPage} /> : null}
        </section>
      ) : null}

      {rest.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(rest)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        <DrawingPanel
          heading={(form && fill(form.heading, ctx)) || undefined}
          headingId={FORM_HEADING_ID}
          params={drawingPanelParams(form, path, ctx)}
          anchorId={CLIENTS_FORM_ANCHOR}
        />
      </CreamBlock>
    </PageShell>
  );
}
