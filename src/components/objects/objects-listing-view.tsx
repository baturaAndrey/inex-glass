import { RenderBlocks } from "@/components/blocks/render-blocks";
import type { LayoutBlock } from "@/components/blocks/types";
import { Breadcrumbs } from "@/components/ig/breadcrumbs";
import { Container } from "@/components/ig/container";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { RichText } from "@/components/rich-text/rich-text";
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
import type { Page } from "@/payload-types";
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

/** First block of the document when it is the intro paragraph (rendered next to the H1). */
function splitIntro(layout: Page["layout"]): { intro: LayoutBlock | null; rest: LayoutBlock[] } {
  const blocks = layout ?? [];
  const [first, ...rest] = blocks;
  return first?.blockType === "richText" ? { intro: first, rest } : { intro: null, rest: blocks };
}

/**
 * Listing `/obekty/` and `/obekty/page/N/` (prototype `Objects.dc.html`): head section with
 * crumbs, H1 and the intro text of the CMS document, then toolbar + grid + pagination, then the
 * remaining blocks of the document («Среди объектов…», «Отправить проект»). Intro and closing
 * blocks are shown on page 1 only. Without published objects only the texts are rendered.
 */
export async function ObjectsListingView({ doc, index, query, page }: ObjectsListingViewProps) {
  const placeholders = await getPlaceholderContext();
  const h1 = resolveH1(doc?.seo, LISTING_H1, placeholders);
  const label = resolveSeoText(doc?.breadcrumbLabel || doc?.title || LISTING_H1, placeholders);
  const crumbs = buildBreadcrumbs(OBJECTS_BASE_PATH, { lastLabel: label });
  const firstPage = page === 1;
  const { intro, rest } = splitIntro(doc?.layout);

  const facets = buildFacets(index);
  const slice = selectObjects(index, query, page);
  const hrefFor = (n: number) => buildObjectsHref({ ...query, page: n });

  return (
    <PageShell
      path={OBJECTS_BASE_PATH}
      breadcrumbs={crumbs}
      hideBreadcrumbs
      showConditions={doc ? !doc.hideConditions : false}
      quiz={!doc || doc.hideQuizCta ? false : (doc.quizPrefill ?? {})}
    >
      <section
        aria-labelledby={HEADING_ID}
        className="bg-surface pt-10 pb-12 max-sm:pt-6 max-sm:pb-8"
      >
        <Container>
          <Breadcrumbs items={crumbs} />
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-12 gap-y-4">
            <h1 id={HEADING_ID} className="ig-h1 m-0">
              {h1}
            </h1>
            {firstPage && intro?.blockType === "richText" ? (
              <RichText
                data={intro.content}
                ctx={placeholders}
                className="text-text-2 max-w-[620px] text-(length:--ig-lead-size) leading-normal text-pretty [&_p]:m-0"
              />
            ) : null}
          </div>
        </Container>
      </section>

      {index.length > 0 ? (
        <section
          aria-label="Список объектов"
          className="bg-bg pt-10 pb-24 max-md:pb-[72px] max-sm:pb-12"
          data-objects-listing=""
        >
          <Container>
            <ObjectsListing
              items={slice.items}
              total={slice.total}
              facets={facets}
              filters={query.filters}
              sort={query.sort}
            />
            <ObjectsPagination page={page} totalPages={slice.totalPages} hrefFor={hrefFor} />
          </Container>
        </section>
      ) : null}

      {firstPage && rest.length > 0 && doc ? (
        <RenderBlocks
          blocks={rest}
          ctx={placeholders}
          page={pageBlockContext(doc, OBJECTS_BASE_PATH, placeholders)}
        />
      ) : null}
    </PageShell>
  );
}
