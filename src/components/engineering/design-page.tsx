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
import { inlineBold } from "./card-text";
import { blockPicker, SectionsStack } from "./layout";
import {
  FactsStrip,
  FeatureCards,
  LevelCards,
  NumberedRows,
  ScopeSection,
  StepCards,
} from "./sections";

/**
 * `/proektirovanie/` (Paper mockup `2560_proektirovanie`, 2026-11-12). The `pages` document
 * supplies the copy (teksty/18 v3, slice `engineering`); its blocks are placed by `anchorId`:
 *
 * - `hero` → H1, the two-paragraph lead (the second one smaller), buttons; photo placeholder;
 * - `table#facts` → white strip «Для кого / Что получаете / Форматы»;
 * - `cards#problems` → numbered rows; `compare#levels` → the two level cards;
 * - `cards#what` → photo cards with bullets; `table#scope` + `cta#team` → table and dark panel;
 * - `steps#process` → 8 step cards; `form` → the drawing-form panel in the cream block
 *   (`sub` + `bullets[0]` as the note «Проектирование — платная услуга …»).
 *
 * Unknown blocks render after the sections. The primary hero button is «Отправить задачу на
 * проектирование» (user decision 2026-11-12, exception to DESIGN.md §10).
 */

export const DESIGN_PATH = "/proektirovanie/";
const HERO_PLACEHOLDER = "Фото / 3D-модель конструкции";

const IDS = {
  problems: "design-problems-title",
  levels: "design-levels-title",
  what: "design-what-title",
  scope: "design-scope-title",
  team: "design-team-title",
  process: "design-process-title",
  form: "design-form-title",
} as const;

export async function DesignPage() {
  const page = await getPageByPath(DESIGN_PATH);
  if (!page) {
    await redirectIfExists(DESIGN_PATH);
    return <NotFoundResponse />;
  }
  const ctx = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, DESIGN_PATH, ctx);
  const label = resolveSeoText(page.breadcrumbLabel || page.title, ctx);
  const { pick, rest } = blockPicker(page.layout ?? []);

  const hero = pick("hero");
  const facts = pick("table", "facts");
  const problems = pick("cards", "problems");
  const levels = pick("compare", "levels");
  const what = pick("cards", "what");
  const scope = pick("table", "scope");
  const team = pick("cta", "team");
  const process = pick("steps", "process");
  const form = pick("form");
  const others = rest();

  const media = hero ? asMedia(hero.image) : null;
  const src = media ? mediaSrc(media) : null;
  const note = form?.bullets?.[0]?.text ? fill(form.bullets[0].text, ctx) : "";

  return (
    <PageShell path={DESIGN_PATH} breadcrumbLabel={label} showConditions={false} quiz={false}>
      <ProcessingHero
        title={(hero ? fill(hero.titleOverride, ctx) : "") || blockPage.title}
        lead={
          hero?.lead ? (
            // Mockup: the first paragraph is the lead (19 px), the second one body text.
            <div className="[&_p+p]:text-text-2 [&_p+p]:mt-6! [&_p+p]:max-w-[660px]! [&_p+p]:text-base! [&_p+p]:leading-[1.6]!">
              <RichText data={hero.lead} ctx={ctx} disableContainer />
            </div>
          ) : undefined
        }
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
        {facts ? <FactsStrip block={facts} ctx={ctx} tone="light" /> : null}
        {problems ? <NumberedRows block={problems} ctx={ctx} headingId={IDS.problems} /> : null}
        {levels ? <LevelCards block={levels} ctx={ctx} headingId={IDS.levels} /> : null}
        {what ? <FeatureCards block={what} ctx={ctx} headingId={IDS.what} variant="top" /> : null}
        {scope ? (
          <ScopeSection
            block={scope}
            team={team}
            ctx={ctx}
            headingId={IDS.scope}
            teamHeadingId={IDS.team}
          />
        ) : null}
        {process ? (
          <StepCards block={process} ctx={ctx} headingId={IDS.process} marker="big" />
        ) : null}
      </SectionsStack>

      {others.length > 0 ? (
        <RenderBlocks blocks={withExplicitBackgrounds(others)} ctx={ctx} page={blockPage} />
      ) : null}

      <CreamBlock>
        <DrawingPanel
          formKey={form?.formKey === "full" ? "full" : "drawing"}
          heading={(form && fill(form.heading, ctx)) || undefined}
          sub={(form && fill(form.sub, ctx)) || undefined}
          note={note ? inlineBold(note) : undefined}
          headingId={IDS.form}
          params={{
            ...drawingPanelParams(form, DESIGN_PATH, ctx),
            ...(form?.submitLabel ? { submitLabel: fill(form.submitLabel, ctx) } : {}),
          }}
          anchorId={UPLOAD_ANCHOR}
        />
      </CreamBlock>
    </PageShell>
  );
}
