/**
 * Content audit (task 40, §2): ТЗ §11 rules over the site text. Finds and reports only — never
 * edits content.
 *
 *   pnpm audit:content                 # --rendered (default): HTML of every audit URL
 *   pnpm audit:content --db            # CMS documents and globals via the Local API
 *   pnpm audit:content --base=http://localhost:3140 --no-cms
 *
 * Options:
 * - `--rendered` / `--db` — mode; `--base=<url>` or `BASE_URL` — site for the rendered mode;
 * - `--no-cms` — rendered mode without the Local API (stop words / experience phrase / prices
 *   fall back to built-ins; use against staging, whose database is not reachable).
 * - `STAGING_BASIC_AUTH=user:pass` — basic auth for staging.
 *
 * Output: `docs/reports/content-audit.md` (sections of every mode run so far) and
 * `scripts/audit/out/content.json` (+ `content-<mode>.json`). Exit code 1 when an `error`
 * finding remains after the allowlist (`scripts/audit/allowlist.json`).
 *
 * Runs under `payload run` (env + TS paths); the script ends the process itself.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import { SEED_PRICES_2026_10_15 } from "@/lib/domain/prices";
import {
  applyAllowlist,
  checkTextUnit,
  DEFAULT_SETTINGS,
  loadAllowlist,
  PRICE_PER_M2,
  priceCaptionProblem,
} from "./lib/content-rules";
import type { AllowEntry, CmsStopWord, ContentSettings, TextUnit } from "./lib/content-rules";
import { fetchPage, loadHtml, mapLimit, resolveBaseUrl, textSegments } from "./lib/html";
import { loadMetaRegistry } from "./lib/meta-registry";
import type { RegistryEntry } from "./lib/meta-registry";
import {
  argFlag,
  countBySeverity,
  findingsTable,
  fragmentAround,
  mdTable,
  reportTimestamp,
  writeJson,
  writeText,
} from "./lib/report";
import type { Finding } from "./lib/report";
import { collectAuditUrls } from "./urls";
import type { Payload } from "payload";

type Mode = "rendered" | "db";

const REPORT_FILE = path.join("docs", "reports", "content-audit.md");
const OUT_DIR = path.join("scripts", "audit", "out");
const PAYLOAD_INIT_TIMEOUT_MS = 60_000;
const RENDER_CONCURRENCY = 4;

interface ModeResult {
  mode: Mode;
  generatedAt: string;
  source: string;
  settingsSource: string;
  checked: Array<{ target: string; status: string }>;
  findings: Finding[];
  allowlistHits: Array<{ entry: AllowEntry; count: number; targets: string[] }>;
}

// ---------------------------------------------------------------------------------------------
// Payload (optional in the rendered mode)

async function initPayload(): Promise<Payload> {
  const [{ getPayload }, configModule] = await Promise.all([
    import("payload"),
    import("@payload-config"),
  ]);
  const config = await configModule.default;
  // Same as the seed: never regenerate `src/payload-types.ts` from a script.
  config.typescript = { ...config.typescript, autoGenerate: false };
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Payload не поднялся за ${PAYLOAD_INIT_TIMEOUT_MS / 1000} с`)),
      PAYLOAD_INIT_TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([getPayload({ config }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function loadSettings(payload: Payload): Promise<ContentSettings> {
  const [settings, prices] = await Promise.all([
    payload.findGlobal({ slug: "site-settings", depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: "prices", depth: 0, overrideAccess: true }),
  ]);
  const stopWords: CmsStopWord[] = (settings.stopWords ?? [])
    .filter((row) => typeof row.word === "string" && row.word.trim())
    .map((row) => ({ word: row.word, kind: (row.kind ?? "stem") as CmsStopWord["kind"] }));
  const priceValues = (prices.rows ?? [])
    .map((row) => row.priceFrom)
    .filter((value): value is number => typeof value === "number" && value > 0);
  return {
    stopWords,
    experiencePhrase: settings.experienceText || DEFAULT_SETTINGS.experiencePhrase,
    priceValues: priceValues.length ? priceValues : DEFAULT_SETTINGS.priceValues,
    source: `CMS (site-settings: ${stopWords.length} стоп-слов; prices: ${priceValues.length} цен)`,
  };
}

// ---------------------------------------------------------------------------------------------
// Rendered mode

function metaExpectedFor(entry: RegistryEntry | null, field: "title" | "description") {
  return entry ? entry[field] : null;
}

async function auditRendered(
  baseUrl: string,
  settings: ContentSettings,
  registry: readonly RegistryEntry[]
): Promise<Pick<ModeResult, "checked" | "findings" | "source">> {
  const { urls, sitemapPaths } = await collectAuditUrls({ baseUrl, registry });
  const findings: Finding[] = [];
  const checked: ModeResult["checked"] = [];

  await mapLimit(urls, RENDER_CONCURRENCY, async (auditUrl) => {
    const target = auditUrl.path;
    let page;
    try {
      page = await fetchPage(`${baseUrl}${encodeURI(target)}`);
    } catch (error) {
      checked.push({ target, status: "сеть: ошибка" });
      findings.push({
        severity: "error",
        rule: "http",
        target,
        field: "—",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    checked.push({ target, status: String(page.status) });
    if (page.status !== 200) {
      // Availability is the SEO audit's job; here it only explains a missing text check.
      findings.push({
        severity: "warn",
        rule: "http",
        target,
        field: "—",
        message: `HTTP ${page.status} — текст не проверен (см. seo-audit)`,
      });
      return;
    }

    const $ = loadHtml(page.body);
    const entry = auditUrl.registry;
    const title = $("head title").first().text();
    const description = $('meta[name="description"]').attr("content") ?? "";
    const metaUnits: TextUnit[] = [
      {
        text: title,
        target,
        field: "title",
        isMeta: true,
        metaExpected: metaExpectedFor(entry, "title"),
        checkPlaceholders: true,
      },
      {
        text: description,
        target,
        field: "meta description",
        isMeta: true,
        metaExpected: metaExpectedFor(entry, "description"),
        checkPlaceholders: true,
      },
    ];
    for (const unit of metaUnits) findings.push(...checkTextUnit(unit, settings));

    const priceBlocksReported = new Set<unknown>();
    for (const segment of textSegments($, "main")) {
      const container = segment.el.parent().closest("div, section, li, td");
      const bridge =
        segment.el.find('a[href*="inex.su"]').length > 0 ||
        segment.el.closest('a[href*="inex.su"]').length > 0 ||
        container.find('a[href*="inex.su"]').length > 0 ||
        /inex\.su/i.test(segment.text);
      findings.push(
        ...checkTextUnit(
          { text: segment.text, target, field: "main", bridge, checkPlaceholders: true },
          settings
        )
      );

      // A «₽/м²» price must carry the dated caption in the same block (section).
      const priceMatch = PRICE_PER_M2.exec(segment.text);
      if (priceMatch) {
        const block = segment.el.closest("section");
        const scope = block.length ? block : $("main");
        const blockNode = scope.get(0);
        if (priceBlocksReported.has(blockNode)) continue;
        const problem = priceCaptionProblem(scope.text().replace(/\s+/g, " "));
        if (problem) {
          priceBlocksReported.add(blockNode);
          findings.push({
            severity: "error",
            rule: "price-caption",
            target,
            field: block.length
              ? `main section${block.attr("id") ? `#${block.attr("id")}` : ""}`
              : "main",
            message: `Цена «₽/м²» без оговорки: ${problem}`,
            fragment: fragmentAround(segment.text, priceMatch.index, priceMatch[0].length),
          });
        }
      }
    }
  });

  checked.sort((a, b) => a.target.localeCompare(b.target));
  return {
    checked,
    findings,
    source: `${baseUrl} — ${urls.length} URL (sitemap: ${sitemapPaths.length}, реестр 17-meta, служебные${
      urls.some((u) => u.sources.includes("listing")) ? ", листинги /obekty/ и /blog/" : ""
    })`,
  };
}

// ---------------------------------------------------------------------------------------------
// DB mode

/** Collections with site copy (public ones + team / shower configs / products). */
const DB_COLLECTIONS = [
  "pages",
  "glass-types",
  "constructions",
  "processing-services",
  "thicknesses",
  "articles",
  "objects",
  "team",
  "shower-configs",
  "products",
] as const;

/**
 * Globals with site copy. `site-settings` is skipped on purpose: it stores the stop-word list
 * itself (and admin-only settings).
 */
const DB_GLOBALS = ["conditions", "snippets", "navigation", "contacts", "promo", "prices"] as const;

/** Keys that never carry readable copy. */
const SKIPPED_KEYS: ReadonlySet<string> = new Set([
  "id",
  "_status",
  "_order",
  "_parent_id",
  "blockType",
  "blockName",
  "slug",
  "path",
  "url",
  "href",
  "anchor",
  "relationTo",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "sortDate",
  "legacyId",
  "legacyUrl",
  "legacyUrls",
  "sourceUrl",
  "importNotes",
  "canonical",
  "icon",
  "email",
  "filename",
  "mimeType",
  "variant",
  "theme",
  "kind",
  "type",
  "template",
  "globalType",
]);

const looksTechnical = (value: string) =>
  /^(?:[a-z0-9_-]+|https?:\/\/\S+|\/[\w/-]*|[0-9a-f-]{36}|\d{4}-\d{2}-\d{2}T[\d:.]+Z?)$/i.test(
    value.trim()
  );

const isLexical = (value: unknown): value is { root: { children: unknown[] } } =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { root?: unknown }).root === "object" &&
  Array.isArray((value as { root: { children?: unknown } }).root?.children);

/** Walks a document and yields text units (Lexical → one unit per top-level node). */
function* walkDocument(
  value: unknown,
  field: string,
  base: Omit<TextUnit, "text" | "field">
): Generator<TextUnit> {
  if (typeof value === "string") {
    if (!value.trim() || looksTechnical(value)) return;
    const isMeta = /(^|\.)seo\.(title|description)$|^(title|metaTitle|metaDescription)$/.test(
      field
    );
    yield { ...base, text: value, field, isMeta };
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries())
      yield* walkDocument(item, `${field}[${index}]`, base);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  if (isLexical(value)) {
    for (const [index, node] of value.root.children.entries()) {
      const text = lexicalToPlainText({ root: { children: [node] } }).replace(/\n+/g, " ");
      if (!text.trim()) continue;
      yield {
        ...base,
        text,
        field: `${field}[${index}]`,
        bridge: JSON.stringify(node).includes("inex.su"),
      };
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SKIPPED_KEYS.has(key)) continue;
    yield* walkDocument(child, field ? `${field}.${key}` : key, base);
  }
}

async function auditDb(
  payload: Payload,
  settings: ContentSettings,
  registry: readonly RegistryEntry[]
): Promise<Pick<ModeResult, "checked" | "findings" | "source">> {
  const findings: Finding[] = [];
  const checked: ModeResult["checked"] = [];
  const registryByUrl = new Map(registry.map((entry) => [entry.url, entry]));

  for (const collection of DB_COLLECTIONS) {
    const result = await payload.find({
      collection,
      depth: 0,
      draft: true,
      pagination: false,
      overrideAccess: true,
    });
    for (const doc of result.docs as unknown as Array<Record<string, unknown>>) {
      const docPath = typeof doc.path === "string" ? doc.path : "";
      const status = typeof doc._status === "string" ? doc._status : "—";
      const target = `${collection}/${String(doc.id)}${docPath ? ` ${docPath}` : ""}`;
      checked.push({ target, status });
      const entry = registryByUrl.get(docPath) ?? null;
      for (const unit of walkDocument(doc, "", {
        target,
        // Drafts are not on the site yet: report, but do not fail the audit.
        ...(status === "draft" ? { severityCap: "warn" as const } : {}),
      })) {
        const metaExpected =
          unit.field === "seo.title"
            ? entry?.title
            : unit.field === "seo.description"
              ? entry?.description
              : null;
        findings.push(
          ...checkTextUnit(
            {
              ...unit,
              field: status === "draft" ? `${unit.field} (черновик)` : unit.field,
              metaExpected: metaExpected ?? null,
            },
            settings
          )
        );
      }
    }
  }

  for (const slug of DB_GLOBALS) {
    const global = (await payload.findGlobal({ slug, depth: 0, overrideAccess: true })) as unknown;
    const target = `global:${slug}`;
    checked.push({ target, status: "global" });
    for (const unit of walkDocument(global, "", { target })) {
      findings.push(...checkTextUnit(unit, settings));
    }
  }

  return {
    checked,
    findings,
    source: `Local API: ${DB_COLLECTIONS.join(", ")}; глобалы ${DB_GLOBALS.join(", ")} (последние версии, включая черновики)`,
  };
}

// ---------------------------------------------------------------------------------------------
// Report

function modeSection(result: ModeResult): string {
  const counts = countBySeverity(result.findings);
  const lines = [
    `## Режим \`--${result.mode}\``,
    "",
    `- Запуск: ${result.generatedAt}`,
    `- Источник: ${result.source}`,
    `- Стоп-слова и цены: ${result.settingsSource}`,
    `- Итого: **error ${counts.error}**, warn ${counts.warn}, info ${counts.info}; проверено: ${result.checked.length}`,
    "",
    "### Нарушения",
    "",
    findingsTable(result.findings),
    "### Сработавшие исключения (allowlist)",
    "",
    mdTable(
      ["match", "url", "rule", "Срабатываний", "Причина"],
      result.allowlistHits.map((hit) => [
        hit.entry.match,
        hit.entry.url ?? "любой",
        hit.entry.rule ?? "любое",
        hit.count,
        hit.entry.reason,
      ])
    ),
    "<details><summary>Проверенные страницы / документы</summary>",
    "",
    mdTable(
      ["URL / документ", "Статус"],
      result.checked.map((c) => [c.target, c.status])
    ),
    "</details>",
    "",
  ];
  return lines.join("\n");
}

const CONTRADICTIONS = `## Противоречия источников (вопросы заказчику)

1. **Формулировка опыта.** ТЗ §11 допускает только «За 21 год специалисты Inex выполнили более 1500 проектов», а 17-meta задаёт description \`/obekty/\` («1500+ проектов за 21 год…») и \`/o-kompanii/\` («…21 год, 1500+ проектов…»). В аудите это \`warn\` (строка взята из 17-meta дословно); в тексте страниц — \`error\`. Решение: подтвердить исключение для мета-описаний или заменить формулировку в 17-meta.
2. **«М1» как стоп-слово.** Если заказчик внесёт «М1» в \`site-settings.stopWords\` (завод), оно конфликтует со статьёй «Марки и маркировка стекла» (\`/blog/markirovka-zakalennogo-stekla/\`, title 17-meta «Стекло М1…»). Исключение задано в \`scripts/audit/allowlist.json\`.
3. **Оговорка к цене.** Требуемая подпись — «Ориентировочная цена на ДД.ММ.ГГГГ. Точная стоимость — в КП; цена в договоре фиксируется». Подписи без части «цена в договоре фиксируется» помечаются как \`error\` (см. таблицу).
`;

function renderReport(results: readonly ModeResult[]): string {
  return [
    "# Аудит контента (ТЗ §11)",
    "",
    "Генерируется `pnpm audit:content` (`scripts/audit/content.ts`, task 40). Скрипт только находит нарушения — тексты не правит. Фикс-лист — таблицы `error` ниже.",
    "",
    "Правила: стоп-слова `site-settings.stopWords` + встроенные (task-11), HST/Heat Soak/ГОСТ 24866/стеклопакеты, «собственное/наше производство», «закаливаем сами», «монтаж под ключ» (кроме моста на inex.su), спецстёкла, обещания (warn), формулировка опыта, нераскрытые метки, оговорка к цене «₽/м²», суммы вне справочника (warn), эмодзи, монтаж (warn), «Хит»/«Новинка»/кабинет/корзина (warn).",
    "",
    ...results.map(modeSection),
    CONTRADICTIONS,
  ].join("\n");
}

function readPrevious(mode: Mode): ModeResult | null {
  const file = path.join(OUT_DIR, `content-${mode}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as ModeResult;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------------

async function main(): Promise<number> {
  const mode: Mode = argFlag("db") ? "db" : "rendered";
  const baseUrl = resolveBaseUrl();
  const useCms = mode === "db" || !argFlag("no-cms");

  let payload: Payload | null = null;
  let settings = DEFAULT_SETTINGS;
  if (useCms) {
    try {
      payload = await initPayload();
      settings = await loadSettings(payload);
    } catch (error) {
      if (mode === "db") throw error;
      console.warn(
        `[audit:content] CMS недоступна (${error instanceof Error ? error.message : error}); встроенные стоп-слова и цены`
      );
    }
  }

  const registry = loadMetaRegistry(SEED_PRICES_2026_10_15).entries;
  const partial =
    mode === "db" && payload
      ? await auditDb(payload, settings, registry)
      : await auditRendered(baseUrl, settings, registry);

  const allowlist = loadAllowlist();
  const { kept, hits } = applyAllowlist(partial.findings, allowlist);
  const result: ModeResult = {
    mode,
    generatedAt: reportTimestamp(),
    source: partial.source,
    settingsSource: settings.source,
    checked: partial.checked,
    findings: kept,
    allowlistHits: [...hits.entries()].map(([entry, matched]) => ({
      entry,
      count: matched.length,
      targets: [...new Set(matched.map((f) => f.target))],
    })),
  };

  writeJson(path.join(OUT_DIR, `content-${mode}.json`), result);
  writeJson(path.join(OUT_DIR, "content.json"), result);
  const other = readPrevious(mode === "db" ? "rendered" : "db");
  const ordered = [result, other].filter((r): r is ModeResult => r !== null);
  ordered.sort((a, b) => (a.mode === "rendered" ? -1 : b.mode === "rendered" ? 1 : 0));
  writeText(REPORT_FILE, renderReport(ordered));

  const counts = countBySeverity(kept);
  console.log(
    `[audit:content] --${mode}: error ${counts.error}, warn ${counts.warn}, info ${counts.info}; проверено ${result.checked.length}`
  );
  for (const hit of result.allowlistHits) {
    console.log(
      `[audit:content] allowlist «${hit.entry.match}» ×${hit.count}: ${hit.entry.reason}`
    );
  }
  console.log(`[audit:content] отчёт: ${REPORT_FILE}`);
  if (payload) await payload.destroy();
  return counts.error > 0 ? 1 : 0;
}

// Top-level await: `payload run` calls process.exit(0) as soon as the module import resolves.
try {
  process.exit(await main());
} catch (error) {
  console.error("[audit:content] сбой:", error);
  process.exit(2);
}
