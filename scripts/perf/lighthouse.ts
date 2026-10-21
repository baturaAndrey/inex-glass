/**
 * Lighthouse (mobile profile) over the representative routes (task 39): median of N runs per
 * route, summary in JSON + Markdown, raw reports kept for inspection.
 *
 *   pnpm tsx scripts/perf/lighthouse.ts           # PERF_BASE_URL (default http://localhost:3000)
 *   PERF_ONLY=home,article PERF_RUNS=1 pnpm tsx scripts/perf/lighthouse.ts
 *   PERF_LABEL=before pnpm tsx scripts/perf/lighthouse.ts   # out/lighthouse-before.{json,md}
 *   PERF_LABEL=before PERF_SUMMARIZE_ONLY=1 pnpm tsx scripts/perf/lighthouse.ts  # re-read raw reports
 *
 * Measure a PRODUCTION build (`next build` + `next start`) — never `next dev`.
 *
 * Lighthouse is pinned (`LIGHTHOUSE_VERSION`), so it is not a project dependency. Two runners:
 * - default: `pnpm dlx lighthouse@<version>` with `CHROME_PATH` or Playwright's Chromium;
 * - `PERF_LIGHTHOUSE_DOCKER_IMAGE=<image>` (built from `scripts/perf/lighthouse.Dockerfile`):
 *   Lighthouse + Chromium in a Linux container reaching the host server through
 *   `host.docker.internal`. Use it on Windows machines whose antivirus proxies browser HTTP
 *   traffic (uncompressed HTML, injected scripts) — the authoritative numbers of the report.
 * Profile: default mobile form factor and screen emulation, simulated throttling (slow 4G, 4× CPU).
 *
 * Routes answering a non-200 status (the 404 page) are skipped: Lighthouse refuses to audit an
 * error document. Exit code 1 when a CWV-gated template misses LCP/CLS/TBT targets.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { perfBaseUrl, resolveRoutes } from "./routes";
import type { PerfRoute } from "./routes";

export const LIGHTHOUSE_VERSION = "13.5.0";

/** Targets of ТЗ §2 п.3 (lab proxies: TBT stands for INP). */
const TARGETS = { lcpMs: 2500, cls: 0.1, tbtMs: 200 } as const;
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"] as const;

const OUT_DIR = path.join(import.meta.dirname, "out");
const RAW_DIR = path.join(OUT_DIR, "lighthouse");
const RUNS = Math.max(1, Number(process.env.PERF_RUNS ?? 3));
/** Re-summarize the raw reports of `PERF_LABEL` without running Lighthouse again. */
const SUMMARIZE_ONLY = process.env.PERF_SUMMARIZE_ONLY === "1";
const DOCKER_IMAGE = process.env.PERF_LIGHTHOUSE_DOCKER_IMAGE;
/** How a container reaches the server listening on the host. */
const DOCKER_HOST_ALIAS = "host.docker.internal";
const LABEL = process.env.PERF_LABEL ?? "latest";

type CategoryId = (typeof CATEGORIES)[number];

interface LhAudit {
  numericValue?: number;
  details?: {
    items?: Array<Record<string, unknown>>;
  };
}

interface LhReport {
  lighthouseVersion: string;
  runtimeError?: { code: string; message: string };
  audits: Record<string, LhAudit | undefined>;
  categories: Record<CategoryId, { score: number | null } | undefined>;
}

interface RunMetrics {
  lcp: number;
  cls: number;
  tbt: number;
  fcp: number;
  si: number;
  scores: Record<CategoryId, number | null>;
  /** Bytes of images loaded during the page load (lazy images below the fold excluded). */
  imageBytes: number;
  totalBytes: number;
  lcpElement: string | null;
}

interface RouteSummary extends RunMetrics {
  id: string;
  path: string;
  template: string;
  cwvGate: boolean;
  runs: number;
  passed: boolean;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function numeric(report: LhReport, audit: string): number {
  return report.audits[audit]?.numericValue ?? Number.NaN;
}

interface LhNode {
  type?: string;
  selector?: string;
  snippet?: string;
}

/** Short description of the LCP node: tag + first class from the snippet, else the selector. */
function describeNode(node: LhNode): string | null {
  const snippet = node.snippet?.match(/^<([a-z0-9]+)(?:[^>]*?class="([^"]*)")?/i);
  if (snippet) {
    const firstClass = snippet[2]?.split(" ")[0];
    return firstClass ? `${snippet[1]}.${firstClass}` : (snippet[1] ?? null);
  }
  return node.selector ?? null;
}

function lcpElement(report: LhReport): string | null {
  // LH 13: `lcp-breakdown-insight` lists a phases table and the LCP node; older reports keep
  // the node in `largest-contentful-paint-element` (a table whose rows hold `node`).
  for (const audit of ["lcp-breakdown-insight", "largest-contentful-paint-element"]) {
    for (const item of report.audits[audit]?.details?.items ?? []) {
      const entry = item as LhNode & { items?: Array<{ node?: LhNode }> };
      const node = entry.type === "node" ? entry : entry.items?.[0]?.node;
      if (node) return describeNode(node);
    }
  }
  return null;
}

function networkBytes(report: LhReport): { image: number; total: number } {
  const items = report.audits["network-requests"]?.details?.items ?? [];
  let image = 0;
  let total = 0;
  for (const item of items) {
    const bytes = Number(item.transferSize ?? 0);
    total += bytes;
    if (item.resourceType === "Image") image += bytes;
  }
  return { image, total };
}

function extract(report: LhReport): RunMetrics {
  const bytes = networkBytes(report);
  return {
    lcp: numeric(report, "largest-contentful-paint"),
    cls: numeric(report, "cumulative-layout-shift"),
    tbt: numeric(report, "total-blocking-time"),
    fcp: numeric(report, "first-contentful-paint"),
    si: numeric(report, "speed-index"),
    scores: Object.fromEntries(
      CATEGORIES.map((id) => [id, report.categories[id]?.score ?? null])
    ) as Record<CategoryId, number | null>,
    imageBytes: bytes.image,
    totalBytes: bytes.total,
    lcpElement: lcpElement(report),
  };
}

/** Lighthouse flags shared by both runners (profile of the report). */
const LIGHTHOUSE_FLAGS = [
  "--form-factor=mobile",
  "--screenEmulation.mobile",
  "--throttling-method=simulate",
  `--only-categories=${CATEGORIES.join(",")}`,
  "--output=json",
  '--chrome-flags="--headless=new --no-sandbox"',
  "--quiet",
];

function readReport(outFile: string): LhReport {
  const report = JSON.parse(readFileSync(outFile, "utf8")) as LhReport;
  if (report.runtimeError) {
    throw new Error(`${report.runtimeError.code}: ${report.runtimeError.message}`);
  }
  return report;
}

/** The report is streamed to stdout and written by this process (no volume mounts needed). */
function runLighthouseInDocker(url: string, outFile: string, image: string): LhReport {
  const target = new URL(url);
  if (target.hostname === "localhost" || target.hostname === "127.0.0.1") {
    target.hostname = DOCKER_HOST_ALIAS;
  }
  const args = [
    "run",
    "--rm",
    `--add-host=${DOCKER_HOST_ALIAS}:host-gateway`,
    "--shm-size=1g",
    image,
    `"${target.toString()}"`,
    ...LIGHTHOUSE_FLAGS,
    "--output-path=stdout",
  ];
  const result = spawnSync("docker", args, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    // Git Bash would rewrite the URL-like arguments into Windows paths.
    env: { ...process.env, MSYS_NO_PATHCONV: "1" },
  });
  if (result.status !== 0) {
    throw new Error(`docker lighthouse завершился с кодом ${result.status}: ${result.stderr}`);
  }
  writeFileSync(outFile, result.stdout);
  return readReport(outFile);
}

function runLighthouse(url: string, outFile: string, chromePath: string): LhReport {
  if (DOCKER_IMAGE) return runLighthouseInDocker(url, outFile, DOCKER_IMAGE);
  const args = [
    "dlx",
    `lighthouse@${LIGHTHOUSE_VERSION}`,
    `"${url}"`,
    ...LIGHTHOUSE_FLAGS,
    `--output-path="${outFile}"`,
  ];
  // `shell: true`: `pnpm` is a .cmd shim on Windows.
  const result = spawnSync("pnpm", args, {
    shell: true,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, CHROME_PATH: chromePath },
  });
  if (result.status !== 0) throw new Error(`lighthouse завершился с кодом ${result.status}`);
  return readReport(outFile);
}

function summarize(route: PerfRoute, runs: RunMetrics[]): RouteSummary {
  const pick = (key: "lcp" | "cls" | "tbt" | "fcp" | "si" | "imageBytes" | "totalBytes") =>
    median(runs.map((run) => run[key]));
  // Scores and the LCP element come from the run whose LCP is the median one.
  const lcp = pick("lcp");
  const representative = runs.find((run) => run.lcp === lcp) ?? runs[0]!;
  const summary: RouteSummary = {
    id: route.id,
    path: route.path,
    template: route.template,
    cwvGate: route.cwvGate,
    runs: runs.length,
    lcp,
    cls: pick("cls"),
    tbt: pick("tbt"),
    fcp: pick("fcp"),
    si: pick("si"),
    imageBytes: pick("imageBytes"),
    totalBytes: pick("totalBytes"),
    scores: representative.scores,
    lcpElement: representative.lcpElement,
    passed: false,
  };
  summary.passed =
    summary.lcp < TARGETS.lcpMs && summary.cls < TARGETS.cls && summary.tbt <= TARGETS.tbtMs;
  return summary;
}

const score = (value: number | null) => (value === null ? "—" : String(Math.round(value * 100)));
const seconds = (ms: number) => (ms / 1000).toFixed(2);
const kb = (bytes: number) => (bytes / 1024).toFixed(0);

function markdown(summaries: RouteSummary[], baseUrl: string): string {
  const lines = [
    `Lighthouse ${LIGHTHOUSE_VERSION}, mobile, simulated throttling, медиана ${RUNS} прогонов, ${baseUrl}`,
    "",
    "| Маршрут | Шаблон | LCP, с | CLS | TBT, мс | FCP, с | SI, с | Perf | A11y | BP | SEO | Картинки, КБ | Всего, КБ | LCP-элемент |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const s of summaries) {
    lines.push(
      `| \`${s.path}\` | ${s.template}${s.cwvGate ? " *" : ""} | ${seconds(s.lcp)} | ${s.cls.toFixed(3)} | ` +
        `${Math.round(s.tbt)} | ${seconds(s.fcp)} | ${seconds(s.si)} | ${score(s.scores.performance)} | ` +
        `${score(s.scores.accessibility)} | ${score(s.scores["best-practices"])} | ${score(s.scores.seo)} | ` +
        `${kb(s.imageBytes)} | ${kb(s.totalBytes)} | \`${(s.lcpElement ?? "—").replaceAll("|", "\\|")}\` |`
    );
  }
  lines.push("", "\\* — шаблон с обязательными целями LCP < 2,5 с, CLS < 0,1, TBT ≤ 200 мс.");
  return lines.join("\n");
}

const baseUrl = perfBaseUrl();
const { routes, skipped } = await resolveRoutes(baseUrl);
const audited = routes.filter((route) => (route.status ?? 200) === 200);
for (const route of routes.filter((item) => !audited.includes(item))) {
  skipped.push({ id: route.id, reason: `HTTP ${route.status}: Lighthouse не аудирует ошибки` });
}
for (const item of skipped) console.warn(`пропущен ${item.id}: ${item.reason}`);

mkdirSync(RAW_DIR, { recursive: true });
const chromePath = process.env.CHROME_PATH ?? chromium.executablePath();
const summaries: RouteSummary[] = [];
const failures: string[] = [];

for (const route of audited) {
  const url = new URL(route.path, baseUrl).toString();
  // Warm-up request: the first hit of an ISR route renders it on the server.
  if (!SUMMARIZE_ONLY) await fetch(url).catch(() => undefined);
  const runs: RunMetrics[] = [];
  for (let run = 1; run <= RUNS; run += 1) {
    const outFile = path.join(RAW_DIR, `${LABEL}-${route.id}-${run}.json`);
    try {
      const report = SUMMARIZE_ONLY ? readReport(outFile) : runLighthouse(url, outFile, chromePath);
      runs.push(extract(report));
    } catch (error) {
      console.error(`${route.id} #${run}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (runs.length === 0) {
    failures.push(`${route.id}: нет успешных прогонов`);
    continue;
  }
  const summary = summarize(route, runs);
  summaries.push(summary);
  console.log(
    `${route.path}: LCP ${seconds(summary.lcp)} с · CLS ${summary.cls.toFixed(3)} · ` +
      `TBT ${Math.round(summary.tbt)} мс · perf ${score(summary.scores.performance)}`
  );
  if (route.cwvGate && !summary.passed) failures.push(`${route.id}: цели CWV не достигнуты`);
}

const md = markdown(summaries, baseUrl);
writeFileSync(
  path.join(OUT_DIR, `lighthouse-${LABEL}.json`),
  JSON.stringify(
    { lighthouse: LIGHTHOUSE_VERSION, baseUrl, runs: RUNS, targets: TARGETS, skipped, summaries },
    null,
    2
  )
);
writeFileSync(path.join(OUT_DIR, `lighthouse-${LABEL}.md`), `${md}\n`);
console.log(`\n${md}`);

if (failures.length > 0) {
  console.error(`\nНе прошли:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
