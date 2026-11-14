/**
 * Minimal word-keeper.ru API client (task 40, §4) — dev tool only, never in the site bundle.
 *
 * Documentation (public, checked 21.10.2026): https://word-keeper.ru/doc/api and
 * https://word-keeper.ru/doc/api_multi. Bulk flow: `POST create_freqDiff` (≤ 1000 phrases with
 * Wordstat operators, ONE region per project) → poll `POST get_result` until `status: ok` →
 * `POST remove` (max 40 projects per account). `GET balance?token=` returns roubles and limits.
 * Each phrase costs one limit; limits of failed phrases are returned by the service.
 *
 * The token (`WORDKEEPER_API_KEY`) is sent only in request bodies / the balance query and is
 * never logged: errors carry the method name, not the URL. Responses are cached on disk in
 * `scripts/.cache/wordkeeper/` (git-ignored) so a re-run does not spend limits again.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const DEFAULT_WORDKEEPER_API_BASE = "https://word-keeper.ru/api";
const CACHE_DIR = path.join("scripts", ".cache", "wordkeeper");
const TIMEOUT_MS = 30_000;
const ATTEMPTS = 3;
const POLL_INTERVAL_MS = 10_000;
const POLL_MAX = 60;

/** Wordstat region ids: Russia and the three federal districts of 17-meta. */
export const WORDSTAT_REGIONS = {
  ru: { id: 225, name: "Россия" },
  ural: { id: 52, name: "Уральский ФО" },
  siberia: { id: 59, name: "Сибирский ФО" },
  volga: { id: 40, name: "Приволжский ФО" },
} as const;

export class WordkeeperError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null
  ) {
    super(message);
    this.name = "WordkeeperError";
  }
}

export interface WordkeeperBalance {
  raw: Record<string, unknown>;
  /** Limits left, when the response exposes them. */
  limits: number | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WordkeeperClient {
  constructor(
    private readonly token: string,
    private readonly base = process.env.WORDKEEPER_API_BASE || DEFAULT_WORDKEEPER_API_BASE
  ) {
    if (!token.trim()) throw new WordkeeperError("WORDKEEPER_API_KEY не задан");
  }

  private async request(
    method: string,
    init: { body?: Record<string, unknown>; query?: boolean }
  ): Promise<Record<string, unknown>> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      try {
        const url = init.query
          ? `${this.base}/${method}?token=${encodeURIComponent(this.token)}`
          : `${this.base}/${method}`;
        const response = await fetch(url, {
          method: init.body ? "POST" : "GET",
          headers: init.body ? { "content-type": "application/json" } : {},
          body: init.body ? JSON.stringify({ ...init.body, token: this.token }) : null,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const text = await response.text();
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          // Not retried: wrong token / endpoint — the caller switches to the offline mode.
          throw new WordkeeperError(`${method}: HTTP ${response.status}`, response.status);
        }
        if (!response.ok)
          throw new WordkeeperError(`${method}: HTTP ${response.status}`, response.status);
        try {
          return JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new WordkeeperError(
            `${method}: ответ не JSON (${text.slice(0, 80)})`,
            response.status
          );
        }
      } catch (error) {
        lastError = error;
        if (error instanceof WordkeeperError && error.status !== null && error.status < 500) break;
        if (attempt < ATTEMPTS) await sleep(1_000 * attempt);
      }
    }
    if (lastError instanceof WordkeeperError) throw lastError;
    throw new WordkeeperError(
      `${method}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  }

  async balance(): Promise<WordkeeperBalance> {
    const raw = await this.request("balance", { query: true });
    // Observed shape (21.10.2026): { balance: { msg, limit: "72144", rub: "0" } }.
    const nested = (raw.balance ?? raw) as Record<string, unknown>;
    const value = Number(nested.limit ?? nested.limits);
    return { raw, limits: Number.isFinite(value) ? value : null };
  }

  /**
   * Frequencies of `phrases` in one region. Cached by (region, phrases); the project is removed
   * after the result arrives.
   */
  async frequencies(phrases: readonly string[], geo: number): Promise<Record<string, number>> {
    const key = createHash("sha1")
      .update(JSON.stringify({ geo, phrases: [...phrases].sort() }))
      .digest("hex");
    const cacheFile = path.join(CACHE_DIR, `${key}.json`);
    if (existsSync(cacheFile)) {
      return JSON.parse(readFileSync(cacheFile, "utf8")) as Record<string, number>;
    }

    const created = await this.request("create_freqDiff", {
      body: { text: phrases.join("\n"), geo, name: `inex-glass audit ${geo}` },
    });
    if (created.status !== "ok" || typeof created.id !== "number") {
      throw new WordkeeperError(`create_freqDiff: ${String(created.text ?? created.status)}`);
    }
    const id = created.id;
    try {
      for (let poll = 0; poll < POLL_MAX; poll += 1) {
        await sleep(POLL_INTERVAL_MS);
        const result = await this.request("get_result", { body: { id } });
        if (result.status !== "ok") continue;
        const results = (result.results ?? {}) as Record<string, unknown>;
        const parsed = Object.fromEntries(
          Object.entries(results).map(([phrase, value]) => [phrase, Number(value)])
        );
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(cacheFile, JSON.stringify(parsed, null, 2), "utf8");
        return parsed;
      }
      throw new WordkeeperError(`get_result: проект ${id} не готов за ${POLL_MAX} опросов`);
    } finally {
      await this.request("remove", { body: { id } }).catch(() => undefined);
    }
  }
}

/** Wordstat operator for the «exact» frequency of 17-meta: `"!слово !слово"`. */
export function exactPhrase(query: string): string {
  const words = query
    .replace(/[«»"!+[\]]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return `"${words.map((w) => `!${w}`).join(" ")}"`;
}
