import type { JSX } from "react";
import { asMedia, fill, hasText, mediaSrc } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import { ConstructionActions } from "@/components/constructions/construction-hero";
import { HubCards } from "@/components/constructions/hub-cards";
import { HubInfo } from "@/components/constructions/hub-info";
import { HubObjects } from "@/components/constructions/hub-objects";
import { AllObjectsLink, DEFAULT_OBJECTS_HEADING } from "@/components/constructions/objects-column";
import type { Crumb } from "@/components/ig/breadcrumbs";
import { PageShell } from "@/components/page/page-shell";
import type { InfoPanel } from "@/components/processing/info-panels";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { getConditions } from "@/lib/cms/globals";
import { getObjectsIndex } from "@/lib/cms/objects";
import type { PlaceholderContext } from "@/lib/domain";
import { hubObjectGroups } from "@/lib/objects/hub-feed";
import type { Construction } from "@/payload-types";

/**
 * Hub `/steklyannye-konstrukcii/` (a `constructions` document of kind `hub`), restyled to the
 * approved Paper mockup `2560_steklyannye-konstrukcii` (2026-11) like the processing hub:
 *
 * crumbs → hero (`heroImage` behind the text, H1, `intro`, terms checklist from the `conditions`
 * global, buttons) → «Конструкции»: photo cards of the `cards` block + the dark «Монтаж» panel
 * (first `cta` block) → cream block: «Кто что делает» (`whoDoesWhat`) and «Почему комплект»
 * (first `richText` block with a heading; a quote in it is the warning note), «Объекты» with
 * chips by construction type (only when published objects exist), final buttons. The cream block meets the footer: no conditions
 * section and no quiz CTA (the hero lists the terms and has the button).
 *
 * Child construction pages keep `ConstructionPage` (`construction-template.tsx`).
 */

export interface ConstructionHubPageProps {
  doc: Construction;
  title: string;
  path: string;
  crumbs: Crumb[];
  ctx: PlaceholderContext;
}

const OBJECTS_HEADING_ID = "construction-objects-title";

/** Terms checklist of the hero: the full terms bar of the `conditions` global. */
async function heroTerms(ctx: PlaceholderContext): Promise<string[]> {
  const conditions = await getConditions();
  return (conditions?.termsBar ?? []).map((item) => fill(item.text, ctx)).filter(Boolean);
}

function heroMedia(value: unknown): { src: string; alt: string } | null {
  const media = asMedia(value);
  const src = media ? mediaSrc(media) : null;
  return media && src ? { src, alt: media.alt?.trim() ?? "" } : null;
}

const firstOf = <T extends LayoutBlock["blockType"]>(
  blocks: readonly LayoutBlock[],
  type: T,
  match: (block: BlockOf<T>) => boolean = () => true
): BlockOf<T> | null =>
  (blocks.find((block) => block.blockType === type && match(block as BlockOf<T>)) as
    BlockOf<T> | undefined) ?? null;

/** «Почему комплект…»: the first rich-text block with a heading, as a cream-block panel. */
function whyPanel(blocks: readonly LayoutBlock[], ctx: PlaceholderContext): InfoPanel | null {
  const block = firstOf(blocks, "richText", (item) => hasText(item.heading));
  if (!block) return null;
  return {
    key: block.id ?? "why",
    heading: fill(block.heading, ctx),
    headingId: "construction-why-title",
    body: block.content,
    lead: true,
    noteIcon: "warning",
  };
}

export async function ConstructionHubPage({
  doc,
  title,
  path,
  crumbs,
  ctx,
}: ConstructionHubPageProps): Promise<JSX.Element> {
  const layout = (doc.layout ?? []) as LayoutBlock[];
  const [terms, objects] = await Promise.all([heroTerms(ctx), getObjectsIndex()]);
  const groups = hubObjectGroups(objects);
  const blockPage: BlockPageContext = {
    path,
    title,
    faq: doc.faq,
    quizPrefill: doc.quizPrefill,
  };
  const objectsHeading = fill(doc.objectsHeading, ctx) || DEFAULT_OBJECTS_HEADING;
  const montage = firstOf(layout, "cta", (block) => block.tone === "primaryDark");
  const closingCta = (
    <div
      data-section="closing-cta"
      aria-label="Расчёт и заявка"
      role="group"
      className={groups.length > 0 ? "pt-8 max-sm:pt-2" : undefined}
    >
      <ConstructionActions
        doc={doc}
        path={path}
        ctx={ctx}
        className="max-sm:flex-col max-sm:[&_.ig-btn]:w-full"
      />
    </div>
  );

  return (
    <PageShell path={path} breadcrumbs={crumbs} showConditions={false} quiz={false}>
      <ProcessingHero
        title={title}
        media={heroMedia(doc.heroImage)}
        terms={terms}
        lead={
          doc.intro ? (
            <div data-testid="construction-intro">
              <RichText data={doc.intro} ctx={ctx} disableContainer />
            </div>
          ) : undefined
        }
        actions={<ConstructionActions doc={doc} path={path} ctx={ctx} className="contents" />}
        indentActions
      />

      <HubCards cards={firstOf(layout, "cards")} montage={montage} ctx={ctx} page={blockPage} />

      <HubInfo who={doc.whoDoesWhat} why={whyPanel(layout, ctx)} ctx={ctx}>
        {/* Without published objects the heading would stand over nothing: only the buttons stay. */}
        {groups.length > 0 ? (
          <section
            aria-labelledby={OBJECTS_HEADING_ID}
            className="flex flex-col gap-8 max-sm:gap-6"
            data-section="objects"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <h2 id={OBJECTS_HEADING_ID} className="ig-h2 m-0">
                {objectsHeading}
              </h2>
              <AllObjectsLink />
            </div>
            <HubObjects groups={groups} />
            {closingCta}
          </section>
        ) : (
          closingCta
        )}
      </HubInfo>
    </PageShell>
  );
}
