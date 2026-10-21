import type { BlockPageContext } from "@/components/blocks/types";
import { NOT_FOUND_METADATA } from "@/components/page/not-found-response";
import { pageBlockContext } from "@/components/page/page-context";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath } from "@/lib/cms/queries";
import type { PlaceholderContext } from "@/lib/domain";
import { buildBreadcrumbs, type Crumb } from "@/lib/seo/breadcrumbs";
import { buildMetadata, resolveSeoText } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import type { Page } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Data of a `pages` document rendered by an explicit route of task 28 (`/kak-zakazat/`,
 * `/kak-zakazat/trebovaniya-k-chertezham/`, `/kak-zakazat/oplata/`). The same rules as the
 * catch-all `[...slug]`: published document by path, H1 = `seo.h1` → title, crumbs by URL with
 * the document's `breadcrumbLabel`, metadata through `buildMetadata` (canonical to itself).
 */
export interface ServicePageData {
  page: Page;
  path: string;
  placeholders: PlaceholderContext;
  /** `page` prop of `RenderBlocks` / `CtaButtons` (quiz `src`, pre-fill, H1). */
  blockPage: BlockPageContext;
  /** Resolved H1. */
  title: string;
  /** Label of the current crumb. */
  breadcrumbLabel: string;
  crumbs: Crumb[];
}

/** `null` when no published document has this path (the route answers 308 or 404 then). */
export async function loadServicePage(path: string): Promise<ServicePageData | null> {
  const page = await getPageByPath(path);
  if (!page) return null;
  const placeholders = await getPlaceholderContext();
  const blockPage = pageBlockContext(page, path, placeholders);
  const pagePath = blockPage.path ?? path;
  const breadcrumbLabel = resolveSeoText(page.breadcrumbLabel || page.title, placeholders);
  return {
    page,
    path: pagePath,
    placeholders,
    blockPage,
    title: blockPage.title ?? page.title,
    breadcrumbLabel,
    crumbs: buildBreadcrumbs(pagePath, { lastLabel: breadcrumbLabel }),
  };
}

function ogImageOf(page: Page): { url: string; alt?: string | null } | null {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([page.seo?.ogImage]);
}

/** `generateMetadata` of the explicit service routes (404 metadata for a missing document). */
export async function servicePageMetadata(path: string): Promise<Metadata> {
  const page = await getPageByPath(path);
  if (!page) return NOT_FOUND_METADATA;
  const placeholders = await getPlaceholderContext();
  return buildMetadata({
    seo: page.seo,
    path: page.path ?? path,
    fallbackTitle: page.seo?.h1 || page.title,
    placeholders,
    image: ogImageOf(page),
  });
}
