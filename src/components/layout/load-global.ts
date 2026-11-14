import { unstable_rethrow } from "next/navigation";

/**
 * Loads a CMS global for the header / footer. A failing CMS must not take every page down: the
 * caller falls back to `nav-defaults.ts`. Next.js control-flow errors (dynamic bail-out during
 * the build without a database, redirects, notFound) are rethrown untouched.
 */
export async function loadOrNull<T>(
  name: string,
  loader: () => Promise<T | null>
): Promise<T | null> {
  try {
    return await loader();
  } catch (error) {
    unstable_rethrow(error);
    console.error(`[layout] failed to load global "${name}", using defaults`, error);
    return null;
  }
}
