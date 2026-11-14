/**
 * SEO audit by URL (task 40, §3): availability and URL form, coverage of 17-meta, H1 / title /
 * description vs 17-meta, robots, canonical, breadcrumbs, JSON-LD, Open Graph, images, links,
 * structure and TTFB. Only HTTP (fetch + cheerio); never writes to the site.
 *
 *   pnpm audit:seo                                  # BASE_URL or http://localhost:3000
 *   pnpm audit:seo --base=http://localhost:3140     # e.g. a local `next start`
 *
 * Options / env:
 * - `--site-url=<url>` (or `AUDIT_SITE_URL`) — the stand's `SITE_URL` for canonical / og:url
 *   (defaults to the base URL);
 * - `--expect-env=production|staging` — robots expectations; by default detected from the home
 *   page (outside production every page is `noindex, nofollow` and the sitemap is empty);
 * - `AUDIT_ORDER_TOKEN` — a fixture order token: `/zakaz/<token>/` is audited too;
 * - `STAGING_BASIC_AUTH=user:pass` — basic auth for staging.
 *
 * Output: `docs/reports/seo-audit.md` + `scripts/audit/out/seo.json`. Exit code 1 on `error`.
 */
import path from "node:path";
import { formatPrice } from "@/lib/domain/format";
import { DEFAULT_STALE_AFTER_DAYS, SEED_PRICES_2026_10_15 } from "@/lib/domain/prices";
import type { PricesInput } from "@/lib/domain/prices";
import {
  extractFacts,
  fetchPage,
  jsonLdNodes,
  loadHtml,
  mapLimit,
  nodeTypes,
  resolveBaseUrl,
} from "./lib/html";
import type { FetchedPage, PageFacts } from "./lib/html";
import { loadMetaRegistry, normalizeMetaText } from "./lib/meta-registry";
import type { MetaRegistry, RegistryEntry } from "./lib/meta-registry";
import {
  argValue,
  countBySeverity,
  findingsTable,
  mdTable,
  reportTimestamp,
  sortFindings,
  writeJson,
  writeText,
} from "./lib/report";
import type { Finding, Severity } from "./lib/report";
import {
  collectAuditUrls,
  discoverListing,
  isNoindexPath,
  knownExtraReason,
  NO_CANONICAL_PATHS,
  NOT_FOUND_PATH,
  pathOnly,
  TEAM_PATH,
} from "./urls";
import type { AuditUrl } from "./urls";

const REPORT_FILE = path.join("docs", "reports", "seo-audit.md");
const OUT_FILE = path.join("scripts", "audit", "out", "seo.json");
const CONCURRENCY = 4;
const TITLE_MAX = 65;
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 160;
const TTFB_WARN_MS = 600;
const REDIRECT_SAMPLE = 12;
const LISTING_PATHS: ReadonlySet<string> = new Set(["/obekty/", "/blog/"]);
const NOT_FOUND_H1 = "Страница не найдена";
const HOME_H1 = "Закалённое стекло и стеклянные конструкции для ваших проектов";

/** External hosts the site may link to (checked by host only, no network). */
const EXTERNAL_HOSTS = [
  /(^|\.)inex\.su$/,
  /^t\.me$/,
  /^wa\.me$/,
  /^api\.whatsapp\.com$/,
  /(^|\.)max\.ru$/,
  /(^|\.)yandex\.(ru|com)$/,
  /^ya\.ru$/,
  /(^|\.)vk\.com$/,
];

/** Columns of the «URL × checks» matrix. */
const CHECKS = [
  "http",
  "url",
  "h1",
  "title",
  "description",
  "robots",
  "canonical",
  "breadcrumbs",
  "jsonld",
  "og",
  "images",
  "structure",
  "ttfb",
] as const;
type Check = (typeof CHECKS)[number];

type StandEnv = "production" | "non-production";

interface PageResult {
  path: string;
  status: number | null;
  ttfbMs: number | null;
  facts: PageFacts | null;
  failed: Set<Check>;
  warned: Set<Check>;
}

interface Context {
  baseUrl: string;
  siteUrl: string;
  env: StandEnv;
  prices: PricesInput;
  pricesSource: string;
  teamEmpty: boolean | null;
  findings: Finding[];
  metaDiffs: Array<{ path: string; field: string; expected: string; actual: string }>;
}

function add(
  ctx: Context,
  result: PageResult | null,
  check: Check | null,
  severity: Severity,
  target: string,
  message: string,
  fragment?: string
) {
  ctx.findings.push({
    severity,
    rule: check ?? "site",
    target,
    field: check ?? "—",
    message,
    ...(fragment ? { fragment } : {}),
  });
  if (result && check) {
    if (severity === "error") result.failed.add(check);
    else if (severity === "warn") result.warned.add(check);
  }
}

// ---------------------------------------------------------------------------------------------
// Inputs

async function loadPrices(baseUrl: string): Promise<{ prices: PricesInput; source: string }> {
  try {
    const page = await fetchPage(`${baseUrl}/api/globals/prices/?depth=0`);
    if (page.status === 200) {
      const data = JSON.parse(page.body) as {
        rows?: Array<{ thickness: number; priceFrom?: number | null; onRequest?: boolean | null }>;
        priceDate?: string | null;
        staleAfterDays?: number | null;
      };
      const items = (data.rows ?? []).map((row) => ({
        thickness: row.thickness,
        price:
          !row.onRequest && typeof row.priceFrom === "number" && row.priceFrom > 0
            ? row.priceFrom
            : null,
      }));
      if (items.length > 0) {
        return {
          prices: {
            items,
            priceDate: data.priceDate ?? null,
            staleAfterDays:
              typeof data.staleAfterDays === "number" && data.staleAfterDays > 0
                ? data.staleAfterDays
                : DEFAULT_STALE_AFTER_DAYS,
          },
          source: `${baseUrl}/api/globals/prices (дата цен ${data.priceDate?.slice(0, 10) ?? "—"})`,
        };
      }
    }
  } catch {
    // Fall through to the seed constants.
  }
  return { prices: SEED_PRICES_2026_10_15, source: "константы сида 15.10.2026 (API недоступен)" };
}

async function loadTeamEmpty(baseUrl: string): Promise<boolean | null> {
  try {
    const page = await fetchPage(`${baseUrl}/api/team/?limit=1&depth=0`);
    if (page.status !== 200) return null;
    return ((JSON.parse(page.body) as { totalDocs?: number }).totalDocs ?? 0) === 0;
  } catch {
    return null;
  }
}

async function detectEnv(baseUrl: string): Promise<StandEnv> {
  const forced = argValue("expect-env");
  if (forced) return forced === "production" ? "production" : "non-production";
  const home = await fetchPage(`${baseUrl}/`);
  const robots = extractFacts(loadHtml(home.body)).robots ?? "";
  return /noindex/.test(robots) ? "non-production" : "production";
}

// ---------------------------------------------------------------------------------------------
// Per-page checks

const robotsTokens = (value: string | null) =>
  (value ?? "")
    .toLowerCase()
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

function checkMetaField(
  ctx: Context,
  result: PageResult,
  field: "h1" | "title" | "description",
  expected: string,
  actual: string | null
) {
  if (normalizeMetaText(expected) === normalizeMetaText(actual)) return;
  ctx.metaDiffs.push({ path: result.path, field, expected, actual: actual ?? "(нет)" });
  add(
    ctx,
    result,
    field,
    "error",
    result.path,
    `${field} не совпадает с 17-meta`,
    `ожидалось: «${expected}» / фактически: «${actual ?? ""}»`
  );
}

function checkHeadings(
  ctx: Context,
  result: PageResult,
  facts: PageFacts,
  entry: RegistryEntry | null
) {
  if (facts.h1.length !== 1 || !facts.h1[0]) {
    add(
      ctx,
      result,
      "h1",
      "error",
      result.path,
      `H1: найдено ${facts.h1.length} (нужен ровно один, непустой)`,
      facts.h1.join(" | ")
    );
    return;
  }
  const expected = result.path === "/" ? HOME_H1 : entry?.h1;
  if (expected) checkMetaField(ctx, result, "h1", expected, facts.h1[0]);
}

function checkTitleDescription(
  ctx: Context,
  result: PageResult,
  facts: PageFacts,
  entry: RegistryEntry | null
) {
  const { title, description } = facts;
  if (!title) add(ctx, result, "title", "error", result.path, "Нет <title>");
  if (facts.titleCount > 1)
    add(ctx, result, "title", "error", result.path, `<title> ×${facts.titleCount}`);
  if (!description) add(ctx, result, "description", "error", result.path, "Нет meta description");
  if (entry) {
    if (title) checkMetaField(ctx, result, "title", entry.title, title);
    if (description) checkMetaField(ctx, result, "description", entry.description, description);
  }
  if (title && normalizeMetaText(title).length > TITLE_MAX) {
    add(
      ctx,
      result,
      "title",
      "warn",
      result.path,
      `title ${normalizeMetaText(title).length} знаков (> ${TITLE_MAX})`,
      title
    );
  }
  const descLength = normalizeMetaText(description).length;
  if (description && (descLength < DESCRIPTION_MIN || descLength > DESCRIPTION_MAX)) {
    add(
      ctx,
      result,
      "description",
      "warn",
      result.path,
      `description ${descLength} знаков (норма ${DESCRIPTION_MIN}–${DESCRIPTION_MAX})`,
      description
    );
  }
}

function expectedNoindex(ctx: Context, auditPath: string): boolean {
  if (isNoindexPath(auditPath)) return true;
  if (pathOnly(auditPath) === "/obekty/" && auditPath.includes("?")) return true;
  if (pathOnly(auditPath) === TEAM_PATH) return ctx.teamEmpty === true;
  return false;
}

function checkRobots(ctx: Context, result: PageResult, facts: PageFacts, inSitemap: boolean) {
  const tokens = robotsTokens(facts.robots);
  if (ctx.env === "non-production") {
    // Staging / dev: everything must be closed (task 15/36); the per-page matrix is not checkable.
    // Service pages with their own `noindex, follow` (search) are closed as well.
    if (!tokens.includes("noindex")) {
      add(
        ctx,
        result,
        "robots",
        "error",
        result.path,
        "Не-prod стенд: ожидается noindex",
        facts.robots ?? "(нет)"
      );
    }
    return;
  }
  const mustNoindex = expectedNoindex(ctx, result.path);
  if (mustNoindex) {
    if (!tokens.includes("noindex") || !tokens.includes("follow")) {
      add(
        ctx,
        result,
        "robots",
        "error",
        result.path,
        "Ожидается noindex, follow",
        facts.robots ?? "(нет)"
      );
    }
  } else if (tokens.includes("noindex")) {
    add(
      ctx,
      result,
      "robots",
      "error",
      result.path,
      inSitemap ? "noindex у страницы из sitemap" : "Неожиданный noindex",
      facts.robots ?? ""
    );
  }
}

function checkCanonical(ctx: Context, result: PageResult, facts: PageFacts) {
  const clean = pathOnly(result.path);
  const expected = `${ctx.siteUrl}${clean}`;
  if (!facts.canonical) {
    // `/poisk/`: no canonical by design (noindex + Disallow), see NO_CANONICAL_PATHS.
    if (!NO_CANONICAL_PATHS.has(clean)) {
      add(ctx, result, "canonical", "error", result.path, "Нет canonical");
    }
    return;
  }
  if (facts.canonical !== expected) {
    add(
      ctx,
      result,
      "canonical",
      "error",
      result.path,
      "canonical не равен SITE_URL + путь без query",
      `ожидалось: ${expected} / фактически: ${facts.canonical}`
    );
  }
}

/**
 * Deliberate breadcrumb shapes (allowlist): pages whose visible trail holds intermediate crumbs
 * WITHOUT a page of their own. Such a crumb is plain text and cannot be a JSON-LD `ListItem`
 * with `item` (task 15 drops it), so the trail has `textOnly` more visible crumbs than JSON-LD
 * items and one item fewer than «URL depth + 1». Exactly that shape is not reported; any other
 * mismatch on these pages still is.
 */
const TEXT_ONLY_CRUMBS: ReadonlyMap<string, { textOnly: number; reason: string }> = new Map([
  [
    "/instrumenty/kalkulyator-vesa-stekla/",
    { textOnly: 1, reason: "«Инструменты» — раздел без страницы (task 15)" },
  ],
]);

function checkBreadcrumbs(ctx: Context, result: PageResult, facts: PageFacts) {
  if (pathOnly(result.path) === "/") return;
  const textOnly = TEXT_ONLY_CRUMBS.get(pathOnly(result.path))?.textOnly ?? 0;
  const nodes = jsonLdNodes(facts.jsonLd).filter((node) =>
    nodeTypes(node).includes("BreadcrumbList")
  );
  if (!facts.breadcrumbs.visible)
    add(
      ctx,
      result,
      "breadcrumbs",
      "error",
      result.path,
      'Нет видимых крошек nav[aria-label="Хлебные крошки"]'
    );
  if (nodes.length !== 1) {
    add(
      ctx,
      result,
      "breadcrumbs",
      "error",
      result.path,
      `BreadcrumbList в JSON-LD: ${nodes.length}`
    );
    return;
  }
  const items = ((nodes[0]?.itemListElement as unknown[]) ?? []) as Array<Record<string, unknown>>;
  items.forEach((item, index) => {
    if (item.position !== index + 1) {
      add(
        ctx,
        result,
        "breadcrumbs",
        "error",
        result.path,
        `BreadcrumbList: position ${String(item.position)} вместо ${index + 1}`
      );
    }
    const isLast = index === items.length - 1;
    const url =
      typeof item.item === "string"
        ? item.item
        : (item.item as { "@id"?: string } | undefined)?.["@id"];
    if (url !== undefined && !/^https?:\/\//.test(url)) {
      add(
        ctx,
        result,
        "breadcrumbs",
        "error",
        result.path,
        `BreadcrumbList: item не абсолютный (${url})`
      );
    } else if (url === undefined && !isLast) {
      add(
        ctx,
        result,
        "breadcrumbs",
        "warn",
        result.path,
        `BreadcrumbList: у элемента ${index + 1} нет item`
      );
    }
  });
  const visible = facts.breadcrumbs.items;
  if (visible.length && items.length + textOnly !== visible.length) {
    // A crumb without a page («Инструменты») is plain text and cannot be a ListItem with `item`
    // (task 15 drops it from JSON-LD) — reported as warn, not error.
    add(
      ctx,
      result,
      "breadcrumbs",
      items.length < visible.length ? "warn" : "error",
      result.path,
      `Крошки: видимых ${visible.length}, в JSON-LD ${items.length}`
    );
  }
  const depth = pathOnly(result.path).split("/").filter(Boolean).length;
  if (items.length + textOnly !== depth + 1) {
    add(
      ctx,
      result,
      "breadcrumbs",
      "warn",
      result.path,
      `Крошек ${items.length}, глубина URL + 1 = ${depth + 1}`
    );
  }
  const lastName = normalizeMetaText(String(items.at(-1)?.name ?? ""));
  const lastVisible = normalizeMetaText(visible.at(-1) ?? "");
  if (lastVisible && lastName !== lastVisible) {
    add(
      ctx,
      result,
      "breadcrumbs",
      "error",
      result.path,
      "Последняя крошка JSON-LD ≠ видимой",
      `${lastName} / ${lastVisible}`
    );
  }
}

/** Empty strings, `undefined`, `NaN`, `[object Object]`, `{…}` markers anywhere in JSON-LD. */
function badJsonLdValues(value: unknown, at = "$"): string[] {
  if (typeof value === "string") {
    if (!value.trim()) return [`${at}: пустая строка`];
    if (/undefined|NaN|\[object Object\]/.test(value)) return [`${at}: «${value}»`];
    if (/\{[^{}\s][^{}]*\}/.test(value)) return [`${at}: метка в «${value}»`];
    return [];
  }
  if (typeof value === "number") return Number.isFinite(value) ? [] : [`${at}: ${value}`];
  if (value === null) return [`${at}: null`];
  if (Array.isArray(value)) {
    return value.length === 0
      ? [`${at}: пустой массив`]
      : value.flatMap((v, i) => badJsonLdValues(v, `${at}[${i}]`));
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => badJsonLdValues(v, `${at}.${k}`));
  }
  return [];
}

function checkJsonLd(ctx: Context, result: PageResult, facts: PageFacts, faqCount: number) {
  for (const block of facts.jsonLd) {
    if (block.error) {
      add(
        ctx,
        result,
        "jsonld",
        "error",
        result.path,
        `Невалидный JSON-LD: ${block.error}`,
        block.raw.slice(0, 120)
      );
      continue;
    }
    for (const problem of badJsonLdValues(block.value)) {
      add(
        ctx,
        result,
        "jsonld",
        "error",
        result.path,
        "Пустое/некорректное значение в JSON-LD",
        problem
      );
    }
  }
  const nodes = jsonLdNodes(facts.jsonLd);
  const has = (type: string) => nodes.filter((node) => nodeTypes(node).includes(type));
  const clean = pathOnly(result.path);

  // Thickness cards: Product + AggregateOffer only while the price is fresh.
  const thickness = /^\/zakalennoe-steklo\/(\d+)-mm\/$/.exec(clean);
  if (thickness) {
    const n = Number(thickness[1]);
    const entry = loadMetaRegistry(ctx.prices).entries.find((e) => e.url === clean);
    const fresh = entry?.thickness?.priceState === "price";
    const products = has("Product");
    const offers = nodes.flatMap((node) => {
      const offer = node.offers as Record<string, unknown> | undefined;
      return offer ? [offer] : [];
    });
    if (fresh) {
      if (products.length !== 1 || offers.length !== 1) {
        add(
          ctx,
          result,
          "jsonld",
          "error",
          result.path,
          `${n} мм: ожидается Product + AggregateOffer (цена актуальна)`
        );
      } else {
        const offer = offers[0] ?? {};
        const expectedPrice = entry?.thickness?.price ?? null;
        if (!nodeTypes(offer).includes("AggregateOffer"))
          add(ctx, result, "jsonld", "error", result.path, "offers не AggregateOffer");
        if (Number(offer.lowPrice) !== expectedPrice) {
          add(
            ctx,
            result,
            "jsonld",
            "error",
            result.path,
            "lowPrice ≠ цене из prices",
            `${String(offer.lowPrice)} / ${expectedPrice}`
          );
        }
        if (offer.priceCurrency !== "RUB")
          add(
            ctx,
            result,
            "jsonld",
            "error",
            result.path,
            `priceCurrency ${String(offer.priceCurrency)}`
          );
      }
    } else if (products.length > 0 || offers.length > 0) {
      add(
        ctx,
        result,
        "jsonld",
        "error",
        result.path,
        `${n} мм: Product/offers при отсутствии актуальной цены`
      );
    }
  }

  // FAQ: FAQPage with as many questions as the page shows.
  const faq = has("FAQPage");
  if (faqCount > 0 || faq.length > 0) {
    const entities = faq.flatMap((node) => (Array.isArray(node.mainEntity) ? node.mainEntity : []));
    if (faq.length === 0)
      add(
        ctx,
        result,
        "jsonld",
        "error",
        result.path,
        `На странице ${faqCount} вопросов FAQ, FAQPage нет`
      );
    else if (entities.length !== faqCount) {
      add(
        ctx,
        result,
        "jsonld",
        "error",
        result.path,
        `FAQPage: ${entities.length} вопросов, на странице ${faqCount}`
      );
    }
  }

  // Articles.
  if (/^\/blog\/(?!page\/)[^/]+\/$/.test(clean)) {
    const article = has("Article")[0] ?? has("BlogPosting")[0];
    if (!article) add(ctx, result, "jsonld", "error", result.path, "Статья без Article");
    else {
      for (const key of ["headline", "datePublished", "dateModified", "author"]) {
        if (!article[key]) add(ctx, result, "jsonld", "error", result.path, `Article без ${key}`);
      }
    }
  }
}

function checkOg(ctx: Context, result: PageResult, facts: PageFacts, ogImages: Set<string>) {
  for (const key of ["og:title", "og:description", "og:url", "og:type", "og:image"]) {
    if (!facts.og[key]) add(ctx, result, "og", "error", result.path, `Нет ${key}`);
  }
  const image = facts.og["og:image"];
  if (image) {
    if (!/^https?:\/\//.test(image))
      add(ctx, result, "og", "error", result.path, "og:image не абсолютный", image);
    else ogImages.add(image);
  }
  if (facts.og["og:url"] && facts.og["og:url"] !== `${ctx.siteUrl}${pathOnly(result.path)}`) {
    add(ctx, result, "og", "warn", result.path, "og:url ≠ canonical", facts.og["og:url"]);
  }
  if (!facts.twitter["twitter:card"])
    add(ctx, result, "og", "warn", result.path, "Нет twitter:card");
  if (facts.lang !== "ru")
    add(ctx, result, "structure", "error", result.path, `<html lang="${facts.lang ?? ""}">`);
}

function checkImages(ctx: Context, result: PageResult, facts: PageFacts) {
  for (const img of facts.images) {
    const name = img.src.split("?")[0]?.split("/").pop() ?? img.src;
    if (img.alt === null) add(ctx, result, "images", "error", result.path, "<img> без alt", name);
    else if (!img.alt.trim() && !img.decorative) {
      // A card image inside a link that already has text is redundant for screen readers
      // (WCAG H2) — acceptable, but the spec wants it marked explicitly: warn, not error.
      add(
        ctx,
        result,
        "images",
        img.inTextLink ? "warn" : "error",
        result.path,
        img.inTextLink
          ? 'alt="" в карточке-ссылке с текстом: добавить aria-hidden/role="presentation"'
          : 'alt="" без role="presentation"/aria-hidden',
        name
      );
    }
    if (!img.hasSize)
      add(ctx, result, "images", "warn", result.path, "<img> без width/height (CLS)", name);
  }
}

function checkStructure(ctx: Context, result: PageResult, facts: PageFacts, html: string) {
  if (facts.mainCount !== 1 || !facts.mainHasId) {
    add(
      ctx,
      result,
      "structure",
      "error",
      result.path,
      `<main id="main-content">: найдено main ×${facts.mainCount}`
    );
  }
  const $ = loadHtml(html);
  $("script, style, noscript, template, .ig-ph").remove();
  const text = $("main").text();
  const stub = /lorem ipsum|\bTODO\b|заглушк\p{L}*/iu.exec(text);
  if (stub)
    add(ctx, result, "structure", "error", result.path, `Служебный текст «${stub[0]}» в main`);
}

// ---------------------------------------------------------------------------------------------
// Site-level checks

async function checkRedirects(ctx: Context, paths: readonly string[]) {
  const sample = paths.filter((p) => p !== "/" && !p.includes("?")).slice(0, REDIRECT_SAMPLE);
  const rows: Array<[string, string, string, string]> = [];
  await mapLimit(sample, CONCURRENCY, async (p) => {
    const noSlash = p.replace(/\/$/, "");
    const a = await fetchPage(`${ctx.baseUrl}${noSlash}`);
    const okA = [301, 308].includes(a.status) && a.location === `${ctx.baseUrl}${p}`;
    rows.push([noSlash, String(a.status), a.location ?? "", okA ? "✓" : "✗"]);
    if (!okA)
      add(
        ctx,
        null,
        "url",
        "error",
        noSlash,
        `Без слеша: ${a.status} → ${a.location ?? "—"} (ожидается 301/308 на ${p})`
      );

    const upper = p.replace(/(^|\/|-)([a-z])/g, (m) => m.toUpperCase());
    const b = await fetchPage(`${ctx.baseUrl}${upper}`);
    const okB = [301, 308].includes(b.status) && b.location === `${ctx.baseUrl}${p}`;
    rows.push([upper, String(b.status), b.location ?? "", okB ? "✓" : "✗"]);
    if (!okB)
      add(
        ctx,
        null,
        "url",
        "error",
        upper,
        `Верхний регистр: ${b.status} → ${b.location ?? "—"} (ожидается 301 на ${p})`
      );
    else if (b.status !== 301)
      add(ctx, null, "url", "warn", upper, `Верхний регистр: ${b.status} вместо 301`);
  });
  return rows.sort((x, y) => x[0].localeCompare(y[0]));
}

function isExternalAllowed(host: string) {
  return EXTERNAL_HOSTS.some((pattern) => pattern.test(host));
}

async function checkLinks(ctx: Context, pages: ReadonlyMap<string, PageFacts>) {
  const site = new URL(ctx.siteUrl);
  const base = new URL(ctx.baseUrl);
  const internal = new Map<string, string>(); // path → first page that links to it
  const external = new Map<string, string>();
  for (const [from, facts] of pages) {
    for (const link of facts.links) {
      const href = link.href.trim();
      if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
      let url: URL;
      try {
        url = new URL(href, `${ctx.baseUrl}${from}`);
      } catch {
        add(ctx, null, null, "error", from, "Некорректная ссылка", href);
        continue;
      }
      const own = url.host === site.host || url.host === base.host;
      if (own && url.protocol === "http:" && site.protocol === "https:") {
        add(ctx, null, null, "error", from, "http://-ссылка на собственный домен", href);
      }
      if (!own) {
        if (!isExternalAllowed(url.hostname) && !external.has(url.hostname))
          external.set(url.hostname, from);
        continue;
      }
      if (url.pathname.startsWith("/admin")) continue;
      if (!internal.has(url.pathname)) internal.set(url.pathname, from);
    }
  }
  for (const [host, from] of external) {
    add(ctx, null, null, "warn", from, `Внешняя ссылка на неожиданный домен ${host}`);
  }
  const broken: Array<[string, string, string]> = [];
  await mapLimit([...internal.entries()], CONCURRENCY, async ([linkPath, from]) => {
    try {
      const first = await fetchPage(`${ctx.baseUrl}${encodeURI(decodeURI(linkPath))}`);
      if (first.status === 200) return;
      if ([301, 308].includes(first.status) && first.location) {
        const second = await fetchPage(first.location);
        if (second.status === 200) {
          add(
            ctx,
            null,
            null,
            "warn",
            from,
            `Ссылка через редирект ${first.status}`,
            `${linkPath} → ${first.location}`
          );
          return;
        }
      }
      broken.push([linkPath, String(first.status), from]);
      add(ctx, null, null, "error", from, `Битая ссылка: ${first.status}`, linkPath);
    } catch (error) {
      broken.push([linkPath, "сеть", from]);
      add(
        ctx,
        null,
        null,
        "error",
        from,
        `Ссылка не открылась: ${error instanceof Error ? error.message : error}`,
        linkPath
      );
    }
  });
  return { checked: internal.size, broken };
}

async function checkOgImages(ctx: Context, images: ReadonlySet<string>) {
  await mapLimit([...images], CONCURRENCY, async (image) => {
    // The image may point at SITE_URL (prod domain) while we audit another base: map it.
    const url = image.startsWith(ctx.siteUrl)
      ? `${ctx.baseUrl}${image.slice(ctx.siteUrl.length)}`
      : image;
    try {
      const res = await fetchPage(url);
      if (res.status !== 200)
        add(ctx, null, "og", "error", image, `og:image отвечает ${res.status}`);
    } catch (error) {
      add(
        ctx,
        null,
        "og",
        "error",
        image,
        `og:image не загрузился: ${error instanceof Error ? error.message : error}`
      );
    }
  });
}

function checkDuplicates(ctx: Context, pages: ReadonlyMap<string, PageFacts>) {
  for (const field of ["title", "description"] as const) {
    const seen = new Map<string, string[]>();
    for (const [p, facts] of pages) {
      if (p.includes("?")) continue; // query variants share the meta of their canonical page
      const value = normalizeMetaText(facts[field]);
      if (!value) continue;
      seen.set(value, [...(seen.get(value) ?? []), p]);
    }
    for (const [value, paths] of seen) {
      if (paths.length > 1)
        add(
          ctx,
          null,
          field,
          "error",
          paths.join(", "),
          `Дубликат ${field} у ${paths.length} URL`,
          value
        );
    }
  }
}

async function checkPagination(ctx: Context) {
  const rows: string[][] = [];
  for (const listing of ["/obekty/", "/blog/"]) {
    const p = `${listing}page/2/`;
    const res = await fetchPage(`${ctx.baseUrl}${p}`);
    const facts = res.status === 200 ? extractFacts(loadHtml(res.body)) : null;
    // `next dev` streams the not-found page with 200: treat it as «no page 2».
    if (!facts || facts.h1[0] === NOT_FOUND_H1) {
      rows.push([p, String(res.status), "—", "страницы 2 нет (мало записей) — не проверялось"]);
      continue;
    }
    const problems: string[] = [];
    if (ctx.env === "production" && robotsTokens(facts.robots).includes("noindex"))
      problems.push("noindex");
    if (facts.canonical !== `${ctx.siteUrl}${p}`)
      problems.push(`canonical ${facts.canonical ?? "—"}`);
    if (!/страница 2/i.test(facts.title ?? "")) problems.push("в title нет «страница 2»");
    for (const problem of problems) add(ctx, null, "robots", "error", p, `Пагинация: ${problem}`);
    rows.push([p, "200", facts.robots ?? "", problems.length ? problems.join("; ") : "✓"]);
  }
  return rows;
}

async function checkFilterPage(ctx: Context) {
  const p = "/obekty/?product=x";
  const res = await fetchPage(`${ctx.baseUrl}${p}`);
  const facts = res.status === 200 ? extractFacts(loadHtml(res.body)) : null;
  const ok =
    res.status === 200 &&
    robotsTokens(facts?.robots ?? null).includes("noindex") &&
    facts?.canonical === `${ctx.siteUrl}/obekty/`;
  if (!ok) {
    add(
      ctx,
      null,
      "robots",
      "error",
      p,
      "Фильтр объектов: ожидается 200 + noindex + canonical /obekty/",
      `${res.status}; ${facts?.robots ?? "—"}; ${facts?.canonical ?? "—"}`
    );
  }
  return [p, String(res.status), facts?.robots ?? "—", facts?.canonical ?? "—", ok ? "✓" : "✗"];
}

async function checkNotFound(ctx: Context) {
  const res = await fetchPage(`${ctx.baseUrl}${NOT_FOUND_PATH}`);
  if (res.status !== 404)
    add(
      ctx,
      null,
      "http",
      "error",
      NOT_FOUND_PATH,
      `Несуществующая страница отвечает ${res.status} (нужен 404)`
    );
  return res.status;
}

// ---------------------------------------------------------------------------------------------
// Main

async function auditPage(
  ctx: Context,
  auditUrl: AuditUrl,
  pages: Map<string, PageFacts>,
  ogImages: Set<string>
): Promise<PageResult> {
  const result: PageResult = {
    path: auditUrl.path,
    status: null,
    ttfbMs: null,
    facts: null,
    failed: new Set(),
    warned: new Set(),
  };
  let page: FetchedPage;
  try {
    page = await fetchPage(`${ctx.baseUrl}${encodeURI(auditUrl.path)}`);
  } catch (error) {
    add(
      ctx,
      result,
      "http",
      "error",
      auditUrl.path,
      `Не открылась: ${error instanceof Error ? error.message : error}`
    );
    return result;
  }
  result.status = page.status;
  result.ttfbMs = page.ttfbMs;

  const clean = pathOnly(auditUrl.path);
  if (clean !== clean.toLowerCase() || !clean.endsWith("/")) {
    add(
      ctx,
      result,
      "url",
      "error",
      auditUrl.path,
      "Путь не в нижнем регистре или без завершающего слеша"
    );
  }
  if (page.status !== 200) {
    const optional = auditUrl.path === TEAM_PATH && ctx.teamEmpty;
    add(
      ctx,
      result,
      "http",
      optional ? "warn" : "error",
      auditUrl.path,
      `HTTP ${page.status}${page.location ? ` → ${page.location}` : ""}`
    );
    return result;
  }
  if (!page.contentType.includes("text/html"))
    add(ctx, result, "http", "error", auditUrl.path, `content-type ${page.contentType}`);
  if (page.ttfbMs > TTFB_WARN_MS)
    add(ctx, result, "ttfb", "warn", auditUrl.path, `TTFB ${page.ttfbMs} мс (> ${TTFB_WARN_MS})`);

  const $ = loadHtml(page.body);
  const facts = extractFacts($);
  result.facts = facts;
  pages.set(auditUrl.path, facts);
  // FAQ sections: -like ids or a «…вопрос…» heading (blocks render no stable marker).
  const faqCount = $("section")
    .filter((_, el) => {
      const section = $(el);
      if (section.find("section").length > 0) return false;
      return (
        /faq/i.test(section.attr("id") ?? "") ||
        /вопрос/i.test(section.find("h2, h3").first().text())
      );
    })
    .find(".ig-acc__item").length;

  checkHeadings(ctx, result, facts, auditUrl.registry);
  checkTitleDescription(ctx, result, facts, auditUrl.registry);
  checkRobots(ctx, result, facts, auditUrl.sources.includes("sitemap"));
  checkCanonical(ctx, result, facts);
  checkBreadcrumbs(ctx, result, facts);
  checkJsonLd(ctx, result, facts, faqCount);
  checkOg(ctx, result, facts, ogImages);
  checkImages(ctx, result, facts);
  checkStructure(ctx, result, facts, page.body);
  return result;
}

function checkSiteJsonLd(ctx: Context, pages: ReadonlyMap<string, PageFacts>) {
  const home = pages.get("/");
  const contacts = pages.get("/kontakty/");
  const nodes = [...jsonLdNodes(home?.jsonLd ?? []), ...jsonLdNodes(contacts?.jsonLd ?? [])];
  const org = jsonLdNodes(home?.jsonLd ?? []).find((n) => nodeTypes(n).includes("Organization"));
  if (!org) add(ctx, null, "jsonld", "error", "/", "На главной нет Organization");
  else {
    if (org.name !== "Inex Glass")
      add(ctx, null, "jsonld", "error", "/", `Organization.name «${String(org.name)}»`);
    if (!org.url || !org.logo) add(ctx, null, "jsonld", "error", "/", "Organization без url/logo");
  }
  const offices = nodes.filter((n) => nodeTypes(n).includes("LocalBusiness"));
  const cities = new Set(
    offices.map((n) =>
      String((n.address as Record<string, unknown> | undefined)?.addressLocality ?? "")
    )
  );
  for (const city of ["Челябинск", "Екатеринбург"]) {
    if (!cities.has(city))
      add(ctx, null, "jsonld", "error", "/ + /kontakty/", `Нет LocalBusiness для офиса «${city}»`);
  }
  for (const office of offices) {
    for (const key of ["address", "telephone", "openingHoursSpecification"]) {
      if (!office[key])
        add(ctx, null, "jsonld", "error", "/ + /kontakty/", `LocalBusiness без ${key}`);
    }
  }
}

function coverage(
  ctx: Context,
  registry: MetaRegistry,
  urls: readonly AuditUrl[],
  results: ReadonlyMap<string, PageResult>,
  sitemapPaths: readonly string[],
  emptyListings: ReadonlySet<string>
) {
  const registryPaths = new Set(registry.entries.map((e) => e.url));
  const extras: string[][] = [];
  for (const sitemapPath of sitemapPaths) {
    if (registryPaths.has(sitemapPath)) continue;
    const reason = knownExtraReason(sitemapPath);
    extras.push([sitemapPath, reason ?? "—"]);
    if (!reason)
      add(
        ctx,
        null,
        "http",
        "warn",
        sitemapPath,
        "URL из sitemap не найден в 17-meta и не входит в известные дополнительные"
      );
  }
  const missingInSitemap =
    ctx.env === "production"
      ? registry.entries
          .filter((e) => !sitemapPaths.includes(e.url) && !expectedNoindex(ctx, e.url))
          .map((e) => e.url)
      : [];
  for (const p of missingInSitemap) {
    // Listings without published items are left out of the sitemap on purpose (task 40 Notes).
    if (LISTING_PATHS.has(p) && emptyListings.has(p)) {
      add(ctx, null, "http", "info", p, "Пустой листинг — исключён из sitemap намеренно");
      continue;
    }
    add(ctx, null, "http", "error", p, "Индексируемый URL из 17-meta отсутствует в sitemap");
  }
  const registryOk = registry.entries.filter((e) => results.get(e.url)?.status === 200).length;
  return { extras, missingInSitemap, registryOk, total: urls.length };
}

function renderReport(input: {
  ctx: Context;
  registry: MetaRegistry;
  results: PageResult[];
  sitemapPaths: string[];
  sitemapStatus: number | null;
  cov: ReturnType<typeof coverage>;
  redirects: string[][];
  pagination: string[][];
  filter: string[];
  notFoundStatus: number;
  links: { checked: number; broken: Array<[string, string, string]> };
}) {
  const { ctx, registry } = input;
  const counts = countBySeverity(ctx.findings);
  const second = registry.entries.filter((e) => e.secondDescription);
  const mark = (r: PageResult, c: Check) =>
    r.failed.has(c) ? "✗" : r.warned.has(c) ? "!" : r.facts || c === "http" ? "✓" : "—";
  const ttfb = input.results
    .filter((r) => r.ttfbMs !== null)
    .map((r) => r.ttfbMs as number)
    .sort((a, b) => a - b);
  const median = ttfb.length ? ttfb[Math.floor(ttfb.length / 2)] : 0;

  return [
    "# SEO-аудит по URL",
    "",
    "Генерируется `pnpm audit:seo` (`scripts/audit/seo.ts`, task 40). Только чтение: найденные ошибки — фикс-лист для координатора, тексты и шаблоны скрипт не меняет.",
    "",
    `- Запуск: ${reportTimestamp()}`,
    `- Стенд: ${ctx.baseUrl} (SITE_URL для canonical: ${ctx.siteUrl}); режим: **${ctx.env === "production" ? "production" : "не-production (все страницы noindex, sitemap пуст — матрица noindex не проверялась)"}**`,
    `- Цены: ${ctx.pricesSource}`,
    `- sitemap.xml: HTTP ${input.sitemapStatus ?? "—"}, URL: ${input.sitemapPaths.length}`,
    `- Проверено URL: ${input.results.length}; реестр 17-meta: ${registry.entries.length} URL (${registry.rows.length} строк таблиц), отвечают 200: ${input.cov.registryOk}`,
    `- Итого: **error ${counts.error}**, warn ${counts.warn}, info ${counts.info}`,
    "",
    "## Матрица «URL × проверки»",
    "",
    "✓ — ок, ✗ — error, ! — warn, — — не применимо / не проверялось.",
    "",
    mdTable(
      ["URL", "HTTP", "TTFB, мс", ...CHECKS.filter((c) => c !== "http" && c !== "ttfb")],
      input.results
        .slice()
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((r) => [
          r.path,
          r.status ?? "—",
          r.ttfbMs ?? "—",
          ...CHECKS.filter((c) => c !== "http" && c !== "ttfb").map((c) => mark(r, c)),
        ])
    ),
    "## Ошибки",
    "",
    findingsTable(ctx.findings.filter((f) => f.severity === "error")),
    "## Расхождения с 17-meta («ожидалось / фактически»)",
    "",
    mdTable(
      ["URL", "Поле", "Ожидалось (17-meta)", "Фактически"],
      ctx.metaDiffs.map((d) => [d.path, d.field, d.expected, d.actual])
    ),
    "## Редиректы (выборка)",
    "",
    "Next при `trailingSlash: true` отвечает **308** на URL без слеша; Яндекс и Google трактуют 308 как постоянный редирект (аналог 301), поэтому допустимы оба кода. Верхний регистр → 301 (`src/proxy.ts`).",
    "",
    mdTable(["Запрос", "Код", "Location", "OK"], input.redirects),
    "## Пагинация, фильтры, 404",
    "",
    mdTable(["URL", "HTTP", "robots", "Результат"], input.pagination),
    mdTable(["URL", "HTTP", "robots", "canonical", "OK"], [input.filter]),
    `- \`${NOT_FOUND_PATH}\` → HTTP ${input.notFoundStatus}`,
    `- \`${TEAM_PATH}\`: коллекция team ${ctx.teamEmpty === null ? "— не удалось определить" : ctx.teamEmpty ? "пуста → ожидается noindex" : "не пуста → индексируется"}`,
    "",
    "## Покрытие sitemap ↔ 17-meta",
    "",
    "URL из sitemap, которых нет в 17-meta:",
    "",
    mdTable(["URL", "Известная категория"], input.cov.extras),
    `Индексируемые URL 17-meta, отсутствующие в sitemap: ${input.cov.missingInSitemap.length ? input.cov.missingInSitemap.join(", ") : ctx.env === "production" ? "нет" : "не проверялось (не-prod стенд)"}`,
    "",
    `## Ссылки\n\nВнутренних уникальных путей проверено: ${input.links.checked}; битых: ${input.links.broken.length}.\n`,
    mdTable(["Путь", "Код", "Найдена на"], input.links.broken),
    `## Скорость ответа (TTFB, прокси)\n\nМедиана ${median} мс, максимум ${ttfb.at(-1) ?? 0} мс; порог warn — ${TTFB_WARN_MS} мс (имеет смысл только на \`next start\`).\n`,
    "## Предупреждения",
    "",
    findingsTable(ctx.findings.filter((f) => f.severity !== "error")),
    "## Противоречия источников и решения",
    "",
    `1. **Два description в 17-meta.** Взят первый, второй проигнорирован — подтвердить у заказчика:`,
    "",
    mdTable(
      ["URL", "Первый (используется)", "Второй (проигнорирован)"],
      second.map((e) => [e.url, e.description, e.secondDescription])
    ),
    `2. **68 vs 69 URL.** В таблицах 17-meta ${registry.rows.length} строк; шаблон \`/zakalennoe-steklo/{N}-mm/\` занимает 2 строки (с ценой и «без цены») и раскрывается в 8 толщин: ${registry.rows.length} − 2 + 8 = ${registry.entries.length} URL. Цифра 68 в плане, по-видимому, посчитана без одной из строк (например, без \`/\` или с шаблоном как 7 толщин без 5 мм) — в аудите используется ${registry.entries.length}.`,
    "3. **301 vs 308 для URL без слеша** — см. «Редиректы»: допустимы оба, Next отдаёт 308.",
    "4. **Формулировка опыта** в description `/obekty/` и `/o-kompanii/` (17-meta) противоречит ТЗ §11 — см. `docs/reports/content-audit.md`.",
    "5. **«М1» как стоп-слово vs статья о марках стекла** — исключение в `scripts/audit/allowlist.json`.",
    "6. **Крошки калькулятора веса** (`/instrumenty/kalkulyator-vesa-stekla/`): видимых 3, в JSON-LD 2 — «Инструменты» не имеет страницы и не может быть `ListItem` с `item` (task 15). Намеренно; исключение `TEXT_ONLY_CRUMBS` в `scripts/audit/seo.ts`.",
    "",
    "## Ручные проверки (человек)",
    "",
    "- Прогнать JSON-LD ключевых шаблонов (главная, толщина с ценой, толщина без цены, статья, страница с FAQ, контакты) через https://validator.schema.org/ и валидатор микроразметки Яндекса (https://webmaster.yandex.ru/tools/microtest/), результат занести сюда.",
    "",
  ].join("\n");
}

async function main(): Promise<number> {
  const baseUrl = resolveBaseUrl();
  const siteUrl = new URL(argValue("site-url") ?? process.env.AUDIT_SITE_URL ?? baseUrl).origin;
  const [{ prices, source }, teamEmpty, env] = await Promise.all([
    loadPrices(baseUrl),
    loadTeamEmpty(baseUrl),
    detectEnv(baseUrl),
  ]);
  const ctx: Context = {
    baseUrl,
    siteUrl,
    env,
    prices,
    pricesSource: source,
    teamEmpty,
    findings: [],
    metaDiffs: [],
  };
  const registry = loadMetaRegistry(prices);
  const { urls, sitemapPaths, sitemapStatus } = await collectAuditUrls({
    baseUrl,
    registry: registry.entries,
  });
  console.log(`[audit:seo] ${baseUrl}: ${urls.length} URL, стенд ${env}`);

  const pages = new Map<string, PageFacts>();
  const ogImages = new Set<string>();
  const results = await mapLimit(urls, CONCURRENCY, (u) => auditPage(ctx, u, pages, ogImages));
  const byPath = new Map(results.map((r) => [r.path, r]));

  checkSiteJsonLd(ctx, pages);
  checkDuplicates(ctx, pages);
  await checkOgImages(ctx, ogImages);
  const redirects = await checkRedirects(
    ctx,
    registry.entries.map((e) => e.url)
  );
  const pagination = await checkPagination(ctx);
  const filter = await checkFilterPage(ctx);
  const notFoundStatus = await checkNotFound(ctx);
  const links = await checkLinks(ctx, pages);
  const emptyListings = new Set<string>();
  for (const listing of ["/obekty/", "/blog/"] as const) {
    if ((await discoverListing(baseUrl, listing)).length === 0) emptyListings.add(listing);
  }
  const cov = coverage(ctx, registry, urls, byPath, sitemapPaths, emptyListings);

  ctx.findings = sortFindings(ctx.findings);
  writeText(
    REPORT_FILE,
    renderReport({
      ctx,
      registry,
      results,
      sitemapPaths,
      sitemapStatus,
      cov,
      redirects,
      pagination,
      filter,
      notFoundStatus,
      links,
    })
  );
  writeJson(OUT_FILE, {
    baseUrl,
    siteUrl,
    env,
    findings: ctx.findings,
    metaDiffs: ctx.metaDiffs,
    pages: results.map((r) => ({
      path: r.path,
      status: r.status,
      ttfbMs: r.ttfbMs,
      failed: [...r.failed],
      warned: [...r.warned],
    })),
    price: Object.fromEntries(
      prices.items.map((i) => [i.thickness, i.price === null ? null : formatPrice(i.price)])
    ),
  });

  const counts = countBySeverity(ctx.findings);
  console.log(
    `[audit:seo] error ${counts.error}, warn ${counts.warn}, info ${counts.info}; отчёт: ${REPORT_FILE}`
  );
  return counts.error > 0 ? 1 : 0;
}

try {
  process.exit(await main());
} catch (error) {
  console.error("[audit:seo] сбой:", error);
  process.exit(2);
}
