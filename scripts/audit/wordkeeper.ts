/**
 * Main-query coverage and frequency report (task 40, §4) → `docs/reports/seo-frequency.md`.
 * Informational: exit code 0, texts are never changed.
 *
 *   pnpm audit:frequency                         # offline: coverage of 17-meta queries in H1/title
 *   pnpm audit:frequency --online                # + current Wordstat frequencies via Wordkeeper
 *   pnpm audit:frequency --csv=scripts/audit/input/wordkeeper.csv
 *
 * Modes
 * - offline (always): the «Главный запрос» column of 17-meta (query + frequencies recorded
 *   15.10.2026) vs H1 and title. H1/title come from the live site (`BASE_URL`, default
 *   http://localhost:3000) when it answers, otherwise from 17-meta itself.
 * - `--online`: Wordkeeper bulk API (`WORDKEEPER_API_KEY`, optional `WORDKEEPER_API_BASE`),
 *   exact frequency `"!слово !слово"` for Russia (225) and the three federal districts
 *   (Урал 52 + Сибирь 59 + Поволжье 40, summed). Spends one limit per phrase and region: the
 *   script checks the balance first and refuses to spend more than `--max-limits` (default 200).
 *   Responses are cached in `scripts/.cache/wordkeeper/`.
 * - `--csv=<file>`: manual export, columns `query;freq_ru;freq_3okrug` (header optional).
 *
 * The API key is never printed.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { SEED_PRICES_2026_10_15 } from "@/lib/domain/prices";
import { fetchPage, loadHtml, mapLimit, resolveBaseUrl } from "./lib/html";
import { loadMetaRegistry } from "./lib/meta-registry";
import type { RegistryEntry } from "./lib/meta-registry";
import { argFlag, argValue, mdTable, reportTimestamp, writeText } from "./lib/report";
import {
  exactPhrase,
  WORDSTAT_REGIONS,
  WordkeeperClient,
  WordkeeperError,
} from "./lib/wordkeeper-client";

const REPORT_FILE = path.join("docs", "reports", "seo-frequency.md");
const RECORDED_AT = "15.10.2026";
const DROP_THRESHOLD = 0.3;
const DEFAULT_MAX_LIMITS = 200;

/** Prepositions / conjunctions ignored in the coverage check. */
const STOP_WORDS = new Set([
  "в",
  "во",
  "на",
  "для",
  "по",
  "с",
  "со",
  "и",
  "или",
  "из",
  "от",
  "до",
  "за",
  "к",
  "ко",
  "о",
  "об",
  "у",
  "что",
  "как",
  "это",
  "а",
  "но",
  "при",
  "под",
  "над",
]);

type Coverage = "полное" | "частичное" | "нет";

interface Row {
  entry: RegistryEntry;
  h1: string;
  title: string;
  source: "сайт" | "17-meta";
  h1Coverage: Coverage;
  titleCoverage: Coverage;
  missing: string[];
  current: { ru: number | null; d3: number | null } | null;
}

// ---------------------------------------------------------------------------------------------
// Coverage (simplified stemming, task spec §4)

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/²/g, "2")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t && !STOP_WORDS.has(t));
}

/** Words of ≥ 5 letters match by their first `len − 2` characters, shorter ones exactly. */
function stem(word: string): string {
  return word.length >= 5 ? word.slice(0, word.length - 2) : word;
}

function coverage(query: string, target: string): { level: Coverage; missing: string[] } {
  const words = tokens(query);
  const targetTokens = tokens(target);
  const missing = words.filter((word) => {
    const s = stem(word);
    return !targetTokens.some((t) => (word.length >= 5 ? t.startsWith(s) : t === word));
  });
  const level: Coverage =
    missing.length === 0 ? "полное" : missing.length === words.length ? "нет" : "частичное";
  return { level, missing };
}

// ---------------------------------------------------------------------------------------------
// Live H1 / title

async function liveHeadings(baseUrl: string, entries: readonly RegistryEntry[]) {
  const result = new Map<string, { h1: string; title: string }>();
  try {
    const probe = await fetchPage(`${baseUrl}/`, { timeoutMs: 15_000 });
    if (probe.status !== 200) return result;
  } catch {
    return result;
  }
  await mapLimit(entries, 4, async (entry) => {
    try {
      const page = await fetchPage(`${baseUrl}${entry.url}`);
      if (page.status !== 200) return;
      const $ = loadHtml(page.body);
      result.set(entry.url, {
        h1: $("h1").first().text().replace(/\s+/g, " ").trim(),
        title: $("head title").first().text().replace(/\s+/g, " ").trim(),
      });
    } catch {
      // Falls back to the 17-meta values for this URL.
    }
  });
  return result;
}

// ---------------------------------------------------------------------------------------------
// Current frequencies

type Frequencies = Map<string, { ru: number | null; d3: number | null }>;

function readCsv(file: string): Frequencies {
  const records = parse(readFileSync(file, "utf8"), {
    delimiter: ";",
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as string[][];
  const result: Frequencies = new Map();
  for (const [query = "", ru = "", d3 = ""] of records) {
    if (!query || /^query$/i.test(query)) continue;
    const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));
    result.set(query.toLowerCase().replace(/ё/g, "е").trim(), { ru: num(ru), d3: num(d3) });
  }
  return result;
}

interface OnlineOutcome {
  status: string;
  frequencies: Frequencies | null;
}

async function fetchOnline(queries: readonly string[]): Promise<OnlineOutcome> {
  const key = process.env.WORDKEEPER_API_KEY ?? "";
  if (!key)
    return { status: "WORDKEEPER_API_KEY не задан — онлайн-часть пропущена", frequencies: null };
  const client = new WordkeeperClient(key);
  const regions = Object.values(WORDSTAT_REGIONS);
  const cost = queries.length * regions.length;
  const maxLimits = Number(argValue("max-limits") ?? DEFAULT_MAX_LIMITS);
  try {
    const balance = await client.balance();
    if (balance.limits !== null && balance.limits < cost) {
      return {
        status: `недостаточно лимитов Wordkeeper: нужно ${cost}, доступно ${balance.limits} — онлайн-часть пропущена`,
        frequencies: null,
      };
    }
    if (cost > maxLimits) {
      return {
        status: `запуск стоит ${cost} лимитов (> --max-limits=${maxLimits}) — онлайн-часть пропущена`,
        frequencies: null,
      };
    }
    const phrases = queries.map(exactPhrase);
    const byRegion = new Map<number, Record<string, number>>();
    for (const region of regions) {
      console.log(`[audit:frequency] Wordkeeper: ${region.name} (${phrases.length} фраз)…`);
      byRegion.set(region.id, await client.frequencies(phrases, region.id));
    }
    const value = (geo: number, phrase: string) => {
      const v = byRegion.get(geo)?.[phrase];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    const frequencies: Frequencies = new Map();
    queries.forEach((query, index) => {
      const phrase = phrases[index] ?? "";
      const districts = [
        WORDSTAT_REGIONS.ural,
        WORDSTAT_REGIONS.siberia,
        WORDSTAT_REGIONS.volga,
      ].map((r) => value(r.id, phrase));
      frequencies.set(query.toLowerCase().replace(/ё/g, "е"), {
        ru: value(WORDSTAT_REGIONS.ru.id, phrase),
        d3: districts.every((v) => v === null)
          ? null
          : districts.reduce<number>((s, v) => s + (v ?? 0), 0),
      });
    });
    return {
      status: `API Wordkeeper подтверждён (документация word-keeper.ru/doc/api_multi); баланс лимитов до запуска: ${balance.limits ?? "не указан"}; стоимость запуска до ${cost} лимитов (повторные запуски берут ответы из кэша scripts/.cache/wordkeeper/ бесплатно)`,
      frequencies,
    };
  } catch (error) {
    const reason = error instanceof WordkeeperError ? error.message : String(error);
    return {
      status: `API Wordkeeper не подтверждён (${reason}); онлайн-часть пропущена; действие человека: проверить тариф/токен или прислать выгрузку частотности в CSV (--csv)`,
      frequencies: null,
    };
  }
}

// ---------------------------------------------------------------------------------------------
// Report

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));

function delta(recorded: number | null, current: number | null): { text: string; drop: boolean } {
  if (recorded === null || current === null) return { text: "—", drop: false };
  if (recorded === 0) return { text: current === 0 ? "0" : `+${current}`, drop: false };
  const ratio = (current - recorded) / recorded;
  const pct = Math.round(ratio * 100);
  return {
    text: `${current - recorded >= 0 ? "+" : ""}${current - recorded} (${pct >= 0 ? "+" : ""}${pct}%)`,
    drop: ratio < -DROP_THRESHOLD,
  };
}

function render(
  rows: readonly Row[],
  mode: string,
  apiStatus: string,
  skipped: number,
  baseUrl: string
): string {
  const weak = rows.filter((r) => r.h1Coverage !== "полное" || r.titleCoverage !== "полное");
  const drops = rows.filter((r) => {
    const q = r.entry.query;
    return q && r.current && delta(q.freqRu, r.current.ru).drop;
  });
  return [
    "# Частотность и покрытие главных запросов",
    "",
    "Генерируется `pnpm audit:frequency` (`scripts/audit/wordkeeper.ts`, task 40). Автоматических правок текстов нет — только отчёт.",
    "",
    `- Дата: ${reportTimestamp()}`,
    `- Режим: **${mode}**`,
    `- H1/title: ${rows.some((r) => r.source === "сайт") ? `с сайта ${baseUrl} (где страница не ответила — из 17-meta)` : "из 17-meta (сайт недоступен)"}`,
    `- Состояние API Wordkeeper: ${apiStatus}`,
    `- Частотность «15.10» — замер Wordkeeper, зафиксированный в 17-meta (точная, РФ / сумма трёх округов: Урал, Сибирь, Поволжье). Строк без главного запроса («—»): ${skipped}.`,
    "",
    "## Таблица",
    "",
    mdTable(
      [
        "URL",
        "Главный запрос",
        `Частотность ${RECORDED_AT} (РФ/3 округа)`,
        "Сейчас (РФ/3 округа)",
        "Дельта РФ",
        "В H1",
        "В title",
        "Недостающие слова",
      ],
      rows.map((r) => {
        const q = r.entry.query;
        return [
          r.entry.url,
          `${q?.text ?? ""}${q?.derived ? " (выведен)" : ""}`,
          q && q.freqRu !== null ? `${q.freqRu}/${fmt(q.freq3)}` : "—",
          r.current ? `${fmt(r.current.ru)}/${fmt(r.current.d3)}` : "—",
          q && r.current ? delta(q.freqRu, r.current.ru).text : "—",
          r.h1Coverage,
          r.titleCoverage,
          r.missing.join(", "),
        ];
      })
    ),
    "## Выводы",
    "",
    "### Запрос отражён в H1/title не полностью",
    "",
    mdTable(
      ["URL", "Запрос", "H1", "Title", "Недостающие слова"],
      weak.map((r) => [
        r.entry.url,
        r.entry.query?.text ?? "",
        `${r.h1Coverage}: ${r.h1}`,
        `${r.titleCoverage}: ${r.title}`,
        r.missing.join(", "),
      ])
    ),
    "### Падение спроса > 30%",
    "",
    drops.length
      ? mdTable(
          ["URL", "Запрос", RECORDED_AT, "Сейчас"],
          drops.map((r) => [
            r.entry.url,
            r.entry.query?.text ?? "",
            fmt(r.entry.query?.freqRu),
            fmt(r.current?.ru),
          ])
        )
      : rows.some((r) => r.current)
        ? "_нет_\n"
        : "_не проверялось (нет текущих данных)_\n",
    "## Ограничения и неопределённости",
    "",
    "- Покрытие считается упрощённой лемматизацией: «ё»→«е», нижний регистр, предлоги игнорируются, слово ≥ 5 букв сравнивается по первым `длина − 2` знакам, короткие — целиком. «Частичное» — сигнал для человека, а не ошибка (например, «калёное»/«закалённое», «м2»/«м²», синонимы).",
    "- Для `/zakalennoe-steklo/{N}-mm/` 17-meta фиксирует запрос с частотностью только для 10 мм («закаленное стекло 10 мм цена за м2» 47/20); для остальных толщин запрос «закаленное стекло N мм» выведен скриптом, частотности нет.",
    '- Тип частотности при онлайн-замере — точная (`"!слово !слово"`); если в 17-meta записана другая (например, «в кавычках»), дельта будет систематической — сверить с выгрузкой из интерфейса Wordkeeper.',
    "- Wordkeeper API: документация публична (https://word-keeper.ru/doc/api, https://word-keeper.ru/doc/api_multi), base URL `https://word-keeper.ru/api` (переопределяется `WORDKEEPER_API_BASE`), токен — в теле запроса. Один регион на проект, поэтому замер = 4 проекта (РФ 225, УФО 52, СФО 59, ПФО 40); стоимость — 1 лимит за фразу в каждом регионе. Доступ к API зависит от тарифа.",
    "- Ручной вариант: выгрузить частотность из интерфейса в `scripts/audit/input/wordkeeper.csv` (`query;freq_ru;freq_3okrug`) и запустить `pnpm audit:frequency --csv=scripts/audit/input/wordkeeper.csv`.",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const baseUrl = resolveBaseUrl();
  const { entries } = loadMetaRegistry(SEED_PRICES_2026_10_15);
  const withQuery = entries.filter((e) => e.query);
  const skipped = entries.length - withQuery.length;

  const live = await liveHeadings(baseUrl, withQuery);

  const csvFile = argValue("csv");
  let mode = "офлайн";
  let apiStatus = "онлайн-режим не запрашивался (запуск с --online)";
  let frequencies: Frequencies | null = null;
  if (csvFile) {
    if (!existsSync(csvFile)) throw new Error(`CSV не найден: ${csvFile}`);
    frequencies = readCsv(csvFile);
    mode = `CSV (${csvFile})`;
  } else if (argFlag("online")) {
    // Only queries with a recorded frequency are worth the limits.
    const queries = [
      ...new Set(withQuery.filter((e) => !e.query?.derived).map((e) => e.query?.text ?? "")),
    ];
    const outcome = await fetchOnline(queries);
    apiStatus = outcome.status;
    frequencies = outcome.frequencies;
    mode = frequencies ? "онлайн (Wordkeeper)" : "офлайн (онлайн не удался)";
  }

  const rows: Row[] = withQuery.map((entry) => {
    const site = live.get(entry.url);
    const h1 = site?.h1 || entry.h1;
    const title = site?.title || entry.title;
    const query = entry.query?.text ?? "";
    const inH1 = coverage(query, h1);
    const inTitle = coverage(query, title);
    const missing = [...new Set([...inH1.missing, ...inTitle.missing])];
    return {
      entry,
      h1,
      title,
      source: site ? "сайт" : "17-meta",
      h1Coverage: inH1.level,
      titleCoverage: inTitle.level,
      missing,
      current: frequencies?.get(query.toLowerCase().replace(/ё/g, "е")) ?? null,
    };
  });

  writeText(REPORT_FILE, render(rows, mode, apiStatus, skipped, baseUrl));
  const weak = rows.filter((r) => r.h1Coverage !== "полное" || r.titleCoverage !== "полное").length;
  console.log(
    `[audit:frequency] режим: ${mode}; запросов: ${rows.length}; неполное покрытие: ${weak}`
  );
  console.log(`[audit:frequency] API: ${apiStatus}`);
  console.log(`[audit:frequency] отчёт: ${REPORT_FILE}`);
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error("[audit:frequency] сбой:", error instanceof Error ? error.message : error);
  process.exit(2);
}
