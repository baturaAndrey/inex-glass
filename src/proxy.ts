import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Site proxy. Does exactly three things:
 * 1. Plain 404 for vulnerability-scanner paths (`/wp-login.php`, `/.env`, …) — see
 *    `isScannerPath`.
 * 2. Basic auth on staging (`SITE_ENV=staging` and `STAGING_BASIC_AUTH=user:pass`).
 * 3. 301 from a path with uppercase letters to its lowercase form (query preserved); for
 *    `/zakaz/<token>/` only the prefix is lowercased.
 *
 * "No trailing slash -> slash" is done by Next itself (`trailingSlash: true`, status 308).
 *
 * Env is read directly from `process.env` (proxy runs on the Node.js runtime) instead of
 * `getEnv()`, so an unrelated invalid variable cannot take the whole site down here.
 */

const BASIC_PREFIX = "Basic ";

/** Compare via fixed-length SHA-256 digests so timing does not leak length or content. */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

function isAuthorized(header: string | null, expected: string): boolean {
  if (!header?.startsWith(BASIC_PREFIX)) return false;
  let provided: string;
  try {
    provided = Buffer.from(header.slice(BASIC_PREFIX.length), "base64").toString("utf8");
  } catch {
    return false;
  }
  return safeEqual(provided, expected);
}

function stagingAuthResponse(request: NextRequest): NextResponse | null {
  const credentials = process.env.STAGING_BASIC_AUTH;
  if (process.env.SITE_ENV !== "staging" || !credentials) return null;
  if (isAuthorized(request.headers.get("authorization"), credentials)) return null;

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="staging", charset="UTF-8"' },
  });
}

/**
 * Prefixes followed by a case-sensitive secret that must never be lowercased: the client order
 * page `/zakaz/<token>/` (task 33) — its token is base64url (task 18), so lowercasing it would
 * turn every valid link into «Ссылка больше не действует». Only the prefix itself is
 * normalized (`/ZAKAZ/<token>/` → `/zakaz/<token>/`).
 */
const CASE_SENSITIVE_PREFIXES = ["/zakaz/"] as const;

/**
 * Canonical (lowercase) form of a pathname, or `null` when it is already canonical or cannot be
 * decoded. Works on the decoded path (covers Cyrillic too): comparing decoded values avoids
 * redirect loops on percent-encoding, whose hex digits are uppercase by convention.
 * Exported for unit tests.
 */
export function canonicalPathname(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // Malformed encoding: let the router answer (404).
  }

  const lowered = decoded.toLowerCase();
  const sensitivePrefix = CASE_SENSITIVE_PREFIXES.find((prefix) => lowered.startsWith(prefix));
  // Lowercase only the prefix; the rest is a secret and keeps its case.
  const canonical = sensitivePrefix
    ? sensitivePrefix + decoded.slice(sensitivePrefix.length)
    : lowered;
  return canonical === decoded ? null : canonical;
}

function lowercaseRedirect(request: NextRequest): NextResponse | null {
  const canonical = canonicalPathname(request.nextUrl.pathname);
  if (canonical === null) return null;

  const target = request.nextUrl.clone();
  target.pathname = canonical;
  return NextResponse.redirect(target, 301);
}

/**
 * File extensions that never exist on this site but are probed by vulnerability scanners
 * (`/wp-login.php`, `/backup.sql`, `/.env`, `/.git/config`). Keep in sync with the second
 * `config.matcher` entry, which lets such dotted paths reach the proxy at all.
 */
const SCANNER_EXTENSIONS = new Set([
  "php",
  "php3",
  "php4",
  "php5",
  "php7",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "cgi",
  "env",
  "ini",
  "sql",
  "bak",
  "git",
  "svn",
  "htaccess",
  "htpasswd",
]);

/** Directory names of other CMSs / admin tools probed by scanners (whole segments only). */
const SCANNER_SEGMENTS = new Set([
  "wp-admin",
  "wp-content",
  "wp-includes",
  "wp-json",
  "phpmyadmin",
  "cgi-bin",
]);

/** ACME HTTP-01 challenges (Let's Encrypt via Traefik) and other RFC 8615 URIs. */
const WELL_KNOWN_PREFIX = "/.well-known/";

/**
 * Whether the path is an obvious vulnerability-scanner probe. Such URLs are answered with a
 * bare 404 before rendering: the ISR catch-all `(site)/[...slug]` would otherwise render and
 * store a ~186 KB page on disk for EVERY probed URL, growing the container's cache without bound
 * (task 41). Conservative on purpose: every real route is lowercase translit without these
 * extensions or segments. Exported for unit tests.
 */
export function isScannerPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Malformed encoding: inspect the raw path.
  }
  const lowered = decoded.toLowerCase();
  if (lowered.startsWith(WELL_KNOWN_PREFIX)) return false;

  return lowered.split("/").some((segment) => {
    if (SCANNER_SEGMENTS.has(segment)) return true;
    // Every dot-separated suffix counts: `.env.local`, `backup.sql.gz`, `.git`.
    return segment
      .split(".")
      .slice(1)
      .some((extension) => SCANNER_EXTENSIONS.has(extension));
  });
}

function scannerResponse(request: NextRequest): NextResponse | null {
  if (!isScannerPath(request.nextUrl.pathname)) return null;
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function proxy(request: NextRequest) {
  // Scanner probes first: a 404 is the right answer on every stand, and on staging it spares a
  // basic-auth challenge for junk traffic (nothing behind these URLs needs protecting).
  return (
    scannerResponse(request) ??
    stagingAuthResponse(request) ??
    lowercaseRedirect(request) ??
    NextResponse.next()
  );
}

export const config = {
  matcher: [
    // Excluded: /admin, /api, /_next and any path with a dot (static files). The proxy buffers
    // only 10 MB of request body and silently truncates the rest, so the admin and API
    // (uploads, /api/health/ healthcheck) must never pass through it.
    "/((?!admin(?:/|$)|api(?:/|$)|_next/|.*\\..*).*)",
    // Dotted scanner probes (`/wp-login.php`, `/.env`, `/.git/config`, `/wp-content/x.js`) that
    // the entry above excludes; handled by `isScannerPath`. Matchers are case-sensitive and
    // must be static string literals (Next reads `config` at build time), so every letter is
    // spelled as an `[xX]` class: `/WP-LOGIN.PHP` or `/.ENV` must reach the proxy too. Keep in
    // sync with SCANNER_EXTENSIONS / SCANNER_SEGMENTS. Undotted paths of any case already pass
    // the first entry. Real static files (fonts, images, robots.txt, the IndexNow key file)
    // never match.
    "/((?!admin(?:/|$)|api(?:/|$)|_next/).*\\.(?:[pP][hH][pP][3-7]?|[pP][hH][tT][mM][lL]|[aA][sS][pP][xX]?|[jJ][sS][pP]|[cC][gG][iI]|[eE][nN][vV]|[iI][nN][iI]|[sS][qQ][lL]|[bB][aA][kK]|[gG][iI][tT]|[sS][vV][nN]|[hH][tT][aA][cC][cC][eE][sS][sS]|[hH][tT][pP][aA][sS][sS][wW][dD])(?:[./].*)?)",
    "/((?:.*/)?(?:[wW][pP]-[aA][dD][mM][iI][nN]|[wW][pP]-[cC][oO][nN][tT][eE][nN][tT]|[wW][pP]-[iI][nN][cC][lL][uU][dD][eE][sS]|[wW][pP]-[jJ][sS][oO][nN]|[pP][hH][pP][mM][yY][aA][dD][mM][iI][nN]|[cC][gG][iI]-[bB][iI][nN])/.*)",
  ],
};
