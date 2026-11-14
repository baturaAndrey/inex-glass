import { getServerFormsConfig } from "@/components/forms/forms-config-server";

/**
 * `GET /api/forms-config/` (trailing slash!) — public values of the modal site forms (task 21):
 * `{ phone, workHours, thankYouTitle, thankYouText, submitErrorText }` from the `contacts` and
 * `site-settings` globals. Only public, non-personal data (the company's own phone and hours);
 * `{телефон}` in `submitErrorText` is already substituted.
 *
 * Read through the cached CMS loaders; the browser/CDN may keep the answer for 5 minutes.
 */

export const dynamic = "force-dynamic";

const PUBLIC_CACHE = "public, max-age=300, stale-while-revalidate=3600";

export async function GET(): Promise<Response> {
  const config = await getServerFormsConfig();
  const body = {
    phone: config.phone,
    workHours: config.workHours,
    thankYouTitle: config.thankYouTitle,
    thankYouText: config.thankYouText,
    submitErrorText: config.submitErrorText,
  };
  return Response.json(body, { headers: { "Cache-Control": PUBLIC_CACHE } });
}
