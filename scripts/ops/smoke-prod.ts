/**
 * Smoke checks of a deployed stand (task 41, section A3). Read-only by default: nothing is written
 * to the production database.
 *
 *   pnpm smoke:prod                       # = tsx scripts/ops/smoke-prod.ts (alias added by task 40)
 *   pnpm tsx scripts/ops/smoke-prod.ts [--browser] [--with-lead] [--only=a,b] [--skip=a,b] [--list]
 *
 * Environment:
 *   SMOKE_BASE_URL          default https://inexglass.ru (origin; a path is ignored)
 *   SMOKE_EXPECT_ENV        production (default) | staging | development — non-production stands
 *                           must be closed for indexing, so those checks are inverted there
 *   SMOKE_BASIC_AUTH        user:pass of the staging basic auth (sent with page requests)
 *   SMOKE_WWW_URL           default https://www.<host> (production only)
 *   SMOKE_EXPECT_RELEASE    optional git sha that /api/health/ must report
 *   SMOKE_MIN_SITEMAP_URLS  default 30
 *   SMOKE_CERT_MIN_DAYS     default 14
 *   SMOKE_HSTS_MIN_AGE      optional, seconds: FAIL when HSTS max-age is below it. Without it a
 *                           non-zero max-age under 1 year (the 300 s → 1 year rollout steps of
 *                           docs/deploy.md) is a WARN; a missing header or max-age=0 always FAILs
 *   SMOKE_TTFB_WARN_MS      default 800
 *   SMOKE_TIMEOUT_MS        default 20000 (per request)
 *
 * Flags:
 *   --browser    also check the cookie banner and that Metrika loads only after consent, in
 *                Chromium via Playwright (needs `pnpm exec playwright install chromium`)
 *   --with-lead  also call `POST /api/form-token/` (writes one rate-limit row). A real test lead is
 *                NOT sent by this script — that stays a manual checklist step (with «SMOKE» in the
 *                name and deletion afterwards), see docs/runbooks/prod-launch-checklist.md
 *   --only / --skip   comma-separated check ids (see --list)
 *
 * Plain `http://` stands (local `next start`, a container on localhost) skip the TLS, HTTP→HTTPS,
 * www and HSTS checks automatically. Exit code 1 when any check FAILs (WARN does not fail).
 * In GitHub Actions the result table is also appended to the job summary.
 *
 * No dependencies beyond Node built-ins (`node:http(s)`, `node:tls`); Playwright is loaded lazily
 * only with --browser.
 */
import { appendFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { randomBytes } from "node:crypto";
import tls from "node:tls";
import { parseArgs } from "node:util";

/* ------------------------------------------------------------------------------------------ */
/* Configuration                                                                              */
/* ------------------------------------------------------------------------------------------ */

type ExpectEnv = "production" | "staging" | "development";

interface Config {
  base: URL;
  expectEnv: ExpectEnv;
  basicAuth: string | null;
  wwwUrl: URL | null;
  expectRelease: string | null;
  minSitemapUrls: number;
  certMinDays: number;
  /** Enforced HSTS max-age (SMOKE_HSTS_MIN_AGE); null — only warn below one year. */
  hstsMinAge: number | null;
  ttfbWarnMs: number;
  timeoutMs: number;
  browser: boolean;
  withLead: boolean;
  only: Set<string> | null;
  skip: Set<string>;
  list: boolean;
}

const DEFAULT_BASE_URL = "https://inexglass.ru";
const ONE_YEAR_SECONDS = 31_536_000;
const DAY_MS = 86_400_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TTFB_SAMPLES = 3;

/** Indexable key URLs (A3 item 7): 200, exactly one h1, no noindex on production. */
const KEY_PATHS = [
  "/",
  "/zakalennoe-steklo/",
  "/zakalennoe-steklo/10-mm/",
  "/kak-zakazat/",
  "/kontakty/",
  "/raschet-stoimosti/",
  "/obekty/",
  "/blog/",
] as const;

/** Pages that are always noindex (A3 item 8). */
const NOINDEX_PATHS = ["/zakalennoe-steklo/5-mm/", "/poisk/"] as const;

/** Payload REST endpoints that must not be readable anonymously (section C). */
const PRIVATE_COLLECTIONS = [
  "leads",
  "orders",
  "lead-files",
  "order-files",
  "consent-log",
  "rate-limits",
  "search",
  "users",
] as const;

/** Paths that must answer 404 on production. */
const PRODUCTION_404_PATHS = ["/ui-kit/", "/wp-login.php"] as const;

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name}: ожидается целое > 0, получено «${raw}»`);
  }
  return value;
}

function csvSet(value: string | undefined): Set<string> | null {
  const items = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? new Set(items) : null;
}

function readConfig(argv: string[]): Config {
  const { values } = parseArgs({
    args: argv,
    options: {
      browser: { type: "boolean", default: false },
      "with-lead": { type: "boolean", default: false },
      only: { type: "string" },
      skip: { type: "string" },
      list: { type: "boolean", default: false },
    },
    allowPositionals: true, // `pnpm smoke:prod -- …` forwards a bare "--"
  });

  const base = new URL(process.env.SMOKE_BASE_URL?.trim() || DEFAULT_BASE_URL);
  base.pathname = "/";
  base.search = "";
  base.hash = "";

  const expectEnv = (process.env.SMOKE_EXPECT_ENV?.trim() || "production") as ExpectEnv;
  if (!["production", "staging", "development"].includes(expectEnv)) {
    throw new Error(
      `SMOKE_EXPECT_ENV: production | staging | development, получено «${expectEnv}»`
    );
  }

  const basicAuth = process.env.SMOKE_BASIC_AUTH?.trim() || null;
  if (basicAuth !== null && !/^[^:]+:.+$/.test(basicAuth)) {
    throw new Error("SMOKE_BASIC_AUTH: ожидается формат user:pass");
  }

  const wwwRaw = process.env.SMOKE_WWW_URL?.trim();
  const isIpOrLocal = /^(localhost|\d{1,3}(\.\d{1,3}){3}|\[.*\])$/.test(base.hostname);
  const wwwUrl = wwwRaw
    ? new URL(wwwRaw)
    : base.protocol === "https:" && !isIpOrLocal && !base.hostname.startsWith("www.")
      ? new URL(`https://www.${base.hostname}/`)
      : null;

  return {
    base,
    expectEnv,
    basicAuth,
    wwwUrl,
    expectRelease: process.env.SMOKE_EXPECT_RELEASE?.trim() || null,
    minSitemapUrls: positiveInt("SMOKE_MIN_SITEMAP_URLS", 30),
    certMinDays: positiveInt("SMOKE_CERT_MIN_DAYS", 14),
    hstsMinAge: process.env.SMOKE_HSTS_MIN_AGE?.trim()
      ? positiveInt("SMOKE_HSTS_MIN_AGE", ONE_YEAR_SECONDS)
      : null,
    ttfbWarnMs: positiveInt("SMOKE_TTFB_WARN_MS", 800),
    timeoutMs: positiveInt("SMOKE_TIMEOUT_MS", 20_000),
    browser: values.browser === true,
    withLead: values["with-lead"] === true,
    only: csvSet(values.only),
    skip: csvSet(values.skip) ?? new Set(),
    list: values.list === true,
  };
}

/* ------------------------------------------------------------------------------------------ */
/* HTTP                                                                                       */
/* ------------------------------------------------------------------------------------------ */

interface HttpResult {
  url: string;
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  /** Time to the first response byte (headers), ms. */
  ttfbMs: number;
}

interface RequestOptions {
  method?: string;
  /** Send the staging basic auth (default true). */
  auth?: boolean;
  headers?: Record<string, string>;
  /** Follow redirects within the same origin (default false: most checks assert exact codes). */
  follow?: boolean;
}

/**
 * One HTTP(S) request without redirects or decompression (no Accept-Encoding is sent), so status
 * codes and headers are exactly what the edge returned. TLS is verified (Node defaults).
 */
function rawRequest(cfg: Config, url: URL, options: RequestOptions): Promise<HttpResult> {
  const transport = url.protocol === "https:" ? https : http;
  const headers: Record<string, string> = {
    "User-Agent": "inex-glass-smoke/1.0 (+docs/deploy.md)",
    Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
    ...options.headers,
  };
  if (options.auth !== false && cfg.basicAuth) {
    headers.Authorization = `Basic ${Buffer.from(cfg.basicAuth).toString("base64")}`;
  }

  return new Promise((resolve, reject) => {
    const started = performance.now();
    const request = transport.request(
      url,
      { method: options.method ?? "GET", headers, timeout: cfg.timeoutMs },
      (response) => {
        const ttfbMs = Math.round(performance.now() - started);
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size <= MAX_BODY_BYTES) chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            url: url.toString(),
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString("utf8"),
            ttfbMs,
          })
        );
        response.on("error", reject);
      }
    );
    request.on("timeout", () => request.destroy(new Error(`таймаут ${cfg.timeoutMs} мс`)));
    request.on("error", reject);
    request.end();
  });
}

async function get(cfg: Config, target: string | URL, options: RequestOptions = {}) {
  let url = typeof target === "string" ? new URL(target, cfg.base) : target;
  let result = await rawRequest(cfg, url, options);
  for (let hop = 0; options.follow && hop < MAX_REDIRECTS; hop += 1) {
    const location = result.headers.location;
    if (result.status < 300 || result.status >= 400 || !location) break;
    const next = new URL(location, url);
    if (next.origin !== url.origin) break; // never leave the stand being checked
    url = next;
    result = await rawRequest(cfg, url, options);
  }
  return result;
}

function header(result: HttpResult, name: string): string {
  const value = result.headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}

/* ------------------------------------------------------------------------------------------ */
/* HTML / robots / sitemap parsing (pure)                                                     */
/* ------------------------------------------------------------------------------------------ */

/** Attributes of every `<tag …>` start tag (good enough for server-rendered Next HTML). */
function startTags(html: string, tag: string): Array<Record<string, string>> {
  const tags: Array<Record<string, string>> = [];
  const tagPattern = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  for (const match of html.matchAll(tagPattern)) {
    const attributes: Record<string, string> = {};
    const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    for (const attr of (match[1] ?? "").matchAll(attrPattern)) {
      const name = (attr[1] ?? "").toLowerCase();
      attributes[name] = decodeEntities(attr[3] ?? attr[4] ?? attr[5] ?? "");
    }
    tags.push(attributes);
  }
  return tags;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Robots directives of a page: `<meta name="robots">` plus the `X-Robots-Tag` header. */
function robotsDirectives(result: HttpResult): string {
  const meta = startTags(result.body, "meta")
    .filter((attrs) => ["robots", "googlebot", "yandex"].includes((attrs.name ?? "").toLowerCase()))
    .map((attrs) => attrs.content ?? "");
  return [...meta, header(result, "x-robots-tag")].join(", ").toLowerCase();
}

const isNoindex = (result: HttpResult) => /\bnoindex\b/.test(robotsDirectives(result));
const h1Count = (html: string) => (html.match(/<h1[\s>]/gi) ?? []).length;
const canonicalOf = (html: string) =>
  startTags(html, "link").find((attrs) => (attrs.rel ?? "").toLowerCase() === "canonical")?.href ??
  null;
/** HTML without `<script>` / `<style>` contents (for text searches). */
const withoutScripts = (html: string) =>
  html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
/** A Node/V8 stack frame (`at fn (/app/x.js:1:2)`) leaked into a response. */
const STACK_TRACE = /\bat [\w$.<>[\] ]+ \((?:file:\/\/|\/|[A-Za-z]:\\)[^)]*:\d+:\d+\)/;

interface RobotsGroup {
  agents: string[];
  rules: Array<{ directive: string; value: string }>;
}

/** Groups of `robots.txt` (consecutive User-agent lines open a group) + Sitemap lines. */
function parseRobots(text: string): { groups: RobotsGroup[]; sitemaps: string[]; raw: string } {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!match) continue;
    const directive = (match[1] ?? "").toLowerCase();
    const value = (match[2] ?? "").trim();
    if (directive === "sitemap") {
      sitemaps.push(value);
      continue;
    }
    if (directive === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    current?.rules.push({ directive, value });
  }
  return { groups, sitemaps, raw: text };
}

/** `Disallow: /` (the whole site) in the group of `agent`. */
function blocksEverything(robots: ReturnType<typeof parseRobots>, agent: string): boolean {
  const group = robots.groups.find((g) => g.agents.includes(agent));
  return Boolean(group?.rules.some((r) => r.directive === "disallow" && r.value === "/"));
}

function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decodeEntities(m[1] ?? ""));
}

/* ------------------------------------------------------------------------------------------ */
/* Checks                                                                                     */
/* ------------------------------------------------------------------------------------------ */

type Status = "PASS" | "FAIL" | "WARN" | "SKIP";

interface CheckResult {
  status: Status;
  details: string[];
}

interface Check {
  id: string;
  title: string;
  run: (cfg: Config) => Promise<CheckResult>;
}

/** Accumulates findings of one check; the worst one wins. */
class Findings {
  private readonly lines: string[] = [];
  private worst: Status = "PASS";

  pass(line: string) {
    this.lines.push(`ok   ${line}`);
  }
  warn(line: string) {
    this.lines.push(`warn ${line}`);
    if (this.worst === "PASS") this.worst = "WARN";
  }
  fail(line: string) {
    this.lines.push(`FAIL ${line}`);
    this.worst = "FAIL";
  }
  expect(condition: boolean, line: string, failure = line) {
    if (condition) this.pass(line);
    else this.fail(failure);
  }
  result(): CheckResult {
    return { status: this.worst, details: this.lines };
  }
}

const skip = (reason: string): CheckResult => ({ status: "SKIP", details: [reason] });
const isHttps = (cfg: Config) => cfg.base.protocol === "https:";
const isProduction = (cfg: Config) => cfg.expectEnv === "production";
const isRedirect = (status: number) => status === 301 || status === 308;

const CHECKS: Check[] = [
  {
    id: "http-redirect",
    title: "HTTP → HTTPS одним редиректом",
    async run(cfg) {
      if (!isHttps(cfg)) return skip("стенд по http://");
      const found = new Findings();
      const httpUrl = new URL(cfg.base);
      httpUrl.protocol = "http:";
      httpUrl.port = "";
      const response = await rawRequest(cfg, httpUrl, { auth: false });
      const location = header(response, "location");
      found.expect(
        isRedirect(response.status) && location === cfg.base.toString(),
        `${httpUrl} → ${response.status} ${location || "(нет Location)"}`
      );
      return found.result();
    },
  },
  {
    id: "www-redirect",
    title: "www → apex 301 с сохранением пути",
    async run(cfg) {
      if (!isProduction(cfg)) return skip("только production");
      if (!cfg.wwwUrl) return skip("нет www-хоста (http:// или IP)");
      const found = new Findings();
      for (const path of ["/", "/kontakty/"]) {
        const source = new URL(path, cfg.wwwUrl);
        const expected = new URL(path, cfg.base).toString();
        const response = await rawRequest(cfg, source, { auth: false });
        const location = header(response, "location");
        found.expect(
          response.status === 301 && location === expected,
          `${source} → ${response.status} ${location || "(нет Location)"}`,
          `${source} → ${response.status} ${location || "(нет Location)"}, ожидалось 301 ${expected}`
        );
      }
      return found.result();
    },
  },
  {
    id: "tls",
    title: "TLS: доверенная цепочка, срок, SAN",
    async run(cfg) {
      if (!isHttps(cfg)) return skip("стенд по http://");
      const found = new Findings();
      // Each host is checked over its own TLS connection (SNI = that host): Dokploy (Traefik +
      // Let's Encrypt) issues a separate certificate per domain, so the apex certificate is not
      // required to list www — what matters is that each name is served a valid certificate.
      const targets = [cfg.base, ...(isProduction(cfg) && cfg.wwwUrl ? [cfg.wwwUrl] : [])];
      for (const target of targets) {
        await checkHostCertificate(cfg, target, found);
      }
      return found.result();
    },
  },
  {
    id: "headers",
    title: "Заголовки безопасности (HSTS, X-Frame-Options, nosniff)",
    async run(cfg) {
      const found = new Findings();
      const home = await get(cfg, "/");
      if (isHttps(cfg)) {
        const hsts = header(home, "strict-transport-security");
        const maxAge = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? 0);
        const line = `Strict-Transport-Security: ${hsts || "(нет)"}`;
        const verdict = hstsVerdict(maxAge, cfg.hstsMinAge);
        if (verdict === "pass") {
          found.pass(line);
        } else if (verdict === "warn" || !isProduction(cfg)) {
          // A rollout step (300 s → 1 week → 1 year, docs/deploy.md §5) is not a failure.
          found.warn(`${line} — max-age < ${ONE_YEAR_SECONDS}: поднять до 1 года после проверки`);
        } else if (maxAge > 0 && cfg.hstsMinAge !== null) {
          found.fail(`${line} — нужен max-age ≥ ${cfg.hstsMinAge} (SMOKE_HSTS_MIN_AGE)`);
        } else {
          found.fail(`${line} — HSTS отсутствует или max-age=0`);
        }
        if (/\bpreload\b/i.test(hsts))
          found.warn("HSTS с preload — по решению задачи 41 не включать");
      } else {
        found.pass("HSTS не проверяется на http://");
      }
      const xfo = header(home, "x-frame-options");
      found.expect(xfo.toUpperCase() === "SAMEORIGIN", `X-Frame-Options: ${xfo || "(нет)"}`);
      const nosniff = header(home, "x-content-type-options");
      found.expect(
        nosniff.toLowerCase() === "nosniff",
        `X-Content-Type-Options: ${nosniff || "(нет)"}`
      );
      return found.result();
    },
  },
  {
    id: "health",
    title: "/api/health/ и /admin/",
    async run(cfg) {
      const found = new Findings();
      const health = await get(cfg, "/api/health/", { auth: false });
      let body: { status?: unknown; release?: unknown } = {};
      try {
        body = JSON.parse(health.body) as typeof body;
      } catch {
        // reported below
      }
      found.expect(
        health.status === 200 && body.status === "ok",
        `/api/health/ → ${health.status} ${health.body.slice(0, 120)}`
      );
      if (cfg.expectRelease) {
        found.expect(
          body.release === cfg.expectRelease,
          `release = ${String(body.release)}`,
          `release = ${String(body.release)}, ожидался ${cfg.expectRelease}`
        );
      }
      const admin = await get(cfg, "/admin/", { auth: false, follow: true });
      found.expect(admin.status === 200, `/admin/ → ${admin.status} (${admin.url})`);
      found.expect(
        !STACK_TRACE.test(admin.body),
        "нет стек-трейсов в /admin/",
        "стек-трейс в /admin/"
      );
      return found.result();
    },
  },
  {
    id: "robots-sitemap",
    title: "robots.txt и sitemap.xml",
    async run(cfg) {
      const found = new Findings();
      const robotsResponse = await get(cfg, "/robots.txt");
      found.expect(robotsResponse.status === 200, `/robots.txt → ${robotsResponse.status}`);
      const robots = parseRobots(robotsResponse.body);
      const expectedSitemap = new URL("/sitemap.xml", cfg.base).toString();
      const sitemap = await get(cfg, "/sitemap.xml");
      const locs = sitemapLocs(sitemap.body);
      found.expect(sitemap.status === 200, `/sitemap.xml → ${sitemap.status}`);

      if (isProduction(cfg)) {
        found.expect(
          !blocksEverything(robots, "*"),
          "User-agent: * не закрыт целиком",
          "User-agent: * → Disallow: / (staging-конфиг!)"
        );
        found.expect(
          robots.sitemaps.includes(expectedSitemap),
          `Sitemap: ${expectedSitemap}`,
          `нет строки Sitemap: ${expectedSitemap}`
        );
        found.expect(/^\s*Clean-param:/im.test(robots.raw), "есть Clean-param", "нет Clean-param");
        found.expect(
          locs.length >= cfg.minSitemapUrls,
          `<loc>: ${locs.length}`,
          `<loc>: ${locs.length} (< ${cfg.minSitemapUrls})`
        );
        const foreign = locs.filter((loc) => !loc.startsWith(cfg.base.origin + "/"));
        found.expect(
          foreign.length === 0,
          `все <loc> на ${cfg.base.origin}`,
          `чужие <loc>: ${foreign.slice(0, 3).join(", ")}`
        );
        found.expect(
          !/staging/i.test(sitemap.body),
          "нет «staging» в sitemap",
          "«staging» в sitemap"
        );
      } else {
        found.expect(
          blocksEverything(robots, "*"),
          "User-agent: * → Disallow: / (закрыт)",
          "robots.txt не закрывает сайт на не-production стенде"
        );
        found.expect(
          robots.sitemaps.length === 0,
          "без строки Sitemap",
          "Sitemap в robots.txt на не-production стенде"
        );
        found.expect(
          locs.length === 0,
          "sitemap пустой",
          `sitemap содержит ${locs.length} URL на не-production стенде`
        );
      }
      return found.result();
    },
  },
  {
    id: "key-pages",
    title: "Ключевые страницы: 200, один h1, индексация",
    async run(cfg) {
      const found = new Findings();
      for (const path of KEY_PATHS) {
        const page = await get(cfg, path);
        const h1 = h1Count(page.body);
        const noindex = isNoindex(page);
        const indexOk = isProduction(cfg) ? !noindex : noindex;
        const line = `${path} → ${page.status}, h1×${h1}, ${noindex ? "noindex" : "index"}`;
        found.expect(page.status === 200 && h1 === 1 && indexOk, line);
      }
      return found.result();
    },
  },
  {
    id: "noindex-pages",
    title: "Служебные страницы закрыты от индексации",
    async run(cfg) {
      const found = new Findings();
      for (const path of NOINDEX_PATHS) {
        const page = await get(cfg, path);
        found.expect(
          page.status === 200 && isNoindex(page),
          `${path} → ${page.status}, ${isNoindex(page) ? "noindex" : "INDEX"}`
        );
      }
      // A random token that cannot be valid (43 base64url chars, like real ones).
      const token = randomBytes(32).toString("base64url");
      const order = await get(cfg, `/zakaz/${token}/`);
      const invalidShown = order.status === 404 || /Ссылка больше не действует/.test(order.body);
      found.expect(
        invalidShown && isNoindex(order),
        `/zakaz/<случайный>/ → ${order.status}, ${isNoindex(order) ? "noindex" : "INDEX"}`
      );
      return found.result();
    },
  },
  {
    id: "no-staging",
    title: "Нет признаков staging / basic auth",
    async run(cfg) {
      const found = new Findings();
      const anonymous = await get(cfg, "/", { auth: false });
      if (isProduction(cfg)) {
        found.expect(
          anonymous.status === 200 && !header(anonymous, "www-authenticate"),
          `/ без авторизации → ${anonymous.status}`,
          `/ без авторизации → ${anonymous.status} ${header(anonymous, "www-authenticate")} (basic auth на prod!)`
        );
        const text = withoutScripts(anonymous.body);
        const mention = /staging|dev\.inexglass\.ru/i.exec(text)?.[0];
        found.expect(!mention, "нет «staging» в HTML", `в HTML найдено «${mention}»`);
        const canonical = canonicalOf(anonymous.body);
        found.expect(
          canonical === cfg.base.toString(),
          `canonical главной: ${canonical}`,
          `canonical главной: ${canonical ?? "(нет)"}, ожидался ${cfg.base}`
        );
        const foreignLinks = startTags(text, "a")
          .map((a) => a.href ?? "")
          .filter((href) => /inexglass\.ru/i.test(href) && !href.startsWith(cfg.base.origin));
        found.expect(
          foreignLinks.length === 0,
          "ссылки только на основной домен",
          `ссылки на другой хост: ${foreignLinks.slice(0, 3).join(", ")}`
        );
      } else if (cfg.expectEnv === "staging") {
        found.expect(
          anonymous.status === 401,
          `/ без авторизации → 401 (basic auth включён)`,
          `/ без авторизации → ${anonymous.status}: staging открыт без basic auth`
        );
      } else {
        found.pass(`development: / → ${anonymous.status}`);
      }
      return found.result();
    },
  },
  {
    id: "private-api",
    title: "Приватные коллекции и служебные пути закрыты",
    async run(cfg) {
      const found = new Findings();
      for (const slug of PRIVATE_COLLECTIONS) {
        const response = await get(cfg, `/api/${slug}/`, { auth: false, follow: true });
        found.expect(
          response.status === 401 || response.status === 403,
          `/api/${slug}/ → ${response.status}`,
          `/api/${slug}/ → ${response.status} (ожидалось 401/403)`
        );
      }
      if (isProduction(cfg)) {
        for (const path of PRODUCTION_404_PATHS) {
          const response = await get(cfg, path, { auth: false });
          found.expect(
            response.status === 404,
            `${path} → ${response.status}`,
            `${path} → ${response.status} (ожидался 404)`
          );
        }
      }
      return found.result();
    },
  },
  {
    id: "upload",
    title: "Публичная загрузка /api/upload/ доступна",
    async run(cfg) {
      const found = new Findings();
      const response = await get(cfg, "/api/upload/", { method: "OPTIONS", auth: false });
      found.expect(
        response.status !== 404 && response.status < 500,
        `OPTIONS /api/upload/ → ${response.status}`,
        `OPTIONS /api/upload/ → ${response.status} (маршрут недоступен)`
      );
      found.warn("запись в том /data/lead-files health не проверяет — ручной пункт чек-листа");
      return found.result();
    },
  },
  {
    id: "lead",
    title: "Заявки: выдача form-token (--with-lead)",
    async run(cfg) {
      if (!cfg.withLead) return skip("выключено (флаг --with-lead); заявку проверяет человек");
      const found = new Findings();
      const response = await get(cfg, "/api/form-token/", {
        method: "POST",
        auth: false,
        headers: { "Content-Type": "application/json", Origin: cfg.base.origin },
      });
      let ok = false;
      try {
        const body = JSON.parse(response.body) as { ok?: unknown; token?: unknown };
        ok = body.ok === true && typeof body.token === "string";
      } catch {
        // reported below
      }
      found.expect(response.status === 200 && ok, `POST /api/form-token/ → ${response.status}`);
      found.warn(
        "тестовая заявка не отправляется скриптом — отправить вручную с пометкой SMOKE и удалить"
      );
      return found.result();
    },
  },
  {
    id: "consent",
    title: "Метрика только после согласия, cookie-баннер",
    async run(cfg) {
      const found = new Findings();
      const home = await get(cfg, "/");
      const html = home.body;
      const metrikaTag =
        /<script[^>]*mc\.yandex\.(?:ru|com)|<link[^>]*mc\.yandex\.(?:ru|com)/i.test(html);
      found.expect(
        !metrikaTag,
        "в серверном HTML нет mc.yandex.ru",
        "mc.yandex.ru подключается до согласия"
      );
      if (!cfg.browser) {
        found.warn("баннер рендерится на клиенте — проверка в браузере: --browser (или e2e)");
        return found.result();
      }
      await browserConsentCheck(cfg, found);
      return found.result();
    },
  },
  {
    id: "ttfb",
    title: "TTFB главной",
    async run(cfg) {
      const found = new Findings();
      await get(cfg, "/"); // warm-up (ISR / data cache)
      const samples: number[] = [];
      for (let index = 0; index < TTFB_SAMPLES; index += 1)
        samples.push((await get(cfg, "/")).ttfbMs);
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)] ?? 0;
      const line = `медиана ${median} мс (${samples.join(", ")})`;
      if (median < cfg.ttfbWarnMs) found.pass(line);
      else found.warn(`${line} ≥ ${cfg.ttfbWarnMs} мс`);
      return found.result();
    },
  },
];

/* ------------------------------------------------------------------------------------------ */
/* TLS and browser helpers                                                                    */
/* ------------------------------------------------------------------------------------------ */

interface PeerCertificate {
  authorized: boolean;
  error: string;
  validTo: string;
  dnsNames: string[];
}

/**
 * HSTS max-age verdict. Missing header / max-age=0 → "fail"; below an explicitly enforced minimum
 * (SMOKE_HSTS_MIN_AGE) → "fail"; otherwise below one year → "warn" (a staged rollout); else "pass".
 */
function hstsVerdict(maxAge: number, enforcedMin: number | null): "pass" | "warn" | "fail" {
  if (!(maxAge > 0)) return "fail";
  if (enforcedMin !== null && maxAge < enforcedMin) return "fail";
  return maxAge >= ONE_YEAR_SECONDS ? "pass" : "warn";
}

/** Chain, expiry and SAN of the certificate served for `target`'s own host name (SNI). */
async function checkHostCertificate(cfg: Config, target: URL, found: Findings): Promise<void> {
  const host = target.hostname;
  let cert: PeerCertificate;
  try {
    cert = await peerCertificate(host, Number(target.port || 443), cfg.timeoutMs);
  } catch (error) {
    found.fail(`${host}: TLS-соединение не установлено: ${(error as Error).message}`);
    return;
  }
  found.expect(
    cert.authorized,
    `${host}: цепочка доверенная`,
    `${host}: цепочка НЕ доверенная: ${cert.error}`
  );
  const daysLeft = Math.floor((Date.parse(cert.validTo) - Date.now()) / DAY_MS);
  found.expect(
    daysLeft > cfg.certMinDays,
    `${host}: действует до ${cert.validTo} (${daysLeft} дн.)`,
    `${host}: истекает ${cert.validTo}: осталось ${daysLeft} дн. (< ${cfg.certMinDays})`
  );
  found.expect(
    sanCovers(cert.dnsNames, host),
    `${host}: SAN покрывает имя`,
    `${host}: SAN без ${host} (${cert.dnsNames.join(", ") || "пусто"})`
  );
}

/** Exact SAN entry or a one-label wildcard (`*.example.ru` covers `www.example.ru` only). */
function sanCovers(dnsNames: readonly string[], host: string): boolean {
  const name = host.toLowerCase();
  return dnsNames.some(
    (entry) =>
      entry === name ||
      (entry.startsWith("*.") && name.slice(name.indexOf(".") + 1) === entry.slice(2))
  );
}

/** Leaf certificate as served for `host` (SNI), with Node's chain verification result. */
function peerCertificate(host: string, port: number, timeoutMs: number): Promise<PeerCertificate> {
  return new Promise((resolve, reject) => {
    // rejectUnauthorized:false only to REPORT the verification error instead of a bare reset;
    // `authorized` below is the verdict.
    const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false });
    socket.setTimeout(timeoutMs, () => socket.destroy(new Error(`TLS таймаут ${timeoutMs} мс`)));
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate();
      const dnsNames = (cert.subjectaltname ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.startsWith("DNS:"))
        .map((entry) => entry.slice("DNS:".length).toLowerCase());
      resolve({
        authorized: socket.authorized,
        error: socket.authorizationError ? String(socket.authorizationError) : "",
        validTo: cert.valid_to ?? "",
        dnsNames,
      });
      socket.end();
    });
    socket.once("error", reject);
  });
}

/** Cookie banner visible; no Metrika request before «Принять»; Metrika after it (warn if not). */
async function browserConsentCheck(cfg: Config, found: Findings): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  try {
    const [user, pass] = cfg.basicAuth ? cfg.basicAuth.split(/:(.*)/s) : [];
    const context = await browser.newContext(
      user && pass ? { httpCredentials: { username: user, password: pass } } : {}
    );
    const page = await context.newPage();
    const metrikaRequests: string[] = [];
    page.on("request", (request) => {
      if (/mc\.yandex\.(ru|com)/.test(request.url())) metrikaRequests.push(request.url());
    });
    await page.goto(cfg.base.toString(), { waitUntil: "networkidle" });
    const banner = page.getByRole("region", { name: "Уведомление о cookie" });
    const visible = await banner.isVisible().catch(() => false);
    found.expect(visible, "cookie-баннер показан", "cookie-баннер не найден");
    found.expect(
      metrikaRequests.length === 0,
      "до согласия запросов к mc.yandex.ru нет",
      `до согласия: ${metrikaRequests[0]}`
    );
    if (visible) {
      await banner.getByRole("button", { name: "Принять" }).click();
      await page.waitForLoadState("networkidle");
      if (metrikaRequests.length > 0) found.pass("после «Принять» Метрика загружена");
      else
        found.warn("после «Принять» Метрика не загрузилась (ID счётчика задан в site-settings?)");
    }
  } finally {
    await browser.close();
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Runner                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function selected(cfg: Config, check: Check): boolean {
  if (cfg.skip.has(check.id)) return false;
  return cfg.only ? cfg.only.has(check.id) : true;
}

function writeSummary(cfg: Config, rows: Array<{ check: Check } & CheckResult>): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const escape = (text: string) => text.replace(/\|/g, "\\|");
  const lines = [
    `### Smoke ${cfg.base.origin} (${cfg.expectEnv})`,
    "",
    "| Статус | Проверка | Детали |",
    "| --- | --- | --- |",
    ...rows.map(
      (row) =>
        `| ${row.status} | ${escape(row.check.title)} | ${escape(row.details.join("<br>"))} |`
    ),
    "",
  ];
  appendFileSync(file, lines.join("\n"));
}

async function main(): Promise<number> {
  const cfg = readConfig(process.argv.slice(2));
  if (cfg.list) {
    for (const check of CHECKS) console.log(`${check.id.padEnd(16)} ${check.title}`);
    return 0;
  }
  const unknown = [...(cfg.only ?? []), ...cfg.skip].filter(
    (id) => !CHECKS.some((c) => c.id === id)
  );
  if (unknown.length > 0)
    throw new Error(`неизвестные проверки: ${unknown.join(", ")} (см. --list)`);

  console.log(`smoke: ${cfg.base.origin} (ожидается ${cfg.expectEnv})\n`);
  const rows: Array<{ check: Check } & CheckResult> = [];
  for (const check of CHECKS) {
    let result: CheckResult;
    if (!selected(cfg, check)) result = skip("отключено --only/--skip");
    else {
      try {
        result = await check.run(cfg);
      } catch (error) {
        result = {
          status: "FAIL",
          details: [`ошибка: ${error instanceof Error ? error.message : String(error)}`],
        };
      }
    }
    rows.push({ check, ...result });
    console.log(`${result.status.padEnd(4)}  [${check.id}] ${check.title}`);
    for (const line of result.details) console.log(`        ${line}`);
  }

  const count = (status: Status) => rows.filter((row) => row.status === status).length;
  console.log(
    `\nитого: PASS ${count("PASS")}, WARN ${count("WARN")}, FAIL ${count("FAIL")}, SKIP ${count("SKIP")}`
  );
  writeSummary(cfg, rows);
  return count("FAIL") > 0 ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`smoke-prod: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
