import { getEnv } from "@/lib/env";
import { docUrl } from "@/lib/seo/doc-url";
import { isIndexable, isPublished } from "@/lib/seo/indexable";
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  CollectionSlug,
  Plugin,
  PayloadRequest,
} from "payload";

/**
 * IndexNow plugin (task 36): when a public document is published, changed while published,
 * un-published or deleted, its URL is queued for the `indexnow-submit` job (`src/jobs/indexnow.ts`),
 * which tells Yandex / Bing to re-crawl it. Search engines then see the new content, or a
 * 404 / redirect and drop the URL.
 *
 * Contract of the plugin registry (task 10): this file exports `indexNowPlugin: Plugin`, called
 * without arguments by `src/payload/plugins/index.ts`. The collection list is configured here;
 * the hooks are appended to the collection configs, the collection files are not touched.
 *
 * Nothing is queued when:
 * - the write comes from the seed / import / CLI (`req.context.disableRevalidate`);
 * - the site is not production (`SITE_ENV`), or `INDEXNOW_KEY` is unset;
 * - `site-settings.indexNow.enabled` is off (switched on by a human after launch);
 * - neither the old nor the new version is indexable (drafts, `seo.noindex`, 5/15/19 mm, …);
 * - a DRAFT is saved over a published document: the public version did not change.
 *
 * The hook never performs HTTP: it only inserts a job row (inside the save transaction, so a
 * rolled-back save queues nothing) with `waitUntil` = now + 60 s, which batches quick
 * successive edits into separate small jobs without blocking the admin.
 */

/** Collections whose documents have public URLs (`docUrl`). */
export const INDEXNOW_COLLECTIONS = [
  "pages",
  "thicknesses",
  "glass-types",
  "processing-services",
  "constructions",
  "articles",
  "objects",
] as const satisfies readonly CollectionSlug[];

/** Same slug as `INDEXNOW_SUBMIT` of `@/jobs/indexnow` (not imported: keeps the config graph small). */
export const INDEXNOW_TASK = "indexnow-submit" as const;

/** Delay before the job may run. */
export const INDEXNOW_DELAY_MS = 60_000;

/** Listing pages that show cards of the collection (page 1 only: deeper pages shift anyway). */
const LISTING_PATHS: Readonly<Partial<Record<string, string>>> = {
  objects: "/obekty/",
  articles: "/blog/",
};

const INDEXNOW_COLLECTION_SET: ReadonlySet<string> = new Set(INDEXNOW_COLLECTIONS);

/**
 * Site paths to submit after a change of `doc` (previously `previousDoc`, absent on create /
 * delete). Pure: no environment or database checks.
 *
 * - the new URL when the new version is indexable;
 * - the old URL when the old version was indexable and the page disappeared from it
 *   (un-published, closed with noindex, moved to another path);
 * - the collection's listing page when anything is submitted.
 */
export function changedPaths(collection: string, doc: unknown, previousDoc?: unknown): string[] {
  const paths = new Set<string>();
  const currentPath = isIndexable(collection, doc) ? docUrl(collection, doc) : null;
  const previousPath =
    previousDoc !== undefined && isIndexable(collection, previousDoc)
      ? docUrl(collection, previousDoc)
      : null;

  if (currentPath) paths.add(currentPath);
  if (previousPath && previousPath !== currentPath) paths.add(previousPath);

  const listing = LISTING_PATHS[collection];
  if (paths.size > 0 && listing) paths.add(listing);
  return [...paths];
}

/** Absolute URLs (`https://inexglass.ru/…`) from site paths. */
export function toAbsoluteUrls(paths: readonly string[], siteUrl: string): string[] {
  const origin = siteUrl.trim().replace(/\/+$/, "");
  return paths.map((path) => `${origin}${path}`);
}

/** `true` when nothing may be queued for this environment / request. */
function isDisabled(req: PayloadRequest): boolean {
  if (req.context?.disableRevalidate) return true;
  const { SITE_ENV, INDEXNOW_KEY } = getEnv();
  return SITE_ENV !== "production" || !INDEXNOW_KEY;
}

async function isEnabledInSettings(req: PayloadRequest): Promise<boolean> {
  const settings = await req.payload.findGlobal({
    slug: "site-settings",
    depth: 0,
    overrideAccess: true,
    req,
  });
  return settings?.indexNow?.enabled === true;
}

/**
 * A draft saved over a published document reaches `afterChange` as `_status: 'draft'` with a
 * published `previousDoc` — exactly like an un-publish. The main row tells them apart: a draft
 * save writes only a version, an un-publish updates the main row.
 */
async function isStillPublished(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: unknown
): Promise<boolean> {
  if (typeof id !== "string" && typeof id !== "number") return false;
  const main = await req.payload.findByID({
    collection,
    id,
    depth: 0,
    draft: false,
    disableErrors: true,
    overrideAccess: true,
    req,
  });
  return (main as { _status?: unknown } | null)?._status === "published";
}

async function queueSubmit(
  req: PayloadRequest,
  collection: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0 || !(await isEnabledInSettings(req))) return;
  const urls = toAbsoluteUrls(paths, getEnv().SITE_URL);
  await req.payload.jobs.queue({
    task: INDEXNOW_TASK,
    input: { urls },
    waitUntil: new Date(Date.now() + INDEXNOW_DELAY_MS),
    req,
  });
  req.payload.logger.info({
    msg: "IndexNow: URL поставлены в очередь",
    collection,
    urls: urls.length,
  });
}

function logFailure(req: PayloadRequest, collection: string, error: unknown): void {
  // A failed ping must never fail the editor's save.
  req.payload.logger.error({
    msg: "IndexNow: не удалось поставить задание в очередь",
    collection,
    error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
  });
}

const afterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (isDisabled(req)) return doc;
  const slug = collection.slug;
  try {
    const previous = operation === "update" ? previousDoc : undefined;
    const paths = changedPaths(slug, doc, previous);
    if (paths.length === 0) return doc;

    const draftOverPublished =
      previous !== undefined && isPublished(slug, previous) && !isPublished(slug, doc);
    if (draftOverPublished && (await isStillPublished(req, slug as CollectionSlug, doc?.id))) {
      return doc;
    }
    await queueSubmit(req, slug, paths);
  } catch (error) {
    logFailure(req, slug, error);
  }
  return doc;
};

const afterDelete: CollectionAfterDeleteHook = async ({ collection, doc, req }) => {
  if (isDisabled(req)) return doc;
  const slug = collection.slug;
  try {
    // The deleted document was indexable → submit its URL so the engine sees the 404.
    await queueSubmit(req, slug, changedPaths(slug, undefined, doc));
  } catch (error) {
    logFailure(req, slug, error);
  }
  return doc;
};

function withHooks(collection: CollectionConfig): CollectionConfig {
  if (!INDEXNOW_COLLECTION_SET.has(collection.slug)) return collection;
  return {
    ...collection,
    hooks: {
      ...collection.hooks,
      afterChange: [...(collection.hooks?.afterChange ?? []), afterChange],
      afterDelete: [...(collection.hooks?.afterDelete ?? []), afterDelete],
    },
  };
}

export const indexNowPlugin: Plugin = (config) => ({
  ...config,
  collections: (config.collections ?? []).map(withHooks),
});
