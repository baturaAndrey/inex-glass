import { docUrl, isPublicCollection } from "./doc-url";
import type { PublicCollection } from "./doc-url";

/**
 * «May this document be in the search index?» — the single rule shared by the sitemap
 * (`./sitemap-entries.ts`) and the IndexNow plugin (`@/payload/plugins/indexnow`), task 36,
 * and — through `isClosedDocument` / `isExcludedFromSearch` — by the site search (task 35).
 * Pure: no Payload / Next imports (unit-tested).
 *
 * A document is indexable when ALL of the following hold:
 * - it belongs to a public collection and resolves to a canonical path (`docUrl`);
 * - it is published: `_status === 'published'` for draft-enabled collections (pages,
 *   glass-types, constructions, articles, objects). `thicknesses` and `processing-services` have
 *   no drafts — they are always public;
 * - it is not a closed document (`isClosedDocument`: `seo.noindex`, a legal page, a service
 *   path such as search, order pages, legal pages — see below);
 * - thicknesses: `indexable === true` (5, 15 and 19 mm are noindex by ТЗ §3.1).
 *
 * The site search excludes exactly the closed documents (`isExcludedFromSearch`); unlike search
 * engines it keeps the 5/15/19 mm thicknesses (real pages a visitor may look for). Publication
 * is checked by the caller there: only the PUBLISHED version decides (a draft never removes the
 * live search entry).
 *
 * Environment (staging/dev never index) is NOT part of this rule: callers check `SITE_ENV`.
 * The team page `/o-kompanii/sotrudniki/` additionally depends on the `team` collection
 * (`isTeamIndexable()`), which the sitemap checks separately.
 */

/** Paths that are never indexed even when a published document claims them. */
const NON_INDEXABLE_PATHS: ReadonlySet<string> = new Set([
  "/poisk/",
  "/politika-konfidencialnosti/",
  "/soglasie-na-obrabotku-personalnyh-dannyh/",
  "/ui-kit/",
]);

/** Prefixes of service sections (order pages, admin, API). */
const NON_INDEXABLE_PREFIXES = ["/zakaz/", "/admin/", "/api/", "/ui-kit/"] as const;

/** Collections with Payload drafts (`_status`); the others have no publication state. */
const DRAFT_COLLECTIONS: ReadonlySet<PublicCollection> = new Set([
  "pages",
  "glass-types",
  "constructions",
  "articles",
  "objects",
]);

/** Page template of legal documents (privacy policy, consent): never indexed nor searchable. */
const LEGAL_TEMPLATE = "legal";

/** Minimal document shape read by the rule; every field is optional on purpose. */
export interface IndexableInput {
  _status?: string | null;
  indexable?: boolean | null;
  seo?: { noindex?: boolean | null } | null;
  /** `pages.template` */
  template?: string | null;
}

/** `true` when the path is a service URL that must never be in the index. */
export function isServicePath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    NON_INDEXABLE_PATHS.has(lower) ||
    NON_INDEXABLE_PREFIXES.some((prefix) => lower.startsWith(prefix))
  );
}

/** Published state of a document of a draft-enabled collection (others are always public). */
export function isPublished(collection: string, doc: unknown): boolean {
  if (!isPublicCollection(collection)) return false;
  if (!DRAFT_COLLECTIONS.has(collection)) return true;
  return (doc as IndexableInput | null)?._status === "published";
}

/**
 * `true` for a document closed from every index whatever its status: `seo.noindex` (any public
 * collection), a legal page (`template: legal`) or a service path (`isServicePath`).
 * Non-public collections and non-objects are not «closed» — they are simply not public.
 */
export function isClosedDocument(collection: string, doc: unknown): boolean {
  if (!isPublicCollection(collection)) return false;
  if (typeof doc !== "object" || doc === null) return false;

  const input = doc as IndexableInput;
  if (input.seo?.noindex === true) return true;
  if (collection === "pages" && input.template === LEGAL_TEMPLATE) return true;
  const path = docUrl(collection, doc);
  return path !== null && isServicePath(path);
}

/**
 * `true` when the (published) document must not be in the site search index. Same rule as
 * `isClosedDocument`; callers pass the PUBLISHED version only — a draft never decides.
 */
export function isExcludedFromSearch(collection: string, doc: unknown): boolean {
  return isClosedDocument(collection, doc);
}

export function isIndexable(collection: string, doc: unknown): boolean {
  if (!isPublicCollection(collection)) return false;
  if (typeof doc !== "object" || doc === null) return false;

  const input = doc as IndexableInput;
  if (!isPublished(collection, input)) return false;
  if (isClosedDocument(collection, input)) return false;
  if (collection === "thicknesses" && input.indexable !== true) return false;

  return docUrl(collection, doc) !== null;
}
