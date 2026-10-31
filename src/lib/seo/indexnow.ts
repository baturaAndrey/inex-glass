/**
 * IndexNow client (task 36): tells Yandex (and, through the protocol, the other participating
 * engines such as Bing) that URLs of the site changed. Google does not support IndexNow — it
 * relies on the sitemap and Search Console.
 *
 * Protocol (https://www.indexnow.org/documentation): `POST <engine>/indexnow` with JSON
 * `{ host, key, keyLocation, urlList }`, at most 10 000 URLs per request, URLs of `host` only.
 * The key file `https://<host>/<key>.txt` must contain exactly the key
 * (`src/app/(site)/indexnow-key/[key]/route.ts` + the rewrite in `next.config.ts`).
 *
 * Responses: 200 / 202 — accepted; 400 (bad request), 403 (key not valid), 422 (URLs of another
 * host / key mismatch) — configuration errors, retrying cannot help; 429 (too many requests) and
 * 5xx — transient, the caller retries later (the `indexnow-submit` job throws → Payload retry).
 *
 * No Payload / Next imports: used by the job, by `scripts/indexnow-all.ts` and unit tests.
 */

/** Yandex endpoint (yandex.com/indexnow, see the Yandex Webmaster IndexNow docs). */
export const YANDEX_INDEXNOW_ENDPOINT = "https://yandex.com/indexnow";
/** Shared endpoint that forwards to every participating engine (Bing, Seznam, Naver, …). */
export const AGGREGATOR_INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/**
 * Also send every batch to the aggregator. Off: participating engines share submissions with
 * each other, so the Yandex request already reaches Bing; switch on if Bing Webmaster shows
 * that submissions do not arrive.
 */
export const SUBMIT_TO_AGGREGATOR = false;

/** Protocol limit of URLs per request. */
export const INDEXNOW_BATCH_LIMIT = 10_000;
/** Key format of this project (`openssl rand -hex 16`); also the rewrite pattern of the key file. */
export const INDEXNOW_KEY_PATTERN = /^[a-f0-9]{32}$/;
/** One request must not hang the job runner. */
const REQUEST_TIMEOUT_MS = 15_000;

const HTTP_OK = 200;
const HTTP_ACCEPTED = 202;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;

export type IndexNowOutcome = "ok" | "config-error" | "retryable";

export interface IndexNowResult {
  outcome: IndexNowOutcome;
  /** URLs accepted by every endpoint (on failure: those of the batches before it). */
  submitted: number;
  /** HTTP status of the failed request (absent for network errors and local validation). */
  status?: number;
  /** Endpoint of the failed request. */
  endpoint?: string;
  /** Short, log-safe reason (no response bodies, no URLs). */
  reason?: string;
}

export interface IndexNowOptions {
  /** Site origin from `SITE_URL`: defines `host` and `keyLocation`. */
  siteUrl: string;
  key: string;
  /** Injected in tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Defaults to Yandex (+ the aggregator when `SUBMIT_TO_AGGREGATOR`). */
  endpoints?: readonly string[];
}

export interface IndexNowBody {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

export const DEFAULT_ENDPOINTS: readonly string[] = SUBMIT_TO_AGGREGATOR
  ? [YANDEX_INDEXNOW_ENDPOINT, AGGREGATOR_INDEXNOW_ENDPOINT]
  : [YANDEX_INDEXNOW_ENDPOINT];

/** Maps an HTTP status of an IndexNow endpoint to what the caller should do. */
export function classifyStatus(status: number): IndexNowOutcome {
  if (status === HTTP_OK || status === HTTP_ACCEPTED) return "ok";
  if (status === HTTP_TOO_MANY_REQUESTS || status >= HTTP_SERVER_ERROR_MIN) return "retryable";
  // 400 / 403 / 422 and any other unexpected status: retrying the same request cannot succeed.
  return status >= HTTP_OK && status < 300 ? "ok" : "config-error";
}

/**
 * Absolute http(s) URLs of the site's own host, de-duplicated in input order. Anything else is
 * dropped: one foreign URL makes the engine reject the whole batch with 422.
 */
export function ownHostUrls(urls: readonly unknown[], siteUrl: string): string[] {
  const host = new URL(siteUrl).hostname;
  const seen = new Set<string>();
  for (const value of urls) {
    if (typeof value !== "string") continue;
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      continue;
    }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.hostname !== host) continue;
    seen.add(url.toString());
  }
  return [...seen];
}

/** Splits a list into chunks of at most `size` items. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }
  return result;
}

/** Request body of one batch. */
export function buildIndexNowBody(siteUrl: string, key: string, urlList: string[]): IndexNowBody {
  const origin = new URL(siteUrl);
  return {
    host: origin.hostname,
    key,
    keyLocation: `${origin.origin}/${key}.txt`,
    urlList,
  };
}

async function post(
  fetchImpl: typeof fetch,
  endpoint: string,
  body: IndexNowBody
): Promise<{ status: number } | { error: string }> {
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    // The body is irrelevant (and may be large HTML); release the connection.
    await response.body?.cancel().catch(() => undefined);
    return { status: response.status };
  } catch (error) {
    return { error: error instanceof Error ? error.name : "unknown" };
  }
}

/**
 * Submits `urls` (only those of the site's host) in batches of 10 000 to every endpoint.
 * Stops at the first failure and reports it; network errors and timeouts are `retryable`.
 * Never throws.
 */
export async function submitToIndexNow(
  urls: readonly unknown[],
  options: IndexNowOptions
): Promise<IndexNowResult> {
  if (!INDEXNOW_KEY_PATTERN.test(options.key)) {
    return {
      outcome: "config-error",
      submitted: 0,
      reason: "INDEXNOW_KEY: ожидается 32 hex-символа",
    };
  }
  const list = ownHostUrls(urls, options.siteUrl);
  if (list.length === 0) return { outcome: "ok", submitted: 0 };

  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoints = options.endpoints ?? DEFAULT_ENDPOINTS;
  let submitted = 0;

  for (const batch of chunk(list, INDEXNOW_BATCH_LIMIT)) {
    const body = buildIndexNowBody(options.siteUrl, options.key, batch);
    for (const endpoint of endpoints) {
      const result = await post(fetchImpl, endpoint, body);
      if ("error" in result) {
        return { outcome: "retryable", submitted, endpoint, reason: result.error };
      }
      const outcome = classifyStatus(result.status);
      if (outcome !== "ok") {
        return { outcome, submitted, endpoint, status: result.status };
      }
    }
    submitted += batch.length;
  }
  return { outcome: "ok", submitted };
}
