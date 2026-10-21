import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { PageShell } from "@/components/page/page-shell";
import { HubPage } from "@/components/zak-hub/hub-page";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath, redirectIfExists } from "@/lib/cms/queries";
import { buildMetadata, resolveSeoText } from "@/lib/seo/metadata";
import type { Media, Page } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Hub «Закалённое стекло» (`/zakalennoe-steklo/`): the `pages` document with `template: 'hub'`
 * rendered by `HubPage` (price table from the `prices` global, checklist, risk, thickness choice,
 * kinds, processing, timing, audiences, objects, FAQ, form).
 *
 * ISR: prices and the promo depend on the DATE (45-day rule), not only on edits, so the page is
 * re-rendered at least hourly; edits expire it through the cache tags of the globals/pages.
 * Without the document: a redirect record or the server-rendered 404 (`NotFoundResponse`).
 */

const HUB_PATH = "/zakalennoe-steklo/";

export const revalidate = 3600;

function ogImageOf(page: Page): { url: string; alt?: string | null } | null {
  const image = page.seo?.ogImage;
  if (!image || typeof image === "string") return null;
  const media = image as Media;
  return media.url ? { url: media.url, alt: media.alt ?? null } : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageByPath(HUB_PATH);
  if (!page) return NOT_FOUND_METADATA;
  return buildMetadata({
    seo: page.seo,
    path: page.path ?? HUB_PATH,
    fallbackTitle: page.seo?.h1 || page.title,
    placeholders: await getPlaceholderContext(),
    image: ogImageOf(page),
  });
}

export default async function ZakHubPage() {
  const page = await getPageByPath(HUB_PATH);
  if (!page) {
    await redirectIfExists(HUB_PATH);
    return <NotFoundResponse />;
  }

  const ctx = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, HUB_PATH, ctx);
  const path = blockPage.path ?? HUB_PATH;

  return (
    <PageShell
      path={path}
      breadcrumbLabel={resolveSeoText(page.breadcrumbLabel || page.title, ctx)}
      // The hero carries the terms strip; the hub ends with its own lead form.
      showConditions={false}
      quiz={false}
    >
      <HubPage blocks={page.layout} ctx={ctx} page={blockPage} />
    </PageShell>
  );
}
