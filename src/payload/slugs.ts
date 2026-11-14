import type { CollectionSlug, GlobalSlug } from "payload";

/**
 * Untyped slug helpers for relationships/globals that may not exist in `payload-types.ts` yet.
 *
 * Tasks 06–08 add collections in parallel; until the schema freeze (task 10) regenerates the
 * types, a literal slug of another task's collection would not type-check as `CollectionSlug`.
 */
export const rel = (slug: string) => slug as unknown as CollectionSlug;
export const relGlobal = (slug: string) => slug as unknown as GlobalSlug;
