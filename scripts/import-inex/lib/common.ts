/**
 * Small helpers shared by the inex.su importers (`import.ts`, task 37; `merge-objects.ts`):
 * the production guard, error formatting, alt texts, import notes and the CMS stop-word list.
 *
 * No module-level mutable state: callers keep their own counters and report data.
 */
import type { SeedContext } from "@/seed/context";

import type { StopWordCheck, TextNote } from "../parse-objects";
import { inexUrl } from "../shared";
import { cmsStopWordCheck, type CmsStopWord } from "../stop-words";

/* ------------------------------------------------------------------------------------------ */
/* Safety guard                                                                               */
/* ------------------------------------------------------------------------------------------ */

/**
 * Refuses to run against production — `SITE_ENV=production` or a `DATABASE_URL` host listed in
 * `IMPORT_PROD_GUARD_HOSTS` (comma-separated) — unless `allowProd` (`--i-know-this-is-prod`).
 *
 * @throws Error with the detected environment when the guard trips.
 */
export function assertNotProduction(allowProd: boolean): void {
  const guardHosts = (process.env.IMPORT_PROD_GUARD_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  let dbHost = "";
  try {
    dbHost = new URL(process.env.DATABASE_URL ?? "").hostname.toLowerCase();
  } catch {
    // An unparsable URL fails later in Payload with a clear message.
  }
  const isProd = process.env.SITE_ENV === "production" || guardHosts.includes(dbHost);
  if (isProd && !allowProd) {
    throw new Error(
      `похоже на production (SITE_ENV=${process.env.SITE_ENV ?? "?"}, хост БД ${dbHost || "?"}). ` +
        "Запуск только с флагом --i-know-this-is-prod"
    );
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Errors                                                                                     */
/* ------------------------------------------------------------------------------------------ */

/** Error text for logs and reports; Payload validation errors keep their `data` (field errors). */
export const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const data = (error as { data?: unknown }).data;
    return data ? `${error.message} ${JSON.stringify(data)}` : error.message;
  }
  return String(error);
};

/* ------------------------------------------------------------------------------------------ */
/* Alt texts and import notes                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * Alt text per photo: the source caption, or the deterministic «<name> — фото N».
 * `generated` lists the alts that were made up (the report asks editors to check them).
 */
export function photoAlts(
  name: string,
  photos: ReadonlyArray<{ alt?: string }>
): { alts: string[]; generated: string[] } {
  const generated: string[] = [];
  const alts = photos.map((photo, index) => {
    if (photo.alt?.trim()) return photo.alt.trim();
    const alt = `${name} — фото ${index + 1}`;
    generated.push(alt);
    return alt;
  });
  return { alts, generated };
}

/** Today as `YYYY-MM-DD` (UTC). */
export const today = (): string => new Date().toISOString().slice(0, 10);

/** Date in the first line of import notes («Импорт с inex.su 2026-10-21 (task 37).»). */
export const IMPORT_NOTES_DATE = /^Импорт с inex\.su (\d{4}-\d{2}-\d{2}) /;

/**
 * `importNotes` of a document imported by `import.ts`: header with the date, the source pages,
 * `extra` lines and the parser notes. Pass the original `date` to regenerate notes unchanged.
 */
export function importNotesText(
  oldUrls: readonly string[],
  notes: readonly TextNote[],
  extra: readonly string[] = [],
  date: string = today()
): string {
  const labels: Record<TextNote["kind"], string> = {
    removed: "Удалено из текста (монтаж/замер/под ключ — ТЗ §11)",
    contact: "Удалено из текста (контакты inex.su)",
    flagged: "Проверить (двери остаются на inex.su)",
    "stop-word": "Стоп-слово (ТЗ §11)",
  };
  return [
    `Импорт с inex.su ${date} (task 37).`,
    ...oldUrls.map((url) => `Источник: ${inexUrl(url)}`),
    ...extra,
    ...notes.map((note) => `${labels[note.kind]}: ${note.text}`),
  ].join("\n");
}

/* ------------------------------------------------------------------------------------------ */
/* Stop words                                                                                 */
/* ------------------------------------------------------------------------------------------ */

export interface CmsStopWords {
  /** Built-in rules merged with the CMS list. */
  check: StopWordCheck;
  /** Where the list came from (for the report). */
  source: string;
}

/**
 * Stop-word check with the CMS list (`site-settings.stopWords`, `experienceText`) merged into
 * the built-in rules. Without the global (empty DB) the built-ins alone are used. Logs the source.
 */
export async function loadCmsStopWords(ctx: SeedContext): Promise<CmsStopWords> {
  const settings = await ctx.payload.findGlobal({
    slug: "site-settings",
    depth: 0,
    overrideAccess: true,
  });
  const rows: CmsStopWord[] = (settings.stopWords ?? []).flatMap((row) =>
    row.word?.trim() && row.kind ? [{ word: row.word, kind: row.kind }] : []
  );
  const source =
    rows.length > 0
      ? `встроенные правила + список CMS (site-settings.stopWords: ${rows.length})`
      : "встроенные правила (в site-settings.stopWords пусто)";
  ctx.log(`стоп-слова: ${source}`);
  return {
    check: cmsStopWordCheck({ stopWords: rows, experiencePhrase: settings.experienceText }),
    source,
  };
}
