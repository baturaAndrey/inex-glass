import { PATH_COLLECTIONS, PATH_PATTERN, ROOT_PATH } from "@/payload/fields/path-utils";

/**
 * The single resolver «CMS document → canonical site path» (trailing slash, no origin).
 * Used by rich-text internal links, link fields of blocks, site search (task 35) and the
 * sitemap / IndexNow (task 36). Pure: no Payload/Next imports, safe in client bundles and tests.
 *
 * Every public collection stores the computed `path` (DB-level, kept in sync by the collection
 * hooks), so the stored value wins. The fallbacks below only cover documents populated
 * without `path` (custom `select`, an old revision): they mirror the collection hooks.
 */

export type PublicCollection = (typeof PATH_COLLECTIONS)[number];

/** Minimal shape read from a populated document; every field is optional on purpose. */
export interface DocUrlInput {
  path?: string | null;
  slug?: string | null;
  isHome?: boolean | null;
  /** `thicknesses.n` */
  n?: number | string | null;
  /** `glass-types.urlBase`: `root` lives at `/<slug>/` (triplex). */
  urlBase?: string | null;
}

const HUB_BASE: Partial<Record<PublicCollection, string>> = {
  "glass-types": "/zakalennoe-steklo/",
  "processing-services": "/obrabotka-stekla/",
  articles: "/blog/",
  objects: "/obekty/",
};

/** Glass types that live at the site root even without `urlBase: root` (`/tripleks/`). */
const ROOT_GLASS_TYPES: ReadonlySet<string> = new Set(["tripleks"]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PUBLIC_COLLECTIONS: ReadonlySet<string> = new Set(PATH_COLLECTIONS);

export function isPublicCollection(collection: string): collection is PublicCollection {
  return PUBLIC_COLLECTIONS.has(collection);
}

function validSlug(slug: unknown): string | null {
  return typeof slug === "string" && SLUG_PATTERN.test(slug) ? slug : null;
}

function thicknessPath(n: unknown): string | null {
  const value = typeof n === "string" ? Number(n) : n;
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? `/zakalennoe-steklo/${value}-mm/`
    : null;
}

/** Path rebuilt from slug-like fields when the stored `path` is missing. */
function fallbackPath(collection: PublicCollection, doc: DocUrlInput): string | null {
  if (collection === "pages" && doc.isHome === true) return ROOT_PATH;
  if (collection === "thicknesses") return thicknessPath(doc.n);

  const slug = validSlug(doc.slug);
  if (!slug) return null;

  if (collection === "glass-types" && (doc.urlBase === "root" || ROOT_GLASS_TYPES.has(slug))) {
    return `/${slug}/`;
  }
  // Pages and constructions without a stored path: their parent is unknown, assume the root.
  return `${HUB_BASE[collection] ?? ROOT_PATH}${slug}/`;
}

/**
 * Canonical path of a document of a public collection, or `null` when the document is not
 * populated (a bare id), belongs to a private collection or has no usable path.
 *
 * - `pages` → its `path` (`/` for the home page);
 * - `thicknesses` → `/zakalennoe-steklo/{n}-mm/`;
 * - `glass-types` → `/zakalennoe-steklo/{slug}/`, `tripleks` → `/tripleks/`;
 * - `processing-services` → `/obrabotka-stekla/{slug}/`;
 * - `constructions` → its `path` (parent path + slug: `/steklyannye-peregorodki/`);
 * - `articles` → `/blog/{slug}/`; `objects` → `/obekty/{slug}/`.
 */
export function docUrl(collection: string, doc: unknown): string | null {
  if (!isPublicCollection(collection)) return null;
  if (typeof doc !== "object" || doc === null) return null;

  const input = doc as DocUrlInput;
  // Triplex has its own root section (`/tripleks/`) whatever `urlBase` an editor picked.
  const slug = validSlug(input.slug);
  if (collection === "glass-types" && slug && ROOT_GLASS_TYPES.has(slug)) return `/${slug}/`;
  if (typeof input.path === "string" && PATH_PATTERN.test(input.path)) return input.path;
  return fallbackPath(collection, input);
}
