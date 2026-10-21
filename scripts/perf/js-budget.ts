/**
 * JS budget per route (task 39, ТЗ §2 п.3): ≤ 150 KB gzip of same-origin scripts, Next/React
 * runtime included, third-party scripts (Yandex Metrika) excluded.
 *
 *   pnpm tsx scripts/perf/js-budget.ts            # PERF_BASE_URL (default http://localhost:3000)
 *   PERF_ONLY=home,quiz pnpm tsx scripts/perf/js-budget.ts
 *   PERF_CONSENT=all pnpm tsx scripts/perf/js-budget.ts   # report run with analytics consent
 *
 * Measure a PRODUCTION build (`next build` + `next start`): dev chunks are unminified.
 *
 * Method: Chromium, mobile viewport 375×812, a fresh context per route (empty HTTP cache), wait
 * for `networkidle`, then sum `gzipSync(body)` of every `script` response of the site's origin.
 * Playwright hands over the decoded body, so it is re-compressed (gzip level 9 is close to what
 * `compress: true` sends) — the number is comparable across runs, not a byte-exact transfer size.
 * Scripts of other origins are counted separately (they must be absent without consent).
 *
 * Exit code 1 when a route exceeds the budget or fails to load (expected status mismatch).
 * Writes `scripts/perf/out/js-budget[-consent].json`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { CONSENT_STORAGE_KEY } from "../../src/lib/consent";
import { formatKb, JS_BUDGET_GZIP_BYTES, perfBaseUrl, resolveRoutes } from "./routes";
import type { PerfRoute } from "./routes";
import type { Browser, Response } from "@playwright/test";

const OUT_DIR = path.join(import.meta.dirname, "out");
const NAVIGATION_TIMEOUT_MS = 120_000;
/** Chunks listed per route in the JSON (heaviest first); `PERF_TOP_CHUNKS` overrides. */
const TOP_CHUNKS = Number(process.env.PERF_TOP_CHUNKS ?? 8);

interface ScriptEntry {
  url: string;
  gzipBytes: number;
  rawBytes: number;
}

interface RouteResult {
  id: string;
  path: string;
  status: number | null;
  gzipBytes: number;
  rawBytes: number;
  scripts: number;
  thirdPartyScripts: string[];
  overBudget: boolean;
  topChunks: ScriptEntry[];
  error?: string;
}

async function scriptEntry(response: Response): Promise<ScriptEntry | null> {
  try {
    const body = await response.body();
    return {
      url: response.url(),
      rawBytes: body.length,
      gzipBytes: gzipSync(body, { level: 9 }).length,
    };
  } catch {
    // Redirects and aborted requests have no body.
    return null;
  }
}

async function measureRoute(
  browser: Browser,
  baseUrl: string,
  route: PerfRoute,
  withConsent: boolean
): Promise<RouteResult> {
  const origin = new URL(baseUrl).origin;
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: "ru-RU",
    serviceWorkers: "block",
  });
  if (withConsent) {
    await context.addInitScript(([key]) => window.localStorage.setItem(key, "all"), [
      CONSENT_STORAGE_KEY,
    ] as const);
  }
  const page = await context.newPage();
  const pending: Array<Promise<ScriptEntry | null>> = [];
  const thirdParty: string[] = [];

  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    if (new URL(response.url()).origin === origin) pending.push(scriptEntry(response));
    else thirdParty.push(response.url());
  });

  const result: RouteResult = {
    id: route.id,
    path: route.path,
    status: null,
    gzipBytes: 0,
    rawBytes: 0,
    scripts: 0,
    thirdPartyScripts: thirdParty,
    overBudget: false,
    topChunks: [],
  };

  try {
    const response = await page.goto(new URL(route.path, baseUrl).toString(), {
      waitUntil: "networkidle",
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    result.status = response?.status() ?? null;
    const expected = route.status ?? 200;
    if (result.status !== expected) {
      result.error = `HTTP ${result.status}, ожидался ${expected}`;
    }
    const entries = (await Promise.all(pending)).filter((entry) => entry !== null);
    result.scripts = entries.length;
    result.gzipBytes = entries.reduce((sum, entry) => sum + entry.gzipBytes, 0);
    result.rawBytes = entries.reduce((sum, entry) => sum + entry.rawBytes, 0);
    result.topChunks = entries
      .sort((a, b) => b.gzipBytes - a.gzipBytes)
      .slice(0, TOP_CHUNKS)
      .map((entry) => ({ ...entry, url: new URL(entry.url).pathname }));
    result.overBudget = result.gzipBytes > JS_BUDGET_GZIP_BYTES;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message.split("\n")[0] ?? message;
  } finally {
    await context.close();
  }
  return result;
}

function printTable(results: RouteResult[]): void {
  const rows = results.map((result) => ({
    route: result.path,
    status: result.status ?? "—",
    scripts: result.scripts,
    "KB gzip": formatKb(result.gzipBytes),
    "KB raw": formatKb(result.rawBytes),
    "3rd-party": result.thirdPartyScripts.length,
    verdict: result.error
      ? `ОШИБКА: ${result.error}`
      : result.overBudget
        ? `ПРЕВЫШЕНИЕ +${formatKb(result.gzipBytes - JS_BUDGET_GZIP_BYTES)} KB`
        : "ok",
  }));
  console.table(rows);
}

const baseUrl = perfBaseUrl();
const withConsent = process.env.PERF_CONSENT === "all";
const { routes, skipped } = await resolveRoutes(baseUrl);

console.log(
  `JS-бюджет ${formatKb(JS_BUDGET_GZIP_BYTES)} KB gzip · ${baseUrl} · ` +
    `${withConsent ? "согласие: all" : "без согласия"} · маршрутов: ${routes.length}`
);
for (const item of skipped) console.warn(`  пропущен ${item.id}: ${item.reason}`);

const browser = await chromium.launch();
const results: RouteResult[] = [];
try {
  // Sequential on purpose: one page at a time keeps `networkidle` and the server log readable.
  for (const route of routes)
    results.push(await measureRoute(browser, baseUrl, route, withConsent));
} finally {
  await browser.close();
}

printTable(results);

mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, withConsent ? "js-budget-consent.json" : "js-budget.json");
writeFileSync(
  outFile,
  JSON.stringify(
    { baseUrl, withConsent, budgetBytes: JS_BUDGET_GZIP_BYTES, skipped, results },
    null,
    2
  )
);
console.log(`JSON: ${path.relative(process.cwd(), outFile)}`);

const failed = results.filter(
  (result) =>
    result.error !== undefined ||
    result.overBudget ||
    // Without consent no third-party script may load at all (Metrika is consent-gated).
    (!withConsent && result.thirdPartyScripts.length > 0)
);
if (failed.length > 0) {
  console.error(`Не прошли: ${failed.map((result) => result.id).join(", ")}`);
  process.exit(1);
}
