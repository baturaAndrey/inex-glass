import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain";
import { sanitizeSvg } from "@/lib/svg-sanitize";
import { CONSTRUCTIONS, type ConstructionSeed } from "../content/constructions";

/**
 * Content checks of the constructions slice (task 26): verbatim copy, stop words, links, SVG.
 * Pure: reads `../content/constructions.ts` only (no Payload).
 */

const ROOT = path.resolve(import.meta.dirname, "../../..");
const TEKSTY_DIR = path.join(ROOT, "res/inex-glass-handoff/teksty");
const META_FILE = path.join(ROOT, "docs/inex/17-meta.md");

/** teksty file of each document. */
const SOURCES: Record<string, string> = {
  "steklyannye-konstrukcii": "09-konstrukcii-klientam.md",
  "steklyannye-peregorodki": "11-peregorodki-servis.md",
  "steklyannye-ograzhdeniya": "12-p2-konstrukcii-steklo.md",
  "dushevye-peregorodki": "12-p2-konstrukcii-steklo.md",
  "torgovye-vitriny": "12-p2-konstrukcii-steklo.md",
  furnitura: "12-p2-konstrukcii-steklo.md",
  "steklyannye-kozyrki": "13-p3-kozyrki-osteklenie.md",
};

/** Markdown / teksty markup → plain comparable text. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url)
    .replace(/→\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/[[\]]/g, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every visible string of a document, split into comparable fragments (lines). */
function fragments(doc: ConstructionSeed): string[] {
  const texts: string[] = [doc.intro];
  for (const system of doc.systems ?? []) {
    texts.push(system.name, system.subtitle ?? "", system.whereFits ?? "", system.important ?? "");
    texts.push(system.howHeld ?? "", system.requiresInGlass ?? "");
  }
  texts.push(...(doc.profileSystems ?? []), doc.glassHeading ?? "", ...(doc.glassBullets ?? []));
  if (doc.riskCallout) texts.push(doc.riskCallout.title, doc.riskCallout.body);
  texts.push(doc.documents ?? "");
  if (doc.whoDoesWhat) texts.push(...doc.whoDoesWhat.left, ...doc.whoDoesWhat.right);
  if (doc.inexSuBridge) texts.push(doc.inexSuBridge.title, doc.inexSuBridge.text);
  if (doc.snowCalcBlock) {
    texts.push(doc.snowCalcBlock.title, doc.snowCalcBlock.body, doc.snowCalcBlock.sideText);
  }
  for (const item of doc.faq ?? []) texts.push(item.question, item.answer);
  for (const block of doc.layout) {
    if (block.type === "richText") texts.push(block.heading ?? "", block.md);
    if (block.type === "callout") texts.push(block.heading ?? "", block.md);
    if (block.type === "table") {
      texts.push(block.heading, block.sub ?? "", block.table.footnote ?? "");
      texts.push(...block.table.columns, ...block.table.rows.flat());
    }
    if (block.type === "cards") {
      texts.push(block.heading, ...block.items.flatMap((item) => [item.title, item.text]));
    }
  }
  return texts
    .flatMap((text) => text.split("\n"))
    .map(plain)
    .filter((text) => text !== "");
}

/** Every internal / external href of a document. */
function links(doc: ConstructionSeed): string[] {
  const markdown = [
    doc.intro,
    ...(doc.glassBullets ?? []),
    doc.riskCallout?.body ?? "",
    doc.documents ?? "",
    doc.snowCalcBlock?.body ?? "",
    ...(doc.faq ?? []).map((item) => item.answer),
    ...doc.layout.flatMap((block) => ("md" in block ? [block.md] : [])),
  ].join("\n");
  const fromMarkdown = [...markdown.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] ?? "");
  const fromCards = doc.layout.flatMap((block) =>
    block.type === "cards" ? block.items.map((item) => item.url) : []
  );
  return [...fromMarkdown, ...fromCards, ...(doc.inexSuBridge ? [doc.inexSuBridge.url] : [])];
}

const bySlug = (slug: string) => {
  const doc = CONSTRUCTIONS.find((item) => item.slug === slug);
  if (!doc) throw new Error(`no seed document ${slug}`);
  return doc;
};

describe("constructions seed content", () => {
  const hasTeksty = existsSync(TEKSTY_DIR);

  it.skipIf(!hasTeksty)("copies every string verbatim from teksty", () => {
    for (const doc of CONSTRUCTIONS) {
      const file = SOURCES[doc.slug];
      expect(file, doc.slug).toBeDefined();
      const source = plain(readFileSync(path.join(TEKSTY_DIR, file as string), "utf8"));
      for (const fragment of fragments(doc)) {
        expect(source.includes(fragment), `${doc.slug}: «${fragment}»`).toBe(true);
      }
    }
  });

  it("has no stop words («под ключ» only in the inex.su bridge)", () => {
    for (const doc of CONSTRUCTIONS) {
      const bridge = doc.inexSuBridge;
      const rest = fragments(doc).filter(
        (text) => !bridge || (text !== plain(bridge.title) && text !== plain(bridge.text))
      );
      const text = [...rest, doc.seo.h1, doc.seo.title, doc.seo.description].join("\n");
      expect(checkStopWords(text), doc.slug).toEqual([]);
      expect(text, doc.slug).not.toMatch(/под ключ/i);
      if (bridge) {
        const bridgeText = `${bridge.title} ${bridge.text} ${bridge.url}`;
        expect(checkStopWords(bridgeText)).toEqual([]);
        expect(bridge.url).toBe("https://inex.su/");
      }
    }
  });

  it("covers the seven URLs with slug = last segment and meta from 17-meta", () => {
    expect(CONSTRUCTIONS.map((doc) => doc.url)).toEqual([
      "/steklyannye-konstrukcii/",
      "/steklyannye-peregorodki/",
      "/steklyannye-ograzhdeniya/",
      "/steklyannye-kozyrki/",
      "/dushevye-peregorodki/",
      "/torgovye-vitriny/",
      "/furnitura/",
    ]);
    for (const doc of CONSTRUCTIONS) expect(doc.url).toBe(`/${doc.slug}/`);
  });

  it.skipIf(!existsSync(META_FILE))("matches H1 / title / description of 17-meta", () => {
    const meta = readFileSync(META_FILE, "utf8");
    for (const doc of CONSTRUCTIONS) {
      const row = meta.split("\n").find((line) => line.startsWith(`| ${doc.url} |`));
      expect(row, doc.url).toBeDefined();
      const cells = (row as string)
        .split(/(?<!\\)\|/)
        .map((cell) => cell.replace(/\\\|/g, "|").trim());
      expect(cells[2], `${doc.url} h1`).toBe(doc.seo.h1);
      expect(cells[3], `${doc.url} title`).toBe(doc.seo.title);
      expect(cells[4], `${doc.url} description`).toBe(doc.seo.description);
    }
  });

  it("uses lower-case internal links with a trailing slash", () => {
    for (const doc of CONSTRUCTIONS) {
      for (const href of links(doc)) {
        if (href.startsWith("http")) {
          expect(href, doc.slug).toMatch(/^https:\/\/inex\.su\/$/);
          continue;
        }
        expect(href, doc.slug).toMatch(/^\/[a-z0-9/-]*\/$/);
      }
    }
  });

  it("contains no editorial notes or unknown placeholders", () => {
    for (const doc of CONSTRUCTIONS) {
      for (const fragment of fragments(doc)) {
        expect(fragment, doc.slug).not.toMatch(/ждёт ответа|Каталог конфигураций/);
        const placeholders = fragment.match(/\{[^}]*\}/g) ?? [];
        for (const placeholder of placeholders) expect(placeholder).toBe("{условия}");
      }
    }
  });

  it("partitions: 4 systems with schemes and 6 profile plates", () => {
    const doc = bySlug("steklyannye-peregorodki");
    expect(doc.systems).toHaveLength(4);
    for (const system of doc.systems ?? []) expect(sanitizeSvg(system.schemeSvg)).toMatch(/^<svg/);
    expect(doc.profileSystems).toEqual([
      "Алютех",
      "СИАЛ",
      "Татпроф",
      "Доксал",
      "Loft-Gratec",
      "Фристайл",
    ]);
    expect(doc.faq).toHaveLength(5);
    expect(doc.riskCallout?.body.match(/^\d\. /gm)).toHaveLength(3);
  });

  it("canopies: 3 labelled schemes with valid SVG and the snow block", () => {
    const doc = bySlug("steklyannye-kozyrki");
    expect(doc.systems).toHaveLength(3);
    for (const system of doc.systems ?? []) {
      const svg = sanitizeSvg(system.schemeSvg);
      expect(svg).toMatch(/^<svg[^>]* role="img"/);
      expect(svg).toMatch(/aria-label="Схема [^"]+"/);
      expect(svg).toBe(sanitizeSvg(svg)); // stable: nothing left to strip
    }
    expect(doc.snowCalcBlock?.ctaLabel).toBe("Отправить проект на расчёт");
    expect(doc.faq).toHaveLength(3);
  });

  it("primary CTA is always «Рассчитать …», furnitura has no secondary form", () => {
    for (const doc of CONSTRUCTIONS) expect(doc.ctaPrimaryLabel).toMatch(/^Рассчитать /);
    expect(bySlug("furnitura").secondaryFormKey).toBe("none");
    expect(bySlug("dushevye-peregorodki").ctaPrimaryLabel).toBe("Рассчитать партию");
    expect(bySlug("dushevye-peregorodki").ctaSecondaryLabel).toBe("Отправить проект");
  });
});
