/**
 * Full IndexNow submission (task 36): every URL of the sitemap → IndexNow, in batches of 10 000.
 * Run once after launch and after the inex.su redirects are switched on.
 *
 *   pnpm payload run scripts/indexnow-all.ts                # submit (production env only)
 *   pnpm payload run scripts/indexnow-all.ts -- --dry-run   # list the URLs, send nothing
 *
 * Needs the production env of the site: `SITE_ENV=production`, `SITE_URL` (the public origin)
 * and `INDEXNOW_KEY` (the key file `/<key>.txt` must already be reachable), plus `DATABASE_URL`.
 * Unlike the admin hooks it ignores `site-settings.indexNow.enabled`: running it is the decision.
 *
 * Top-level `await` on purpose: `payload run` exits as soon as the module body returns.
 */
import { getEnv } from "@/lib/env";
import { submitToIndexNow } from "@/lib/seo/indexnow";
import { collectSitemapEntries } from "@/lib/seo/sitemap-entries";

const dryRun = process.argv.includes("--dry-run");
const { INDEXNOW_KEY, SITE_ENV, SITE_URL } = getEnv();

const entries = await collectSitemapEntries();
const urls = entries.map((entry) => entry.url);
console.log(`IndexNow: ${urls.length} URL из sitemap (${SITE_URL})`);

if (dryRun) {
  for (const url of urls) console.log(`  ${url}`);
  process.exit(0);
}

if (SITE_ENV !== "production" || !INDEXNOW_KEY) {
  console.error("IndexNow: нужна production-среда (SITE_ENV=production) и INDEXNOW_KEY.");
  process.exit(1);
}

const result = await submitToIndexNow(urls, { siteUrl: SITE_URL, key: INDEXNOW_KEY });
if (result.outcome !== "ok") {
  console.error(
    `IndexNow: ошибка (${result.outcome}) ${result.status ?? result.reason ?? ""} ${result.endpoint ?? ""}; ` +
      `отправлено до ошибки: ${result.submitted}`
  );
  process.exit(1);
}

console.log(`IndexNow: отправлено ${result.submitted} URL.`);
process.exit(0);
