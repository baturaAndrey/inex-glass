import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords, EXPERIENCE_PHRASE } from "@/lib/domain";
import {
  COMPANY,
  CONTACTS,
  CONTRACTORS,
  DESIGNERS,
  DEVELOPERS,
  FURNITURE,
  HUB,
  KLIENTAM_COMPANY_PAGES,
  TEAM,
  type PageEntry,
} from "../content/klientam-company";
import { LEGAL_PAGES } from "../content/legal";

/**
 * Content of the «klientam-company» slice (task 29):
 * (a) body strings are verbatim from teksty, H1 / Title / Description from 17-meta;
 * (b) no stop-words (ТЗ §11), the experience wording is exact;
 * (c) no `[` left in the text (unfilled fields are allowed on the legal pages only);
 * (d) the 8 paths of the slice plus the 2 legal paths are unique.
 * Verbatim checks are skipped when the handoff folder (`res/`) is not checked out.
 */

const ROOT = process.cwd();
const TEKSTY_DIR = path.join(ROOT, "res", "inex-glass-handoff", "teksty");
const META_FILE = path.join(ROOT, "docs", "inex", "17-meta.md");

/** Markdown links keep their label; `[label]` markers of teksty lose the brackets. */
const stripLinks = (text: string) => text.replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1");

/**
 * Markdown → comparable text: links / link markers keep their label, emphasis, list and heading
 * markers and table pipes are removed, escaped pipes unescaped, whitespace collapsed.
 */
function normalize(text: string): string {
  return stripLinks(text)
    .replace(/\\\|/g, "|")
    .replace(/\*+/g, "")
    .replace(/[[\]]/g, "")
    .replace(/^\s*(?:#{1,6}\s+|-\s+|\d+\.\s+)/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readNormalized(file: string): string | null {
  return existsSync(file) ? normalize(readFileSync(file, "utf8")) : null;
}

const teksty = (name: string) => readNormalized(path.join(TEKSTY_DIR, name));
const TEKSTY_09 = teksty("09-konstrukcii-klientam.md");
const TEKSTY_17 = teksty("17-matirovanie-markirovka-listingi.md");
const TEKSTY_06 = teksty("06-kompaniya-kontakty.md");
const META = existsSync(META_FILE) ? readFileSync(META_FILE, "utf8") : null;

const lines = (md: string) => md.split("\n").filter((line) => line.trim() !== "");

/** Text checked against teksty: one entry per paragraph / list item / cell. */
const VERBATIM: Array<[string, string | null, string[]]> = [
  [
    "/klientam/",
    TEKSTY_17,
    [
      HUB.lead,
      ...HUB.columns,
      ...HUB.rows.flatMap((row) => [`${row.segment} → ${HUB.moreLabel}`, row.task, row.take]),
      HUB.bridge,
    ],
  ],
  [
    "/klientam/podryadchikam/",
    TEKSTY_09,
    [
      CONTRACTORS.lead,
      CONTRACTORS.problems.heading,
      ...CONTRACTORS.problems.columns,
      ...CONTRACTORS.problems.rows.map((cells) => cells.join(" | ")),
      CONTRACTORS.start.heading,
      ...lines(CONTRACTORS.start.markdown),
      CONTRACTORS.secondaryLabel,
    ],
  ],
  [
    "/klientam/proizvoditelyam-mebeli/",
    TEKSTY_09,
    [
      FURNITURE.lead,
      FURNITURE.series.heading,
      ...lines(FURNITURE.series.markdown),
      FURNITURE.types.heading,
      FURNITURE.types.markdown,
      FURNITURE.secondaryLabel,
    ],
  ],
  [
    "/klientam/zastrojshchikam/",
    TEKSTY_09,
    [
      DEVELOPERS.lead,
      DEVELOPERS.benefits.heading,
      ...lines(DEVELOPERS.benefits.markdown),
      DEVELOPERS.objects.heading,
      DEVELOPERS.objects.markdown,
      DEVELOPERS.secondaryLabel,
    ],
  ],
  [
    "/klientam/dizajneram-i-arhitektoram/",
    TEKSTY_09,
    [
      DESIGNERS.lead,
      DESIGNERS.solutions.heading,
      DESIGNERS.solutions.columns.join(" | "),
      ...DESIGNERS.solutions.rows.map((cells) => cells.join(" | ")),
      DESIGNERS.process.heading,
      ...lines(DESIGNERS.process.markdown),
      DESIGNERS.secondaryLabel,
    ],
  ],
  [
    "/o-kompanii/",
    TEKSTY_06,
    [
      COMPANY.lead,
      COMPANY.experience,
      COMPANY.roles.heading,
      COMPANY.roles.columns.join(" | "),
      ...COMPANY.roles.rows.map((cells) => cells.join(" | ")),
      ...lines(COMPANY.about),
      COMPANY.clients.heading,
      COMPANY.clients.items.map((item) => item.label).join(" · "),
      COMPANY.inexSu.heading,
      `${COMPANY.inexSu.text} ${COMPANY.inexSu.linkLabel}`,
      COMPANY.objects.heading,
      `${COMPANY.objects.text} ${COMPANY.objects.linkLabel}`,
    ],
  ],
  ["/kontakty/", TEKSTY_06, [CONTACTS.form.heading, CONTACTS.form.sub, CONTACTS.form.submitLabel]],
];

/** All visible copy of a page for the stop-word and bracket checks. */
const PAGE_TEXT: Record<string, string> = Object.fromEntries(
  VERBATIM.map(([pagePath, , strings]) => [pagePath, stripLinks(strings.join("\n"))])
);
PAGE_TEXT[TEAM.page.path] = TEAM.intro;

const seoText = (page: PageEntry) =>
  [page.seo.h1, page.seo.title, page.seo.description ?? ""].join("\n");

describe("klientam-company content: verbatim teksty", () => {
  for (const [pagePath, source, strings] of VERBATIM) {
    it.skipIf(source === null)(`${pagePath}: every string is from teksty`, () => {
      const missing = strings.filter((text) => !source?.includes(normalize(text)));
      expect(missing).toEqual([]);
    });
  }

  it.skipIf(TEKSTY_09 === null)("segment placeholders come from teksty", () => {
    expect(TEKSTY_09).toContain("{условия} · {акция_текст}");
    expect(CONTRACTORS.closing).toBe("{условия}\n\n{акция_текст}");
    for (const segment of [FURNITURE, DEVELOPERS, DESIGNERS]) {
      expect(segment.closing).toBe("{условия}");
    }
  });

  it.skipIf(TEKSTY_06 === null)("editorial notes of teksty are not copied", () => {
    const all = Object.values(PAGE_TEXT).join("\n");
    expect(all).not.toMatch(/Блок публикуется/);
    expect(all).not.toMatch(/ждёт ответа/);
  });
});

describe("klientam-company content: 17-meta", () => {
  for (const page of KLIENTAM_COMPANY_PAGES) {
    it.skipIf(META === null)(`${page.path}: H1 / Title / Description`, () => {
      const row = META?.split("\n").find((line) => line.startsWith(`| ${page.path} |`));
      expect(row, `17-meta row for ${page.path}`).toBeDefined();
      const cells = (row ?? "")
        .split(/(?<!\\)\|/)
        .slice(1, -1)
        .map((cell) => cell.trim().replace(/\\\|/g, "|"));
      expect(cells[1]).toBe(page.seo.h1);
      expect(cells[2]).toBe(page.seo.title);
      expect(cells[3]).toBe(page.seo.description);
    });
  }
});

describe("klientam-company content: wording rules", () => {
  for (const page of KLIENTAM_COMPANY_PAGES) {
    it(`${page.path}: no stop-words in body and meta`, () => {
      const text = `${PAGE_TEXT[page.path] ?? ""}\n${seoText(page)}`;
      expect(checkStopWords(text)).toEqual([]);
    });

    it(`${page.path}: no «[» and no unknown «{…}» in the text`, () => {
      const text = `${PAGE_TEXT[page.path] ?? ""}\n${seoText(page)}`;
      expect(text).not.toContain("[");
      expect(text.replace(/\{(?:условия|акция_текст)\}/g, "")).not.toMatch(/[{}]/);
    });
  }

  it("the experience wording is exact on /o-kompanii/ and /klientam/zastrojshchikam/", () => {
    expect(COMPANY.experience.startsWith(EXPERIENCE_PHRASE)).toBe(true);
    expect(DEVELOPERS.lead).toContain(EXPERIENCE_PHRASE);
  });

  it("«под ключ» is only the bridge to inex.su", () => {
    expect(checkStopWords(COMPANY.inexSu.text)).toEqual([]);
    expect(COMPANY.inexSu.text).toContain("inex.su");
  });
});

describe("klientam-company pages", () => {
  it("8 slice paths + 2 legal paths are unique, with leading and trailing slashes", () => {
    const paths = [...KLIENTAM_COMPANY_PAGES, ...LEGAL_PAGES].map((page) => page.path);
    expect(paths).toHaveLength(10);
    expect(new Set(paths).size).toBe(paths.length);
    for (const value of paths) expect(value).toMatch(/^\/(?:[a-z0-9-]+\/)+$/);
  });

  it("children follow their parents and their path is parent + slug", () => {
    const seen = new Set<string>();
    for (const page of KLIENTAM_COMPANY_PAGES) {
      if (page.parentPath) {
        expect(seen.has(page.parentPath)).toBe(true);
        expect(page.path).toBe(`${page.parentPath}${page.slug}/`);
      } else {
        expect(page.path).toBe(`/${page.slug}/`);
      }
      seen.add(page.path);
    }
  });

  it("the hub table links every segment page", () => {
    const segmentPaths = [CONTRACTORS, FURNITURE, DEVELOPERS, DESIGNERS].map((s) => s.page.path);
    expect(HUB.rows.map((row) => row.href)).toEqual(segmentPaths);
  });
});
