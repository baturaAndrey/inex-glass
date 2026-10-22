import type { GeneratePreviewURL } from "payload";

/** Route that checks the staff session, enables Draft Mode and redirects to the page. */
export const PREVIEW_API_PATH = "/api/preview/";
/** Route that disables Draft Mode (POST only, from the preview banner). */
export const PREVIEW_EXIT_PATH = "/api/preview/exit/";

/**
 * `pages.admin.preview`: `/api/preview/?path=%2Fo-kompanii%2F` for a page with a path; `null`
 * hides Payload's «Предпросмотр» button (a new page has no `path` until it is saved).
 *
 * Relative URL: Payload opens it in a new tab of the same origin. The slash before `?` matches
 * `trailingSlash: true` (otherwise Next answers with an extra 308 first).
 */
export const buildPreviewUrl: GeneratePreviewURL = (doc) => {
  const path = typeof doc.path === "string" ? doc.path : null;
  if (!path || !path.startsWith("/")) return null;
  return `${PREVIEW_API_PATH}?path=${encodeURIComponent(path)}`;
};
