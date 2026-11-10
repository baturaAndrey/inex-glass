import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain";
import { EDGE_TERMINOLOGY_APPROVED_STRINGS } from "../content/edge-terminology";
import {
  EMPTY_HEADER,
  GLASS_TYPES_CONTENT,
  GLASS_TYPE_SLUGS,
  type GlassTypeContent,
  type LayoutContent,
} from "../content/glass-types";

/**
 * Content of the glass-type pages (task 24, Paper mockups `2560_glass_*`) against its sources:
 * verbatim teksty (`copy.source: "teksty"`) or the mockup with its «[уточнить]» list
 * (`copy.source: "paper"`), 17-meta, forbidden wording (ТЗ §11), link format, seed images and
 * the section shapes of the new design. Pure data — Payload is not booted.
 */

const ROOT = path.resolve(import.meta.dirname, "../../..");
const TEKSTY_DIR = path.join(ROOT, "res/inex-glass-handoff/teksty");
const META_FILE = path.join(ROOT, "docs/inex/17-meta.md");
const DRAFTS_FILE = path.join(ROOT, "docs/inex/drafts/service-pages-paper-drafts.md");
const MEDIA_DIR = path.join(ROOT, "src/seed/media/glass-types");
const HAS_TEKSTY = existsSync(TEKSTY_DIR);

/** Comparable text: markdown links/bold/headings/quotes, arrows and spacing removed. */
function normalize(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
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

function layoutTexts(block: LayoutContent): string[] {
  switch (block.kind) {
    case "richText":
      return [
        block.heading ?? "",
        block.md,
        block.figure?.caption ?? "",
        block.table?.caption ?? "",
        block.table?.footnote ?? "",
        ...(block.table?.columns ?? []),
        ...(block.table?.rows.flat() ?? []),
      ];
    case "callout":
      return [block.title ?? "", ...block.items.flatMap((item) => [item.lead ?? "", item.text])];
    case "cards":
      return [
        block.heading,
        block.sub ?? "",
        ...block.items.flatMap((item) => [item.title, item.text ?? ""]),
      ];
    case "table": {
      const { table } = block;
      return [
        table.heading,
        table.lead ?? "",
        table.footnote ?? "",
        ...table.columns.map((column) => column.label),
        ...table.rows.flat().map((cell) => (typeof cell === "string" ? cell : cell.value)),
      ];
    }
    case "twoColumns":
      return [block.left, ...(block.right ? [block.right] : [])].flatMap((column) => [
        column.heading,
        column.md,
      ]);
  }
}

/** Lines of copy of a document (markdown fragments split by line and list markers). */
function copyFragments(doc: GlassTypeContent): string[] {
  const out: string[] = [doc.intro];
  const add = (value: string | undefined) => {
    if (value) out.push(value);
  };
  for (const spec of doc.specs ?? []) {
    add(spec.label);
    add(spec.value);
    add(spec.text);
  }
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
    layoutTexts({ kind: "table", table }).forEach(add);
  }
  for (const item of doc.importantItems ?? []) {
    add(item.lead);
    add(item.text);
  }
  add(doc.importantButton?.label);
  for (const block of doc.layout ?? []) layoutTexts(block).forEach(add);
  for (const item of doc.applications ?? []) {
    add(item.text);
    add(item.link?.label);
  }
  for (const item of doc.relatedLinks ?? []) add(item.label);
  for (const item of doc.faq ?? []) {
    add(item.question);
    add(item.answer);
  }
  return toCopyLines(out.filter((text) => text !== EMPTY_HEADER));
}

/** Texts → comparable lines: split by line, list marker dropped, normalized, empty dropped. */
function toCopyLines(texts: readonly string[]): string[] {
  return texts
    .flatMap((text) => text.split("\n"))
    .map((line) => normalize(line.replace(/^\s*(?:-|\d+\.)\s+/, "")))
    .filter((line) => line !== "");
}

/**
 * Client-approved edge terminology of 2026-11-08 (`EDGE_TERMINOLOGY_APPROVED_STRINGS`), as
 * copy lines: exempt from the verbatim teksty check only.
 */
const EDGE_APPROVED_LINES = toCopyLines(EDGE_TERMINOLOGY_APPROVED_STRINGS["glass-types"]);
const edgeApproved = new Set(EDGE_APPROVED_LINES);

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
    doc.heroImage?.alt ?? "",
    ...(doc.heroPhotos ?? []).map((photo) => photo.caption),
    ...copyFragments(doc),
  ].join("\n");
}

/** Every link URL of a document (structured links and markdown links). */
function allLinks(doc: GlassTypeContent): string[] {
  const urls = [
    ...(doc.applications ?? []).flatMap((item) => (item.link ? [item.link.url] : [])),
    ...(doc.relatedLinks ?? []).map((item) => item.url),
    ...(doc.importantButton ? [doc.importantButton.url] : []),
    ...(doc.layout ?? []).flatMap((block) =>
      block.kind === "cards" ? block.items.flatMap((item) => (item.href ? [item.href] : [])) : []
    ),
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

const tekstyDocs = GLASS_TYPES_CONTENT.filter((doc) => doc.copy.source === "teksty");
const bySlug = (slug: string) => GLASS_TYPES_CONTENT.find((doc) => doc.slug === slug)!;

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

  it.skipIf(!HAS_TEKSTY)("teksty documents copy every line from their teksty section", () => {
    for (const doc of tekstyDocs) {
      const section = normalize(tekstySection(doc));
      for (const fragment of copyFragments(doc).filter((line) => !edgeApproved.has(line))) {
        expect(section, `${doc.slug}: «${fragment}»`).toContain(fragment);
      }
    }
  });

  it("mockup documents: every «[уточнить]» statement is in the copy and in the drafts doc", () => {
    const drafts = existsSync(DRAFTS_FILE) ? normalize(readFileSync(DRAFTS_FILE, "utf8")) : null;
    for (const doc of GLASS_TYPES_CONTENT) {
      expect(JSON.stringify(doc), doc.slug).not.toMatch(/уточнить/i);
      if (doc.copy.source !== "paper") continue;
      expect(doc.copy.mockup).toBe(`2560_glass_${doc.slug}`);
      const copy = copyFragments(doc).join(" ");
      for (const statement of doc.copy.pendingApproval) {
        expect(copy, `${doc.slug}: ${statement}`).toContain(normalize(statement));
        if (drafts !== null) {
          expect(drafts, `drafts doc: ${statement}`).toContain(normalize(statement));
        }
      }
    }
  });

  it("keeps the client-approved edge strings in the content", () => {
    const content = new Set(GLASS_TYPES_CONTENT.flatMap(copyFragments));
    expect(EDGE_APPROVED_LINES.filter((line) => !content.has(line))).toEqual([]);
  });

  it.skipIf(!HAS_TEKSTY)("teksty documents take hub card texts from teksty/02", () => {
    const hub = normalize(readFileSync(path.join(TEKSTY_DIR, "02-zakalennoe-steklo.md"), "utf8"));
    for (const doc of tekstyDocs) {
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

  it("ships every seed image with a Russian alt", () => {
    for (const doc of GLASS_TYPES_CONTENT) {
      const figures = (doc.layout ?? []).flatMap((block) =>
        block.kind === "richText" && block.figure ? [block.figure.image] : []
      );
      for (const image of [...(doc.heroImage ? [doc.heroImage] : []), ...figures]) {
        expect(image.alt, `${doc.slug}: ${image.file}`).toMatch(/[А-Яа-яЁё]/);
        expect(existsSync(path.join(MEDIA_DIR, image.file)), image.file).toBe(true);
      }
    }
  });

  it("keeps the shapes of the new sections consistent", () => {
    for (const doc of GLASS_TYPES_CONTENT) {
      if (doc.specs) expect(doc.specs.length, `${doc.slug}: specs`).toBeGreaterThanOrEqual(2);
      if (doc.related) {
        expect(new Set(doc.related).size, `${doc.slug}: related`).toBe(3);
        expect(doc.related, `${doc.slug}: related`).not.toContain(doc.slug);
      }
      for (const block of doc.layout ?? []) {
        if (block.kind !== "richText") continue;
        expect(block.figure && block.table, `${doc.slug}: figure or table`).toBeFalsy();
        if (block.table) {
          const { columns, rows, highlightColumn } = block.table;
          for (const row of rows) expect(row, `${doc.slug}: row`).toHaveLength(columns.length);
          if (highlightColumn) expect(highlightColumn).toBeLessThanOrEqual(columns.length);
        }
        if (block.figure || block.table) expect(block.heading, doc.slug).toBeTruthy();
      }
    }
  });

  it("матовое: sandblasting also on tempered glass (client decision)", () => {
    const matovoe = bySlug("matovoe");
    expect(matovoe.faq?.[0]?.answer).toContain(
      "Пескоструй можно сделать и на уже закалённом стекле."
    );
    expect(matovoe.related).toEqual(["tonirovannoe", "tripleks", "dlya-mebeli"]);
    expect(matovoe.specs?.filter((spec) => spec.accent)).toHaveLength(1);
  });

  it("highlights four rows for осветлённое and gives рифлёное five patterns", () => {
    const osvetlennoe = bySlug("osvetlennoe");
    const positive = (osvetlennoe.tables ?? []).flatMap((table) =>
      table.rows.filter((row) => row.some((cell) => typeof cell !== "string" && cell.positive))
    );
    expect(positive).toHaveLength(4);

    const riflenoe = bySlug("riflenoe");
    const patterns = (riflenoe.variants ?? []).filter(
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

  it("gives every glass type its own FAQ (3–4 questions)", () => {
    const withFaq = GLASS_TYPES_CONTENT.filter((doc) => (doc.faq?.length ?? 0) > 0)
      .map((doc) => `${doc.slug}:${doc.faq?.length}`)
      .sort();
    expect(withFaq).toEqual([
      "dlya-mebeli:4",
      "matovoe:3",
      "mollirovannoe:4",
      "okrashennoe:3",
      "osvetlennoe:3",
      "riflenoe:3",
      "tonirovannoe:3",
      "tripleks:4",
    ]);
  });
});
