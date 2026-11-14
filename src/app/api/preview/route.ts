import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { jsonError, requireStaff } from "@/lib/leads-admin/auth";
import { safeInternalPath } from "@/lib/preview/safe-path";

/**
 * `GET /api/preview/?path=/o-kompanii/` — entry of the page draft preview (task 11, admin
 * redesign). Opened by Payload's «Предпросмотр» button (`pages.admin.preview`, see
 * `@/lib/preview/preview-url`) in a new tab.
 *
 * - Staff only (admin, manager): the Payload session cookie is checked with `payload.auth`
 *   (Payload's CSRF rule for cookie auth applies). No secret or document id in the URL.
 * - `path` must be an internal site page (`safeInternalPath`): no open redirect, no admin/API.
 * - Enables Next Draft Mode (cookie `__prerender_bypass`, unforgeable: its value changes with
 *   every build) and answers 307 to the page; `getPageByPath` then reads the latest version.
 *
 * `GET` changes state here (sets a cookie) because the CMS opens the URL in a new tab; leaving
 * the preview is a `POST` (`./exit`).
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response; // 401 «Требуется вход» / 403 «Недостаточно прав»

  const path = safeInternalPath(new URL(request.url).searchParams.get("path"));
  if (!path) return jsonError(400, "Некорректный путь превью");

  // No personal data: the user id and the page path only.
  auth.payload.logger.info({ event: "draft-preview", userId: auth.user.id, path });

  (await draftMode()).enable();
  // Throws NEXT_REDIRECT: Next answers 307 and merges the Draft Mode cookie into the response.
  redirect(path);
}
