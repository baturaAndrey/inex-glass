/**
 * The single URL list of the audits and of `e2e/all-urls.spec.ts` (task 40):
 * `sitemap.xml` ∪ 17-meta registry (expanded) ∪ service pages ∪ (optionally) an order page.
 *
 * Outside production the sitemap is empty by design (task 36), so published object and article
 * pages are additionally discovered from the `/obekty/` and `/blog/` listings.
 *
 * Pure helpers + one async collector; no side effects on import (Playwright imports this file
 * while collecting tests).
 */
import { SEED_PRICES_2026_10_15 } from "@/lib/domain/prices";
import { fetchPage, loadHtml } from "./lib/html";
import { loadMetaRegistry } from "./lib/meta-registry";
import type { RegistryEntry } from "./lib/meta-registry";

/** Service pages that are not in the sitemap (noindex) but must be audited. */
export const SERVICE_PATHS = [
  "/politika-konfidencialnosti/",
  "/soglasie-na-obrabotku-personalnyh-dannyh/",
  "/poisk/?q=стекло",
] as const;

/** A path that must answer 404 with the not-found page. */
export const NOT_FOUND_PATH = "/net-takoj-stranicy/";

/** `noindex, follow` is mandatory here (task spec §3.5, ТЗ §3.1, §8). */
export const NOINDEX_PATHS: ReadonlySet<string> = new Set([
  "/zakalennoe-steklo/5-mm/",
  "/zakalennoe-steklo/15-mm/",
  "/zakalennoe-steklo/19-mm/",
  "/politika-konfidencialnosti/",
  "/soglasie-na-obrabotku-personalnyh-dannyh/",
  "/poisk/",
]);

/**
 * Pages that deliberately have NO canonical: `/poisk/` is `noindex, follow` + `Disallow: /poisk/`
 * and every query is a different result set — no URL to canonicalise to (task 35/36, ТЗ §8.3).
 * The audits and `e2e/all-urls.spec.ts` accept a missing canonical here (a present one is still
 * checked).
 */
export const NO_CANONICAL_PATHS: ReadonlySet<string> = new Set(["/poisk/"]);

/** Prefixes that are always noindex (order pages). */
export const NOINDEX_PREFIXES = ["/zakaz/"] as const;

/** Depends on the `team` collection: noindex while it is empty (task 29/36). */
export const TEAM_PATH = "/o-kompanii/sotrudniki/";

/**
 * P0 URLs: never skipped in e2e, even on a minimal seed (task spec §5): home, hub, 8 thicknesses,
 * quiz, «Как заказать» + 5 service pages, company, contacts, privacy policy.
 */
export const P0_PATHS: readonly string[] = [
  "/",
  "/zakalennoe-steklo/",
  ...[4, 5, 6, 8, 10, 12, 15, 19].map((n) => `/zakalennoe-steklo/${n}-mm/`),
  "/raschet-stoimosti/",
  "/kak-zakazat/",
  "/kak-zakazat/trebovaniya-k-chertezham/",
  "/kak-zakazat/dopuski-i-gost/",
  "/kak-zakazat/sroki/",
  "/kak-zakazat/upakovka-i-dostavka/",
  "/kak-zakazat/dokumenty/",
  "/o-kompanii/",
  "/kontakty/",
  "/politika-konfidencialnosti/",
];

/**
 * URL patterns that legitimately exist outside 17-meta (coverage check, §3.2). Anything else in
 * the sitemap that is not in the registry is reported as `warn`.
 */
export const KNOWN_EXTRA_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /^\/obekty\/[a-z0-9-]+\/$/, reason: "карточка объекта" },
  { pattern: /^\/obekty\/page\/\d+\/$/, reason: "пагинация объектов" },
  { pattern: /^\/blog\/page\/\d+\/$/, reason: "пагинация блога" },
  { pattern: /^\/politika-konfidencialnosti\/$/, reason: "служебная (политика)" },
  { pattern: /^\/soglasie-na-obrabotku-personalnyh-dannyh\/$/, reason: "служебная (согласие)" },
  { pattern: /^\/poisk\/$/, reason: "служебная (поиск)" },
  { pattern: /^\/zakaz\/[^/]+\/$/, reason: "страница заказа" },
];

export type UrlSource = "sitemap" | "registry" | "service" | "listing" | "order";

export interface AuditUrl {
  /** Path with query (`/poisk/?q=стекло`). */
  path: string;
  sources: UrlSource[];
  registry: RegistryEntry | null;
}

/** `<loc>` values of a sitemap → paths (`https://x.ru/a/` → `/a/`). */
export function parseSitemapLocs(xml: string): string[] {
  const paths: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    try {
      const url = new URL((match[1] ?? "").replace(/&amp;/g, "&"));
      paths.push(`${decodeURI(url.pathname)}${url.search}`);
    } catch {
      // A malformed <loc> is reported by the SEO audit through the coverage check.
    }
  }
  return paths;
}

/** Path part without the query string. */
export const pathOnly = (path: string) => path.split("?")[0] ?? path;

export function isNoindexPath(path: string): boolean {
  const clean = pathOnly(path);
  return NOINDEX_PATHS.has(clean) || NOINDEX_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

export function knownExtraReason(path: string): string | null {
  const clean = pathOnly(path);
  return KNOWN_EXTRA_PATTERNS.find(({ pattern }) => pattern.test(clean))?.reason ?? null;
}

/** Registry paths for test collection (sync; prices do not change the URL set). */
export function registryPaths(): string[] {
  return loadMetaRegistry(SEED_PRICES_2026_10_15).entries.map((entry) => entry.url);
}

/** Order page from the env (a fixture token: `AUDIT_ORDER_TOKEN`), or `null`. */
export function orderPath(): string | null {
  const token = process.env.AUDIT_ORDER_TOKEN?.trim();
  return token ? `/zakaz/${encodeURIComponent(token)}/` : null;
}

/**
 * Safety cap on listing pages walked by `discoverListing` (objects: 12 per page → 50 pages is
 * 600 objects, far above the site's volume): a pagination bug can never loop the audit forever.
 */
const MAX_LISTING_PAGES = 50;

/**
 * One-segment detail paths of a listing (`/blog/<slug>/`). `page` is the pagination segment
 * (`/blog/page/N/`), never a slug, so a bare `/blog/page/` link is not a detail page.
 */
export function listingDetailPattern(listing: "/obekty/" | "/blog/"): RegExp {
  return listing === "/obekty/"
    ? /^\/obekty\/(?!page\/)[a-z0-9-]+\/$/
    : /^\/blog\/(?!page\/)[a-z0-9-]+\/$/;
}

/**
 * Detail pages linked from a listing (objects / articles), across ALL its pagination pages:
 * page 1 is fetched, then every `/<listing>/page/N/` link found in `<main>` (a visited set +
 * `MAX_LISTING_PAGES` bound the walk). Unfiltered listing pages only — no query strings.
 */
export async function discoverListing(baseUrl: string, listing: "/obekty/" | "/blog/") {
  const origin = new URL(baseUrl).origin;
  const detail = listingDetailPattern(listing);
  const paginationPage = new RegExp(`^${listing}page/\\d+/$`);
  const found = new Set<string>();
  const queue: string[] = [listing];
  const visited = new Set<string>(queue);

  while (queue.length > 0) {
    const listingPath = queue.shift() as string;
    const page = await fetchPage(`${origin}${listingPath}`, { authOrigin: origin });
    // Page 1 missing → nothing to discover; a later page failing just ends that branch.
    if (page.status !== 200) continue;
    const $ = loadHtml(page.body);
    $("main a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      let url: URL;
      try {
        url = new URL(href, origin);
      } catch {
        return;
      }
      if (url.origin !== origin) return;
      const path = url.pathname;
      if (paginationPage.test(path)) {
        if (!visited.has(path) && visited.size < MAX_LISTING_PAGES && url.search === "") {
          visited.add(path);
          queue.push(path);
        }
        return;
      }
      if (detail.test(path)) found.add(path);
    });
  }
  return [...found];
}

export interface CollectOptions {
  baseUrl: string;
  registry: readonly RegistryEntry[];
  /** Discover objects/articles from the listings (default: only when the sitemap is empty). */
  discover?: boolean;
}

export interface CollectedUrls {
  urls: AuditUrl[];
  sitemapPaths: string[];
  sitemapStatus: number | null;
  discovered: boolean;
}

export async function collectAuditUrls(opts: CollectOptions): Promise<CollectedUrls> {
  const byPath = new Map<string, AuditUrl>();
  const add = (path: string, source: UrlSource, registry: RegistryEntry | null = null) => {
    const existing = byPath.get(path);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      existing.registry ??= registry;
      return;
    }
    byPath.set(path, { path, sources: [source], registry });
  };

  let sitemapPaths: string[] = [];
  let sitemapStatus: number | null = null;
  try {
    const sitemap = await fetchPage(`${opts.baseUrl}/sitemap.xml`, { authOrigin: opts.baseUrl });
    sitemapStatus = sitemap.status;
    if (sitemap.status === 200) sitemapPaths = parseSitemapLocs(sitemap.body);
  } catch {
    sitemapStatus = null;
  }

  for (const entry of opts.registry) add(entry.url, "registry", entry);
  for (const path of sitemapPaths) add(path, "sitemap");
  for (const path of SERVICE_PATHS) add(path, "service");
  const order = orderPath();
  if (order) add(order, "order");

  const discover = opts.discover ?? sitemapPaths.length <= 1;
  if (discover) {
    for (const listing of ["/obekty/", "/blog/"] as const) {
      for (const path of await discoverListing(opts.baseUrl, listing)) add(path, "listing");
    }
  }

  return { urls: [...byPath.values()], sitemapPaths, sitemapStatus, discovered: discover };
}
