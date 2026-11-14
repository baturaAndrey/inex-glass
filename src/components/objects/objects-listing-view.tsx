import { CtaButtons } from "@/components/blocks/cta-buttons";
import { RenderBlocks } from "@/components/blocks/render-blocks";
import type { LayoutBlock } from "@/components/blocks/types";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { QuizLink } from "@/components/page/quiz-cta";
import { ProcessingHero } from "@/components/processing/processing-hero";
import { RichText } from "@/components/rich-text/rich-text";
import { lexicalFromNodes } from "@/lib/blog/toc";
import { getPlaceholderContext } from "@/lib/cms/globals";
import {
  buildFacets,
  buildObjectsHref,
  OBJECTS_BASE_PATH,
  selectObjects,
} from "@/lib/objects/filters";
import type { ObjectCardData, ObjectsQuery } from "@/lib/objects/filters";
import { LISTING_H1 } from "@/lib/objects/seo";
import { buildBreadcrumbs } from "@/lib/seo/breadcrumbs";
import { resolveH1, resolveSeoText } from "@/lib/seo/metadata";
import { withExplicitBackgrounds } from "@/lib/service/page-compose";
import type { Page } from "@/payload-types";
import { objectsClosing, ObjectsFormPanel } from "./objects-closing";
import { ObjectsListing } from "./objects-listing";
import { ObjectsPagination } from "./objects-pagination";

export interface ObjectsListingViewProps {
  /** CMS document `/obekty/` (template `listing`); the page still renders without it. */
  doc: Page | null;
  /** Every published object (`getObjectsIndex`). */
  index: ObjectCardData[];
  query: Pick<ObjectsQuery, "filters" | "sort">;
  /** 1-based page (validated by the route). */
  page: number;
}

const HEADING_ID = "objects-title";
const FORM_HEADING_ID = "objects-form-title";

/** First block of the document when it is the intro paragraph (rendered as the hero lead). */
function splitIntro(layout: Page["layout"]): { intro: LayoutBlock | null; rest: LayoutBlock[] } {
  const blocks = layout ?? [];
  const [first, ...rest] = blocks;
  return first?.blockType === "richText" ? { intro: first, rest } : { intro: null, rest: blocks };
}

/** Form buttons of the closing block are the hero's secondary action (mockup: outlined). */
const asSecondary = <T extends { variant?: string | null }>(buttons: readonly T[]): T[] =>
  buttons.map((button) => ({ ...button, variant: "secondary" }));

/**
 * Listing `/obekty/` and `/obekty/page/N/`, restyled to the Paper mockup `2560_obekty`
 * (2026-11). One page background, no white header band:
 * 1. hero — crumbs (PageShell), H1, the intro block of the CMS document as the lead (page 1),
 *    «Рассчитать стоимость» + the buttons of the closing `cta` block («Отправить проект»);
 * 2. the listing — filter panel / drawer, cards, «Показать ещё», pagination; without published
 *    objects the «Среди объектов: …» paragraph of the closing block in a white panel instead;
 * 3. any other block of the document (page 1);
 * 4. cream block — the drawing-form panel; its heading and sub are the CTA paragraph of the
 *    closing block (`objectsClosing`).
 * The «Условия» strip and the quiz banner of the frame are off: the hero carries both actions,
 * the form closes the page.
 */
export async function ObjectsListingView({ doc, index, query, page }: ObjectsListingViewProps) {
  const placeholders = await getPlaceholderContext();
  const h1 = resolveH1(doc?.seo, LISTING_H1, placeholders);
  const label = resolveSeoText(doc?.breadcrumbLabel || doc?.title || LISTING_H1, placeholders);
  const crumbs = buildBreadcrumbs(OBJECTS_BASE_PATH, { lastLabel: label });
  const firstPage = page === 1;
  const { intro, rest } = splitIntro(doc?.layout);
  const closing = objectsClosing(doc, placeholders);
  const blockPage = doc ? pageBlockContext(doc, OBJECTS_BASE_PATH, placeholders) : undefined;
  const others = rest.filter((block) => block !== closing.block);
  const formButtons = closing.buttons.filter((button) => button.kind === "form");

  const facets = buildFacets(index);
  const slice = selectObjects(index, query, page);
  const hrefFor = (n: number) => buildObjectsHref({ ...query, page: n });

  return (
    <PageShell path={OBJECTS_BASE_PATH} breadcrumbs={crumbs} showConditions={false} quiz={false}>
      <ProcessingHero
        title={h1}
        titleId={HEADING_ID}
        lead={
          firstPage && intro?.blockType === "richText" ? (
            <RichText data={intro.content} ctx={placeholders} />
          ) : undefined
        }
        actions={
          <>
            <QuizLink prefill={doc?.quizPrefill} src={OBJECTS_BASE_PATH} ctx={placeholders} />
            <CtaButtons
              buttons={asSecondary(formButtons)}
              ctx={placeholders}
              page={blockPage}
              className="contents"
            />
          </>
        }
        indentActions
        actionsGap="tight"
      />

      <section
        aria-label="Список объектов"
        className="mx-auto w-full max-w-[1920px] px-(--ig-gutter) pt-8 pb-24 max-md:pt-6 max-md:pb-[72px] max-sm:pt-2 max-sm:pb-12"
        data-objects-listing=""
      >
        {index.length > 0 ? (
          <>
            <ObjectsListing
              items={slice.items}
              total={slice.total}
              facets={facets}
              filters={query.filters}
              sort={query.sort}
            />
            <ObjectsPagination page={page} totalPages={slice.totalPages} hrefFor={hrefFor} />
          </>
        ) : closing.lead.length > 0 ? (
          <div
            className="bg-surface border-hairline rounded-xl border px-10 py-8 max-sm:rounded-lg max-sm:p-6"
            data-objects-empty=""
          >
            <RichText
              data={lexicalFromNodes(closing.lead)}
              ctx={placeholders}
              className="text-ink-3 text-lead-m max-w-[1100px] text-pretty [&_p]:m-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit [&_p+p]:mt-3"
            />
          </div>
        ) : null}
      </section>

      {firstPage && others.length > 0 && blockPage ? (
        <RenderBlocks
          blocks={withExplicitBackgrounds(others)}
          ctx={placeholders}
          page={blockPage}
        />
      ) : null}

      <ObjectsFormPanel closing={closing} headingId={FORM_HEADING_ID} />
    </PageShell>
  );
}
