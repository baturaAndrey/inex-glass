import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain";
import {
  GLASS_TYPES_CONTENT,
  GLASS_TYPE_SLUGS,
  layoutBackgrounds,
  type GlassTypeContent,
} from "../content/glass-types";

/**
 * Content of the glass-type pages (task 24) against its sources: verbatim teksty, 17-meta,
 * forbidden wording (ТЗ §11) and link format. Pure data — Payload is not booted.
 */

const ROOT = path.resolve(import.meta.dirname, "../../..");
const TEKSTY_DIR = path.join(ROOT, "res/inex-glass-handoff/teksty");
const META_FILE = path.join(ROOT, "docs/inex/17-meta.md");
const HAS_TEKSTY = existsSync(TEKSTY_DIR);

/** Comparable text: markdown links/bold, arrows and spacing removed. */
function normalize(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/→/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Section of a teksty file: from the `# N. …` heading to the next one. */
function tekstySection(doc: GlassTypeContent): string {
  const file = readFileSync(path.join(TEKSTY_DIR, doc.source.file), "utf8");
  if (doc.source.section === null) return file;
  const start = file.indexOf(doc.source.section);
  if (start < 0) throw new Error(`${doc.slug}: раздел «${doc.source.section}» не найден`);
  const rest = file.slice(start + doc.source.section.length);
  const end = rest.search(/\n# \d+\. /);
  return end < 0 ? rest : rest.slice(0, end);
}

/** Lines of copy of a document (markdown fragments split by line and list markers). */
function copyFragments(doc: GlassTypeContent): string[] {
  const out: string[] = [doc.intro];
  const add = (value: string | undefined) => {
    if (value) out.push(value);
  };
  add(doc.variantsHeading);
  for (const variant of doc.variants ?? []) {
    add(variant.name);
    add(variant.description);
    add(variant.application);
  }
  add(doc.variantsNote);
  add(doc.variantsCallout?.title);
  add(doc.variantsCallout?.body);
  for (const table of doc.tables ?? []) {
    add(table.heading);
    add(table.lead);
    add(table.footnote);
    for (const column of table.columns) add(column.label);
    for (const row of table.rows)
      for (const cell of row) add(typeof cell === "string" ? cell : cell.value);
  }
  for (const item of doc.importantItems ?? []) {
    add(item.lead);
    add(item.text);
  }
  for (const block of doc.layout ?? []) {
    if (block.kind === "richText") {
      add(block.heading);
      add(block.md);
    } else {
      add(block.title);
      for (const item of block.items) {
        add(item.lead);
        add(item.text);
      }
    }
  }
  for (const item of doc.applications ?? []) {
    add(item.text);
    add(item.link?.label);
  }
  for (const item of doc.relatedLinks ?? []) add(item.label);
  for (const item of doc.faq ?? []) {
    add(item.question);
    add(item.answer);
  }
  return out
    .flatMap((text) => text.split("\n"))
    .map((line) => normalize(line.replace(/^\s*-\s+/, "")))
    .filter((line) => line !== "");
}

/** Every string of a document (stop-word check). */
function allText(doc: GlassTypeContent): string {
  return [
    doc.title,
    doc.breadcrumbLabel,
    doc.card.title,
    doc.card.text ?? "",
    doc.seo.h1,
    doc.seo.title,
    doc.seo.description,
    ...(doc.heroPhotoCaptions ?? []),
    ...copyFragments(doc),
  ].join("\n");
}

/** Every link URL of a document (structured links and markdown links). */
function allLinks(doc: GlassTypeContent): string[] {
  const urls = [
    ...(doc.applications ?? []).flatMap((item) => (item.link ? [item.link.url] : [])),
    ...(doc.relatedLinks ?? []).map((item) => item.url),
  ];
  const markdown = JSON.stringify(doc);
  for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) urls.push(match[1] ?? "");
  return urls;
}

interface MetaRow {
  h1: string;
  title: string;
  description: string;
}

/** Rows of the 17-meta tables: `| /url/ | H1 | Title | Description | … |`. */
function metaRows(): Map<string, MetaRow> {
  const rows = new Map<string, MetaRow>();
  for (const line of readFileSync(META_FILE, "utf8").split("\n")) {
    const cells = line
      .replace(/\\\|/g, "\u0000")
      .split("|")
      .map((cell) => cell.replace(/\u0000/g, "|").trim());
    const url = cells[1];
    if (!url?.startsWith("/")) continue;
    rows.set(url, { h1: cells[2] ?? "", title: cells[3] ?? "", description: cells[4] ?? "" });
  }
  return rows;
}

describe("glass-types content", () => {
  it("has the eight documents with the expected URLs", () => {
    expect(GLASS_TYPES_CONTENT.map((doc) => doc.slug).sort()).toEqual([...GLASS_TYPE_SLUGS].sort());
    for (const doc of GLASS_TYPES_CONTENT) {
      if (doc.slug === "tripleks") {
        expect(doc.urlBase).toBe("root");
        expect(doc.path).toBe("/tripleks/");
      } else {
        expect(doc.urlBase).toBe("zakalennoe-steklo");
        expect(doc.path).toBe(`/zakalennoe-steklo/${doc.slug}/`);
      }
    }
    expect(new Set(GLASS_TYPES_CONTENT.map((doc) => doc.order)).size).toBe(8);
  });

  it("takes H1, title and description from 17-meta verbatim", () => {
    const meta = metaRows();
    for (const doc of GLASS_TYPES_CONTENT) {
      const row = meta.get(doc.path);
      expect(row, doc.path).toBeDefined();
      expect(doc.seo).toEqual(row);
    }
  });

  it.skipIf(!HAS_TEKSTY)("copies every line of copy from its teksty section", () => {
    for (const doc of GLASS_TYPES_CONTENT) {
      const section = normalize(tekstySection(doc));
      for (const fragment of copyFragments(doc)) {
        expect(section, `${doc.slug}: «${fragment}»`).toContain(fragment);
      }
    }
  });

  it.skipIf(!HAS_TEKSTY)("takes hub card texts from teksty/02", () => {
    const hub = normalize(readFileSync(path.join(TEKSTY_DIR, "02-zakalennoe-steklo.md"), "utf8"));
    for (const doc of GLASS_TYPES_CONTENT) {
      if (doc.card.text) expect(hub, doc.slug).toContain(doc.card.text);
    }
  });

  it("contains no forbidden wording (ТЗ §11) and no editor notes", () => {
    for (const doc of GLASS_TYPES_CONTENT) {
      const text = allText(doc);
      expect(checkStopWords(text), doc.slug).toEqual([]);
      expect(text, doc.slug).not.toMatch(/\[Фото|ждёт ответа|фацет/i);
    }
  });

  it("links internally, lower case, with a trailing slash (or the #vidy anchor)", () => {
    for (const doc of GLASS_TYPES_CONTENT) {
      for (const url of allLinks(doc)) {
        expect(url, doc.slug).toMatch(/^\/(?:[a-z0-9-]+\/)*(?:#vidy)?$/);
        if (url.includes("#")) expect(url).toBe("/zakalennoe-steklo/#vidy");
      }
    }
  });

  it("highlights four rows for осветлённое and gives рифлёное five patterns", () => {
    const osvetlennoe = GLASS_TYPES_CONTENT.find((doc) => doc.slug === "osvetlennoe");
    const positive = (osvetlennoe?.tables ?? []).flatMap((table) =>
      table.rows.filter((row) => row.some((cell) => typeof cell !== "string" && cell.positive))
    );
    expect(positive).toHaveLength(4);

    const riflenoe = GLASS_TYPES_CONTENT.find((doc) => doc.slug === "riflenoe");
    const patterns = (riflenoe?.variants ?? []).filter(
      (variant) => variant.swatchKind === "pattern" && variant.patternKey
    );
    expect(patterns.map((variant) => variant.patternKey)).toEqual([
      "moru",
      "fluts",
      "shinshilla",
      "delta",
      "krizet",
    ]);
    expect(patterns.every((variant) => variant.application)).toBe(true);
  });

  it("has FAQ exactly on матовое, тонированное, осветлённое, рифлёное", () => {
    const withFaq = GLASS_TYPES_CONTENT.filter((doc) => (doc.faq?.length ?? 0) > 0)
      .map((doc) => `${doc.slug}:${doc.faq?.length}`)
      .sort();
    expect(withFaq).toEqual(["matovoe:3", "osvetlennoe:2", "riflenoe:3", "tonirovannoe:2"]);
  });

  it("continues the bg ↔ sf rhythm of the template in the layout blocks", () => {
    const osvetlennoe = GLASS_TYPES_CONTENT.find((doc) => doc.slug === "osvetlennoe");
    // hero bg → table sf → important bg → layout sf.
    expect(osvetlennoe && layoutBackgrounds(osvetlennoe)).toEqual(["sf"]);
    const matovoe = GLASS_TYPES_CONTENT.find((doc) => doc.slug === "matovoe");
    // hero bg → table sf → layout bg, sf, bg.
    expect(matovoe && layoutBackgrounds(matovoe)).toEqual(["bg", "sf", "bg"]);
  });
});
