import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { collectionTag, docTag } from "@/lib/cache-tags";
import { isDraftModeEnabled } from "@/lib/preview/draft";
import { normalizeRedirectPath } from "@/payload/collections/crm/redirects";
import { LINKABLE_COLLECTIONS } from "@/payload/fields/link";
import type { Page, Thickness, ThicknessGroup } from "@/payload-types";
import { cached } from "./cache";
import { getPayloadClient } from "./payload";
import { lookupTag } from "./tags";
import type { DataFromCollectionSlug, PaginatedDocs, Where } from "payload";

/**
 * Cached queries to the public collections.
 *
 * Rules:
 * - Only PUBLIC collections can be queried (`PublicCollectionSlug`); CRM data never goes through
 *   these helpers.
 * - Reads run AS AN ANONYMOUS VISITOR (`overrideAccess: false`): collection access already limits
 *   draft-enabled collections to published documents and field-level access strips private
 *   fields (team contacts, internal notes). The `_status: published` condition is added
 *   explicitly as well, so the intent is visible and independent of the access functions.
 * - `depth` is always explicit. Tags: `collection:<slug>` on every query, plus `doc:<slug>:<id>`
 *   on single documents; populated relations add the tags of the linkable collections and media.
 */

/** Collections whose documents are publicly visible on the site. */
export const PUBLIC_COLLECTIONS = [
  "pages",
  "articles",
  "objects",
  "team",
  "thicknesses",
  "thickness-groups",
  "glass-types",
  "processing-services",
  "constructions",
  "shower-configs",
  "products",
  "object-types",
  "cities",
  "media",
] as const;

export type PublicCollectionSlug = (typeof PUBLIC_COLLECTIONS)[number];

/** Default depth of a single page-like document: blocks → media / linked cards. */
export const DOC_DEPTH = 2;
/** Default depth of list queries (cards). */
export const LIST_DEPTH = 1;

const RELATED_TAGS = [
  ...LINKABLE_COLLECTIONS.map((slug) => collectionTag(slug)),
  collectionTag("media"),
];

type Doc<C extends PublicCollectionSlug> = DataFromCollectionSlug<C>;

/** `true` when the collection has drafts (`_status` exists). */
async function hasDrafts(collection: PublicCollectionSlug): Promise<boolean> {
  const payload = await getPayloadClient();
  return Boolean(payload.collections[collection]?.config.versions?.drafts);
}

/** Adds `_status: published` to a filter for draft-enabled collections. */
async function publishedWhere(collection: PublicCollectionSlug, where?: Where): Promise<Where> {
  const conditions: Where[] = [];
  if (where && Object.keys(where).length > 0) conditions.push(where);
  if (await hasDrafts(collection)) conditions.push({ _status: { equals: "published" } });
  if (conditions.length === 0) return {};
  return conditions.length === 1 ? (conditions[0] as Where) : { and: conditions };
}

/**
 * Step 1 of a single-document lookup: id of the published document whose `field` equals `value`.
 * Cached under `collection:<slug>` (any change in the collection may change the answer) and
 * `lookup:<slug>` (expired immediately by the hooks). A miss is NOT cached (`cacheMisses: false`,
 * see `./cache.ts`): the key comes from the requested URL.
 */
const findPublishedId = cached(
  async (collection: PublicCollectionSlug, field: string, value: string | number) => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection,
      where: await publishedWhere(collection, { [field]: { equals: value } }),
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: false,
    });
    const id = docs[0]?.id;
    return id === undefined || id === null ? null : String(id);
  },
  ["cms", "find-published-id"],
  {
    tags: (collection) => [collectionTag(collection), lookupTag(collection)],
    cacheMisses: false,
  }
);

/** Step 2: the document itself, tagged with its own `doc:<slug>:<id>` tag. */
const findPublishedById = cached(
  async (collection: PublicCollectionSlug, id: string, depth: number) => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection,
      where: await publishedWhere(collection, { id: { equals: id } }),
      limit: 1,
      depth,
      pagination: false,
      overrideAccess: false,
    });
    return docs[0] ?? null;
  },
  ["cms", "find-published-by-id"],
  {
    tags: (collection, id) => [collectionTag(collection), docTag(collection, id), ...RELATED_TAGS],
    // Only reachable with an id found by step 1; a miss means "unpublished meanwhile".
    cacheMisses: false,
  }
);

async function getPublishedBy<C extends PublicCollectionSlug>(
  collection: C,
  field: string,
  value: string | number,
  depth: number
): Promise<Doc<C> | null> {
  const id = await findPublishedId(collection, field, value);
  if (id === null) return null;
  return (await findPublishedById(collection, id, depth)) as Doc<C> | null;
}

/** Brings a path to the stored form: leading and trailing slash. */
export function toPagePath(path: string): string {
  let value = path.trim() || "/";
  if (!value.startsWith("/")) value = `/${value}`;
  if (!value.endsWith("/")) value = `${value}/`;
  return value;
}

/**
 * Per-request memo (React `cache`) of the page lookup: `generateMetadata` and the page both
 * resolve the same path, and a MISS is never data-cached (`cacheMisses: false`), so without it
 * every 404 would query the database twice. Keyed by primitives — an options object would
 * defeat the memo (React compares arguments by identity).
 */
const getPageByPathMemo = cache((path: string, depth: number): Promise<Page | null> =>
  getPublishedBy("pages", "path", path, depth)
);

/**
 * Draft preview (task 11, admin redesign): the LATEST version of the page — its draft when one
 * exists, otherwise the published document. Deliberately not wrapped in `cached()`: drafts must
 * never reach the data cache (in Draft Mode Next bypasses `unstable_cache` anyway).
 *
 * `overrideAccess: true`: only reachable in Draft Mode, which `/api/preview/` enables for staff
 * only, and its cookie (`__prerender_bypass`, per-build value) cannot be forged.
 */
const getDraftPageByPathMemo = cache(async (path: string, depth: number): Promise<Page | null> => {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "pages",
    where: { path: { equals: path } },
    draft: true,
    limit: 1,
    depth,
    pagination: false,
    overrideAccess: true,
  });
  return docs[0] ?? null;
});

/**
 * Document of `pages` by its full path (`/o-kompanii/`, `/` for the home page): the published
 * one, or the latest draft while the request is in Draft Mode (the page preview).
 */
export async function getPageByPath(
  path: string,
  opts: { depth?: number } = {}
): Promise<Page | null> {
  const key = toPagePath(path);
  const depth = opts.depth ?? DOC_DEPTH;
  if (await isDraftModeEnabled()) return getDraftPageByPathMemo(key, depth);
  return getPageByPathMemo(key, depth);
}

/** Published document of a public collection by `slug`. */
export function getDocBySlug<C extends PublicCollectionSlug>(
  collection: C,
  slug: string,
  opts: { depth?: number } = {}
): Promise<Doc<C> | null> {
  return getPublishedBy(collection, "slug", slug, opts.depth ?? DOC_DEPTH);
}

export interface ListPublishedOptions {
  limit?: number;
  /** 1-based page number. */
  page?: number;
  /** Payload sort, e.g. `-publishedAt` or `order`. */
  sort?: string;
  where?: Where;
  depth?: number;
}

const DEFAULT_LIST_LIMIT = 100;

const listPublishedCached = cached(
  async (
    collection: PublicCollectionSlug,
    limit: number,
    page: number,
    sort: string | null,
    where: Where | null,
    depth: number
  ) => {
    const payload = await getPayloadClient();
    return payload.find({
      collection,
      where: await publishedWhere(collection, where ?? undefined),
      limit,
      page,
      depth,
      ...(sort ? { sort } : {}),
      overrideAccess: false,
    });
  },
  ["cms", "list-published"],
  { tags: (collection) => [collectionTag(collection), ...RELATED_TAGS] }
);

/** Paginated published documents of a public collection. */
export async function listPublished<C extends PublicCollectionSlug>(
  collection: C,
  opts: ListPublishedOptions = {}
): Promise<PaginatedDocs<Doc<C>>> {
  const result = await listPublishedCached(
    collection,
    opts.limit ?? DEFAULT_LIST_LIMIT,
    Math.max(1, Math.trunc(opts.page ?? 1)),
    opts.sort ?? null,
    opts.where ?? null,
    opts.depth ?? LIST_DEPTH
  );
  return result as unknown as PaginatedDocs<Doc<C>>;
}

// ---------------------------------------------------------------------------------------------
// Catalog helpers (task 23)
// ---------------------------------------------------------------------------------------------

/** Thickness card by `n` (4, 5, … 19 mm). */
export function getThicknessByN(
  n: number,
  opts: { depth?: number } = {}
): Promise<Thickness | null> {
  if (!Number.isInteger(n) || n <= 0) return Promise.resolve(null);
  return getPublishedBy("thicknesses", "n", n, opts.depth ?? DOC_DEPTH);
}

/** Thickness groups in display order (with their joined thicknesses). */
export async function getThicknessGroups(opts: { depth?: number } = {}): Promise<ThicknessGroup[]> {
  const { docs } = await listPublished("thickness-groups", {
    sort: "order",
    limit: DEFAULT_LIST_LIMIT,
    depth: opts.depth ?? LIST_DEPTH,
  });
  return docs;
}

// ---------------------------------------------------------------------------------------------
// Redirects (collection of task 08)
// ---------------------------------------------------------------------------------------------

export interface RedirectTarget {
  to: string;
  code: 301 | 308;
}

const findRedirect = cached(
  async (from: string): Promise<RedirectTarget | null> => {
    const payload = await getPayloadClient();
    const { docs } = await payload.find({
      collection: "redirects",
      where: { and: [{ from: { equals: from } }, { active: { equals: true } }] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: false,
    });
    const doc = docs[0];
    if (!doc?.to) return null;
    return { to: doc.to.trim(), code: doc.code === "308" ? 308 : 301 };
  },
  ["cms", "redirect"],
  // Keyed by the requested URL: a miss (the common case — every 404) is never cached.
  { tags: [collectionTag("redirects"), lookupTag("redirects")], cacheMisses: false }
);

/** Per-request memo (React `cache`) keyed by the normalized path: a miss is never data-cached. */
const getRedirectMemo = cache(async (from: string): Promise<RedirectTarget | null> => {
  if (from === "") return null;
  const target = await findRedirect(from);
  if (!target || target.to === "") return null;
  // A record pointing at itself would loop forever; treat it as missing.
  if (target.to.startsWith("/") && normalizeRedirectPath(target.to) === from) return null;
  return target;
});

/**
 * Active redirect for a path. The path is normalized exactly like `redirects.from` is stored
 * (percent-decoded, lower case, trailing slash, no origin/query/hash), so `/Old%20Page` and
 * `/old page/` find the same record.
 */
export function getRedirect(path: string): Promise<RedirectTarget | null> {
  return getRedirectMemo(normalizeRedirectPath(path));
}

/**
 * Redirects when an active `redirects` record exists for the path, otherwise returns.
 *
 * Always `permanentRedirect` (HTTP 308) whatever the record's `code`: search engines treat 308 as
 * a permanent redirect, like 301 (see requirements, «Техническое SEO»).
 *
 * Pages call it before rendering the 404 body —
 * `await redirectIfExists(path); return <NotFoundResponse />;` — see
 * `@/components/page/not-found-response` for why a bare `notFound()` is not enough.
 */
export async function redirectIfExists(path: string): Promise<void> {
  const target = await getRedirect(path);
  if (target) permanentRedirect(target.to);
}

/**
 * Redirect when a `redirects` record exists, otherwise `notFound()`.
 *
 * Caveat: a `notFound()` thrown by a page outside `<Suspense>` yields an EMPTY server-rendered
 * body in Next 16.4 (see `@/components/page/not-found-response`). Static/ISR pages (typed routes
 * of Wave 5 included) should use `redirectIfExists` + `<NotFoundResponse />`; this helper is for
 * dynamic routes and code that can only throw (e.g. nested loaders).
 */
export async function redirectOrNotFound(path: string): Promise<never> {
  await redirectIfExists(path);
  notFound();
}
