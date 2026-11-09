import { CtaButtons, toFormParams } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, mediaSrc } from "@/components/blocks/shared";
import type { BlockOf } from "@/components/blocks/types";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { redirectIfExists } from "@/lib/cms/queries";
import { pickFirst, withExplicitBackgrounds } from "@/lib/service/page-compose";
import { loadServicePage, type ServicePageData } from "@/lib/service/service-page";
import { UPLOAD_ANCHOR } from "./copy";
import { buildArticle, SubpageArticle, type BuildArticleOptions } from "./subpage-article";
import { loadSubpageLinks, SubpageLinks } from "./subpage-links";

/**
 * Template of the «Как заказать» subpages and of every `pages` document with the template
 * «Услуга / сервис» (Paper mockup `2560_kak-zakazat_trebovaniya`, 2026-11):
 *
 * breadcrumbs → photo hero (H1, lead, the hero buttons) → article («На странице» + H2 sections
 * built from the layout, `./subpage-article.tsx`) → blocks the article does not render → cream
 * block: the dark drawing-form panel (`#dr-up`, the target of «Загрузить чертёж») and the
 * subpage cards of the hub with the current page highlighted.
 *
 * The page's `form` block only configures the panel (heading, lead params); without one the
 * panel still closes the page (the mockup template). The frame's «Условия» strip and quiz CTA
 * are off: the hero and the panel carry both actions.
 */

export interface SubpageCompose {
  lead?: BuildArticleOptions["lead"];
  override?: BuildArticleOptions["override"];
}

export interface HowToOrderSubpageProps {
  path: string;
  /** Page-specific article pieces (fixed routes: «Требования к чертежам», «Оплата»). */
  compose?: ((data: ServicePageData) => SubpageCompose | Promise<SubpageCompose>) | undefined;
}

/** Lead params of the drawing panel: the `form` block's, or the page as the source. */
function panelParams(form: BlockOf<"form"> | null, data: ServicePageData) {
  const fallbackSource = `${data.path}#${UPLOAD_ANCHOR}`;
  if (!form) return { source: fallbackSource };
  const params = toFormParams(form.params, fallbackSource);
  const label = fill(form.sourceLabel, data.placeholders);
  return label ? { ...params, label } : params;
}

export async function HowToOrderSubpage({ path, compose }: HowToOrderSubpageProps) {
  const data = await loadServicePage(path);
  if (!data) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }
  const { page, placeholders: ctx, blockPage, title, breadcrumbLabel } = data;
  const layout = page.layout ?? [];
  const hero = pickFirst(layout, "hero");
  const form = pickFirst(layout, "form");
  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;

  const extra = compose ? await compose(data) : {};
  const { sections, trailing } = buildArticle({
    layout,
    ctx,
    page: blockPage,
    lead: extra.lead,
    override: extra.override,
  });
  const links = await loadSubpageLinks(ctx);
  const heroTitle = (hero ? fill(hero.titleOverride, ctx) : "") || title;

  return (
    <PageShell
      path={data.path}
      breadcrumbLabel={breadcrumbLabel}
      showConditions={false}
      quiz={false}
    >
      <ProcessingHero
        title={heroTitle}
        lead={hero?.lead ? <RichText data={hero.lead} ctx={ctx} /> : undefined}
        actions={
          hero ? (
            <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="contents" />
          ) : null
        }
        media={media && src ? { src, alt: media.alt?.trim() ?? "" } : null}
        indentActions
      />

      <SubpageArticle sections={sections} />

      {trailing.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(trailing)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        <DrawingPanel
          heading={(form && fill(form.heading, ctx)) || undefined}
          headingId="subpage-form-title"
          params={panelParams(form, data)}
          anchorId={UPLOAD_ANCHOR}
        />
        <SubpageLinks links={links} currentPath={data.path} />
      </CreamBlock>
    </PageShell>
  );
}
