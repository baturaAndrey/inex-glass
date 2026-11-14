import type { CollectionAfterReadHook } from "payload";

/**
 * `withPayload` sets `NEXT_TRAILING_SLASH=true` (the site uses `trailingSlash: true`), and
 * Payload's `formatAdminURL` then appends `/` to every upload URL it computes on read:
 * `/api/media/file/a.jpg/`. Next answers that with a 308 and the image optimizer refuses the
 * redirect (500), so file URLs are normalised once at the source instead of in every caller.
 */

/** A path ending in `name.ext/` (optionally followed by a query / hash). */
const FILE_WITH_TRAILING_SLASH = /(\/[^/?#]+\.[a-z0-9]{2,5})\/+(?=[?#]|$)/i;

/**
 * Drops the trailing slash after a file name, keeping the query / hash. Directory-like URLs
 * (`/api/media/`) and non-strings are returned unchanged.
 */
export function stripFileTrailingSlash<T>(url: T): T {
  if (typeof url !== "string") return url;
  return url.replace(FILE_WITH_TRAILING_SLASH, "$1") as T;
}

interface UploadUrls {
  url?: unknown;
  thumbnailURL?: unknown;
  sizes?: Record<string, { url?: unknown } | null | undefined> | null;
}

/** Collection `afterRead` hook: `url`, `thumbnailURL` and every `sizes.*.url` without `/`. */
export const stripUploadUrlTrailingSlash: CollectionAfterReadHook = ({ doc }) => {
  const upload = doc as UploadUrls | null | undefined;
  if (!upload || typeof upload !== "object") return doc;
  if ("url" in upload) upload.url = stripFileTrailingSlash(upload.url);
  if ("thumbnailURL" in upload) upload.thumbnailURL = stripFileTrailingSlash(upload.thumbnailURL);
  if (upload.sizes && typeof upload.sizes === "object") {
    for (const size of Object.values(upload.sizes)) {
      if (size && typeof size === "object" && "url" in size) {
        size.url = stripFileTrailingSlash(size.url);
      }
    }
  }
  return doc;
};
