import { RenderBlocks } from "@/components/blocks/render-blocks";
import { Container } from "@/components/ig/container";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { pathFromSegments } from "@/lib/cms/path";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { buildMetadata, resolveSeoText } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import type { Page } from "@/payload-types";
import { fixedRouteFor } from "./fixed-routes";
import type { Metadata } from "next";

/**
 * Root optional catch-all of the site: the fixed-URL templates + the universal resolver of the
 * `pages` collection (`/kak-zakazat/sroki/`, legal pages, …).
 *
 * 0. A fixed URL (`/`, `/kontakty/`, hubs, constructions, … — `./fixed-paths.ts`) renders its own
 *    template from `../_fixed/` (`./fixed-routes.ts`). They live behind this dynamic segment, not
 *    in route folders, only so that they are ISR'd without a database at build time (a static
 *    route would be marked dynamic for good — see `@/lib/cms/cache`).
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

/** `slug` is absent for `/` (optional catch-all). */
type Params = Promise<{ slug?: string[] }>;

const HOME_PATH = "/";

/** No DB at build time: nothing is prerendered, pages render on first request (ISR). */
export function generateStaticParams(): Array<{ slug: string[] }> {
  return [];
}
export const dynamicParams = true;
/**
 * Blocks and templates may show prices / promo, which change with the date, not only with
 * edits; the header shows the promo on every page (`@/lib/cms/cache`, «Time, not edits…»).
 */
export const revalidate = 3600;

/** Canonical path of the request; `null` for an impossible one (encoded separator → 404). */
function requestPath(slug: readonly string[] | undefined): string | null {
  return slug && slug.length > 0 ? pathFromSegments(slug) : HOME_PATH;
}

function ogImageOf(page: Page): { url: string; alt?: string | null } | null {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([page.seo?.ogImage]);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const path = requestPath(slug);
  const fixed = path ? fixedRouteFor(path) : null;
  if (fixed) return fixed.generateMetadata();
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
  const path = requestPath(slug);
  if (!path) return <NotFoundResponse />;
  const fixed = fixedRouteFor(path);
  if (fixed) {
    const FixedTemplate = fixed.default;
    return <FixedTemplate />;
  }
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
