/**
 * URLs of the fixed-path templates served by the `[[...slug]]` dispatcher (`./page.tsx`).
 *
 * Kept free of imports so unit tests (`./fixed-paths.test.ts`) can check the list against the
 * file tree without loading the page modules. The template of each path lives in
 * `../_fixed/<path>/page.tsx` (a private folder: not a route by itself); the path → module map
 * is `./fixed-routes.ts`, typed against this list so the two cannot drift apart.
 *
 * Paths are canonical: lowercase, leading and trailing slash (`proxy.ts` lowercases, Next adds
 * the trailing slash) — exactly what `pathFromSegments` produces.
 */
export const FIXED_PATHS = [
  "/",
  "/blog/",
  "/kontakty/",
  "/o-kompanii/",
  "/o-kompanii/sotrudniki/",
  "/kak-zakazat/",
  "/kak-zakazat/oplata/",
  "/kak-zakazat/trebovaniya-k-chertezham/",
  "/zakalennoe-steklo/",
  "/obrabotka-stekla/",
  "/osteklenie/",
  "/zerkala/",
  "/steklyannye-konstrukcii/",
  "/dushevye-peregorodki/",
  "/furnitura/",
  "/steklyannye-kozyrki/",
  "/steklyannye-ograzhdeniya/",
  "/steklyannye-peregorodki/",
  "/torgovye-vitriny/",
  "/tripleks/",
] as const;

export type FixedPath = (typeof FIXED_PATHS)[number];

const FIXED_PATH_SET: ReadonlySet<string> = new Set(FIXED_PATHS);

export function isFixedPath(path: string): path is FixedPath {
  return FIXED_PATH_SET.has(path);
}
