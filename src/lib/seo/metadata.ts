import { assertDbAvailableOrBailOut } from "@/lib/cms/cache";
import { replacePlaceholders } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import { getEnv } from "@/lib/env";
import type { Metadata } from "next";

/**
 * `generateMetadata` builder for every public page: title/description from the SEO group of the
 * document (with CMS placeholders), canonical, robots, Open Graph.
 *
 * All URLs are absolute and built from the RUNTIME `SITE_URL`. `metadataBase` of the layout is
 * not relied upon: for pages prerendered at build time it would carry the build-time URL.
 * During `next build` this function opts the route out of prerendering (see `@/lib/cms/cache`),
 * so the URL is always resolved at runtime.
 */

export const SITE_NAME = "Inex Glass";
/** Brand suffix already present in the titles of `docs/inex/17-meta.md`. */
export const TITLE_BRAND_SUFFIX = ` | ${SITE_NAME}`;
/** Neutral 1200×630 fallback image in `public/`. */
export const DEFAULT_OG_IMAGE = "/og-default.jpg";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

export interface SeoFields {
  h1?: string | null;
  title?: string | null;
  description?: string | null;
  noindex?: boolean | null;
  canonical?: string | null;
}

export interface BuildMetadataInput {
  seo: SeoFields | null | undefined;
  /** Page path with a trailing slash: `/zakalennoe-steklo/10-mm/`, `/obekty/page/2/`. */
  path: string;
  fallbackTitle: string;
  fallbackDescription?: string | undefined;
  /** CMS placeholders `{…}` are substituted in title and description. */
  placeholders?: PlaceholderContext | undefined;
  image?: { url: string; alt?: string | null | undefined } | null | undefined;
  type?: "website" | "article" | undefined;
  /** Listing pages 2+: «— страница N» in the title. */
  pagination?: { page: number } | undefined;
  /** Service pages, filters, search: `noindex, follow`. */
  forceNoindex?: boolean | undefined;
  /** Canonical of another page, e.g. `/obekty/` for filtered listings. */
  canonicalOverride?: string | undefined;
}

const ABSOLUTE_URL = /^https?:\/\//i;

/** Runtime site origin without a trailing slash: `https://inexglass.ru`. */
export function siteOrigin(): string {
  return getEnv().SITE_URL.replace(/\/+$/, "");
}

/** Path with a leading and trailing slash (query/hash kept after the slash). */
function withSlashes(path: string): string {
  const match = /^([^?#]*)(.*)$/.exec(path.trim());
  let pathname = match?.[1] ?? "";
  const rest = match?.[2] ?? "";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  if (!pathname.endsWith("/")) pathname = `${pathname}/`;
  return `${pathname}${rest}`;
}

/**
 * Absolute URL from a site path (`/kontakty/` → `https://inexglass.ru/kontakty/`), guaranteeing
 * the trailing slash of `trailingSlash: true`. Absolute input is returned unchanged.
 */
export function absoluteUrl(pathOrUrl: string): string {
  const value = pathOrUrl.trim();
  if (ABSOLUTE_URL.test(value)) return value;
  return `${siteOrigin()}${withSlashes(value)}`;
}

/** Absolute URL of a file/asset (no trailing slash added): `/og-default.jpg`. */
export function absoluteAssetUrl(pathOrUrl: string): string {
  const value = pathOrUrl.trim();
  if (ABSOLUTE_URL.test(value)) return value;
  return `${siteOrigin()}${value.startsWith("/") ? value : `/${value}`}`;
}

/** Placeholder substitution for meta and H1 strings; trims and collapses doubled spaces. */
export function resolveSeoText(
  text: string | null | undefined,
  placeholders?: PlaceholderContext
): string {
  const value = text?.trim() ?? "";
  if (!value) return "";
  const replaced = placeholders ? replacePlaceholders(value, placeholders) : value;
  return replaced.replace(/[ \t]{2,}/g, " ").trim();
}

/** H1 of a page: `seo.h1` (with placeholders) or the fallback (usually the document title). */
export function resolveH1(
  seo: SeoFields | null | undefined,
  fallback: string,
  placeholders?: PlaceholderContext
): string {
  return resolveSeoText(seo?.h1, placeholders) || resolveSeoText(fallback, placeholders);
}

/** «Title | Inex Glass» → «Title — страница 2 | Inex Glass» (page ≥ 2 only). */
export function withPageNumber(title: string, page: number | undefined): string {
  if (page === undefined || !Number.isInteger(page) || page < 2) return title;
  const marker = ` — страница ${page}`;
  if (title.endsWith(TITLE_BRAND_SUFFIX)) {
    return `${title.slice(0, -TITLE_BRAND_SUFFIX.length)}${marker}${TITLE_BRAND_SUFFIX}`;
  }
  return `${title}${marker}`;
}

/** Fallback titles (document names) get the brand suffix the 17-meta titles already have. */
function withBrand(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title}${TITLE_BRAND_SUFFIX}`;
}

/** Everything except production (staging, dev, unset) must stay out of search indexes. */
function isIndexableEnvironment(): boolean {
  return getEnv().SITE_ENV === "production";
}

function robotsFor(noindex: boolean): NonNullable<Metadata["robots"]> {
  if (!isIndexableEnvironment()) return { index: false, follow: false };
  return { index: !noindex, follow: true };
}

export async function buildMetadata(input: BuildMetadataInput): Promise<Metadata> {
  // Build-time: no DB and no runtime SITE_URL → render on request instead (see @/lib/cms/cache).
  await assertDbAvailableOrBailOut();

  const { seo, placeholders } = input;

  const seoTitle = resolveSeoText(seo?.title, placeholders);
  const baseTitle = seoTitle || withBrand(resolveSeoText(input.fallbackTitle, placeholders));
  const title = withPageNumber(baseTitle, input.pagination?.page);

  const description =
    resolveSeoText(seo?.description, placeholders) ||
    resolveSeoText(input.fallbackDescription, placeholders);

  const canonicalSource = input.canonicalOverride?.trim() || seo?.canonical?.trim() || input.path;
  const canonical = absoluteUrl(canonicalSource);
  const url = absoluteUrl(input.path);

  const image = input.image?.url
    ? { url: absoluteAssetUrl(input.image.url), alt: input.image.alt?.trim() || title }
    : {
        url: absoluteAssetUrl(DEFAULT_OG_IMAGE),
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: SITE_NAME,
      };

  return {
    title: { absolute: title },
    ...(description ? { description } : {}),
    alternates: { canonical },
    robots: robotsFor(Boolean(seo?.noindex) || Boolean(input.forceNoindex)),
    openGraph: {
      type: input.type ?? "website",
      locale: "ru_RU",
      siteName: SITE_NAME,
      url,
      title,
      ...(description ? { description } : {}),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(description ? { description } : {}),
      images: [image.url],
    },
  };
}
