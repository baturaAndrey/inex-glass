import { CtaButtons } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, mediaSrc } from "@/components/blocks/shared";
import {
  CLIENTS_FORM_ANCHOR,
  CLIENTS_TEMPLATE_COPY,
  SEGMENT_LINKS_ANCHOR,
} from "@/components/clients/copy";
import { drawingPanelParams } from "@/components/clients/drawing-params";
import { segmentPieces } from "@/components/clients/segment-pieces";
import { loadSegmentLinks } from "@/components/clients/segments";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { buildArticle, SubpageArticle } from "@/components/how-to-order/subpage-article";
import { SubpageLinks } from "@/components/how-to-order/subpage-links";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { pickFirst, withExplicitBackgrounds } from "@/lib/service/page-compose";
import type { ServicePageData } from "@/lib/service/service-page";

/**
 * Segment pages of «С кем мы работаем» (`/klientam/podryadchikam/` and its three siblings: a
 * `pages` document with the template «Сегмент» under the hub), restyled to the Paper mockup
 * `2560_klientam_podryadchikam` (2026-11). Built from the «Как заказать» subpage template:
 *
 * breadcrumbs → photo hero (H1, lead, «Рассчитать стоимость» + the page's «Отправить …»
 * button) → the article at full width, without «На странице» (`buildArticle` + the segment
 * renderings of `@/components/clients/segment-pieces`: tables, step cards, feature cards, link
 * rows, the closing «{условия}» note) → blocks the article does not render → cream block: the
 * drawing-form panel (the `form` block configures it) and the tiles of the four segments with
 * the current one dark (`aria-current="page"`), read from the hub's segment table.
 *
 * The frame's «Условия» strip and quiz CTA are off: the note and the panel close the page.
 */

const FORM_HEADING_ID = "segment-form-title";

export async function ClientsSegmentPage({ data }: { data: ServicePageData }) {
  const { page, path, placeholders: ctx, blockPage, title, breadcrumbLabel } = data;
  const layout = page.layout ?? [];
  const hero = pickFirst(layout, "hero");
  const form = pickFirst(layout, "form");
  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;

  const { sections, trailing } = buildArticle({
    layout,
    ctx,
    page: blockPage,
    override: (block) => segmentPieces(block, ctx),
  });
  const links = await loadSegmentLinks(ctx);

  return (
    <PageShell path={path} breadcrumbLabel={breadcrumbLabel} showConditions={false} quiz={false}>
      <ProcessingHero
        title={(hero ? fill(hero.titleOverride, ctx) : "") || title}
        lead={hero?.lead ? <RichText data={hero.lead} ctx={ctx} /> : undefined}
        actions={
          hero ? (
            <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="contents" />
          ) : null
        }
        media={media && src ? { src, alt: media.alt?.trim() ?? "" } : null}
        indentActions
      />

      <SubpageArticle sections={sections} toc={false} />

      {trailing.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(trailing)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        <DrawingPanel
          heading={(form && fill(form.heading, ctx)) || undefined}
          headingId={FORM_HEADING_ID}
          params={drawingPanelParams(form, path, ctx)}
          anchorId={CLIENTS_FORM_ANCHOR}
        />
        <SubpageLinks
          links={links}
          currentPath={path}
          label={CLIENTS_TEMPLATE_COPY.segmentLinks}
          id={SEGMENT_LINKS_ANCHOR}
          testId="segment-links"
        />
      </CreamBlock>
    </PageShell>
  );
}
