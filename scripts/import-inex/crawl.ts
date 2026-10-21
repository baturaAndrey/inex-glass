/**
 * Firecrawl scrape of the inex.su pages the import needs (task 37), with a file cache.
 *
 *   pnpm tsx --env-file=.env scripts/import-inex/crawl.ts [options]
 *
 * Options:
 *   --sample           one page of each kind (object, shower, shower listing, category); prints
 *                      raw HTML fragments for tuning `selectors.ts`
 *   --limit=N          at most N pages (after --only)
 *   --only=<substr>    only URLs containing the substring
 *   --refresh          ignore the cache (spends credits again)
 *   --concurrency=N    parallel requests (default 3)
 *   --credits          print the remaining Firecrawl credits and exit
 *   --dry-run          list the pages and the cost estimate; no API calls
 *
 * Targets come from the corrected redirect logic (`crawlTargets`): portfolio objects that keep
 * their 301 (no stairs, interior finishing, categories, pagination) and the shower catalogue.
 * Every response (also errors) lands in `scripts/.cache/firecrawl/<sha1(url)>.json`, so a re-run
 * costs nothing. Failed pages are cached as `ok: false` and retried only with `--refresh`.
 *
 * API: Firecrawl v2 `POST /v2/scrape` (docs.firecrawl.dev/api-reference/endpoint/scrape),
 * credits: `GET /v2/team/credit-usage`. The key (FIRECRAWL_API_KEY) is only placed in the
 * Authorization header and never logged.
 */
import { parseArgs } from "node:util";

import * as cheerio from "cheerio";

import {
  CRAWL_STATS_JSON,
  cacheFile,
  crawlTargets,
  inexUrl,
  mapLimit,
  readCache,
  readJson,
  readSourceCsv,
  sleep,
  writeCache,
  writeFileAtomic,
  type CacheEntry,
  type CrawlTarget,
  type FirecrawlDocument,
} from "./shared";

const API_BASE = "https://api.firecrawl.dev/v2";
const SCRAPE_TIMEOUT_MS = 60_000;
/** Client-side timeout: the API's own timeout plus headroom for queueing. */
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 5;
const BACKOFF_START_MS = 2_000;
const BACKOFF_MAX_MS = 32_000;
/** One scrape of a plain page costs one credit (Firecrawl pricing). */
const CREDITS_PER_SCRAPE = 1;
/** Stop before a run would leave fewer credits than this. */
const CREDIT_RESERVE = 50;

/** A sample category page, crawled only in `--sample` (to see the listing markup). */
const SAMPLE_CATEGORY_URL = "/portfolio/peregorodki/celnosteklyannye";

class FatalError extends Error {}

function apiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) throw new FatalError("FIRECRAWL_API_KEY не задан (.env)");
  return key;
}

async function getRemainingCredits(): Promise<number> {
  const response = await fetch(`${API_BASE}/team/credit-usage`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new FatalError(`credit-usage: HTTP ${response.status}`);
  const body = (await response.json()) as { data?: { remainingCredits?: number } };
  const remaining = body.data?.remainingCredits;
  if (typeof remaining !== "number") throw new FatalError("credit-usage: нет remainingCredits");
  return remaining;
}

/** `Retry-After` in ms (seconds or HTTP date), if present. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

interface ScrapeResult {
  ok: boolean;
  error?: string;
  data?: FirecrawlDocument;
  creditsUsed?: number;
}

/**
 * One scrape with retries on 429/5xx/network errors (2 → 32 s, honouring `Retry-After`).
 * 401/402 are fatal for the whole run.
 */
async function scrape(url: string): Promise<ScrapeResult> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          formats: ["markdown", "html", "rawHtml", "links"],
          onlyMainContent: true,
          waitFor: 1000,
          timeout: SCRAPE_TIMEOUT_MS,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await sleep(Math.min(BACKOFF_START_MS * 2 ** (attempt - 1), BACKOFF_MAX_MS));
      continue;
    }

    if (response.status === 401 || response.status === 403) {
      throw new FatalError(`Firecrawl: HTTP ${response.status} — проверьте ключ`);
    }
    if (response.status === 402) throw new FatalError("Firecrawl: недостаточно кредитов (402)");
    if (response.status === 429 || response.status >= 500) {
      lastError = `HTTP ${response.status}`;
      const wait = retryAfterMs(response) ?? BACKOFF_START_MS * 2 ** (attempt - 1);
      await sleep(Math.min(wait, BACKOFF_MAX_MS));
      continue;
    }

    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
      data?: FirecrawlDocument & { metadata?: { creditsUsed?: number } };
    } | null;
    if (!response.ok || !body?.success || !body.data) {
      return { ok: false, error: body?.error ?? `HTTP ${response.status}` };
    }
    const status = body.data.metadata?.statusCode;
    const empty = !body.data.markdown?.trim() && !body.data.rawHtml?.trim();
    const creditsUsed = body.data.metadata?.creditsUsed ?? CREDITS_PER_SCRAPE;
    if (status !== undefined && status !== 200) {
      return { ok: false, error: `statusCode ${status}`, data: body.data, creditsUsed };
    }
    if (empty) return { ok: false, error: "пустой контент", data: body.data, creditsUsed };
    return { ok: true, data: body.data, creditsUsed };
  }
  return { ok: false, error: `после ${MAX_ATTEMPTS} попыток: ${lastError}` };
}

/** Prints short raw HTML fragments of a page to tune the selectors. */
function printSample(target: CrawlTarget, entry: CacheEntry): void {
  const html = entry.data?.rawHtml ?? "";
  const $ = cheerio.load(html);
  const line = "─".repeat(100);
  process.stdout.write(`\n${line}\n${target.kind}: ${target.oldUrl} (ok=${entry.ok})\n${line}\n`);
  process.stdout.write(`title: ${entry.data?.metadata?.title ?? ""}\n`);
  process.stdout.write(
    `h1: ${$("h1")
      .map((_, el) => $(el).text().trim())
      .get()
      .join(" | ")}\n`
  );
  const images = $("img")
    .map(
      (_, el) =>
        `${$(el).attr("src") ?? ""} [alt=${$(el).attr("alt") ?? ""}] [class=${$(el).attr("class") ?? ""}]`
    )
    .get();
  process.stdout.write(`img (${images.length}):\n  ${images.slice(0, 40).join("\n  ")}\n`);
  const anchors = $(
    "a[href$='.jpg'], a[href$='.jpeg'], a[href$='.png'], a[href$='.webp'], a[href*='/upload/']"
  )
    .map((_, el) => `${$(el).attr("href") ?? ""} [class=${$(el).attr("class") ?? ""}]`)
    .get();
  process.stdout.write(`a→image (${anchors.length}):\n  ${anchors.slice(0, 40).join("\n  ")}\n`);
  process.stdout.write(`markdown (first 1500):\n${(entry.data?.markdown ?? "").slice(0, 1500)}\n`);
}

interface CrawlStats {
  requested: number;
  fromCache: number;
  fetched: number;
  ok: number;
  failed: Array<{ oldUrl: string; error: string }>;
  creditsUsed: number;
  /** Part of `creditsUsed` spent by `--sample` runs. */
  sampleCredits: number;
  creditsBefore: number | null;
  creditsAfter: number | null;
  startedAt: string;
  finishedAt: string;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      sample: { type: "boolean", default: false },
      limit: { type: "string" },
      only: { type: "string" },
      refresh: { type: "boolean", default: false },
      concurrency: { type: "string", default: "3" },
      credits: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
  });

  if (values.credits) {
    process.stdout.write(`Firecrawl: осталось кредитов ${await getRemainingCredits()}\n`);
    return;
  }

  const rows = await readSourceCsv();
  let targets = crawlTargets(rows);
  if (values.sample) {
    const pick = (kind: CrawlTarget["kind"]) => targets.find((target) => target.kind === kind);
    targets = [
      pick("object"),
      pick("shower"),
      pick("shower-listing"),
      { oldUrl: SAMPLE_CATEGORY_URL, kind: "category" as const },
    ].filter((target): target is CrawlTarget => target !== undefined);
  }
  if (values.only) targets = targets.filter((target) => target.oldUrl.includes(values.only ?? ""));
  if (values.limit) targets = targets.slice(0, Number(values.limit));

  const cached = await Promise.all(targets.map((target) => readCache(target.oldUrl)));
  const toFetch = targets.filter((_, index) => values.refresh || cached[index] === null);
  const counts = targets.reduce<Record<string, number>>((acc, target) => {
    acc[target.kind] = (acc[target.kind] ?? 0) + 1;
    return acc;
  }, {});
  process.stdout.write(
    `страниц: ${targets.length} (${Object.entries(counts)
      .map(([k, n]) => `${k} ${n}`)
      .join(", ")}); ` +
      `из кэша ${targets.length - toFetch.length}, к запросу ${toFetch.length} ` +
      `(≈${toFetch.length * CREDITS_PER_SCRAPE} кредитов)\n`
  );
  if (values["dry-run"]) {
    for (const target of toFetch) process.stdout.write(`  ${target.kind}\t${target.oldUrl}\n`);
    return;
  }

  const startedAt = new Date().toISOString();
  let creditsBefore: number | null = null;
  if (toFetch.length > 0) {
    creditsBefore = await getRemainingCredits();
    process.stdout.write(`Firecrawl: осталось кредитов ${creditsBefore}\n`);
    if (creditsBefore - toFetch.length * CREDITS_PER_SCRAPE < CREDIT_RESERVE) {
      throw new FatalError(
        `кредитов недостаточно: нужно ≈${toFetch.length}, осталось ${creditsBefore}, резерв ${CREDIT_RESERVE}`
      );
    }
  }

  const concurrency = Math.max(1, Number(values.concurrency) || 3);
  let done = 0;
  let creditsUsed = 0;
  let fatal: Error | null = null;
  const fetchedEntries = await mapLimit(toFetch, concurrency, async (target) => {
    if (fatal) return null;
    const url = inexUrl(target.oldUrl);
    try {
      const result = await scrape(url);
      const entry: CacheEntry = {
        url,
        oldUrl: target.oldUrl,
        fetchedAt: new Date().toISOString(),
        ok: result.ok,
        ...(result.error ? { error: result.error } : {}),
        ...(result.data ? { data: result.data } : {}),
        ...(result.creditsUsed !== undefined ? { creditsUsed: result.creditsUsed } : {}),
      };
      creditsUsed += result.creditsUsed ?? 0;
      await writeCache(entry);
      done += 1;
      process.stdout.write(
        `[${done}/${toFetch.length}] ${result.ok ? "ok " : "ERR"} ${target.oldUrl}${result.error ? ` — ${result.error}` : ""}\n`
      );
      return entry;
    } catch (error) {
      if (error instanceof FatalError) fatal = error;
      throw error;
    }
  });
  if (fatal) throw fatal;

  const entries = await Promise.all(targets.map((target) => readCache(target.oldUrl)));
  if (values.sample) {
    targets.forEach((target, index) => {
      const entry = entries[index];
      if (entry) printSample(target, entry);
    });
  }

  const creditsAfter = toFetch.length > 0 ? await getRemainingCredits() : null;
  const failed = entries.flatMap((entry, index) =>
    entry && !entry.ok
      ? [{ oldUrl: targets[index]?.oldUrl ?? entry.oldUrl, error: entry.error ?? "?" }]
      : []
  );

  // Accumulate across runs so the import report shows the total spend of the migration.
  const previous = await readJson<CrawlStats | null>(CRAWL_STATS_JSON, null);
  const credits = {
    creditsUsed: (previous?.creditsUsed ?? 0) + creditsUsed,
    sampleCredits: (previous?.sampleCredits ?? 0) + (values.sample ? creditsUsed : 0),
    creditsBefore: previous?.creditsBefore ?? creditsBefore,
    creditsAfter: creditsAfter ?? previous?.creditsAfter ?? null,
    startedAt: previous?.startedAt ?? startedAt,
    finishedAt: new Date().toISOString(),
  };
  // A sample or partial run only adds its spend; the page counters describe full runs.
  const partial = values.sample || !!values.only || !!values.limit;
  const stats: CrawlStats = {
    requested: partial ? (previous?.requested ?? 0) : targets.length,
    fromCache: partial ? (previous?.fromCache ?? 0) : targets.length - toFetch.length,
    fetched: partial ? (previous?.fetched ?? 0) : fetchedEntries.filter(Boolean).length,
    ok: partial ? (previous?.ok ?? 0) : entries.filter((entry) => entry?.ok).length,
    failed: partial ? (previous?.failed ?? []) : failed,
    ...credits,
  };
  await writeFileAtomic(CRAWL_STATS_JSON, JSON.stringify(stats, null, 2));

  process.stdout.write(
    `готово: ok ${stats.ok}/${targets.length}, ошибок ${failed.length}, ` +
      `потрачено в этом запуске ${creditsUsed} кредитов` +
      (creditsAfter !== null ? `, осталось ${creditsAfter}` : "") +
      `\nкэш: ${cacheFile("").replace(/[^\\/]+$/, "")}\n`
  );
}

try {
  await main();
} catch (error) {
  console.error("crawl: ошибка —", error instanceof Error ? error.message : error);
  process.exit(1);
}
