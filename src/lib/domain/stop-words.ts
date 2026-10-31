/**
 * Stop-word check for site content (ТЗ §11): claims Inex Glass must not make. The function only
 * finds matches; the content audit (task 40) and seed tests (task 31) assign severities and
 * per-document exceptions.
 *
 * `\b` does not work with Cyrillic, so word boundaries are explicit look-arounds on letters and
 * digits (`\p{L}`, `\p{N}`, flag `u`).
 */

export const EXPERIENCE_PHRASE = "За 21 год специалисты Inex выполнили более 1500 проектов";

export type StopRuleId =
  | "heat-soak"
  | "hst"
  | "stekloppaket"
  | "own-production"
  | "harden-self"
  | "turnkey"
  | "armored"
  | "smart-glass"
  | "antiglare"
  | "spy"
  | "partner-factory"
  | "extra"
  | "experience";

export interface StopWordOptions {
  /** Partner factory names from `site-settings` (whole words, case-insensitive). */
  partnerFactories?: readonly string[];
  extraStopWords?: readonly string[];
  /** The only allowed experience wording; `EXPERIENCE_PHRASE` by default (from `site-settings`). */
  experiencePhrase?: string;
  /** Rules disabled for a specific document. */
  ignoreRules?: readonly StopRuleId[];
}

export interface StopWordFinding {
  rule: StopRuleId;
  match: string;
  index: number;
  message: string;
}

const START = "(?<![\\p{L}\\p{N}])";
const END = "(?![\\p{L}\\p{N}])";

interface BuiltInRule {
  id: Exclude<StopRuleId, "partner-factory" | "extra" | "experience">;
  pattern: RegExp;
  message: string;
}

const rx = (source: string) => new RegExp(source, "giu");

const BUILT_IN_RULES: readonly BuiltInRule[] = [
  {
    id: "heat-soak",
    pattern: rx(`${START}(?:heat\\s*[- ]?soak|термовыдержк\\p{L}*)`),
    message: "Heat Soak Test / термовыдержка не упоминаются",
  },
  { id: "hst", pattern: rx(`${START}hst${END}`), message: "HST не упоминается" },
  {
    id: "stekloppaket",
    pattern: rx(`${START}стеклопакет\\p{L}*`),
    message: "Стеклопакеты Inex Glass не производит",
  },
  {
    id: "own-production",
    pattern: rx(`${START}собственн\\p{L}*\\s+производств\\p{L}*`),
    message: "Нельзя писать «собственное производство»",
  },
  {
    id: "harden-self",
    pattern: rx(`${START}закаливаем\\s+сам\\p{L}*`),
    message: "Нельзя писать «закаливаем сами»",
  },
  {
    id: "turnkey",
    pattern: rx(`${START}монтаж\\p{L}*\\s+под\\s+ключ${END}`),
    message: "Монтаж под ключ — только как мост на inex.su",
  },
  {
    id: "armored",
    pattern: rx(`${START}бронированн\\p{L}*`),
    message: "Бронированное стекло не продаётся",
  },
  {
    id: "smart-glass",
    pattern: rx(`${START}смарт[-\\s]?стекл\\p{L}*`),
    message: "Смарт-стекло не продаётся",
  },
  {
    id: "antiglare",
    pattern: rx(`${START}антиблик\\p{L}*`),
    message: "Антибликовое стекло не продаётся",
  },
  { id: "spy", pattern: rx(`${START}шпион\\p{L}*`), message: "Стекло-шпион не продаётся" },
];

/**
 * Experience claims in either order: «за 20 лет … 1000 проектов» and «1500+ проектов за 21 год»
 * (meta descriptions, 17-meta).
 */
const EXPERIENCE_PATTERNS: readonly RegExp[] = [
  rx(`${START}за\\s+\\d+\\s+(?:лет|год|года)[^.!?]{0,80}?\\d[\\d\\s]*\\+?\\s*проект\\p{L}*`),
  rx(`${START}\\d[\\d\\s]*\\+?\\s*проект\\p{L}*[^.!?]{0,80}?за\\s+\\d+\\s+(?:лет|года|год)${END}`),
];

const TURNKEY_BRIDGE = /inex\.su/i;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-insensitive pattern for a user-supplied phrase (any whitespace between words). */
function phrasePattern(phrase: string): RegExp | null {
  const words = phrase.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return null;
  return rx(`${START}${words.join("\\s+")}${END}`);
}

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Bounds of the sentence around `index`. A dot ends a sentence only when followed by whitespace
 * or the end of text, so «inex.su» stays inside its sentence.
 */
function sentenceAt(text: string, index: number, length: number): string {
  const terminator = /[!?\n]|\.(?=\s|$)/g;
  let start = 0;
  let end = text.length;
  for (const m of text.matchAll(terminator)) {
    if (m.index < index) start = m.index + 1;
    else if (m.index >= index + length) {
      end = m.index;
      break;
    }
  }
  return text.slice(start, end);
}

function* matchesOf(pattern: RegExp, text: string) {
  // Fresh copy: global regexes are stateful (`lastIndex`).
  yield* text.matchAll(new RegExp(pattern.source, pattern.flags));
}

export function checkStopWords(text: string, opts: StopWordOptions = {}): StopWordFinding[] {
  const ignored = new Set(opts.ignoreRules ?? []);
  const findings: StopWordFinding[] = [];
  const add = (rule: StopRuleId, match: string, index: number, message: string) => {
    if (!ignored.has(rule)) findings.push({ rule, match, index, message });
  };

  for (const rule of BUILT_IN_RULES) {
    if (ignored.has(rule.id)) continue;
    for (const m of matchesOf(rule.pattern, text)) {
      if (rule.id === "turnkey" && TURNKEY_BRIDGE.test(sentenceAt(text, m.index, m[0].length))) {
        continue;
      }
      add(rule.id, m[0], m.index, rule.message);
    }
  }

  const phraseRules: Array<[StopRuleId, readonly string[] | undefined, string]> = [
    ["partner-factory", opts.partnerFactories, "Названия заводов-партнёров не упоминаются"],
    ["extra", opts.extraStopWords, "Стоп-слово"],
  ];
  for (const [rule, phrases, message] of phraseRules) {
    if (ignored.has(rule)) continue;
    for (const phrase of phrases ?? []) {
      const pattern = phrasePattern(phrase);
      if (!pattern) continue;
      for (const m of matchesOf(pattern, text)) add(rule, m[0], m.index, `${message}: «${phrase}»`);
    }
  }

  if (!ignored.has("experience")) {
    const allowed = normalizeSpaces(opts.experiencePhrase ?? EXPERIENCE_PHRASE);
    const taken: Array<[number, number]> = [];
    for (const pattern of EXPERIENCE_PATTERNS) {
      for (const m of matchesOf(pattern, text)) {
        const from = m.index;
        const to = from + m[0].length;
        // Both patterns can catch the same claim; report it once.
        if (taken.some(([a, b]) => from < b && to > a)) continue;
        taken.push([from, to]);
        if (normalizeSpaces(m[0]) === allowed) continue;
        add(
          "experience",
          m[0],
          from,
          `Формулировка опыта — только «${opts.experiencePhrase ?? EXPERIENCE_PHRASE}»`
        );
      }
    }
  }

  return findings.sort((a, b) => a.index - b.index);
}
