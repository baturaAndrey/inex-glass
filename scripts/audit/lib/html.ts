/**
 * HTTP + HTML helpers shared by the audit scripts (task 40). Plain `fetch` (no Firecrawl, no
 * browser) and cheerio. Read-only: only GET / HEAD requests.
 */
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_TIMEOUT_MS = 30_000;
const FETCH_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1_500;

/** `BASE_URL` without a trailing slash (`--base=` wins over the env). */
export function resolveBaseUrl(argv: readonly string[] = process.argv): string {
  const flag = argv.find((arg) => arg.startsWith("--base="))?.slice("--base=".length);
  const raw = flag || process.env.BASE_URL || DEFAULT_BASE_URL;
  return new URL(raw).origin;
}

/** Origin of a URL, or `null` when it does not parse. */
function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Staging is behind basic auth: `STAGING_BASIC_AUTH=user:pass` → `Authorization` header. The
 * credentials go ONLY to the audited origin (`authOrigin`, default `resolveBaseUrl()`): never to
 * third-party hosts (og:image on a CDN, a redirect target elsewhere). The value is never printed.
 */
export function authHeaders(
  url: string,
  authOrigin: string = resolveBaseUrl()
): Record<string, string> {
  const credentials = process.env.STAGING_BASIC_AUTH;
  if (!credentials) return {};
  const target = originOf(url);
  if (target === null || target !== originOf(authOrigin)) return {};
  return { Authorization: `Basic ${Buffer.from(credentials).toString("base64")}` };
}

export interface FetchedPage {
  url: string;
  status: number;
  /** `Location` of a redirect (absolute), otherwise `null`. */
  location: string | null;
  contentType: string;
  body: string;
  /** Time to response headers, ms (TTFB proxy). */
  ttfbMs: number;
  headers: Headers;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET without following redirects (the audit checks the codes itself). Network errors and 5xx
 * are retried (Docker Postgres on Windows makes the dev server flaky); the last 5xx is returned.
 *
 * `redirect: "manual"` also keeps the basic-auth header from travelling with a redirect: a
 * caller that follows `location` makes a new `fetchPage` call, whose header is decided for the
 * new origin by `authHeaders` (`authOrigin`: the audited base URL, default `resolveBaseUrl()`).
 */
export async function fetchPage(
  url: string,
  opts: { method?: "GET" | "HEAD"; timeoutMs?: number; authOrigin?: string } = {}
): Promise<FetchedPage> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch(url, {
        method: opts.method ?? "GET",
        redirect: "manual",
        headers: { ...authHeaders(url, opts.authOrigin), "User-Agent": "inex-glass-audit/1.0" },
        signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
      const ttfbMs = Math.round(performance.now() - started);
      const body = opts.method === "HEAD" ? "" : await response.text();
      // 5xx under load (dev server + Docker Postgres ETIMEDOUT) is retried like a network error.
      if (response.status >= 500 && attempt < FETCH_ATTEMPTS) {
        lastError = new Error(`HTTP ${response.status}`);
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      const location = response.headers.get("location");
      return {
        url,
        status: response.status,
        location: location ? new URL(location, url).toString() : null,
        contentType: response.headers.get("content-type") ?? "",
        body,
        ttfbMs,
        headers: response.headers,
      };
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/** Runs `worker` over `items` with at most `limit` in flight; results keep the input order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index] as T, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export const loadHtml = (html: string): CheerioAPI => cheerio.load(html);

export interface JsonLdBlock {
  raw: string;
  /** Parsed value or `null` when the JSON is invalid (`error` is set). */
  value: unknown;
  error: string | null;
}

/** Flattens `@graph` and arrays into a list of schema.org nodes. */
export function jsonLdNodes(blocks: readonly JsonLdBlock[]): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    const node = value as Record<string, unknown>;
    if (Array.isArray(node["@graph"])) visit(node["@graph"]);
    if (node["@type"]) nodes.push(node);
  };
  blocks.forEach((block) => visit(block.value));
  return nodes;
}

export const nodeTypes = (node: Record<string, unknown>): string[] => {
  const type = node["@type"];
  return Array.isArray(type) ? type.map(String) : [String(type)];
};

export interface PageFacts {
  lang: string | null;
  title: string | null;
  titleCount: number;
  description: string | null;
  robots: string | null;
  canonical: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
  h1: string[];
  mainCount: number;
  mainHasId: boolean;
  breadcrumbs: { visible: boolean; items: string[] };
  jsonLd: JsonLdBlock[];
  images: Array<{
    src: string;
    alt: string | null;
    decorative: boolean;
    /** Inside a link that has its own text (card): an empty alt is redundant-image style. */
    inTextLink: boolean;
    hasSize: boolean;
  }>;
  links: Array<{ href: string; text: string }>;
}

const text = ($: CheerioAPI, selector: string) =>
  $(selector).first().text().replace(/\s+/g, " ").trim();

/** Everything the SEO audit reads from a page. */
export function extractFacts($: CheerioAPI): PageFacts {
  const meta = (attr: "name" | "property", key: string) =>
    $(`meta[${attr}="${key}"]`).first().attr("content")?.trim() ?? null;

  const og: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const key = $(el).attr("property");
    const value = $(el).attr("content");
    if (key && value !== undefined && !(key in og)) og[key] = value;
  });
  const twitter: Record<string, string> = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const key = $(el).attr("name");
    const value = $(el).attr("content");
    if (key && value !== undefined && !(key in twitter)) twitter[key] = value;
  });

  const jsonLd: JsonLdBlock[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    try {
      jsonLd.push({ raw, value: JSON.parse(raw), error: null });
    } catch (error) {
      jsonLd.push({ raw, value: null, error: error instanceof Error ? error.message : "invalid" });
    }
  });

  const crumbs = $('nav[aria-label="Хлебные крошки"]').first();
  const images = $("img")
    .toArray()
    .map((el) => {
      const img = $(el);
      const style = img.attr("style") ?? "";
      return {
        src: img.attr("src") ?? "",
        alt: img.attr("alt") ?? null,
        decorative:
          img.attr("role") === "presentation" ||
          img.attr("aria-hidden") === "true" ||
          img.closest('[aria-hidden="true"]').length > 0,
        inTextLink: (() => {
          const link = img.closest("a");
          return link.length > 0 && link.text().trim().length > 0;
        })(),
        // next/image `fill` sets inline absolute positioning inside a sized box (no CLS).
        hasSize:
          (img.attr("width") !== undefined && img.attr("height") !== undefined) ||
          /aspect-ratio|position:\s*absolute/.test(style) ||
          img.attr("data-nimg") === "fill",
      };
    });

  return {
    lang: $("html").attr("lang") ?? null,
    title: $("head title").length ? text($, "head title") : null,
    titleCount: $("head title").length,
    description: meta("name", "description"),
    robots: meta("name", "robots"),
    canonical: $('link[rel="canonical"]').first().attr("href") ?? null,
    og,
    twitter,
    h1: $("h1")
      .toArray()
      .map((el) => $(el).text().replace(/\s+/g, " ").trim()),
    mainCount: $("main").length,
    mainHasId: $("main#main-content").length === 1,
    breadcrumbs: {
      visible: crumbs.length > 0 && !crumbs.closest("[hidden]").length,
      items: crumbs
        .find("li")
        .toArray()
        .map((el) => $(el).text().replace(/\s+/g, " ").trim()),
    },
    jsonLd,
    images,
    links: $("a[href]")
      .toArray()
      .map((el) => ({
        href: $(el).attr("href") ?? "",
        text: $(el).text().replace(/\s+/g, " ").trim(),
      })),
  };
}

/** Block-level tags: their boundaries separate text segments (paragraph-level context). */
export const BLOCK_SELECTOR =
  "p, li, h1, h2, h3, h4, h5, h6, td, th, dt, dd, blockquote, figcaption, summary, caption, label, button, legend, pre";

/** Containers that also delimit text: cards, rows and other `div`-built layouts. */
const CONTAINER_SELECTOR = `${BLOCK_SELECTOR}, div, section, article, aside, header, footer, nav, ul, ol, dl, table, tr, figure, details, form, fieldset`;

/**
 * Text segments of a container (paragraph-level units): every container without nested
 * containers gives one segment; loose inline content directly inside a non-leaf container (e.g.
 * a price `<span>` in a card footer `<div>` that also holds a `<p>`) gives one more.
 * `script/style/noscript/template` are removed first.
 */
export function textSegments($: CheerioAPI, rootSelector: string) {
  const root = $(rootSelector);
  root.find("script, style, noscript, template").remove();
  const segments: Array<{ text: string; el: ReturnType<CheerioAPI> }> = [];
  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  root.find(CONTAINER_SELECTOR).each((_, el) => {
    const node = $(el);
    if (node.find(CONTAINER_SELECTOR).length === 0) {
      const value = clean(node.text());
      if (value) segments.push({ text: value, el: node });
      return;
    }
    const loose = node
      .contents()
      .toArray()
      .filter(
        (child) =>
          child.type === "text" || (child.type === "tag" && !$(child).is(CONTAINER_SELECTOR))
      )
      .map((child) => $(child).text())
      .join(" ");
    const value = clean(loose);
    if (value) segments.push({ text: value, el: node });
  });
  return segments;
}
