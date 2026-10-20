import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Site proxy. Does exactly two things:
 * 1. Basic auth on staging (`SITE_ENV=staging` and `STAGING_BASIC_AUTH=user:pass`).
 * 2. 301 from a path with uppercase letters to its lowercase form (query preserved).
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
 * Lowercases the decoded path (covers Cyrillic too). Comparing decoded values avoids
 * redirect loops on percent-encoding, whose hex digits are uppercase by convention.
 */
function lowercaseRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // Malformed encoding: let the router answer (404).
  }

  const lowered = decoded.toLowerCase();
  if (lowered === decoded) return null;

  const target = request.nextUrl.clone();
  target.pathname = lowered;
  return NextResponse.redirect(target, 301);
}

export function proxy(request: NextRequest) {
  return stagingAuthResponse(request) ?? lowercaseRedirect(request) ?? NextResponse.next();
}

export const config = {
  // Excluded: /admin, /api, /_next and any path with a dot (static files). The proxy buffers
  // only 10 MB of request body and silently truncates the rest, so the admin and API (uploads,
  // /api/health/ healthcheck) must never pass through it.
  matcher: ["/((?!admin(?:/|$)|api(?:/|$)|_next/|.*\\..*).*)"],
};
