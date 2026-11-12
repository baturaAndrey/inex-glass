import { CtaButtons } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { asMedia, fill, mediaSrc } from "@/components/blocks/shared";
import { drawingPanelParams } from "@/components/clients/drawing-params";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { UPLOAD_ANCHOR } from "@/components/how-to-order/copy";
import { NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { resolveSeoText } from "@/lib/seo/metadata";
import { withExplicitBackgrounds } from "@/lib/service/page-compose";
import { blockPicker, SectionsStack } from "./layout";
import {
  FactsStrip,
  FeatureCards,
  LightPanel,
  SideTableSection,
  SiteGallery,
  StepCards,
  ZonesFlow,
} from "./sections";

/**
 * `/proizvodstvo/` (Paper mockup `2560_proizvodstvo`, 2026-11-12). The `pages` document supplies
 * the copy (teksty/19, slice `engineering`); its blocks are placed by `anchorId`:
 *
 * - `hero` → H1, lead, «Рассчитать стоимость» + «Отправить проект»; photo placeholder;
 * - `table#facts` → the deep-teal strip «Площадь цеха / Металлы / Стекло»;
 * - `cards#workshop` → 4 cards with a side photo; `cards#zones` + `callout#crane` → the flow;
 * - `table#partners`, `steps#flow`, `cards#site` (gallery; `sub` = the location);
 * - `cta#montage` → the light «Монтаж» panel; `form` → the drawing-form panel in the cream block.
 */

export const PRODUCTION_PATH = "/proizvodstvo/";
const HERO_PLACEHOLDER = "Фото цеха: сборка конструкции со стеклом";

const IDS = {
  workshop: "production-workshop-title",
  zones: "production-zones-title",
  partners: "production-partners-title",
  flow: "production-flow-title",
  site: "production-site-title",
  montage: "production-montage-title",
  form: "production-form-title",
} as const;

export async function ProductionPage() {
  const page = await getPageByPath(PRODUCTION_PATH);
  if (!page) {
    await redirectIfExists(PRODUCTION_PATH);
    return <NotFoundResponse />;
  }
  const ctx = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, PRODUCTION_PATH, ctx);
  const label = resolveSeoText(page.breadcrumbLabel || page.title, ctx);
  const { pick, rest } = blockPicker(page.layout ?? []);

  const hero = pick("hero");
  const facts = pick("table", "facts");
  const workshop = pick("cards", "workshop");
  const zones = pick("cards", "zones");
  const crane = pick("callout", "crane");
  const partners = pick("table", "partners");
  const flow = pick("steps", "flow");
  const site = pick("cards", "site");
  const montage = pick("cta", "montage");
  const form = pick("form");
  const others = rest();

  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;

  return (
    <PageShell path={PRODUCTION_PATH} breadcrumbLabel={label} showConditions={false} quiz={false}>
      <ProcessingHero
        title={(hero ? fill(hero.titleOverride, ctx) : "") || blockPage.title}
        lead={hero?.lead ? <RichText data={hero.lead} ctx={ctx} disableContainer /> : undefined}
        actions={
          hero ? (
            <CtaButtons buttons={hero.buttons} ctx={ctx} page={blockPage} className="contents" />
          ) : null
        }
        media={media && src ? { src, alt: media.alt?.trim() ?? "" } : null}
        placeholder={HERO_PLACEHOLDER}
        indentActions
      />

      <SectionsStack>
        {facts ? <FactsStrip block={facts} ctx={ctx} tone="dark" /> : null}
        {workshop ? (
          <FeatureCards block={workshop} ctx={ctx} headingId={IDS.workshop} variant="side" />
        ) : null}
        {zones ? <ZonesFlow block={zones} crane={crane} ctx={ctx} headingId={IDS.zones} /> : null}
        {partners ? <SideTableSection block={partners} ctx={ctx} headingId={IDS.partners} /> : null}
        {flow ? <StepCards block={flow} ctx={ctx} headingId={IDS.flow} marker="circle" /> : null}
        {site ? <SiteGallery block={site} ctx={ctx} headingId={IDS.site} /> : null}
        {montage ? (
          <LightPanel block={montage} ctx={ctx} page={blockPage} headingId={IDS.montage} />
        ) : null}
      </SectionsStack>

      {others.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(others)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        <DrawingPanel
          formKey={form?.formKey === "drawing" ? "drawing" : "full"}
          heading={(form && fill(form.heading, ctx)) || undefined}
          sub={(form && fill(form.sub, ctx)) || undefined}
          headingId={IDS.form}
          params={{
            ...drawingPanelParams(form, PRODUCTION_PATH, ctx),
            ...(form?.submitLabel ? { submitLabel: fill(form.submitLabel, ctx) } : {}),
          }}
          anchorId={UPLOAD_ANCHOR}
        />
      </CreamBlock>
    </PageShell>
  );
}
