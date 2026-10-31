/**
 * Single source of cache tag names.
 *
 * Loaders wrap CMS reads in `unstable_cache(..., { tags })` (task 15) and Payload hooks
 * (`src/payload/hooks/revalidate.ts`) invalidate the same tags — both sides must agree on the format.
 */
export const globalTag = (slug: string) => `global:${slug}`;
export const collectionTag = (slug: string) => `collection:${slug}`;
export const docTag = (slug: string, id: string) => `doc:${slug}:${id}`;
