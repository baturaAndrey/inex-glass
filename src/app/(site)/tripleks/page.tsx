import {
  GlassTypePage,
  TRIPLEX_SLUG,
  generateGlassTypeMetadata,
} from "@/components/templates/glass-type-template";
import type { Metadata } from "next";

/**
 * `/tripleks/` — the triplex glass type (`glass-types`, `urlBase: root`), rendered by the shared
 * glass-type template. The page itself shows no prices, but the site header shows the promo
 * strip, which depends on the current date: like every page under the layout it is re-rendered
 * hourly (see `@/lib/cms/cache`, «Time, not edits…»). Built on first request, never at build time
 * (the template's CMS loaders bail out of prerendering).
 */
export const revalidate = 3600;

export function generateMetadata(): Promise<Metadata> {
  return generateGlassTypeMetadata(TRIPLEX_SLUG);
}

export default function TripleksPage() {
  return <GlassTypePage slug={TRIPLEX_SLUG} />;
}
