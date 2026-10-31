import { NOT_FOUND_METADATA } from "@/components/page/not-found-response";
import { getPlaceholderContext } from "@/lib/cms/globals";
import { getPageByPath } from "@/lib/cms/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { pickOgImage } from "@/lib/seo/og-image";
import type { Page } from "@/payload-types";
import type { Metadata } from "next";

/**
 * Shared metadata of the explicit routes that render a `pages` document at a fixed path
 * (`/o-kompanii/`, `/o-kompanii/sotrudniki/`, `/kontakty/`): the same rules as the catch-all —
 * SEO group of the document with placeholders, canonical, robots, OG image. A missing or
 * unpublished document gets the 404 metadata (the page itself answers with `NotFoundResponse`).
 */

function ogImageOf(page: Page): { url: string; alt?: string | null } | null {
  // Generated placeholders (`gen-*`) never become og:image (task-38, `pickOgImage`).
  return pickOgImage([page.seo?.ogImage]);
}

export interface FixedPageMetadataOptions {
  /** `noindex, follow` regardless of the document (e.g. the empty team page). */
  forceNoindex?: boolean | undefined;
}

export async function fixedPageMetadata(
  path: string,
  opts: FixedPageMetadataOptions = {}
): Promise<Metadata> {
  const page = await getPageByPath(path);
  if (!page) return NOT_FOUND_METADATA;
  const placeholders = await getPlaceholderContext();
  return buildMetadata({
    seo: page.seo,
    path: page.path ?? path,
    fallbackTitle: page.seo?.h1 || page.title,
    placeholders,
    image: ogImageOf(page),
    forceNoindex: opts.forceNoindex,
  });
}
