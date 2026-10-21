import { revalidateTag } from "next/cache";
import { APIError, ValidationError } from "payload";
import { docTag } from "@/lib/cache-tags";
import { rel } from "../slugs";
import { checkPath, joinPath, PATH_COLLECTIONS } from "./path-utils";
import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  Field,
  PayloadRequest,
  TextFieldSingleValidation,
  UpdateVersionArgs,
  Where,
} from "payload";

export * from "./path-utils";

/** Guards against corrupted parent chains (A → B → A) in path computation and cascades. */
const MAX_PARENT_DEPTH = 12;

/**
 * Context flag that disables the path cascade for a save (e.g. bulk imports that rebuild the
 * whole tree themselves). The cascade itself writes at DB level and never re-enters hooks.
 */
export const SKIP_PATH_CASCADE = "skipPathCascade";

/** `req.context` key holding the published (main table) path captured before a save. */
const publishedPathKey = (collection: string, id: string) => `publishedPath:${collection}:${id}`;

type PathDoc = {
  id?: unknown;
  path?: unknown;
  parent?: unknown;
  slug?: unknown;
  _status?: unknown;
};

/** Id of a relationship value: a raw id or a populated document. */
export function relationId(value: unknown): string | null {
  if (typeof value === "string" && value !== "") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return null;
}

const validatePath: TextFieldSingleValidation = (value) => (value ? checkPath(value) : true);

type PathFieldsOptions = {
  description?: string;
};

/**
 * Computed public `path` (`/…/`, root `/`). Filled by the collection's `beforeValidate` hook and
 * never typed by hand; unique within the collection (DB index) and across all collections with a
 * path (`assertUniquePath`).
 */
export function pathFields(opts: PathFieldsOptions = {}): Field[] {
  return [
    {
      name: "path",
      type: "text",
      label: "Адрес страницы",
      index: true,
      unique: true,
      validate: validatePath,
      admin: {
        readOnly: true,
        position: "sidebar",
        description: opts.description ?? "Вычисляется автоматически из слага и раздела.",
      },
    },
  ];
}

const fail = (collection: string, message: string): never => {
  throw new ValidationError({ collection, errors: [{ path: "slug", message }] });
};

/**
 * True when `path` is already stored (main table, i.e. the published/current document) by another
 * document of any collection that owns a path.
 */
export async function isPathTaken(
  req: PayloadRequest,
  path: string,
  selfCollection: string,
  selfId?: string | number | null
): Promise<boolean> {
  for (const collection of PATH_COLLECTIONS) {
    const conditions: Where[] = [{ path: { equals: path } }];
    if (collection === selfCollection && selfId !== undefined && selfId !== null) {
      conditions.push({ id: { not_equals: selfId } });
    }
    const { totalDocs } = await req.payload.count({
      collection: rel(collection),
      where: { and: conditions },
      overrideAccess: true,
      req,
    });
    if (totalDocs > 0) return true;
  }
  return false;
}

/**
 * Throws a `ValidationError` when `path` is malformed, reserved, or already used by another
 * document of any collection that owns a path.
 */
export async function assertUniquePath(
  req: PayloadRequest,
  path: string,
  selfCollection: string,
  selfId?: string | number | null
): Promise<void> {
  const check = checkPath(path);
  if (check !== true) fail(selfCollection, check);
  if (await isPathTaken(req, path, selfCollection, selfId)) {
    fail(selfCollection, `Такой адрес уже занят: ${path}`);
  }
}

/** Stored path of a document (main table) or `null` when missing. */
export async function findDocPath(
  req: PayloadRequest,
  collection: string,
  id: string
): Promise<string | null> {
  const doc = (await req.payload.findByID({
    collection: rel(collection),
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })) as PathDoc | null;
  return typeof doc?.path === "string" ? doc.path : null;
}

/** Rejects a parent that is the document itself or one of its descendants. */
export async function assertNoParentCycle(
  req: PayloadRequest,
  collection: string,
  selfId: string | null,
  parentId: string | null
): Promise<void> {
  if (!parentId || !selfId) return;
  let current: string | null = parentId;
  for (let depth = 0; current && depth < MAX_PARENT_DEPTH; depth += 1) {
    if (current === selfId) fail(collection, "Документ не может быть вложен сам в себя");
    const doc = (await req.payload.findByID({
      collection: rel(collection),
      id: current,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      req,
    })) as PathDoc | null;
    current = relationId(doc?.parent);
  }
  if (current) fail(collection, `Слишком глубокая вложенность (больше ${MAX_PARENT_DEPTH})`);
}

/**
 * Path stored in the main table, read straight from the DB adapter (no hooks, no access).
 * For a drafts collection the main table holds the published document (draft saves only write
 * a version row), so this is the path the site serves and children derive theirs from.
 */
async function readMainPath(
  req: PayloadRequest,
  collection: string,
  id: string
): Promise<string | null> {
  const doc = await req.payload.db.findOne<PathDoc & { id: string }>({
    collection: rel(collection),
    where: { id: { equals: id } },
    select: { path: true },
    req,
  });
  return typeof doc?.path === "string" ? doc.path : null;
}

type VersionRow = { id: string | number; version?: PathDoc };

/**
 * Version data that leaves `updatedAt` untouched: the Drizzle adapter stamps `updatedAt` with
 * "now" unless it is explicitly `null`, which would reorder the version history and make an old
 * published row look newer than the pending draft.
 */
const KEEP_VERSION_TIMESTAMPS = (version: Record<string, unknown>) =>
  ({
    updatedAt: null,
    version: { ...version, updatedAt: null },
  }) as unknown as UpdateVersionArgs["versionData"];

/**
 * Rewrites `version.path` of the child's latest version (a pending draft or the published one)
 * and of its newest published version, when that version still sits under `parentId`. Only the
 * `version_path` column changes: `_status`, `latest` and every other column stay as they were,
 * so a pending draft is never published by the cascade.
 */
async function syncVersionPaths(
  req: PayloadRequest,
  collection: string,
  childId: string,
  parentId: string,
  parentPath: string
): Promise<void> {
  const slug = rel(collection);
  const byParent: Where = { parent: { equals: childId } };
  const [latest, published] = await Promise.all([
    req.payload.db.findVersions({
      collection: slug,
      where: { and: [byParent, { latest: { equals: true } }] },
      sort: "-updatedAt",
      limit: 1,
      req,
    }),
    req.payload.db.findVersions({
      collection: slug,
      where: { and: [byParent, { "version._status": { equals: "published" } }] },
      sort: "-updatedAt",
      limit: 1,
      req,
    }),
  ]);

  const rows = new Map<string, VersionRow>();
  for (const row of [...latest.docs, ...published.docs] as VersionRow[]) {
    rows.set(String(row.id), row);
  }

  for (const row of rows.values()) {
    const version = row.version;
    if (relationId(version?.parent) !== parentId) continue;
    if (typeof version?.slug !== "string" || version.slug === "") continue;
    const nextPath = joinPath(parentPath, version.slug);
    if (version.path === nextPath) continue;
    await req.payload.db.updateVersion({
      collection: slug,
      id: row.id,
      versionData: KEEP_VERSION_TIMESTAMPS({ path: nextPath }),
      returning: false,
      req,
    });
  }
}

/** Invalidates `doc:<collection>:<id>` of cascaded children (their hooks do not run). */
function revalidateDocs(req: PayloadRequest, collection: string, ids: readonly string[]): void {
  if (req.context?.disableRevalidate) return;
  for (const id of ids) {
    try {
      revalidateTag(docTag(collection, id), "max");
    } catch {
      // Outside a Next.js request (seed, jobs, CLI, tests) there is no cache to invalidate.
    }
  }
}

/** A descendant whose main-table `path` the cascade rewrote. */
export interface CascadedChild {
  id: string;
  /** Stored path before the cascade (`null` when it was missing). */
  from: string | null;
  to: string;
}

/**
 * Side effects the cascade's DB-level writes skip (no hooks run for the children): their site
 * search entries still carry the old URLs and IndexNow is not told about the move. Re-syncs the
 * entries from the published versions and queues IndexNow for the old and new URLs, inside the
 * parent's transaction. Each part is independent and never throws into the parent's save.
 *
 * The modules are imported lazily: they pull the search plugin and the env/job helpers, which
 * the collection configs importing this file do not need at config-build time.
 */
async function syncCascadedChildren(
  req: PayloadRequest,
  collection: string,
  changed: readonly CascadedChild[]
): Promise<void> {
  if (changed.length === 0) return;
  try {
    const { isSearchKind } = await import("@/lib/search/types");
    if (isSearchKind(collection)) {
      const { reindexDocuments } = await import("@/lib/search/reindex");
      await reindexDocuments(
        req.payload,
        collection,
        changed.map((child) => child.id),
        req
      );
    }
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: `Поиск: не удалось обновить записи потомков ${collection} после смены адреса`,
    });
  }

  // `queueMovedDocs` checks the environment / settings itself and logs its own failures.
  const moves = changed.flatMap((child) =>
    child.from ? [{ id: child.id, from: child.from, to: child.to }] : []
  );
  try {
    const { queueMovedDocs } = await import("@/payload/plugins/indexnow");
    await queueMovedDocs(req, collection, moves);
  } catch (error) {
    req.payload.logger.error({
      err: error,
      msg: `IndexNow: не удалось поставить в очередь потомков ${collection}`,
    });
  }
}

/**
 * Recomputes the stored `path` of all descendants of `rootId` after its published path became
 * `rootPath`. Breadth-first with a visited set.
 *
 * Writes go straight to the DB adapter inside the caller's transaction (`req`): only the `path`
 * column of the main table and `version_path` of the relevant version rows change. No hooks, no
 * validation and no new versions — so a child's pending draft is never published, and business
 * rules of a child cannot abort the parent's save. A new path already taken by another document
 * is detected beforehand (a unique-index violation would abort the whole Postgres transaction):
 * that child and its subtree keep their old paths and the conflict is logged; the editor fixes
 * it by re-saving the child with another slug.
 *
 * Returns the children whose main-table path changed (id, old and new path).
 */
export async function cascadeChildPaths(
  req: PayloadRequest,
  collection: string,
  rootId: string,
  rootPath: string
): Promise<CascadedChild[]> {
  const slug = rel(collection);
  const hasVersions = Boolean(req.payload.collections[slug]?.config.versions);
  const visited = new Set<string>([rootId]);
  const queue: { id: string; path: string }[] = [{ id: rootId, path: rootPath }];
  const changed: CascadedChild[] = [];

  while (queue.length > 0) {
    const parent = queue.shift() as { id: string; path: string };
    const { docs } = await req.payload.db.find<PathDoc>({
      collection: slug,
      where: { parent: { equals: parent.id } },
      select: { slug: true, path: true, parent: true },
      pagination: false,
      req,
    });

    for (const child of docs) {
      const childId = relationId(child.id);
      if (!childId || visited.has(childId)) continue;
      visited.add(childId);
      if (typeof child.slug !== "string" || child.slug === "") continue;

      const nextPath = joinPath(parent.path, child.slug);
      if (nextPath !== child.path) {
        if (
          checkPath(nextPath) !== true ||
          (await isPathTaken(req, nextPath, collection, childId))
        ) {
          req.payload.logger.warn(
            `Адрес ${collection}/${childId} не пересчитан: ${nextPath} занят или недопустим`
          );
          continue;
        }
        await req.payload.db.updateOne({
          collection: slug,
          id: childId,
          data: { path: nextPath },
          returning: false,
          req,
        });
        changed.push({
          id: childId,
          from: typeof child.path === "string" ? child.path : null,
          to: nextPath,
        });
      }
      if (hasVersions) await syncVersionPaths(req, collection, childId, parent.id, parent.path);
      queue.push({ id: childId, path: nextPath });
    }
  }
  return changed;
}

/**
 * `beforeChange`: remembers the published (main table) path before an update, so `afterChange`
 * can tell whether the save actually changed what children derive their paths from. Comparing
 * with `previousDoc` would not work: for drafts it is the latest draft, which in the usual
 * "save draft, then publish" flow already holds the new path.
 */
export function capturePublishedPath(collection: string): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, operation, req }) => {
    if (operation !== "update") return data;
    const id = relationId((originalDoc as PathDoc | undefined)?.id);
    if (!id) return data;
    const context = req.context ?? {};
    req.context = context;
    context[publishedPathKey(collection, id)] = await readMainPath(req, collection, id);
    return data;
  };
}

/**
 * `afterChange`: when the published path changed (a publish, not a draft save — draft saves do
 * not touch the main table), recompute descendants' paths (pages, constructions). Requires
 * `capturePublishedPath` in `beforeChange`. Never throws into the parent's save.
 */
export function cascadePathsAfterChange(collection: string): CollectionAfterChangeHook {
  return async ({ doc, req, operation }) => {
    if (operation !== "update") return doc;
    const id = relationId((doc as PathDoc).id);
    if (!id) return doc;
    const context = req.context ?? {};
    const key = publishedPathKey(collection, id);
    if (!(key in context)) return doc;
    const before = context[key];
    delete context[key];
    if (context[SKIP_PATH_CASCADE]) return doc;

    try {
      const after = await readMainPath(req, collection, id);
      if (!after || after === before) return doc;
      const changed = await cascadeChildPaths(req, collection, id, after);
      revalidateDocs(
        req,
        collection,
        changed.map((child) => child.id)
      );
      await syncCascadedChildren(req, collection, changed);
    } catch (error) {
      // Only infrastructure errors can get here (business rules are not evaluated); the save
      // itself is decided by the surrounding transaction.
      req.payload.logger.error({
        err: error,
        msg: `Не удалось пересчитать адреса потомков ${collection}/${id}`,
      });
    }
    return doc;
  };
}

/**
 * `beforeDelete`: refuses to delete a document that still has children (published or in a
 * pending draft). With `onDelete: set null` the children would silently lose their parent and
 * keep stale paths; recomputing them automatically could collide with other paths, so the editor
 * moves or deletes the children first.
 */
export function preventDeleteWithChildren(collection: string): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const slug = rel(collection);
    const byParent: Where = { parent: { equals: id } };
    const { totalDocs: published } = await req.payload.db.count({
      collection: slug,
      where: byParent,
      req,
    });
    let drafts = 0;
    if (req.payload.collections[slug]?.config.versions) {
      ({ totalDocs: drafts } = await req.payload.db.countVersions({
        collection: slug,
        where: {
          and: [
            { "version.parent": { equals: id } },
            { latest: { equals: true } },
            { parent: { not_equals: id } },
          ],
        },
        req,
      }));
    }
    const total = Math.max(published, drafts);
    if (total > 0) {
      throw new APIError(
        `Нельзя удалить: есть вложенные страницы (${total}). Сначала перенесите их к другому родителю или удалите.`,
        400,
        undefined,
        true
      );
    }
  };
}
