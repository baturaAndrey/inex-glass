import { HomePage } from "@/components/home/home-page";
import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath } from "@/lib/cms/queries";
import { OrgJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import type { Page } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Home page `/` — the published `pages` document with `isHome` (path `/`), rendered by the home
 * template (`@/components/home/home-page`). Served by the `[[...slug]]` dispatcher (ISR, see
 * `../[[...slug]]/fixed-routes.ts`): no request APIs here or in the layout; hourly revalidation because the catalog card shows a dated price, CMS edits expire the cache
 * through the revalidation hooks (`doc:pages:<id>`, `global:*` tags).
 *
 * Without the document the route answers 404 via `<NotFoundResponse />` (never a bare
 * `notFound()`, which would ship an empty SSR body — see `not-found-response.tsx`).
 */

const HOME_PATH = "/";

function ogImageOf(page: Page): { url: string; alt?: string | null } | null {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([page.seo?.ogImage]);
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageByPath(HOME_PATH);
  if (!page) return NOT_FOUND_METADATA;
  const placeholders = await getPlaceholderContext();
  return buildMetadata({
    seo: page.seo,
    path: HOME_PATH,
    fallbackTitle: page.title,
    placeholders,
    image: ogImageOf(page),
  });
}

export default async function HomeRoute() {
  const page = await getPageByPath(HOME_PATH);
  if (!page) return <NotFoundResponse />;

  // One placeholder context (and one `now`) per render: prices, footnote and labels agree.
  const placeholders = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, HOME_PATH, placeholders);

  return (
    <PageShell path={HOME_PATH} hideBreadcrumbs showConditions={false} quiz={false}>
      <OrgJsonLd />
      <HomePage layout={page.layout} ctx={placeholders} page={blockPage} />
    </PageShell>
  );
}
