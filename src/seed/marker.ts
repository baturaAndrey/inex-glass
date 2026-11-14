/**
 * Seed write markers: how the seed tells «still as the seed wrote it» from «edited in the admin».
 *
 * After every document write the seed stores the document's `updatedAt` (as read back with
 * `draft: true`, i.e. the latest version) in Payload's key-value store (`payload.kv`, table
 * `payload_kv` from the baseline migration — no schema change). On the next run a document is
 * overwritten only while its `updatedAt` still equals the recorded one; any save in the admin
 * moves `updatedAt` and the seed skips the document (unless `--force` / `overwrite`).
 *
 * The marker lives in the database, so it follows the data (dev, test and prod DBs each keep
 * their own markers) and survives container redeploys, unlike a state file.
 *
 * Documents without a marker (written by a seed before markers existed) fall back to the old
 * heuristic «`updatedAt` within 2 s of `createdAt`». That heuristic misreads the seed's own
 * second write (mini-seed creates, a slice later updates) as an edit — which is the reason for
 * the markers; such documents need one `--force` run, after which they carry a marker.
 *
 * Only TYPE imports from Payload / `./context`: unit tests (and the slice tests that mock
 * `./context`) use this module with a fake `payload`. `./context.ts` re-exports the helpers.
 */

import type { SeedContext } from "./context";
import type { CollectionSlug, Where } from "payload";

/** Value stored per written document. */
export interface SeedMarker {
  /** `updatedAt` of the latest version right after the seed wrote it (ISO string). */
  updatedAt: string;
}

/** Key prefix of seed markers in `payload.kv`. */
export const SEED_MARKER_PREFIX = "seed:written:";

/** Legacy rule window: a document saved once (by a seed) has `updatedAt ≈ createdAt`. */
export const LEGACY_PRISTINE_WINDOW_MS = 2000;

/** KV key of the marker of one document. */
export function seedMarkerKey(collection: string, id: string | number): string {
  return `${SEED_MARKER_PREFIX}${collection}:${String(id)}`;
}

/** Narrows an unknown KV value to a marker (anything else counts as «no marker»). */
export function parseSeedMarker(value: unknown): SeedMarker | null {
  if (typeof value !== "object" || value === null) return null;
  const updatedAt = (value as { updatedAt?: unknown }).updatedAt;
  return typeof updatedAt === "string" && Number.isFinite(Date.parse(updatedAt))
    ? { updatedAt }
    : null;
}

export interface TimestampedDoc {
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * `true` while the stored document is exactly as the seed left it, so a re-run may overwrite it.
 *
 * - With a marker: the instants of `updatedAt` must match (compared as dates, so `…000Z` and
 *   `Z` spellings of one instant are equal).
 * - Without one: the legacy 2-second rule (see the module comment).
 */
export function isSeedPristine(doc: TimestampedDoc, marker: SeedMarker | null): boolean {
  const updated = Date.parse(doc.updatedAt ?? "");
  if (!Number.isFinite(updated)) return false;
  if (marker) return Date.parse(marker.updatedAt) === updated;
  const created = Date.parse(doc.createdAt ?? "");
  return Number.isFinite(created) && Math.abs(updated - created) < LEGACY_PRISTINE_WINDOW_MS;
}

/* I/O (Payload Local API + `payload.kv`) */

type LatestDoc = { id: string | number; createdAt?: string; updatedAt?: string };

/**
 * Latest version of the document matching `where` (`draft: true`: an editor's unpublished
 * changes count as edits too; collections without drafts ignore the flag).
 */
async function findLatest(
  ctx: SeedContext,
  collection: CollectionSlug,
  where: Where
): Promise<LatestDoc | undefined> {
  const found = await ctx.payload.find({
    collection,
    where,
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    draft: true,
  });
  return found.docs[0] as LatestDoc | undefined;
}

/**
 * Records that the seed has just written document `id` (its current `updatedAt`). Must follow
 * EVERY seed write of a document whose later overwrite is decided by `mayOverwrite` —
 * `upsertByField` does it itself; slices calling `payload.update` directly call it too.
 * A failure only costs the marker (the next run falls back to the legacy rule), so it is
 * logged, not thrown.
 */
export async function rememberSeedWrite(
  ctx: SeedContext,
  collection: CollectionSlug,
  id: string | number
): Promise<void> {
  try {
    const doc = await findLatest(ctx, collection, { id: { equals: id } });
    if (!doc?.updatedAt) return;
    await ctx.payload.kv.set(seedMarkerKey(collection, id), { updatedAt: doc.updatedAt });
  } catch (error) {
    ctx.log(`${collection} ${String(id)}: маркер сида не сохранён (${String(error)})`);
  }
}

/**
 * Whether a slice may overwrite the document matching `where`: always with `--force`, when it
 * does not exist yet, or while it is unchanged since the seed's last write (marker in
 * `payload.kv`; legacy 2-second rule for documents without one). Logs the skip otherwise.
 */
export async function mayOverwrite(
  ctx: SeedContext,
  collection: CollectionSlug,
  where: Where,
  label: string
): Promise<boolean> {
  if (ctx.force) return true;
  const doc = await findLatest(ctx, collection, where);
  if (!doc) return true;
  const marker = parseSeedMarker(await ctx.payload.kv.get(seedMarkerKey(collection, doc.id)));
  const pristine = isSeedPristine(doc, marker);
  if (!pristine) {
    ctx.log(`${collection} ${label}: изменён в админке — пропуск (перезапись: --force)`);
  }
  return pristine;
}
