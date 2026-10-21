import { NOT_FOUND_METADATA, NotFoundResponse } from "@/components/page/not-found-response";
import {
  GlassTypePage,
  generateGlassTypeMetadata,
  isGlassTypeSlug,
} from "@/components/templates/glass-type-template";
import {
  ThicknessPage,
  generateThicknessMetadata,
  parseThicknessSlug,
} from "@/components/templates/thickness-template";
import { redirectIfExists } from "@/lib/cms/queries";
import type { Metadata } from "next";

/**
 * `/zakalennoe-steklo/[slug]/` — one route for two templates:
 * - `4-mm` … `19-mm` (strictly `^(4|5|6|8|10|12|15|19)-mm$`) → thickness card;
 * - a glass type slug (`matovoe`, `osvetlennoe`, …; template of task 24) → glass type page;
 * - anything else → a redirect record or the server-rendered 404 (`NotFoundResponse`: a bare
 *   `notFound()` here would ship an empty body, see `@/components/page/not-found-response`).
 *
 * No DB at build time: nothing is prerendered, pages render on first request and are ISR —
 * prices follow the date (45-day rule), so at least hourly.
 */

type Params = Promise<{ slug: string }>;

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams(): Array<{ slug: string }> {
  return [];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const n = parseThicknessSlug(slug);
  if (n !== null) return generateThicknessMetadata(n);
  if (isGlassTypeSlug(slug)) return generateGlassTypeMetadata(slug);
  return NOT_FOUND_METADATA;
}

export default async function ZakSlugPage({ params }: { params: Params }) {
  const { slug } = await params;
  const n = parseThicknessSlug(slug);
  if (n !== null) return <ThicknessPage n={n} />;
  if (isGlassTypeSlug(slug)) return <GlassTypePage slug={slug} />;
  await redirectIfExists(`/zakalennoe-steklo/${slug}/`);
  return <NotFoundResponse />;
}
