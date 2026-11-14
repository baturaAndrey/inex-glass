/**
 * Validation of the page path the draft preview redirects to (`/api/preview/?path=…`, the
 * `Referer` of `/api/preview/exit/`). Pure module: no Payload / Next imports, unit-tested.
 *
 * Only internal site pages pass: an open redirect (`//evil.com`, `/\evil.com`, an absolute URL,
 * a percent-encoded or whitespace-smuggled authority) and service prefixes are refused.
 */

const MAX_PATH_LENGTH = 512;
/** Base used only to let the WHATWG URL parser resolve the path; never leaves this module. */
const PROBE_ORIGIN = "http://preview.invalid";
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
/**
 * Percent-encoded slash, backslash or control character. The parser keeps them encoded (so
 * `/%2F%2Fevil.com` is same-origin for it), but a browser, proxy or log decoding the path would
 * see `//evil.com` or a CR/LF; no page path contains them, so they are refused outright.
 */
const ENCODED_UNSAFE = /%(?:2f|5c|[01][0-9a-f]|7f)/i;
/** Not site pages: the preview only shows pages of the public site. */
const FORBIDDEN_PREFIXES = ["/api/", "/_next/"] as const;
/** The admin: `/admin` itself and everything below it (but not e.g. `/administrirovanie/`). */
const ADMIN_PATH = "/admin";

/** Leading and trailing slash, like `pages.path` is stored (copy of `toPagePath` in cms/queries). */
function withSlashes(path: string): string {
  let value = path.trim() || "/";
  if (!value.startsWith("/")) value = `/${value}`;
  if (!value.endsWith("/")) value = `${value}/`;
  return value;
}

/**
 * Normalized internal path (`/o-kompanii/`) or `null` when `raw` is not a safe internal path.
 * Query and hash are dropped: the preview targets the page itself.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length === 0 || raw.length > MAX_PATH_LENGTH) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (raw.includes("\\") || CONTROL_CHARS.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return null;
  }
  // The parser is the final judge: anything it resolves to another origin is an open redirect.
  if (url.origin !== PROBE_ORIGIN) return null;

  const pathname = url.pathname;
  if (ENCODED_UNSAFE.test(pathname)) return null;
  const lower = pathname.toLowerCase();
  if (FORBIDDEN_PREFIXES.some((prefix) => lower.startsWith(prefix))) return null;
  if (lower === ADMIN_PATH || lower.startsWith(`${ADMIN_PATH}/`)) return null;

  return withSlashes(pathname);
}
