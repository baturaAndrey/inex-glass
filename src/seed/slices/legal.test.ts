import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain";
import {
  CONSENT,
  CONSENT_PATH,
  LEGAL_PAGES,
  POLICY,
  POLICY_PATH,
  REMOVED_EDITORIAL_NOTES,
} from "../content/legal";

/**
 * Content of the «legal» slice (task 29): the policy and the consent are verbatim teksty/15
 * §1–2 (the lawyer's draft, `[…]` fields kept), minus the two editorial notes; no stop-words
 * (the `experience` rule is not applicable to legal text); the consent links the policy.
 * Verbatim checks are skipped when the handoff folder (`res/`) is not checked out.
 */

const SOURCE_FILE = path.join(
  process.cwd(),
  "res",
  "inex-glass-handoff",
  "teksty",
  "15-politika-pdn.md"
);
const RAW = existsSync(SOURCE_FILE) ? readFileSync(SOURCE_FILE, "utf8") : null;

/** Markdown links keep their label in brackets (`[label](/x/)` → `[label]`, like teksty). */
const toTekstyLinks = (text: string) => text.replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "[$1]");

/** Markdown → comparable text (emphasis and table pipes dropped, whitespace collapsed). */
const normalize = (text: string) =>
  toTekstyLinks(text).replace(/\*+/g, "").replace(/\|/g, " ").replace(/\s+/g, " ").trim();

const SOURCE = RAW === null ? null : normalize(RAW);
const lines = (md: string) => md.split("\n").filter((line) => line.trim() !== "");

const POLICY_STRINGS = [
  POLICY.page.seo.h1,
  ...lines(POLICY.intro),
  POLICY.purposes.heading,
  POLICY.purposes.columns.join(" | "),
  ...POLICY.purposes.rows.map((cells) => cells.join(" | ")),
  ...lines(POLICY.body),
];
const CONSENT_STRINGS = [CONSENT.page.seo.h1, ...lines(CONSENT.body)];

describe("legal content: verbatim teksty/15", () => {
  it.skipIf(SOURCE === null)("policy strings are from teksty", () => {
    expect(POLICY_STRINGS.filter((text) => !SOURCE?.includes(normalize(text)))).toEqual([]);
  });

  it.skipIf(SOURCE === null)("consent strings are from teksty", () => {
    expect(CONSENT_STRINGS.filter((text) => !SOURCE?.includes(normalize(text)))).toEqual([]);
  });

  it.skipIf(RAW === null)("titles match the teksty headers", () => {
    expect(RAW).toContain(`**Title:** ${POLICY.page.seo.title}`);
    expect(RAW).toContain(`**Title:** ${CONSENT.page.seo.title}`);
  });

  it("the policy keeps every section 1–8 and the four purposes", () => {
    const text = `${POLICY.intro}\n${POLICY.body}`;
    for (let n = 1; n <= 8; n += 1) {
      if (n === 3) continue; // section 3 is the heading of the purposes table
      expect(text).toMatch(new RegExp(`^## ${n}\\. `, "m"));
    }
    expect(POLICY.purposes.heading.startsWith("3. ")).toBe(true);
    expect(POLICY.purposes.rows).toHaveLength(4);
    for (const row of POLICY.purposes.rows) expect(row).toHaveLength(4);
  });
});

describe("legal content: editorial rules", () => {
  it("editorial notes and the questions to the lawyer are not on the pages", () => {
    const all = [POLICY.intro, POLICY.body, CONSENT.body].join("\n");
    for (const note of REMOVED_EDITORIAL_NOTES) expect(all).not.toContain(note);
    expect(all).not.toContain("Вопросы юристу");
    expect(all).not.toMatch(/Подтвердить Inex|выяснится иное/);
  });

  it("unfilled fields of the draft stay as they are", () => {
    expect(POLICY.intro).toContain("Редакция от [дата]. Действует с [дата].");
    expect(POLICY.purposes.rows[0]?.[3]).toContain("[3 года]");
    expect(POLICY.body).toContain("[e-mail для обращений по ПДн]");
    expect(CONSENT.body).toContain("[3 года]");
    expect(CONSENT.body).toContain("[e-mail]");
    expect(CONSENT.body).toContain("[почтовый адрес]");
  });

  it("the consent links the policy (last mention of the policy)", () => {
    expect(CONSENT.body.trimEnd().split("\n").at(-1)).toBe(
      `**6.** Я подтверждаю, что ознакомлен с [Политикой обработки персональных данных](${POLICY_PATH}).`
    );
  });

  it("no stop-words (the experience rule does not apply to legal text)", () => {
    for (const text of [POLICY_STRINGS.join("\n"), CONSENT_STRINGS.join("\n")]) {
      expect(checkStopWords(text, { ignoreRules: ["experience"] })).toEqual([]);
    }
  });

  it("two unique legal paths", () => {
    expect(LEGAL_PAGES.map((page) => page.path)).toEqual([POLICY_PATH, CONSENT_PATH]);
  });
});
