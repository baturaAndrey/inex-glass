import { blogPageHref, totalPages as blogTotalPages, BLOG_PATH } from "@/lib/blog/pagination";
import { collectionTag, globalTag } from "@/lib/cache-tags";
import { cached } from "@/lib/cms/cache";
import { getPayloadClient } from "@/lib/cms/payload";
import { isTeamIndexable } from "@/lib/cms/team";
import { getEnv } from "@/lib/env";
import {
  OBJECTS_BASE_PATH,
  objectsPagePath,
  RESERVED_OBJECT_SLUG,
  totalPagesOf as objectsTotalPages,
} from "@/lib/objects/filters";
import { PATH_COLLECTIONS, ROOT_PATH } from "@/payload/fields/path-utils";
import { docUrl } from "./doc-url";
import { isIndexable } from "./indexable";
import type { PublicCollection } from "./doc-url";

/**
 * Entries of `/sitemap.xml` (task 36, ТЗ §8.4) — also the URL list of `scripts/indexnow-all.ts`.
 *
 * Included: `/`, every published indexable document of the public collections (`isIndexable`),
 * the listings `/obekty/` and `/blog/` with their pagination pages 2…N, and the fixed routes of
 * `STATIC_PATHS` when no document claims them. Excluded: drafts, `seo.noindex`, thicknesses
 * 5/15/19 mm, legal pages, `/poisk/`, `/zakaz/*`, the team page while the team is empty, and every
 * URL with a query (filters, quiz parameters, UTM) — those are never generated here.
 *
 * `lastModified`: the document's `updatedAt`; thicknesses — also the `prices` global (the price
 * is on the page); listings — the newest document of their collection; `/` — the home document
 * and the `prices` / `promo` globals.
 *
 * Volume: a few hundred URLs — one file. If it ever approaches 45 000 URLs (protocol limit
 * 50 000), split it with `generateSitemaps` (not implemented on purpose).
 *
 * Environment: this module always lists everything; `src/app/(site)/sitemap.ts` serves an empty
 * `urlset` outside production.
 */

export interface SitemapEntry {
  url: string;
  lastModified: Date;
}

/** Fixed routes that must be in the sitemap even when no `pages` document backs them. */
export const STATIC_PATHS = [
  "/raschet-stoimosti/",
  "/instrumenty/kalkulyator-vesa-stekla/",
  "/kontakty/",
  "/o-kompanii/",
  OBJECTS_BASE_PATH,
  BLOG_PATH,
] as const;

/** Indexable only while the `team` collection has visible members (`isTeamIndexable`). */
export const TEAM_PATH = "/o-kompanii/sotrudniki/";

/** Sitemap data is refreshed at least hourly even without a hook-driven invalidation. */
export const SITEMAP_REVALIDATE_SECONDS = 3600;

/** Raw, JSON-serialisable document row (only the fields the rules read). */
export interface SitemapDoc {
  path?: string | null;
  slug?: string | null;
  n?: number | null;
  isHome?: boolean | null;
  urlBase?: string | null;
  _status?: string | null;
  indexable?: boolean | null;
  seo?: { noindex?: boolean | null } | null;
  updatedAt?: string | null;
}

export interface SitemapSource {
  docs: Record<PublicCollection, SitemapDoc[]>;
  /** `updatedAt` of the `prices` / `promo` globals (ISO) or `null` when not seeded. */
  pricesUpdatedAt: string | null;
  promoUpdatedAt: string | null;
  teamIndexable: boolean;
}

/** Draft-enabled collections are read with `_status = published`. */
const DRAFT_COLLECTIONS: ReadonlySet<PublicCollection> = new Set([
  "pages",
  "glass-types",
  "constructions",
  "articles",
  "objects",
]);

/** Only the fields `isIndexable` / `docUrl` / `lastModified` need, per collection. */
const SELECTS: Record<PublicCollection, Record<string, unknown>> = {
  pages: {
    path: true,
    slug: true,
    isHome: true,
    _status: true,
    seo: { noindex: true },
    updatedAt: true,
  },
  thicknesses: { path: true, n: true, indexable: true, seo: { noindex: true }, updatedAt: true },
  "glass-types": {
    path: true,
    slug: true,
    urlBase: true,
    _status: true,
    seo: { noindex: true },
    updatedAt: true,
  },
  "processing-services": { path: true, slug: true, seo: { noindex: true }, updatedAt: true },
  constructions: { path: true, slug: true, _status: true, seo: { noindex: true }, updatedAt: true },
  articles: { path: true, slug: true, _status: true, seo: { noindex: true }, updatedAt: true },
  objects: { path: true, slug: true, _status: true, seo: { noindex: true }, updatedAt: true },
};

/** Sort order of the templates (after `/`); ties are ordered by URL. */
const TEMPLATE_RANK: Record<PublicCollection | "listing" | "static", number> = {
  pages: 1,
  static: 1,
  constructions: 2,
  "glass-types": 3,
  thicknesses: 4,
  "processing-services": 5,
  listing: 6,
  articles: 7,
  objects: 8,
};

const SITEMAP_TAGS = [
  ...PATH_COLLECTIONS.map((slug) => collectionTag(slug)),
  collectionTag("team"),
  globalTag("prices"),
  globalTag("promo"),
];

// ---------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------

async function loadDocs(collection: PublicCollection): Promise<SitemapDoc[]> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection,
    ...(DRAFT_COLLECTIONS.has(collection) ? { where: { _status: { equals: "published" } } } : {}),
    // The per-collection shape is checked by hand above; Payload's `select` type is per slug.
    select: SELECTS[collection] as never,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return docs as unknown as SitemapDoc[];
}

async function loadGlobalUpdatedAt(slug: "prices" | "promo"): Promise<string | null> {
  const payload = await getPayloadClient();
  try {
    const global = await payload.findGlobal({ slug, depth: 0, overrideAccess: true });
    return typeof global?.updatedAt === "string" ? global.updatedAt : null;
  } catch {
    return null;
  }
}

/**
 * Raw sitemap data in one cache entry: invalidated by the `collection:*` hooks of every public
 * collection and the `prices` / `promo` globals, and refreshed hourly at the latest.
 */
const loadSitemapDocs = cached(
  async (): Promise<Pick<SitemapSource, "docs" | "pricesUpdatedAt" | "promoUpdatedAt">> => {
    const rows = await Promise.all(PATH_COLLECTIONS.map((collection) => loadDocs(collection)));
    const docs = Object.fromEntries(
      PATH_COLLECTIONS.map((collection, index) => [collection, rows[index] ?? []])
    ) as Record<PublicCollection, SitemapDoc[]>;
    const [pricesUpdatedAt, promoUpdatedAt] = await Promise.all([
      loadGlobalUpdatedAt("prices"),
      loadGlobalUpdatedAt("promo"),
    ]);
    return { docs, pricesUpdatedAt, promoUpdatedAt };
  },
  ["seo", "sitemap-docs"],
  { tags: SITEMAP_TAGS, revalidate: SITEMAP_REVALIDATE_SECONDS }
);

export async function loadSitemapSource(): Promise<SitemapSource> {
  const [data, teamIndexable] = await Promise.all([loadSitemapDocs(), isTeamIndexable()]);
  return { ...data, teamIndexable };
}

// ---------------------------------------------------------------------------------------------
// Rules (pure)
// ---------------------------------------------------------------------------------------------

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maxDate(...values: (Date | null | undefined)[]): Date | null {
  let result: Date | null = null;
  for (const value of values) {
    if (value && (!result || value.getTime() > result.getTime())) result = value;
  }
  return result;
}

/** Newest `updatedAt` of a list of documents. */
function newest(docs: readonly SitemapDoc[]): Date | null {
  return maxDate(...docs.map((doc) => toDate(doc.updatedAt)));
}

interface Collected {
  lastModified: Date;
  rank: number;
}

/** Builds the entries from raw data. Pure (the clock is injected for the no-data fallback). */
export function buildSitemapEntries(
  source: SitemapSource,
  siteUrl: string,
  now: Date = new Date()
): SitemapEntry[] {
  const origin = siteUrl.trim().replace(/\/+$/, "");
  const entries = new Map<string, Collected>();
  /** Paths of published documents excluded by a rule: never re-added from `STATIC_PATHS`. */
  const excluded = new Set<string>();

  const add = (path: string, lastModified: Date | null, rank: number) => {
    const date = lastModified ?? now;
    const current = entries.get(path);
    if (!current) {
      entries.set(path, { lastModified: date, rank });
      return;
    }
    current.lastModified = maxDate(current.lastModified, date) ?? date;
    current.rank = Math.min(current.rank, rank);
  };

  const prices = toDate(source.pricesUpdatedAt);
  const promo = toDate(source.promoUpdatedAt);
  const homeDoc = source.docs.pages.find((doc) => docUrl("pages", doc) === ROOT_PATH);
  const homeLastModified = maxDate(toDate(homeDoc?.updatedAt), prices, promo);
  add(ROOT_PATH, homeLastModified, 0);

  for (const collection of PATH_COLLECTIONS) {
    for (const doc of source.docs[collection]) {
      const path = docUrl(collection, doc);
      if (!path || path === ROOT_PATH) continue;
      if (!isIndexable(collection, doc) || (path === TEAM_PATH && !source.teamIndexable)) {
        excluded.add(path);
        continue;
      }
      const updated = toDate(doc.updatedAt);
      add(
        path,
        collection === "thicknesses" ? maxDate(updated, prices) : updated,
        TEMPLATE_RANK[collection]
      );
    }
  }

  // Listings: page 1 + pagination pages 2…N (index, follow, self-canonical — ТЗ §8.4).
  const listedObjects = source.docs.objects.filter(
    (doc) => doc.slug !== RESERVED_OBJECT_SLUG && docUrl("objects", doc) !== null
  );
  const objectsLastModified = newest(listedObjects);
  add(OBJECTS_BASE_PATH, objectsLastModified, TEMPLATE_RANK.listing);
  for (let page = 2; page <= objectsTotalPages(listedObjects.length); page++) {
    add(objectsPagePath(page), objectsLastModified, TEMPLATE_RANK.listing);
  }

  const articles = source.docs.articles;
  const articlesLastModified = newest(articles);
  add(BLOG_PATH, articlesLastModified, TEMPLATE_RANK.listing);
  for (let page = 2; page <= blogTotalPages(articles.length); page++) {
    add(blogPageHref(page), articlesLastModified, TEMPLATE_RANK.listing);
  }

  for (const path of STATIC_PATHS) {
    if (!entries.has(path) && !excluded.has(path))
      add(path, homeLastModified, TEMPLATE_RANK.static);
  }

  return [...entries.entries()]
    .sort(
      ([pathA, a], [pathB, b]) => a.rank - b.rank || (pathA < pathB ? -1 : pathA > pathB ? 1 : 0)
    )
    .map(([path, { lastModified }]) => ({ url: `${origin}${path}`, lastModified }));
}

/** Every sitemap entry of the site (absolute URLs from the runtime `SITE_URL`). */
export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  return buildSitemapEntries(await loadSitemapSource(), getEnv().SITE_URL);
}
