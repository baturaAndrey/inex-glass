/**
 * Site URLs of Payload media files with a content version.
 *
 * Replacing the file of an existing `media` document keeps its file name (Payload reuses
 * `design.webp`), so `/api/media/file/design.webp` never changes. The image optimizer
 * (`/_next/image`, `minimumCacheTTL` 14 days) and browsers key their caches by URL and would
 * keep serving the old picture. Every site URL of a media file therefore carries `?v=<version>`
 * derived from the document's `updatedAt`: a new file (or any edit of the document) gives a new
 * URL, and the old cached copies are simply never requested again.
 *
 * Pages pick up the new `updatedAt` because every CMS loader that populates media is tagged
 * `collection:media`, which the media `afterChange` hook invalidates (`revalidateCollection`).
 */

/** Query parameter of the version (`images.localPatterns` in `next.config.ts` allows it). */
export const MEDIA_VERSION_PARAM = "v";

/** Base for parsing site-relative URLs; never part of the result. */
const PARSE_BASE = "http://local";

/**
 * Short version token of a media document: `updatedAt` in epoch milliseconds, base 36
 * (`2026-11-18T10:00:00.000Z` → `mwly9ts0`). `null` when the date is missing or invalid.
 */
export function mediaVersion(updatedAt: string | null | undefined): string | null {
  if (typeof updatedAt !== "string" || updatedAt.trim() === "") return null;
  const time = Date.parse(updatedAt);
  return Number.isFinite(time) && time > 0 ? time.toString(36) : null;
}

/**
 * Site-relative URL (`/api/media/file/a.jpg?v=…`) of a media file or one of its sizes.
 *
 * - An absolute URL (Payload with `serverURL`) loses its origin: `next/image` only optimizes
 *   paths allowed by `images.localPatterns`.
 * - `v` is set (an existing `v` is replaced, other parameters are kept); without a valid
 *   `updatedAt` the URL is returned unversioned, so calling it twice is harmless.
 * - `null` for empty or unparsable input.
 */
export function mediaUrl(
  url: string | null | undefined,
  updatedAt?: string | null | undefined
): string | null {
  if (typeof url !== "string" || url.trim() === "") return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim(), PARSE_BASE);
  } catch {
    return null;
  }
  const version = mediaVersion(updatedAt);
  if (version) parsed.searchParams.set(MEDIA_VERSION_PARAM, version);
  return `${parsed.pathname}${parsed.search}`;
}
