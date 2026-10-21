/**
 * Rebuild of the site search index (task 35):
 *
 *   pnpm payload run scripts/reindex-search.ts [-- collection,collection]
 *
 * The plugin keeps the index in sync on every save / publish / delete; run this after the first
 * deploy of the search migration, after a seed or content import that skipped existing documents,
 * or whenever the index looks stale. Collections default to all indexed ones
 * (`SEARCH_COLLECTIONS`). At the end the cache of the running site is purged through the signed
 * `POST /api/revalidate/` (same as the seed).
 *
 * `payload run` loads the env and config; the script uses top-level `await` and ends the process
 * itself (AGENTS.md).
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { requestSiteRevalidation } from "@/lib/cms/revalidate-token";
import { getEnv } from "@/lib/env";
import { reindexSearch } from "@/lib/search/reindex";
import { isSearchKind, SEARCH_COLLECTIONS, type SearchKind } from "@/lib/search/types";

function parseCollections(argv: readonly string[]): SearchKind[] {
  const names = argv
    .filter((arg) => arg !== "--")
    .flatMap((arg) => arg.replace(/^-+/, "").split(","))
    .map((name) => name.trim())
    .filter(Boolean);
  if (names.length === 0) return [...SEARCH_COLLECTIONS];
  const unknown = names.filter((name) => !isSearchKind(name));
  if (unknown.length > 0) {
    throw new Error(
      `неизвестные коллекции: ${unknown.join(", ")}. Допустимо: ${SEARCH_COLLECTIONS.join(", ")}`
    );
  }
  return names as SearchKind[];
}

try {
  // `payload run` rewrites process.argv to [node, bin, ...positionals].
  const collections = parseCollections(process.argv.slice(2));
  const payload = await getPayload({ config });
  const started = Date.now();
  const stats = await reindexSearch(payload, collections);
  for (const { collection, indexed, skipped } of stats) {
    console.warn(
      `reindex-search: ${collection} — проиндексировано ${indexed}, пропущено ${skipped}`
    );
  }
  console.warn(`reindex-search: готово за ${((Date.now() - started) / 1000).toFixed(1)} с`);

  const env = getEnv();
  const result = await requestSiteRevalidation({
    siteUrl: env.SITE_URL,
    secret: env.PAYLOAD_SECRET,
  });
  console.warn(
    result.ok
      ? `reindex-search: кэш сайта сброшен: ${result.url}`
      : `reindex-search: кэш сайта НЕ сброшен (${result.url}: ${result.reason}); см. docs/deploy.md, «Кэш Next»`
  );
  process.exit(0);
} catch (error) {
  console.error("reindex-search: ошибка —", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) console.error(error.stack);
  process.exit(1);
}
