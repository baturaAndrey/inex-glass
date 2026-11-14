/**
 * Stop-word check of imported inex.su texts (task 37, wave-6 review): the built-in rules of
 * `checkStopWords` (task 11) PLUS the editable list `site-settings.stopWords` from the CMS —
 * partner factories, phrases and word stems — and the CMS experience wording. Pure: the caller
 * loads the global (`loadCmsStopWords` in `import.ts`) and passes the rows in.
 */
import { checkStopWords, EXPERIENCE_PHRASE } from "@/lib/domain/stop-words";

import type { StopWordCheck } from "./parse-objects";

/** `site-settings.stopWords[]` row (`kind` as in the schema select). */
export interface CmsStopWord {
  word: string;
  kind: "stem" | "phrase" | "factory";
}

export interface CmsStopWordSettings {
  stopWords: readonly CmsStopWord[];
  /** `site-settings.experienceText`; the built-in phrase when empty. */
  experiencePhrase?: string | null;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A stem matches at a word start and may continue with letters («стеклопакет» → «…ами»). */
function stemPattern(stem: string): RegExp | null {
  const words = stem.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])${words.join("\\s+")}\\p{L}*`, "giu");
}

/**
 * The combined check. CMS factories and phrases go through `checkStopWords` (whole words);
 * stems are matched here. A place found by two rules (the CMS list repeats the built-ins:
 * «стеклопакет», «монтаж под ключ») is reported once.
 */
export function cmsStopWordCheck(settings: CmsStopWordSettings): StopWordCheck {
  const words = (kind: CmsStopWord["kind"]) =>
    settings.stopWords.filter((row) => row.kind === kind && row.word.trim()).map((row) => row.word);
  const stems = words("stem")
    .map((stem) => ({ stem, pattern: stemPattern(stem) }))
    .filter((item): item is { stem: string; pattern: RegExp } => item.pattern !== null);
  const experiencePhrase = settings.experiencePhrase?.trim() || EXPERIENCE_PHRASE;

  return (text) => {
    const found: Array<{ match: string; message: string; index: number }> = [
      ...checkStopWords(text, {
        partnerFactories: words("factory"),
        extraStopWords: words("phrase"),
        experiencePhrase,
      }),
    ];
    for (const { stem, pattern } of stems) {
      for (const m of text.matchAll(pattern)) {
        found.push({ match: m[0], index: m.index, message: `Стоп-слово (основа): «${stem}»` });
      }
    }
    found.sort((a, b) => a.index - b.index);
    const taken: Array<[number, number]> = [];
    return found.filter(({ index, match }) => {
      const end = index + match.length;
      if (taken.some(([from, to]) => index < to && end > from)) return false;
      taken.push([index, end]);
      return true;
    });
  };
}
