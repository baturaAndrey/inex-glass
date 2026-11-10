import type { JSX } from "react";
import { fill } from "@/components/blocks/shared";
import type { BlockOf, BlockPageContext, LayoutBlock } from "@/components/blocks/types";
import { PILL, splitDotList } from "@/components/company/company-pieces";
import { BlockPanels } from "@/components/constructions/block-panels";
import { ConstructionActions } from "@/components/constructions/construction-hero";
import { HubCards } from "@/components/constructions/hub-cards";
import { HubObjects } from "@/components/constructions/hub-objects";
import {
  AllObjectsLink,
  DEFAULT_OBJECTS_HEADING,
  OBJECTS_LIMIT,
} from "@/components/constructions/objects-column";
import { DrawingPanel } from "@/components/forms/drawing-panel";
import { NumberedCards } from "@/components/how-to-order/article-pieces";
import type { Crumb } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";
import { PageShell } from "@/components/page/page-shell";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { splitFirstList } from "@/components/rich-text/lexical-parts";
import { RichText } from "@/components/rich-text/rich-text";
import { heroMedia, heroTerms } from "@/components/templates/construction-hub-template";
import { CreamBlock } from "@/components/zak-hub/zak-info";
import { getObjectsByProduct } from "@/lib/cms/construction-queries";
import { layoutSlotOf } from "@/lib/cms/layout-slots";
import { toObjectCard } from "@/lib/cms/objects";
import type { PlaceholderContext } from "@/lib/domain";
import { HUB_OBJECTS_ALL_KEY, type HubObjectsGroup } from "@/lib/objects/hub-feed";
import { cn } from "@/lib/utils";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import type { Construction } from "@/payload-types";

/**
 * Hubs `/osteklenie/` and `/zerkala/` (`constructions` documents of kind `hub`, groups «glazing»
 * and «mirrors»), restyled to the approved Paper mockup `2560_osteklenie` (2026-11), built from
 * the pieces of the constructions hub:
 *
 * crumbs → photo hero (H1, `intro` without `{условия}` — the terms checklist replaces it —
 * buttons) → photo cards of the first `cards` block («Что остекляем» / «Куда»; a card without a
 * page has no arrow) → the other layout blocks as white panels («Что делаем» of the
 * mirrors) → cream block: «Как работаем с объектом» (the first rich text that is a numbered
 * list) as numbered cards, «Объекты» (the published objects of the hub's product tag, else the
 * featured ones; without any, the names of the `slot-objects` text as pills; nothing at all — no
 * section) and the drawing-form panel, as on the other redesigned pages. The cream block meets the
 * footer: no «Условия» strip, no quiz CTA, no closing button row (the hero has the buttons).
 *
 * Their subpages (`/osteklenie/<slug>/`, `/zerkala/<slug>/`) keep the task-26 template.
 */

export interface GlazingHubPageProps {
  doc: Construction;
  title: string;
  path: string;
  crumbs: Crumb[];
  ctx: PlaceholderContext;
}

const STEPS_HEADING_ID = "glazing-steps-title";
const OBJECTS_HEADING_ID = "glazing-objects-title";
const FORM_HEADING_ID = "glazing-form-title";
const FORM_ANCHOR = "form";

type RichTextBlock = BlockOf<"richText">;

/** «Как работаем с объектом»: a rich-text block outside the objects slot that is a numbered list. */
function isStepsBlock(block: LayoutBlock): block is RichTextBlock {
  if (block.blockType !== "richText" || layoutSlotOf(block) === "objects") return false;
  const { before, items, ordered, after } = splitFirstList(block.content);
  return ordered && items.length > 0 && before === null && after === null;
}

const relationId = (value: unknown): string | null =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? String((value as { id: unknown }).id)
      : null;

/** The objects of the hub as one group of hub cards (no type chips on these hubs). */
async function objectsGroup(doc: Construction): Promise<HubObjectsGroup | null> {
  const docs = await getObjectsByProduct(relationId(doc.productTag), OBJECTS_LIMIT);
  const objects = docs.flatMap((object) => {
    const card = toObjectCard(object);
    return card
      ? [
          {
            id: card.id,
            href: card.href,
            name: card.name,
            type: card.products[0]?.name ?? "",
            photo: card.photo,
          },
        ]
      : [];
  });
  return objects.length > 0 ? { key: HUB_OBJECTS_ALL_KEY, label: "", objects } : null;
}

export async function GlazingHubPage({
  doc,
  title,
  path,
  crumbs,
  ctx,
}: GlazingHubPageProps): Promise<JSX.Element> {
  const layout = (doc.layout ?? []) as LayoutBlock[];
  const [terms, group] = await Promise.all([heroTerms(ctx), objectsGroup(doc)]);
  const page: BlockPageContext = { path, title, faq: doc.faq, quizPrefill: doc.quizPrefill };
  const introCtx: PlaceholderContext = { ...ctx, conditions: "" };

  const cards = layout.find((block): block is BlockOf<"cards"> => block.blockType === "cards");
  const steps = layout.find(isStepsBlock) ?? null;
  const objectsText = layout.filter(
    (block): block is RichTextBlock =>
      block.blockType === "richText" && layoutSlotOf(block) === "objects"
  );
  const panels = layout.filter(
    (block) => block !== cards && block !== steps && !objectsText.includes(block as RichTextBlock)
  );

  const stepItems = steps
    ? splitFirstList(steps.content).items.map((item, index) => ({
        key: String(index),
        title: (
          <RichText
            data={item}
            ctx={ctx}
            className="[&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit"
          />
        ),
      }))
    : [];
  const objectNames = objectsText.flatMap((block) =>
    splitDotList(fill(lexicalToPlainText(block.content), ctx).replace(/\s+/g, " "))
  );
  const objectsHeading = fill(doc.objectsHeading, ctx) || DEFAULT_OBJECTS_HEADING;
  const showObjects = group !== null || objectNames.length > 0;

  return (
    <PageShell path={path} breadcrumbs={crumbs} showConditions={false} quiz={false}>
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

      <HubCards
        cards={cards ?? null}
        montage={null}
        ctx={ctx}
        page={page}
        defaultHeading={title}
        headingId="glazing-cards-title"
        testId="glazing-cards"
        keepPlain
        capitalizeText
      />

      {panels.length > 0 ? (
        <Container className="flex flex-col gap-12 pb-16 max-md:gap-10 max-md:pb-12 max-sm:gap-8 max-sm:pb-8">
          <BlockPanels blocks={panels} ctx={ctx} page={page} idPrefix="glazing-block" />
        </Container>
      ) : null}

      <CreamBlock>
        {steps && stepItems.length > 0 ? (
          <section
            {...(steps.heading ? { "aria-labelledby": STEPS_HEADING_ID } : {})}
            className="flex flex-col gap-6"
            data-section="steps"
          >
            {steps.heading ? (
              <h2 id={STEPS_HEADING_ID} className="ig-h2 m-0">
                {fill(steps.heading, ctx)}
              </h2>
            ) : null}
            <NumberedCards items={stepItems} testId="glazing-steps" />
          </section>
        ) : null}
        {showObjects ? (
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
            {group ? (
              <HubObjects groups={[group]} />
            ) : objectNames.length > 0 ? (
              // No published object yet: the object names of the CMS text.
              <ul
                className="m-0 flex list-none flex-wrap gap-2.5 p-0"
                data-testid="glazing-object-names"
              >
                {objectNames.map((name, index) => (
                  <li key={`${index}-${name}`} className={cn(PILL, "bg-surface text-text")}>
                    {name}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
        <DrawingPanel
          headingId={FORM_HEADING_ID}
          anchorId={FORM_ANCHOR}
          params={{ source: `${path}#${FORM_ANCHOR}` }}
        />
      </CreamBlock>
    </PageShell>
  );
}
