import { signToken, verifyToken } from "@/lib/uploads/tokens";

/**
 * Short-lived token of `POST /api/revalidate/` — lets processes outside Next (the seed, import
 * scripts) expire the CMS cache of the running site (see `./cache.ts`, "Writes outside the admin").
 *
 * Signed with `PAYLOAD_SECRET` (the seed and the site share it; no new env variable) under its own
 * domain-separation context, so it can never be confused with a form/upload token or a Payload
 * session. It carries only an expiry: a leaked token can do nothing but purge the cache, and only
 * for `REVALIDATE_TOKEN_TTL_MS`.
 *
 * Pure Node crypto: unit-tested without Next or Payload.
 */

const REVALIDATE_TOKEN_CONTEXT = "cms-revalidate:v1";

/** Five minutes: enough for clock skew between the seed container and the site. */
export const REVALIDATE_TOKEN_TTL_MS = 5 * 60 * 1000;

/** Header carrying the token (`Authorization: Bearer <token>`). */
export const REVALIDATE_AUTH_SCHEME = "Bearer ";

export function signRevalidateToken(secret: string, now: number = Date.now()): string {
  return signToken(REVALIDATE_TOKEN_CONTEXT, { x: now + REVALIDATE_TOKEN_TTL_MS }, secret);
}

/** `true` for a genuine, unexpired token (constant-time signature check). */
export function verifyRevalidateToken(
  token: unknown,
  secret: string,
  now: number = Date.now()
): boolean {
  const claims = verifyToken(REVALIDATE_TOKEN_CONTEXT, token, secret);
  if (typeof claims !== "object" || claims === null) return false;
  const exp = (claims as { x?: unknown }).x;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return false;
  // A token valid "too far" in the future was not issued by `signRevalidateToken`.
  return now <= exp && exp - now <= REVALIDATE_TOKEN_TTL_MS;
}

/** Path of the route (trailing slash: without it Next answers 308 and `fetch` drops the body). */
export const REVALIDATE_ROUTE_PATH = "/api/revalidate/";

/** The seed must not hang on an unreachable site. */
const REVALIDATE_REQUEST_TIMEOUT_MS = 10_000;

export type SiteRevalidationResult =
  { ok: true; url: string } | { ok: false; url: string; reason: string };

/**
 * Asks the running site at `siteUrl` to expire its CMS cache. Never throws: an unreachable site
 * (seed run before the app is up, CI, a stopped dev server) is reported as `{ ok: false }`.
 */
/** Sends the POST and resolves with the HTTP status. Injectable for tests. */
export type RevalidateTransport = (
  url: URL,
  headers: Record<string, string>,
  timeoutMs: number
) => Promise<number>;

/**
 * POST over `node:http(s)` without keep-alive. Not `fetch`: undici keeps the socket in its pool,
 * and the seed ends with `process.exit()`, which on Windows then aborts with a libuv assertion
 * (`UV_HANDLE_CLOSING`). A one-shot connection closes before the process exits.
 */
const nodeTransport: RevalidateTransport = async (url, headers, timeoutMs) => {
  const { request } =
    url.protocol === "https:" ? await import("node:https") : await import("node:http");
  return new Promise<number>((resolve, reject) => {
    const req = request(
      url,
      {
        method: "POST",
        agent: false,
        headers: { ...headers, Connection: "close", "Content-Length": "0" },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode ?? 0));
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error(`timeout ${timeoutMs} ms`)));
    req.on("error", reject);
    req.end();
  });
};

const HTTP_OK_MIN = 200;
const HTTP_OK_MAX = 299;

export async function requestSiteRevalidation(opts: {
  siteUrl: string;
  secret: string;
  transport?: RevalidateTransport;
  timeoutMs?: number;
  now?: number;
}): Promise<SiteRevalidationResult> {
  let url: URL;
  try {
    url = new URL(REVALIDATE_ROUTE_PATH, opts.siteUrl);
  } catch {
    return { ok: false, url: opts.siteUrl, reason: "некорректный SITE_URL" };
  }
  const href = url.toString();
  try {
    const status = await (opts.transport ?? nodeTransport)(
      url,
      { Authorization: `${REVALIDATE_AUTH_SCHEME}${signRevalidateToken(opts.secret, opts.now)}` },
      opts.timeoutMs ?? REVALIDATE_REQUEST_TIMEOUT_MS
    );
    if (status < HTTP_OK_MIN || status > HTTP_OK_MAX) {
      return { ok: false, url: href, reason: `HTTP ${status}` };
    }
    return { ok: true, url: href };
  } catch (error) {
    return { ok: false, url: href, reason: error instanceof Error ? error.message : String(error) };
  }
}

/** Token from an `Authorization` header value, or `null`. */
export function tokenFromAuthorization(header: string | null): string | null {
  if (!header?.startsWith(REVALIDATE_AUTH_SCHEME)) return null;
  const token = header.slice(REVALIDATE_AUTH_SCHEME.length).trim();
  return token === "" ? null : token;
}
