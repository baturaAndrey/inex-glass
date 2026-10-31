import {
  buildSearchFields,
  isExcludedFromSearch,
  SEARCH_PRIORITIES,
  SEARCH_SLUG,
} from "@/payload/plugins/search";
import { rel } from "@/payload/slugs";
import { SEARCH_COLLECTIONS, type SearchKind } from "./types";
import type { Payload, PayloadRequest, Where } from "payload";

/**
 * Full rebuild of the site search index (task 35) through the Local API: for every indexed
 * collection the `search` entries are deleted and recreated from the published documents with
 * the same field builder as the plugin's `beforeSync`. Editor-set priorities of surviving
 * documents are kept. Used by `scripts/reindex-search.ts`; import scripts may call it before
 * their final `/api/revalidate/` request.
 *
 * Writes carry `context.disableRevalidate` (no `revalidateTag` outside Next requests).
 */

const BATCH_SIZE = 50;
const WRITE_CONTEXT = { disableRevalidate: true } as const;
const PUBLISHED: Where = { _status: { equals: "published" } };

export interface ReindexStats {
  collection: SearchKind;
  indexed: number;
  skipped: number;
}

type IndexedDoc = Record<string, unknown> & { id: string };
type SearchEntry = { priority?: number | null; doc?: { value?: unknown } | null };

const hasDrafts = (payload: Payload, collection: string): boolean =>
  Boolean(payload.collections[rel(collection)]?.config.versions?.drafts);

/** `doc id → priority` of the current entries of `collection`. */
async function currentPriorities(payload: Payload, collection: string) {
  const priorities = new Map<string, number>();
  const { docs } = await payload.find({
    collection: rel(SEARCH_SLUG),
    where: { "doc.relationTo": { equals: collection } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  for (const entry of docs as unknown as SearchEntry[]) {
    const value = entry.doc?.value;
    const id = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
    if (typeof id === "string" && typeof entry.priority === "number") {
      priorities.set(id, entry.priority);
    }
  }
  return priorities;
}

async function reindexCollection(payload: Payload, collection: SearchKind): Promise<ReindexStats> {
  const priorities = await currentPriorities(payload, collection);
  await payload.delete({
    collection: rel(SEARCH_SLUG),
    where: { "doc.relationTo": { equals: collection } },
    depth: 0,
    overrideAccess: true,
    context: WRITE_CONTEXT,
  });

  const where = hasDrafts(payload, collection) ? PUBLISHED : undefined;
  const stats: ReindexStats = { collection, indexed: 0, skipped: 0 };
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: rel(collection),
      ...(where ? { where } : {}),
      depth: 0,
      draft: false,
      limit: BATCH_SIZE,
      page,
      overrideAccess: true,
    });
    for (const doc of result.docs as unknown as IndexedDoc[]) {
      if (isExcludedFromSearch(collection, doc)) {
        stats.skipped += 1;
        continue;
      }
      await payload.create({
        collection: rel(SEARCH_SLUG),
        data: {
          doc: { relationTo: collection, value: doc.id },
          priority: priorities.get(doc.id) ?? SEARCH_PRIORITIES[collection],
          ...buildSearchFields(collection, doc),
        } as never,
        depth: 0,
        overrideAccess: true,
        context: WRITE_CONTEXT,
      });
      stats.indexed += 1;
    }
    if (!result.hasNextPage) break;
  }
  return stats;
}

/** Rebuilds the index of `collections` (all indexed collections by default), sequentially. */
export async function reindexSearch(
  payload: Payload,
  collections: readonly SearchKind[] = SEARCH_COLLECTIONS
): Promise<ReindexStats[]> {
  const stats: ReindexStats[] = [];
  for (const collection of collections) stats.push(await reindexCollection(payload, collection));
  return stats;
}

/**
 * Re-syncs the search entries of individual documents from their PUBLISHED version: existing
 * entries are replaced (the editor-set priority is kept), or removed when the document is no
 * longer published / is excluded. Used after writes that bypass the plugin's hooks — the path
 * cascade of `src/payload/fields/path.ts` rewrites children's `path` straight in the DB, which
 * would otherwise leave their old URLs in the index.
 *
 * With `req` the writes join its transaction (and its `context` is left untouched: setting
 * `disableRevalidate` there would also silence the hooks of the caller's own save); without it
 * they run standalone with `disableRevalidate`.
 */
export async function reindexDocuments(
  payload: Payload,
  collection: SearchKind,
  ids: readonly string[],
  req?: PayloadRequest
): Promise<number> {
  const scope = req ? { req } : { context: WRITE_CONTEXT };
  let indexed = 0;
  for (const id of ids) {
    const byDoc: Where = {
      and: [{ "doc.relationTo": { equals: collection } }, { "doc.value": { equals: id } }],
    };
    const { docs: entries } = await payload.find({
      collection: rel(SEARCH_SLUG),
      where: byDoc,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      ...scope,
    });
    const priority = (entries as unknown as SearchEntry[]).find(
      (entry) => typeof entry.priority === "number"
    )?.priority;
    if (entries.length > 0) {
      await payload.delete({
        collection: rel(SEARCH_SLUG),
        where: byDoc,
        depth: 0,
        overrideAccess: true,
        ...scope,
      });
    }

    const doc = (await payload.findByID({
      collection: rel(collection),
      id,
      depth: 0,
      draft: false,
      disableErrors: true,
      overrideAccess: true,
      ...scope,
    })) as unknown as IndexedDoc | null;
    if (!doc) continue;
    if (hasDrafts(payload, collection) && doc._status !== "published") continue;
    if (isExcludedFromSearch(collection, doc)) continue;

    await payload.create({
      collection: rel(SEARCH_SLUG),
      data: {
        doc: { relationTo: collection, value: doc.id },
        priority: priority ?? SEARCH_PRIORITIES[collection],
        ...buildSearchFields(collection, doc),
      } as never,
      depth: 0,
      overrideAccess: true,
      ...scope,
    });
    indexed += 1;
  }
  return indexed;
}
