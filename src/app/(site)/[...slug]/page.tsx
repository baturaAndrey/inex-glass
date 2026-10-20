import { RenderBlocks } from "@/components/blocks/render-blocks";
import { Container } from "@/components/ig/container";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { pathFromSegments } from "@/lib/cms/path";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { buildMetadata, resolveSeoText } from "@/lib/seo/metadata";
import type { Media, Page } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Universal resolver of the `pages` collection (`/o-kompanii/`, `/kak-zakazat/sroki/`, …).
 *
 * 1. Path from the segments (`proxy.ts` guarantees lower case, Next the trailing slash). A segment
 *    with an encoded `/` (`%2F`) is a 404, not a duplicate of the nested URL (`@/lib/cms/path`).
 * 2. Published page with that path → `PageShell` + blocks. The blocks receive the document
 *    (`pageBlockContext`): the hero renders its H1, FAQ / quiz blocks read `faq` / `quizPrefill`.
 * 3. Otherwise an active record of `redirects` → `permanentRedirect` (HTTP 308: search engines
 *    treat it as permanent, like 301 — see requirements «Техническое SEO»), otherwise 404 via
 *    `<NotFoundResponse />` (HTTP 404 with the 404 body in the server HTML; a bare `notFound()`
 *    here would ship an empty body — see `@/components/page/not-found-response`).
 *    Lookups are memoized per request, so metadata + page query the database once.
 *
 * Typed collections with root URLs (constructions, glass types, objects…) have their own route
 * folders (Wave 5); they take precedence over this catch-all.
 */

type Params = Promise<{ slug: string[] }>;

/** No DB at build time: nothing is prerendered, pages render on first request (ISR). */
export function generateStaticParams(): Array<{ slug: string[] }> {
  return [];
}
export const dynamicParams = true;
/** Blocks may show prices / promo, which change with the date, not only with edits. */
export const revalidate = 3600;

function ogImageOf(page: Page): { url: string; alt?: string | null } | null {
  const image = page.seo?.ogImage;
  if (!image || typeof image === "string") return null;
  const media = image as Media;
  return media.url ? { url: media.url, alt: media.alt ?? null } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const path = pathFromSegments(slug);
  const page = path ? await getPageByPath(path) : null;
  // Unknown path: the page answers 308 (redirect) or the 404 body.
  if (!page || !path) return NOT_FOUND_METADATA;

  const placeholders = await getPlaceholderContext();
  return buildMetadata({
    seo: page.seo,
    path: page.path ?? path,
    fallbackTitle: page.seo?.h1 || page.title,
    placeholders,
    image: ogImageOf(page),
    // Legal documents (policy, consent) are service pages: noindex, follow.
    forceNoindex: page.template === "legal",
  });
}

export default async function CatchAllPage({ params }: { params: Params }) {
  const { slug } = await params;
  const path = pathFromSegments(slug);
  if (!path) return <NotFoundResponse />;
  const page = await getPageByPath(path);
  if (!page) {
    await redirectIfExists(path);
    return <NotFoundResponse />;
  }

  const placeholders = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, path, placeholders);
  const pagePath = blockPage.path ?? path;
  const label = resolveSeoText(page.breadcrumbLabel || page.title, placeholders);
  // The hero block renders the H1 (`blockPage.title` unless it has a `titleOverride`); a page
  // that does not start with a hero gets a plain heading.
  const hasHero = page.layout?.[0]?.blockType === "hero";

  return (
    <PageShell
      path={pagePath}
      breadcrumbLabel={label}
      showConditions={!page.hideConditions}
      quiz={page.hideQuizCta ? false : (page.quizPrefill ?? {})}
    >
      {hasHero ? null : (
        <Container className="pt-6 max-sm:pt-4">
          <h1 className="ig-h1 m-0">{blockPage.title}</h1>
        </Container>
      )}
      <RenderBlocks blocks={page.layout} ctx={placeholders} page={blockPage} />
    </PageShell>
  );
}
