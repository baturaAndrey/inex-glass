/**
 * Pure URL-path helpers (no Payload imports): shared by `pathFields`, hooks and unit tests.
 */

/** `/`, `/zakalennoe-steklo/`, `/osteklenie/fasadov/` — kebab-case segments, trailing slash. */
export const PATH_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/;

/** Prefixes owned by the app itself (admin, API, Next assets, order pages). */
export const RESERVED_PATH_PREFIXES = ["/admin/", "/api/", "/_next/", "/zakaz/"] as const;

/** Collections that own a public `path`; a path must be unique across all of them. */
export const PATH_COLLECTIONS = [
  "pages",
  "constructions",
  "glass-types",
  "processing-services",
  "thicknesses",
  "articles",
  "objects",
] as const;

export const ROOT_PATH = "/";

/** Normalizes a base path to `/…/` form: `instrumenty` → `/instrumenty/`, `` → `/`. */
export function normalizeBasePath(base: string | null | undefined): string {
  const trimmed = (base ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed === "" ? ROOT_PATH : `/${trimmed}/`;
}

/** `joinPath("/osteklenie/", "fasadov")` → `/osteklenie/fasadov/`. */
export function joinPath(base: string | null | undefined, slug: string): string {
  return `${normalizeBasePath(base)}${slug}/`;
}

export function isReservedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return RESERVED_PATH_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/** Validation message for a computed path, or `true`. */
export function checkPath(path: string): string | true {
  if (!PATH_PATTERN.test(path)) {
    return `Некорректный адрес «${path}»: только строчная латиница, цифры и дефисы, слеш на конце`;
  }
  if (isReservedPath(path)) return `Адрес «${path}» зарезервирован системой`;
  return true;
}
