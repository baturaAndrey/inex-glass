import type { JSX, ReactNode } from "react";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import { fill, hasText } from "@/components/blocks/shared";
import type { BlockPageContext, LayoutBlock, SystemItem } from "@/components/blocks/types";
import {
  ConstructionActions,
  ConstructionHero,
} from "@/components/constructions/construction-hero";
import { InexSuStrip, hasInexSuBridge } from "@/components/constructions/inex-su-strip";
import {
  AllObjectsLink,
  DEFAULT_OBJECTS_HEADING,
  OBJECTS_LIMIT,
  ObjectsColumn,
  ObjectsList,
  objectCards,
} from "@/components/constructions/objects-column";
import { ProfilePlates } from "@/components/constructions/profile-plates";
import { ShowerConfigsGrid } from "@/components/constructions/shower-configs-grid";
import { SnowCalcSection } from "@/components/constructions/snow-calc-section";
import { SystemsSection } from "@/components/constructions/systems-section";
import { WhoDoesWhatSection } from "@/components/constructions/who-does-what";
import { Accordion } from "@/components/ig/accordion";
import { Callout } from "@/components/ig/callout";
import { Section, SectionHead, type SectionVariant } from "@/components/ig/section";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { PageShell } from "@/components/page/page-shell";
import { RichText } from "@/components/rich-text/rich-text";
import {
  getObjectsByProduct,
  listShowerConfigs,
  resolveConstruction,
  type ResolveConstructionInput,
} from "@/lib/cms/construction-queries";
import { getConditions, getPlaceholderContext } from "@/lib/cms/globals";
import { splitLayoutBySlot } from "@/lib/cms/layout-slots";
import { redirectIfExists, toPagePath } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { JsonLd, faqLd } from "@/lib/seo/jsonld";
import { buildMetadata, resolveH1, resolveSeoText } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Construction, Object as PortfolioObject, ShowerConfig } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Template of the `constructions` collection (task 26): the hub `/steklyannye-konstrukcii/`, the
 * six root construction pages and — unchanged — the glazing / mirrors pages of task 27.
 *
 * Section order (each optional, driven by the document): hero → shower configurations →
 * systems → profile systems + glass → layout blocks (`main` slot) → «main risk» callout →
 * «Расчёт под снег» → documents + objects → «Кто что делает» → inex.su strip → layout blocks
 * (`slot-b-`) → [hub: objects] → FAQ → closing CTA → conditions (`PageShell`).
 *
 * Backgrounds alternate `sf` / `bg` by a template counter (the hero is `bg`); layout blocks
 * without an explicit background get the counter value too. The dark snow section keeps its own
 * colour and does not advance the counter. Slots: see `@/lib/cms/layout-slots`.
 */

export const PROFILE_SYSTEMS_HEADING = "Профильные системы";
export const DEFAULT_GLASS_HEADING = "Стекло";
export const FAQ_HEADING = "Частые вопросы";

type ConstructionPageInput = ResolveConstructionInput;

/** Fallback path of a request whose document is missing (redirect lookup). */
function requestedPath({ slug, path }: ConstructionPageInput): string | null {
  if (path?.trim()) return toPagePath(path);
  if (slug?.trim()) return toPagePath(slug.trim());
  return null;
}

const relationId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: unknown }).id)
      : null;

function ogImageOf(doc: Construction): { url: string; alt?: string | null } | null {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([doc.seo?.ogImage, doc.heroImage]);
}

/** `generateMetadata` of a construction route: SEO group of the document, or the 404 metadata. */
export async function generateConstructionMetadata(
  input: ConstructionPageInput
): Promise<Metadata> {
  const doc = await resolveConstruction(input);
  if (!doc?.path) return NOT_FOUND_METADATA;
  return buildMetadata({
    seo: doc.seo,
    path: doc.path,
    fallbackTitle: doc.title,
    placeholders: await getPlaceholderContext(),
    image: ogImageOf(doc),
  });
}

/* ------------------------------------------------------------------------------------------ */
/* Section helpers                                                                             */
/* ------------------------------------------------------------------------------------------ */

/** Sequential `sf` / `bg` backgrounds (the hero above is `bg`). */
function createBackgroundCounter(): () => SectionVariant {
  let index = 0;
  return () => (index++ % 2 === 0 ? "sf" : "bg");
}

/** Layout blocks with the counter background unless the editor chose one explicitly. */
function withBackgrounds(blocks: LayoutBlock[], next: () => SectionVariant): LayoutBlock[] {
  return blocks.map((block) => {
    const own = "background" in block ? block.background : null;
    if (own && own !== "auto") {
      next();
      return block;
    }
    return { ...block, background: next() } as LayoutBlock;
  });
}

/**
 * Slot blocks rendered INSIDE a template column (`profile`, `systems`, `objects`): rich text
 * without its own section; other block types fall back to `RenderBlocks` (with their section).
 */
function SlotBlocks({
  blocks,
  ctx,
  page,
}: {
  blocks: LayoutBlock[];
  ctx: PlaceholderContext;
  page: BlockPageContext;
}) {
  return (
    <>
      {blocks.map((block, index) =>
        block.blockType === "richText" ? (
          <RichText
            key={block.id ?? index}
            data={block.content}
            ctx={ctx}
            className="[&_p]:max-w-none [&_p]:text-[17px] [&_p]:leading-[1.6] max-sm:[&_p]:text-[16px]"
          />
        ) : (
          <RenderBlocks key={block.id ?? index} blocks={[block]} ctx={ctx} page={page} />
        )
      )}
    </>
  );
}

/** `.p5-list`: bulleted rich-text items (bold leads, links). */
function GlassBullets({
  bullets,
  ctx,
}: {
  bullets: NonNullable<Construction["glassBullets"]>;
  ctx: PlaceholderContext;
}) {
  return (
    <ul className="marker:text-primary-pressed m-0 flex list-disc flex-col gap-2.5 pl-6 text-[17px] leading-[1.55] max-sm:text-[16px]">
      {bullets.map((bullet, index) => (
        <li
          key={bullet.id ?? index}
          className="[&>p]:m-0 [&>p]:inline [&>p]:max-w-none [&>p]:text-inherit"
        >
          <RichText data={bullet.body} ctx={ctx} disableContainer />
        </li>
      ))}
    </ul>
  );
}

function ProfileGlassSection({
  doc,
  slot,
  ctx,
  page,
  variant,
}: {
  doc: Construction;
  slot: LayoutBlock[];
  ctx: PlaceholderContext;
  page: BlockPageContext;
  variant: SectionVariant;
}) {
  const profiles = doc.profileSystems ?? [];
  const bullets = (doc.glassBullets ?? []).filter((bullet) => bullet.body);
  const showProfiles = profiles.length > 0 || slot.length > 0;
  const showGlass = bullets.length > 0;
  return (
    <Section variant={variant} data-section="profile-glass">
      <div
        className={cn(
          "grid items-start gap-12 max-md:grid-cols-1 max-md:gap-6",
          showProfiles && showGlass ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {showProfiles ? (
          <div className="flex min-w-0 flex-col gap-5" data-column="profiles">
            <h2 className="ig-h2 m-0">{PROFILE_SYSTEMS_HEADING}</h2>
            {slot.length > 0 ? <SlotBlocks blocks={slot} ctx={ctx} page={page} /> : null}
            <ProfilePlates systems={profiles} ctx={ctx} />
          </div>
        ) : null}
        {showGlass ? (
          <div className="flex min-w-0 flex-col gap-5" data-column="glass">
            <h2 className="ig-h2 m-0">{fill(doc.glassHeading, ctx) || DEFAULT_GLASS_HEADING}</h2>
            <GlassBullets bullets={bullets} ctx={ctx} />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

function RiskCalloutSection({
  risk,
  ctx,
  variant,
}: {
  risk: NonNullable<Construction["riskCallout"]>;
  ctx: PlaceholderContext;
  variant: SectionVariant;
}) {
  const title = fill(risk.title, ctx);
  return (
    <Section variant={variant} data-section="risk">
      <Callout
        variant="warning"
        className="max-w-[1100px] [&_ol]:mt-1 [&_p]:max-w-none"
        {...(title ? { title } : {})}
      >
        <RichText data={risk.body} ctx={ctx} disableContainer />
      </Callout>
    </Section>
  );
}

function FaqSection({
  faq,
  ctx,
  variant,
}: {
  faq: NonNullable<Construction["faq"]>;
  ctx: PlaceholderContext;
  variant: SectionVariant;
}) {
  const items = faq.filter((item) => hasText(item.question));
  if (items.length === 0) return null;
  const headingId = "construction-faq-title";
  return (
    <Section variant={variant} aria-labelledby={headingId} data-section="faq">
      <SectionHead title={FAQ_HEADING} headingId={headingId} />
      <Accordion
        type="multiple"
        defaultOpen={["faq-0"]}
        headingLevel={3}
        className="max-w-[1100px]"
        items={items.map((item, index) => ({
          id: `faq-${index}`,
          title: fill(item.question, ctx),
          content: <RichText data={item.answer} ctx={ctx} />,
        }))}
      />
      <JsonLd
        data={faqLd(
          items.map((item) => ({
            question: fill(item.question, ctx),
            answer: fill(lexicalToPlainText(item.answer), ctx),
          }))
        )}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* Page                                                                                         */
/* ------------------------------------------------------------------------------------------ */

interface LoadedData {
  configs: ShowerConfig[];
  objects: PortfolioObject[];
}

async function loadRelated(doc: Construction, isHub: boolean): Promise<LoadedData> {
  const productId = relationId(doc.productTag);
  const [configs, objects] = await Promise.all([
    doc.showShowerConfigs ? listShowerConfigs(String(doc.id)) : Promise.resolve([]),
    // Hubs without a product tag show the featured objects; other pages only tagged ones.
    productId || isHub ? getObjectsByProduct(productId, OBJECTS_LIMIT) : Promise.resolve([]),
  ]);
  return { configs, objects };
}

/**
 * Page of a construction. `slug` / `path` select the document (see `resolveConstruction`);
 * an unknown or unpublished document answers 404 (or the `redirects` record) with the 404 body
 * in the server HTML (`NotFoundResponse`).
 */
export async function ConstructionPage(input: ConstructionPageInput): Promise<JSX.Element> {
  const doc = await resolveConstruction(input);
  if (!doc) {
    const missing = requestedPath(input);
    if (missing) await redirectIfExists(missing);
    return <NotFoundResponse />;
  }

  const isHub = doc.kind === "hub";
  const [ctx, conditions, related] = await Promise.all([
    getPlaceholderContext(),
    getConditions(),
    loadRelated(doc, isHub),
  ]);

  const path = doc.path ?? requestedPath(input) ?? "/";
  const title = resolveH1(doc.seo, doc.title, ctx);
  const crumbLabel = resolveSeoText(doc.breadcrumbLabel || doc.title, ctx);
  const crumbs = buildBreadcrumbs(path, { lastLabel: crumbLabel });
  const slots = splitLayoutBySlot<LayoutBlock>(doc.layout as LayoutBlock[] | null | undefined);
  const systems = (doc.systems ?? []) as SystemItem[];
  const blockPage: BlockPageContext = {
    path,
    title,
    faq: doc.faq,
    systems,
    quizPrefill: doc.quizPrefill,
  };
  const next = createBackgroundCounter();

  // --- Section plan, in page order (each variant is taken from the counter when rendered). ---
  const showConfigs = Boolean(doc.showShowerConfigs);
  const configsVariant = showConfigs ? next() : null;

  const systemsVariant = systems.length > 0 ? next() : null;

  const showProfileGlass =
    (doc.profileSystems?.length ?? 0) > 0 ||
    (doc.glassBullets?.length ?? 0) > 0 ||
    slots.profile.length > 0;
  const profileVariant = showProfileGlass ? next() : null;

  const mainBlocks = withBackgrounds(slots.main, next);

  const showRisk = Boolean(doc.riskCallout?.enabled) && Boolean(doc.riskCallout?.body);
  const riskVariant = showRisk ? next() : null;

  const showSnow = Boolean(doc.snowCalcBlock?.enabled);

  const objectsHeading = fill(doc.objectsHeading, ctx) || DEFAULT_OBJECTS_HEADING;
  const hasObjects = objectCards(related.objects).length > 0;
  const objectsSlot =
    slots.objects.length > 0 ? (
      <SlotBlocks blocks={slots.objects} ctx={ctx} page={blockPage} />
    ) : hasObjects ? (
      <AllObjectsLink />
    ) : null;
  const objectsColumn =
    !isHub && (objectsSlot || hasObjects) ? (
      <ObjectsColumn
        heading={objectsHeading}
        headingId="construction-objects-title"
        slot={objectsSlot}
        objects={related.objects}
      />
    ) : null;
  const showDocs = Boolean(doc.documents) || objectsColumn !== null;
  const docsVariant = showDocs ? next() : null;

  const who = doc.whoDoesWhat;
  const showWho =
    Boolean(who?.enabled) &&
    ((who?.leftItems?.length ?? 0) > 0 || (who?.rightItems?.length ?? 0) > 0);
  const whoVariant = showWho ? next() : null;

  // The inex.su strip joins the section right before it (who-does-what, else documents).
  const bridge = hasInexSuBridge(doc.inexSuBridge) ? doc.inexSuBridge : null;
  const strip = bridge ? <InexSuStrip bridge={bridge} ctx={ctx} /> : null;
  const stripHost: "who" | "docs" | "own" | null = !strip
    ? null
    : showWho
      ? "who"
      : showDocs
        ? "docs"
        : "own";
  const stripVariant = stripHost === "own" ? next() : null;

  const afterBlocks = withBackgrounds(slots.after, next);

  // The hub always has the «Объекты» section (teksty/09, `Constr.dc.html`): heading + «Все
  // объекты» → /obekty/, even before any object is featured — the cards are then just absent.
  const showHubObjects = isHub;
  const hubObjectsVariant = showHubObjects ? next() : null;

  const faq = (doc.faq ?? []).filter((item) => hasText(item.question));
  const faqVariant = faq.length > 0 ? next() : null;
  const ctaVariant = next();

  const docsSection: ReactNode = docsVariant ? (
    <Section variant={docsVariant} data-section="documents-objects">
      <div
        className={cn(
          "grid items-start gap-12 max-md:grid-cols-1 max-md:gap-6",
          doc.documents && objectsColumn ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {doc.documents ? (
          <div className="flex min-w-0 flex-col gap-5" data-column="documents">
            <RichText
              data={doc.documents}
              ctx={ctx}
              className="gap-5 [&_p]:max-w-none [&_p]:text-[17px] [&_p]:leading-[1.6] max-sm:[&_p]:text-[16px]"
            />
          </div>
        ) : null}
        {objectsColumn}
      </div>
      {stripHost === "docs" ? <div className="mt-10 max-sm:mt-6">{strip}</div> : null}
    </Section>
  ) : null;

  return (
    <PageShell path={path} lastLabel={crumbLabel} breadcrumbs={crumbs} hideBreadcrumbs quiz={false}>
      <ConstructionHero
        doc={doc}
        title={title}
        crumbs={crumbs}
        path={path}
        ctx={ctx}
        kpText={conditions?.kpText}
      />

      {configsVariant ? (
        <ShowerConfigsGrid configs={related.configs} variant={configsVariant} />
      ) : null}

      {systemsVariant ? (
        <SystemsSection
          systems={systems}
          heading={doc.systemsHeading}
          layout={doc.systemsLayout}
          ctx={ctx}
          variant={systemsVariant}
          footer={
            slots.systems.length > 0 ? (
              <SlotBlocks blocks={slots.systems} ctx={ctx} page={blockPage} />
            ) : undefined
          }
        />
      ) : null}

      {profileVariant ? (
        <ProfileGlassSection
          doc={doc}
          slot={slots.profile}
          ctx={ctx}
          page={blockPage}
          variant={profileVariant}
        />
      ) : null}

      {mainBlocks.length > 0 ? (
        <RenderBlocks blocks={mainBlocks} ctx={ctx} page={blockPage} />
      ) : null}

      {riskVariant && doc.riskCallout ? (
        <RiskCalloutSection risk={doc.riskCallout} ctx={ctx} variant={riskVariant} />
      ) : null}

      {showSnow && doc.snowCalcBlock ? (
        <SnowCalcSection block={doc.snowCalcBlock} ctx={ctx} source={doc.slug} />
      ) : null}

      {docsSection}

      {whoVariant && who ? (
        <WhoDoesWhatSection
          data={who}
          ctx={ctx}
          variant={whoVariant}
          footer={stripHost === "who" ? strip : undefined}
        />
      ) : null}

      {stripVariant ? (
        <Section variant={stripVariant} className="py-12 max-md:py-10 max-sm:py-8">
          {strip}
        </Section>
      ) : null}

      {afterBlocks.length > 0 ? (
        <RenderBlocks blocks={afterBlocks} ctx={ctx} page={blockPage} />
      ) : null}

      {hubObjectsVariant ? (
        <Section
          variant={hubObjectsVariant}
          aria-labelledby="construction-objects-title"
          data-section="objects"
        >
          <SectionHead
            title={objectsHeading}
            headingId="construction-objects-title"
            action={<AllObjectsLink />}
          />
          {slots.objects.length > 0 ? (
            <div className="mb-8">
              <SlotBlocks blocks={slots.objects} ctx={ctx} page={blockPage} />
            </div>
          ) : null}
          <ObjectsList objects={related.objects} mode="row" />
        </Section>
      ) : null}

      {faqVariant ? <FaqSection faq={faq} ctx={ctx} variant={faqVariant} /> : null}

      <Section variant={ctaVariant} data-section="closing-cta" aria-label="Расчёт и заявка">
        <ConstructionActions
          doc={doc}
          path={path}
          ctx={ctx}
          className="justify-center max-sm:flex-col max-sm:[&_.ig-btn]:w-full"
        />
      </Section>
    </PageShell>
  );
}
