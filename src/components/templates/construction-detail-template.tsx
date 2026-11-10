import type { JSX, ReactNode } from "react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockPageContext, LayoutBlock, SystemItem } from "@/components/blocks/types";
import { DARK_PANEL_TEXT, DarkPanel } from "@/components/clients/montage-panel";
import { BlockPanels } from "@/components/constructions/block-panels";
import { ConstructionActions } from "@/components/constructions/construction-hero";
import {
  DEFAULT_GLASS_HEADING,
  FAQ_HEADING,
  PROFILE_SYSTEMS_HEADING,
} from "@/components/constructions/copy";
import {
  GlassPanel,
  PANEL_TEXT,
  PanelRow,
  ProfilePanel,
  TextPanel,
  WarningPanel,
} from "@/components/constructions/detail-panels";
import { WhoPanel } from "@/components/constructions/hub-info";
import { INEX_SU_DEFAULT_LABEL, hasInexSuBridge } from "@/components/constructions/inex-su-strip";
import {
  ALL_OBJECTS_LABEL,
  DEFAULT_OBJECTS_HEADING,
  OBJECTS_LIMIT,
  OBJECTS_PATH,
  ObjectsList,
  objectCards,
} from "@/components/constructions/objects-column";
import { ShowerConfigsGrid } from "@/components/constructions/shower-configs-grid";
import { SnowCalcSection } from "@/components/constructions/snow-calc-section";
import { SystemPhotoCards } from "@/components/constructions/system-photo-cards";
import { DEFAULT_SYSTEMS_HEADING } from "@/components/constructions/systems-section";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import type { Crumb } from "@/components/ig/breadcrumbs";
import { Button } from "@/components/ig/button";
import { Container } from "@/components/ig/container";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { ServiceFaq } from "@/components/processing/service-faq";
import type { RichTextData } from "@/components/rich-text/rich-text";
import { RichText } from "@/components/rich-text/rich-text";
import { heroMedia, heroTerms } from "@/components/templates/construction-hub-template";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getObjectsByProduct, listShowerConfigs } from "@/lib/cms/construction-queries";
import { splitLayoutBySlot } from "@/lib/cms/layout-slots";
import type { PlaceholderContext } from "@/lib/domain";
import type { Construction } from "@/payload-types";

/**
 * The five construction pages (`/steklyannye-peregorodki/`, `/steklyannye-ograzhdeniya/`,
 * `/steklyannye-kozyrki/`, `/dushevye-peregorodki/`, `/torgovye-vitriny/`: `constructions`
 * documents of the group «constructions», kind `construction`), restyled to the approved Paper
 * mockup `2560_steklyannye-peregorodki` (2026-11):
 *
 * crumbs → photo hero (H1, `intro` without `{условия}` — the terms checklist of the `conditions`
 * global replaces it — the quiz button and the secondary form) → one container, 48 px between
 * the parts, each optional and driven by the document:
 * shower configurations → systems (photo cards; slot `systems` as panels under them) →
 * «Профильные системы» (slot `profile` + pills) | glass bullets → layout blocks (`main`) as
 * panels → «Главный риск» warning block → «Расчёт под снег» (dark panel) → documents | objects
 * (slot `objects`, «Все объекты →») → layout blocks of the slot `b` → «Кто что делает» → «Нужен
 * монтаж «под ключ»?» (`inexSuBridge`, dark panel) → FAQ (+ FAQPage JSON-LD) → cream block with
 * the drawing-form panel, which closes the page (no «Условия» strip, no closing button row).
 *
 * Glazing / mirrors subpages and «Зажимной профиль» keep the task-26 template.
 */

export interface ConstructionDetailPageProps {
  doc: Construction;
  title: string;
  path: string;
  crumbs: Crumb[];
  crumbLabel: string;
  ctx: PlaceholderContext;
}

const FORM_HEADING_ID = "construction-form-title";
const FORM_ANCHOR = "form";

const relationId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: unknown }).id)
      : null;

/** Rich-text blocks of a slot as plain panel text; other block kinds keep their rendering. */
function SlotText({
  blocks,
  ctx,
  page,
}: {
  blocks: readonly LayoutBlock[];
  ctx: PlaceholderContext;
  page: BlockPageContext;
}) {
  return (
    <>
      {blocks.map((block, index) =>
        block.blockType === "richText" ? (
          <RichText key={block.id ?? index} data={block.content} ctx={ctx} className={PANEL_TEXT} />
        ) : (
          <RenderBlocks key={block.id ?? index} blocks={[block]} ctx={ctx} page={page} />
        )
      )}
    </>
  );
}

/** «Нужен монтаж «под ключ»?»: the dark panel with the outline button to inex.su. */
function TurnkeyPanel({
  bridge,
  ctx,
}: {
  bridge: NonNullable<Construction["inexSuBridge"]>;
  ctx: PlaceholderContext;
}) {
  const title = fill(bridge.title, ctx);
  const text = fill(bridge.text, ctx);
  const label = fill(bridge.buttonLabel, ctx) || INEX_SU_DEFAULT_LABEL;
  const url = bridge.url?.trim();
  // Only an absolute http(s) URL: the panel always leads to the engineering company's site.
  const href = url && /^https?:\/\/[^\s/]+/i.test(url) ? url : "https://inex.su/";
  return (
    <DarkPanel
      title={title}
      headingId="construction-turnkey-title"
      testId="construction-turnkey"
      actions={
        <Button asChild variant="onDark" size="l" className="shrink-0 max-sm:w-full">
          <a href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        </Button>
      }
    >
      {text ? <p className={DARK_PANEL_TEXT}>{text}</p> : null}
    </DarkPanel>
  );
}

export async function ConstructionDetailPage({
  doc,
  title,
  path,
  crumbs,
  crumbLabel,
  ctx,
}: ConstructionDetailPageProps): Promise<JSX.Element> {
  const productId = relationId(doc.productTag);
  const [terms, configs, objects] = await Promise.all([
    heroTerms(ctx),
    doc.showShowerConfigs ? listShowerConfigs(String(doc.id)) : Promise.resolve([]),
    productId ? getObjectsByProduct(productId, OBJECTS_LIMIT) : Promise.resolve([]),
  ]);

  const slots = splitLayoutBySlot<LayoutBlock>(doc.layout as LayoutBlock[] | null | undefined);
  const systems = (doc.systems ?? []) as SystemItem[];
  const page: BlockPageContext = {
    path,
    title,
    faq: doc.faq,
    systems,
    quizPrefill: doc.quizPrefill,
  };
  // The hero lists the terms: the intro's `{условия}` sentence would repeat them.
  const introCtx: PlaceholderContext = { ...ctx, conditions: "" };

  const parts: ReactNode[] = [];

  if (doc.showShowerConfigs) {
    parts.push(<ShowerConfigsGrid key="configs" configs={configs} variant="bg" bare />);
  }

  if (systems.length > 0) {
    const heading = fill(doc.systemsHeading, ctx) || DEFAULT_SYSTEMS_HEADING;
    parts.push(
      <section
        key="systems"
        id="sistemy"
        aria-labelledby="construction-systems-title"
        className="flex scroll-mt-24 flex-col gap-12 max-md:gap-8 max-sm:gap-6"
        data-section="systems"
      >
        <h2 id="construction-systems-title" className="ig-h2 m-0">
          {heading}
        </h2>
        <SystemPhotoCards systems={systems} ctx={ctx} />
      </section>
    );
    if (slots.systems.length > 0) {
      parts.push(
        <BlockPanels
          key="systems-slot"
          blocks={slots.systems}
          ctx={ctx}
          page={page}
          idPrefix="construction-systems-note"
        />
      );
    }
  }

  const profiles = doc.profileSystems ?? [];
  const bullets = (doc.glassBullets ?? []).flatMap((bullet) =>
    bullet.body ? [bullet.body as RichTextData] : []
  );
  const showProfiles = profiles.length > 0 || slots.profile.length > 0;
  const showGlass = bullets.length > 0;
  if (showProfiles || showGlass) {
    parts.push(
      <PanelRow key="profile-glass" count={Number(showProfiles) + Number(showGlass)}>
        {showProfiles ? (
          <ProfilePanel
            heading={PROFILE_SYSTEMS_HEADING}
            intro={<SlotText blocks={slots.profile} ctx={ctx} page={page} />}
            systems={profiles}
            ctx={ctx}
          />
        ) : null}
        {showGlass ? (
          <GlassPanel
            heading={fill(doc.glassHeading, ctx) || DEFAULT_GLASS_HEADING}
            bullets={bullets}
            ctx={ctx}
          />
        ) : null}
      </PanelRow>
    );
  }

  if (slots.main.length > 0) {
    parts.push(
      <BlockPanels
        key="main"
        blocks={slots.main}
        ctx={ctx}
        page={page}
        idPrefix="construction-block"
      />
    );
  }

  if (doc.riskCallout?.enabled && doc.riskCallout.body) {
    parts.push(
      <WarningPanel
        key="risk"
        title={fill(doc.riskCallout.title, ctx)}
        headingId="construction-risk-title"
        body={doc.riskCallout.body}
        ctx={ctx}
        testId="construction-risk"
      />
    );
  }

  if (doc.snowCalcBlock?.enabled) {
    parts.push(
      <SnowCalcSection key="snow" block={doc.snowCalcBlock} ctx={ctx} source={doc.slug} bare />
    );
  }

  // Documents | objects: the objects panel has the slot text, «Все объекты →» and the tagged
  // objects; it is shown when there is a text or an object.
  const objectsSlot = slots.objects.filter((block) => block.blockType === "richText");
  const hasObjects = objectCards(objects).length > 0;
  const showObjects = objectsSlot.length > 0 || hasObjects;
  const docsPanel = doc.documents ? (
    <TextPanel
      key="documents"
      headingId="construction-documents-title"
      body={doc.documents}
      ctx={ctx}
      testId="construction-documents"
    />
  ) : null;
  const objectsPanel = showObjects ? (
    <TextPanel
      key="objects"
      heading={fill(doc.objectsHeading, ctx) || DEFAULT_OBJECTS_HEADING}
      headingId="construction-objects-title"
      body={objectsSlot[0]?.blockType === "richText" ? objectsSlot[0].content : null}
      ctx={ctx}
      extraLinks={[{ label: ALL_OBJECTS_LABEL, href: OBJECTS_PATH, external: false }]}
      testId="construction-objects"
    >
      {hasObjects ? <ObjectsList objects={objects} mode="column" /> : null}
    </TextPanel>
  ) : null;
  if (docsPanel || objectsPanel) {
    parts.push(
      <PanelRow key="documents-objects" count={Number(Boolean(docsPanel)) + Number(showObjects)}>
        {docsPanel}
        {objectsPanel}
      </PanelRow>
    );
  }
  // Further rich texts of the objects slot (rare) follow as panels.
  if (objectsSlot.length > 1 || slots.objects.length > objectsSlot.length) {
    parts.push(
      <BlockPanels
        key="objects-slot"
        blocks={slots.objects.filter((block) => block !== objectsSlot[0])}
        ctx={ctx}
        page={page}
        idPrefix="construction-objects-note"
      />
    );
  }

  if (slots.after.length > 0) {
    parts.push(
      <BlockPanels
        key="after"
        blocks={slots.after}
        ctx={ctx}
        page={page}
        idPrefix="construction-after"
      />
    );
  }

  const who = doc.whoDoesWhat;
  if (who?.enabled) parts.push(<WhoPanel key="who" data={who} ctx={ctx} />);

  if (hasInexSuBridge(doc.inexSuBridge)) {
    parts.push(<TurnkeyPanel key="turnkey" bridge={doc.inexSuBridge} ctx={ctx} />);
  }

  const faq = (doc.faq ?? []).filter((item) => hasText(item.question));
  if (faq.length > 0) {
    parts.push(
      <div key="faq" className="pt-6 max-sm:pt-2">
        <ServiceFaq
          heading={FAQ_HEADING}
          headingId="construction-faq-title"
          items={faq.map((item, index) => ({
            key: item.id ?? String(index),
            question: fill(item.question, ctx),
            answer: item.answer,
          }))}
          ctx={ctx}
          jsonLd
          bare
        />
      </div>
    );
  }

  return (
    <PageShell
      path={path}
      lastLabel={crumbLabel}
      breadcrumbs={crumbs}
      showConditions={false}
      quiz={false}
    >
      <ProcessingHero
        title={title}
        media={heroMedia(doc.heroImage)}
        terms={terms}
        lead={
          doc.intro ? (
            <div data-testid="construction-intro">
              <RichText data={doc.intro} ctx={introCtx} disableContainer />
            </div>
          ) : undefined
        }
        actions={<ConstructionActions doc={doc} path={path} ctx={ctx} className="contents" />}
        indentActions
      />

      {parts.length > 0 ? (
        <Container className="flex flex-col gap-12 py-16 max-md:gap-10 max-md:py-12 max-sm:gap-8 max-sm:py-8">
          {parts}
        </Container>
      ) : null}

      <CreamBlock>
        <DrawingPanel
          headingId={FORM_HEADING_ID}
          anchorId={FORM_ANCHOR}
          params={{ source: `${path}#${FORM_ANCHOR}` }}
        />
      </CreamBlock>
    </PageShell>
  );
}
