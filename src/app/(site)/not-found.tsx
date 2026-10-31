import { NotFoundContent, NOT_FOUND_TITLE } from "@/components/page/not-found-content";
import { TITLE_BRAND_SUFFIX } from "@/lib/seo/metadata";
import type { Metadata } from "next";

/**
 * 404 boundary inside the site layout. It renders in the BROWSER only (client navigation, and
 * hydration of `<NotFoundResponse />`): React has no error boundaries during SSR, so a server
 * render never reaches it — pages return `<NotFoundResponse />` instead of throwing
 * `notFound()` (see `@/components/page/not-found-response`). Next adds the robots noindex tag.
 */
export const metadata: Metadata = {
  title: { absolute: `${NOT_FOUND_TITLE}${TITLE_BRAND_SUFFIX}` },
};

export default function NotFound() {
  return <NotFoundContent />;
}
