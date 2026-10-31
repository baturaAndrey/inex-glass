/**
 * Content rules of ТЗ §11 for the content audit (task 40, §2). Pure: text in, findings out.
 * The stop-word core is the shared `checkStopWords` (task 11); this module adds the audit-only
 * rules (promises, montage, emoji, prices, placeholders, experience wording) and severities.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { checkStopWords, EXPERIENCE_PHRASE } from "@/lib/domain/stop-words";
import type { StopRuleId } from "@/lib/domain/stop-words";
import { fragmentAround } from "./report";
import type { Finding, Severity } from "./report";

/** `site-settings.stopWords[]` row. */
export interface CmsStopWord {
  word: string;
  kind: "stem" | "phrase" | "factory";
}

export interface ContentSettings {
  stopWords: CmsStopWord[];
  experiencePhrase: string;
  /** Reference prices «от», ₽/м² (`prices` global). */
  priceValues: number[];
  /** Where the settings came from (for the report). */
  source: string;
}

export const DEFAULT_SETTINGS: ContentSettings = {
  stopWords: [],
  experiencePhrase: EXPERIENCE_PHRASE,
  priceValues: [700, 750, 800, 1300, 1400, 2000],
  source: "встроенные значения (CMS недоступна): стоп-слова task-11, цены сида 15.10.2026",
};

/** Text unit under check with its context. */
export interface TextUnit {
  text: string;
  /** URL path or document reference. */
  target: string;
  field: string;
  /** Title / meta description / seo fields: 17-meta strings get softer experience findings. */
  isMeta?: boolean;
  /** Expected 17-meta value of this meta field (exact text), if any. */
  metaExpected?: string | null;
  /** The paragraph links to inex.su (the «bridge»): «монтаж под ключ» is allowed there. */
  bridge?: boolean;
  /** Draft-only documents: findings are capped at `warn` (not on the site yet). */
  severityCap?: Severity;
  /** Check unexpanded `{…}` markers (rendered text and meta only; CMS text keeps them). */
  checkPlaceholders?: boolean;
}

const START = "(?<![\\p{L}\\p{N}])";
const END = "(?![\\p{L}\\p{N}])";
const rx = (source: string) => new RegExp(source, "giu");

/** «нет», «не», «без», «ни» as separate words, and the dash form «… — нет». */
const NEGATION = /(?<![\p{L}])(?:нет|не|без|ни)(?![\p{L}])/iu;

interface PatternRule {
  rule: string;
  severity: Severity;
  pattern: RegExp;
  message: string;
}

/** Error-level phrases of ТЗ §11 that the shared stop-word module does not cover. */
const EXTRA_ERROR_RULES: readonly PatternRule[] = [
  {
    rule: "gost-24866",
    severity: "error",
    pattern: rx(`гост\\s*(?:р\\s*)?24866`),
    message: "ГОСТ 24866 (стеклопакеты) не упоминается",
  },
  {
    rule: "own-production",
    severity: "error",
    pattern: rx(`${START}наш\\p{L}*\\s+производств\\p{L}*`),
    message: "Нельзя писать «наше производство»",
  },
  {
    rule: "special-glass",
    severity: "error",
    pattern: rx(`${START}армированн\\p{L}*`),
    message: "Армированное стекло не продаётся (SSoT §14)",
  },
  {
    rule: "special-glass",
    severity: "error",
    pattern: rx(`${START}солнцезащитн\\p{L}*`),
    message: "Солнцезащитное стекло не продаётся (SSoT §14)",
  },
];

/** Promises Inex does not make: warn + context (negations are fine, checked by a human). */
const PROMISE_RULES: readonly PatternRule[] = [
  {
    rule: "promise-urgent",
    severity: "warn",
    pattern: rx(`${START}срочн\\p{L}*\\s+(?:изготовлен|производств)\\p{L}*`),
    message: "Срочного изготовления нет — проверить формулировку (допустимо отрицание)",
  },
  {
    rule: "promise-template",
    severity: "warn",
    pattern: rx(
      `${START}(?:при[её]м\\p{L}*\\s+(?:физическ\\p{L}*\\s+)?шаблон\\p{L}*|(?:физическ|картонн|фанерн)\\p{L}*\\s+шаблон\\p{L}*|по\\s+шаблону\\s+заказчика)`
    ),
    message: "Физические шаблоны не принимаются — проверить формулировку",
  },
  {
    rule: "promise-customer-glass",
    severity: "warn",
    pattern: rx(
      `${START}закал\\p{L}*\\s+(?:вашего|вашем|ваше|давальческ\\p{L}*|своего)\\s+стекл\\p{L}*`
    ),
    message: "Закалка стекла заказчика не выполняется — проверить формулировку",
  },
  {
    rule: "promise-plain-glass",
    severity: "warn",
    pattern: rx(
      `${START}(?:прода\\p{L}*|постав\\p{L}*|предлага\\p{L}*)\\s+(?:обычн|незакал[её]нн|сыр)\\p{L}*\\s+стекл\\p{L}*`
    ),
    message: "Обычное (незакалённое) стекло не продаётся — проверить формулировку",
  },
  {
    rule: "montage",
    severity: "warn",
    pattern: rx(
      `${START}(?:выполня\\p{L}*\\s+монтаж|производим\\s+монтаж|монтируем|установим|смонтируем)${END}`
    ),
    message: "Монтаж не выполняется (допустимо «Монтаж — ваша бригада»)",
  },
  {
    rule: "extra-labels",
    severity: "warn",
    pattern: rx(`${START}(?:хит(?:\\s+продаж)?|новинк\\p{L}*)${END}`),
    message: "Метки «Хит»/«Новинка» не используются",
  },
  {
    rule: "extra-labels",
    severity: "warn",
    pattern: rx(`${START}(?:личн\\p{L}+\\s+кабинет\\p{L}*|корзин\\p{L}*)`),
    message: "Личного кабинета и корзины на сайте нет",
  },
];

/** Shared stop-word rule ids → error (ТЗ §11). */
const STOP_RULE_LABEL: Partial<Record<StopRuleId, string>> = {
  "partner-factory": "partner-factory",
  extra: "stop-word",
};

/** Unexpanded CMS markers (`{цена}`, `{N}`, `{акция_текст}`…). */
export const PLACEHOLDER_PATTERN = /\{[^{}\s][^{}]*\}/gu;

/** Typographic signs that are allowed even when Unicode lists them as pictographic. */
const ALLOWED_SIGNS = new Set(["№", "₽", "×", "−", "±", "≈", "≤", "≥", "→", "·", "©", "®", "™"]);
const EMOJI = /\p{Extended_Pictographic}/gu;

/** Prices with a rouble sign: «1 400 ₽», «от 700 ₽/м²». */
const RUB_AMOUNT = /(\d{1,3}(?:[\s  ]\d{3})+|\d+)(?:[.,]\d+)?[\s  ]*₽/gu;

/** Experience claims: «21 год/лет» near «проект» or «1500» in one sentence. */
const YEARS = /\d+[\s ]*(?:год|года|лет)(?![\p{L}])/iu;
const PROJECTS = /проект|1[\s ]?500/iu;

const normalize = (value: string) =>
  value.replace(/[   ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

function cap(severity: Severity, ceiling: Severity | undefined): Severity {
  if (!ceiling) return severity;
  const order: Severity[] = ["error", "warn", "info"];
  return order.indexOf(severity) < order.indexOf(ceiling) ? ceiling : severity;
}

function sentences(text: string): Array<{ text: string; index: number }> {
  const result: Array<{ text: string; index: number }> = [];
  const re = /[^.!?\n]+(?:[.!?]+|$)/g;
  for (const m of text.matchAll(re)) result.push({ text: m[0], index: m.index });
  return result;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `stem` words of the CMS list: a prefix match (`шпион` → «шпионское»). */
function stemPattern(word: string): RegExp | null {
  const parts = word.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (parts.length === 0) return null;
  return rx(`${START}${parts.join("\\s+")}\\p{L}*`);
}

/** All findings for one text unit (before the allowlist). */
export function checkTextUnit(unit: TextUnit, settings: ContentSettings): Finding[] {
  const { text } = unit;
  if (!text.trim()) return [];
  const findings: Finding[] = [];
  const taken: Array<[number, number]> = [];
  const push = (
    rule: string,
    severity: Severity,
    index: number,
    length: number,
    message: string,
    dedupe = true
  ) => {
    // One finding per place: built-in and CMS lists overlap (e.g. «стеклопакет» in both).
    if (dedupe && taken.some(([a, b]) => index < b && index + length > a)) return;
    if (dedupe) taken.push([index, index + length]);
    findings.push({
      severity: cap(severity, unit.severityCap),
      rule,
      target: unit.target,
      field: unit.field,
      message,
      fragment: fragmentAround(text, index, length),
    });
  };

  const factories = settings.stopWords.filter((w) => w.kind === "factory").map((w) => w.word);
  const phrases = settings.stopWords.filter((w) => w.kind === "phrase").map((w) => w.word);
  const stems = settings.stopWords.filter((w) => w.kind === "stem").map((w) => w.word);

  // 1. Shared stop-word rules (task 11) + CMS factories / phrases. Experience is handled below.
  for (const f of checkStopWords(text, {
    partnerFactories: factories,
    extraStopWords: phrases,
    ignoreRules: ["experience"],
  })) {
    const isTurnkey = f.rule === "turnkey" || /монтаж\p{L}*\s+под\s+ключ/iu.test(f.match);
    if (isTurnkey && unit.bridge) continue;
    push(STOP_RULE_LABEL[f.rule] ?? f.rule, "error", f.index, f.match.length, f.message);
  }
  for (const stem of stems) {
    const pattern = stemPattern(stem);
    if (!pattern) continue;
    for (const m of text.matchAll(pattern)) {
      if (/монтаж/iu.test(stem) && unit.bridge) continue;
      push("stop-word", "error", m.index, m[0].length, `Стоп-слово (основа): «${stem}»`);
    }
  }

  // 2. Audit-only rules.
  for (const rule of EXTRA_ERROR_RULES) {
    for (const m of text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))) {
      push(rule.rule, rule.severity, m.index, m[0].length, rule.message);
    }
  }
  // Promises: «Срочного изготовления нет» is the intended copy. A negation in the same sentence
  // downgrades the finding to `info` (still listed for the human check the spec asks for).
  for (const rule of PROMISE_RULES) {
    for (const m of text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))) {
      const sentence = sentences(text).find(
        (s) => m.index >= s.index && m.index < s.index + s.text.length
      );
      const negated = sentence !== undefined && NEGATION.test(sentence.text);
      push(
        rule.rule,
        negated ? "info" : rule.severity,
        m.index,
        m[0].length,
        negated ? `${rule.message}; найдено отрицание — вероятно, допустимо` : rule.message
      );
    }
  }

  // 3. Experience wording: only the exact phrase from site-settings.
  const allowed = normalize(settings.experiencePhrase);
  for (const sentence of sentences(text)) {
    if (!YEARS.test(sentence.text) || !PROJECTS.test(sentence.text)) continue;
    if (normalize(sentence.text).includes(allowed)) continue;
    const fromMeta17 =
      unit.isMeta === true &&
      unit.metaExpected !== undefined &&
      unit.metaExpected !== null &&
      normalize(unit.metaExpected) === normalize(text);
    push(
      "experience",
      fromMeta17 ? "warn" : "error",
      sentence.index,
      sentence.text.length,
      fromMeta17
        ? `Формулировка опыта из 17-meta расходится с ТЗ §11 («${settings.experiencePhrase}») — вопрос заказчику`
        : `Формулировка опыта — только «${settings.experiencePhrase}»`,
      false
    );
  }

  // 4. Unexpanded markers.
  if (unit.checkPlaceholders) {
    for (const m of text.matchAll(PLACEHOLDER_PATTERN)) {
      push("placeholder", "error", m.index, m[0].length, `Нераскрытая метка ${m[0]}`, false);
    }
  }

  // 5. Emoji.
  for (const m of text.matchAll(EMOJI)) {
    if (ALLOWED_SIGNS.has(m[0])) continue;
    push("emoji", "error", m.index, m[0].length, `Эмодзи «${m[0]}»`, false);
  }

  // 6. Prices outside the reference list.
  const known = new Set(settings.priceValues);
  for (const m of text.matchAll(RUB_AMOUNT)) {
    const value = Number((m[1] ?? "").replace(/[\s  ]/g, ""));
    if (!Number.isFinite(value) || known.has(value)) continue;
    push(
      "price-reference",
      "warn",
      m.index,
      m[0].length,
      `Сумма ${m[0].trim()} не из справочника цен — проверить (пример расчёта / устаревшая цена)`,
      false
    );
  }

  return findings;
}

/** «₽/м²» with a number: the block must carry the price caption with a date. */
export const PRICE_PER_M2 = /\d[\d\s  ]*[\s  ]*₽\/м²/u;
const PRICE_CAPTION_DATE = /Ориентировочн\p{L}*\s+цен\p{L}*\s+на\s+\d{2}\.\d{2}\.\d{4}/u;
const PRICE_CAPTION_CONTRACT = /цена\s+в\s+договоре\s+фиксируется/iu;

/** `null` when the caption is complete, otherwise what is missing. */
export function priceCaptionProblem(blockText: string): string | null {
  const text = blockText.replace(/[  ]/g, " ");
  const hasDate = PRICE_CAPTION_DATE.test(text);
  const hasContract = PRICE_CAPTION_CONTRACT.test(text);
  if (hasDate && hasContract) return null;
  if (!hasDate && !hasContract) return "нет подписи «Ориентировочная цена на ДД.ММ.ГГГГ…»";
  return hasDate
    ? "подпись без «цена в договоре фиксируется»"
    : "подпись без даты «Ориентировочная цена на ДД.ММ.ГГГГ»";
}

// ---------------------------------------------------------------------------------------------
// Allowlist

export interface AllowEntry {
  match: string;
  url?: string;
  rule?: string;
  reason: string;
}

export const ALLOWLIST_FILE = path.join("scripts", "audit", "allowlist.json");

export function loadAllowlist(file = ALLOWLIST_FILE): AllowEntry[] {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`${file}: ожидается массив`);
  return parsed.map((entry, index) => {
    const e = entry as Partial<AllowEntry>;
    if (typeof e.match !== "string" || typeof e.reason !== "string" || !e.reason.trim()) {
      throw new Error(`${file}[${index}]: нужны поля match и reason`);
    }
    return e as AllowEntry;
  });
}

/** Finding target («/path/» or «collection/id /path/») contains the allowlisted URL path. */
const targetHasUrl = (target: string, url: string) =>
  target === url || target.split(/\s+/).includes(url) || target.startsWith(`${url}?`);

export function applyAllowlist(findings: readonly Finding[], allowlist: readonly AllowEntry[]) {
  const kept: Finding[] = [];
  const hits = new Map<AllowEntry, Finding[]>();
  for (const finding of findings) {
    const entry = allowlist.find(
      (a) =>
        (!a.rule || a.rule === finding.rule) &&
        (!a.url || targetHasUrl(finding.target, a.url)) &&
        (finding.fragment ?? "").toLowerCase().includes(a.match.toLowerCase())
    );
    if (!entry) {
      kept.push(finding);
      continue;
    }
    hits.set(entry, [...(hits.get(entry) ?? []), finding]);
  }
  return { kept, hits };
}
