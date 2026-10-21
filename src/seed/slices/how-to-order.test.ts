import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain";
import { splitStepText } from "@/lib/service/page-compose";
import {
  HOW_TO_ORDER_PAGES,
  PAYMENT_TERMS_COLUMNS,
  TEKSTY_HOW_TO_ORDER,
  TEKSTY_SERVICE,
} from "../content/how-to-order";
import type {
  ServiceBlock,
  ServiceButton,
  ServicePageSeed,
  TekstySource,
} from "../content/how-to-order";

/**
 * Content of the «how-to-order» slice (task 28):
 * (a) every string is verbatim from teksty (body) or 17-meta (H1 / Title / Description);
 * (b) no stop-words (ТЗ §11), no editorial marks;
 * (c) 10 unique paths with a trailing slash.
 * The verbatim checks are skipped when the handoff folder (`res/`) is not checked out.
 */

const ROOT = process.cwd();
const TEKSTY_DIR = path.join(ROOT, "res", "inex-glass-handoff", "teksty");
const META_FILE = path.join(ROOT, "docs", "inex", "17-meta.md");

/**
 * Markdown → comparable text: links keep their label, emphasis / list / heading markers, «→»
 * arrows and escaped pipes are removed, whitespace collapsed.
 */
function normalize(text: string): string {
  return text
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\\\|/g, "|")
    .replace(/\*+/g, "")
    .replace(/→/g, " ")
    .replace(/[[\]]/g, "")
    .replace(/^\s*(?:#{1,6}\s+|-\s+|\d+\.\s+)/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readSource(file: string): string | null {
  return existsSync(file) ? normalize(readFileSync(file, "utf8")) : null;
}

const buttonLabel = (button: ServiceButton) => button.label;

/** Every visible string of a block; markdown is split into lines (each checked on its own). */
function blockStrings(block: ServiceBlock): string[] {
  const lines = (md: string | undefined) => (md ?? "").split("\n").filter((line) => line.trim());
  switch (block.type) {
    case "hero":
      return [...lines(block.lead), ...block.buttons.map(buttonLabel)];
    case "richText":
      return [...(block.heading ? [block.heading] : []), ...lines(block.markdown)];
    case "table": {
      const headerless = block.columns === PAYMENT_TERMS_COLUMNS;
      return [
        ...(block.heading ? [block.heading] : []),
        ...(headerless ? [] : block.columns),
        ...block.rows.flat().map((cell) => (typeof cell === "string" ? cell : cell.value)),
        ...(block.footnote ? [block.footnote] : []),
      ];
    }
    case "callout":
      return [...(block.title ? [block.title] : []), ...(block.items ?? []), ...lines(block.body)];
    case "steps":
      return [
        ...(block.heading ? [block.heading] : []),
        ...block.items.flatMap((item) => {
          const { text, links } = splitStepText(item.text);
          return [
            item.title,
            ...(text ? [text] : []),
            ...links.map((link) => link.label),
            ...(item.link ? [item.link.label] : []),
          ];
        }),
      ];
    case "holesCalculator":
      return [];
    case "download":
      return block.items.map((item) => item.title);
    case "cta":
      return block.buttons.map(buttonLabel);
    case "form":
      return [block.label];
  }
}

const bodyStrings = (page: ServicePageSeed) => [
  page.breadcrumbLabel,
  ...page.layout.flatMap(blockStrings),
];

const allText = HOW_TO_ORDER_PAGES.flatMap((page) => [
  ...Object.values(page.seo),
  ...bodyStrings(page),
]).join("\n");

describe("how-to-order content", () => {
  const sources: Record<TekstySource, string | null> = {
    [TEKSTY_HOW_TO_ORDER]: readSource(path.join(TEKSTY_DIR, TEKSTY_HOW_TO_ORDER)),
    [TEKSTY_SERVICE]: readSource(path.join(TEKSTY_DIR, TEKSTY_SERVICE)),
  };
  const meta = readSource(META_FILE);

  it.skipIf(!sources[TEKSTY_HOW_TO_ORDER] || !sources[TEKSTY_SERVICE])(
    "copies every body string verbatim from teksty",
    () => {
      for (const page of HOW_TO_ORDER_PAGES) {
        const source = sources[page.source] ?? "";
        const missing = bodyStrings(page)
          .map(normalize)
          .filter((text) => text !== "" && !source.includes(text));
        expect(missing, `${page.path} (${page.source})`).toEqual([]);
      }
    }
  );

  it.skipIf(!meta)("takes H1, Title and Description from 17-meta", () => {
    for (const page of HOW_TO_ORDER_PAGES) {
      for (const [field, value] of Object.entries(page.seo)) {
        expect(meta, `${page.path} seo.${field}`).toContain(normalize(value));
      }
    }
  });

  it("contains no stop-words", () => {
    expect(checkStopWords(allText)).toEqual([]);
  });

  it("contains no editorial marks, Heat Soak or insulated glass units", () => {
    expect(allText).not.toMatch(/ждёт ответа|\[уточнить\]|heat\s*soak|стеклопакет/i);
  });

  it("has 10 unique paths with a trailing slash", () => {
    const paths = HOW_TO_ORDER_PAGES.map((page) => page.path);
    expect(paths).toHaveLength(10);
    expect(new Set(paths).size).toBe(10);
    for (const pagePath of paths) expect(pagePath).toMatch(/^\/[a-z0-9-/]+\/$/);
  });

  it("puts the hub first and pages 2–9 under it", () => {
    const [hub, ...rest] = HOW_TO_ORDER_PAGES;
    expect(hub?.path).toBe("/kak-zakazat/");
    for (const page of rest) {
      expect(page.child, page.path).toBe(page.path.startsWith("/kak-zakazat/"));
    }
  });
});
