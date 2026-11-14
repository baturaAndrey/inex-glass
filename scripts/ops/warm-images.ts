/**
 * Warms the Next image optimizer cache for the home hero after a deploy: the first visitor of a
 * new release would otherwise wait for the AVIF encode of the LCP photo (seconds at 1920 px).
 * Best effort and read-only: always exits 0, prints one line per request.
 *
 *   SITE=https://inexglass.ru node scripts/ops/warm-images.ts
 *   SITE=https://dev.inexglass.ru WARM_BASIC_AUTH=user:pass node scripts/ops/warm-images.ts
 *
 * Environment:
 *   SITE              origin of the stand (required; a path is ignored)
 *   WARM_BASIC_AUTH   user:pass of the staging basic auth (sent with every request)
 *   WARM_TIMEOUT_MS   default 30000 (per request)
 *
 * How: fetch `/`, take the srcset of the hero `<link rel="preload" as="image">` (PageHero preloads
 * the home photo), and request every `/_next/image/` candidate twice — with an AVIF and with a
 * WebP-only `Accept`, because the optimizer caches each output format separately.
 *
 * No dependencies beyond Node built-ins (global `fetch`); runs with Node's type stripping.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

/** Accept headers of modern browsers (AVIF) and of WebP-only ones (older Safari). */
const ACCEPT_VARIANTS = [
  { label: "avif", accept: "image/avif,image/webp,*/*" },
  { label: "webp", accept: "image/webp,*/*" },
] as const;

const USER_AGENT = "inex-glass-warm-images/1.0 (+docs/deploy.md)";

interface Config {
  base: URL;
  authHeader: string | null;
  timeoutMs: number;
}

function readConfig(): Config {
  const site = process.env.SITE?.trim();
  if (!site) throw new Error("SITE не задан (например, SITE=https://inexglass.ru)");
  const base = new URL(site);
  base.pathname = "/";
  base.search = "";
  base.hash = "";

  const basicAuth = process.env.WARM_BASIC_AUTH?.trim() || null;
  if (basicAuth !== null && !/^[^:]+:.+$/.test(basicAuth)) {
    throw new Error("WARM_BASIC_AUTH: ожидается формат user:pass");
  }

  const rawTimeout = Number(process.env.WARM_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const timeoutMs =
    Number.isInteger(rawTimeout) && rawTimeout > 0 ? rawTimeout : DEFAULT_TIMEOUT_MS;

  return {
    base,
    authHeader: basicAuth ? `Basic ${Buffer.from(basicAuth).toString("base64")}` : null,
    timeoutMs,
  };
}

function request(cfg: Config, url: URL, accept: string): Promise<Response> {
  const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: accept };
  if (cfg.authHeader) headers.Authorization = cfg.authHeader;
  return fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(cfg.timeoutMs) });
}

/** Decodes the HTML entities React emits inside attribute values. */
function decodeAttribute(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Value of one attribute of a tag (case-insensitive name, single or double quotes). */
function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(tag);
  if (!match) return null;
  return decodeAttribute(match[2] ?? match[3] ?? "");
}

/**
 * Candidate URLs of the first image preload with a srcset (the hero; React hoists it into
 * `<head>` as `imageSrcSet`). Falls back to the first `<img>` with an `/_next/image` srcset.
 */
export function heroCandidates(html: string, base: URL): URL[] {
  const preload = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .find(
      (tag) =>
        /\brel\s*=\s*["']?preload/i.test(tag) &&
        /\bas\s*=\s*["']?image/i.test(tag) &&
        attribute(tag, "imagesrcset") !== null
    );
  const img = preload
    ? null
    : [...html.matchAll(/<img\b[^>]*>/gi)]
        .map((match) => match[0])
        .find((tag) => attribute(tag, "srcset")?.includes("/_next/image") ?? false);
  const srcset = preload
    ? attribute(preload, "imagesrcset")
    : img
      ? attribute(img, "srcset")
      : null;
  if (!srcset) return [];

  // Candidates are "<url> <width>w" separated by commas; `/_next/image` URLs contain no commas
  // or spaces (the source path is percent-encoded), so a plain split is safe.
  const urls = srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter((url): url is string => Boolean(url))
    .map((url) => new URL(url, base))
    .filter((url) => url.origin === base.origin);
  return [...new Map(urls.map((url) => [url.href, url])).values()];
}

async function warmOne(cfg: Config, url: URL, label: string, accept: string): Promise<void> {
  const width = url.searchParams.get("w") ?? "?";
  const started = performance.now();
  try {
    const response = await request(cfg, url, accept);
    const bytes = (await response.arrayBuffer()).byteLength;
    const ms = Math.round(performance.now() - started);
    const type = response.headers.get("content-type") ?? "-";
    const cache = response.headers.get("x-nextjs-cache") ?? "-";
    console.log(
      `w=${width.padStart(4)} ${label} ${response.status} ${String(bytes).padStart(7)} B ${type} cache=${cache} ${ms} ms`
    );
  } catch (error) {
    console.log(`w=${width.padStart(4)} ${label} ERROR ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  const cfg = readConfig();
  const page = await request(cfg, cfg.base, "text/html");
  if (!page.ok) {
    console.log(`warm-images: ${cfg.base.href} → ${page.status}, прогрев пропущен`);
    return;
  }
  const candidates = heroCandidates(await page.text(), cfg.base);
  if (candidates.length === 0) {
    console.log("warm-images: srcset hero-изображения не найден, прогрев пропущен");
    return;
  }
  console.log(`warm-images: ${candidates.length} кандидатов srcset на ${cfg.base.href}`);
  // Sequential on purpose: parallel AVIF encodes of a 2.7k photo would load the fresh container.
  for (const url of candidates) {
    for (const variant of ACCEPT_VARIANTS) {
      await warmOne(cfg, url, variant.label, variant.accept);
    }
  }
}

// Best effort: a failed warm-up must never fail a deploy.
try {
  await main();
} catch (error) {
  console.log(`warm-images: ${(error as Error).message}`);
}
