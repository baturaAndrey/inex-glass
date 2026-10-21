import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXPERIENCE_PHRASE, checkStopWords } from "@/lib/domain";
import {
  HOME_CONSTRUCTIONS,
  HOME_FORM,
  HOME_GLASS,
  HOME_HERO,
  HOME_OBJECTS,
  HOME_PROCESSING,
  HOME_PROTOTYPE_STRINGS,
  HOME_SEGMENTS,
  HOME_SEO,
  HOME_STEPS,
  HOME_USEFUL,
  HOME_WHY,
} from "../content/home";

/**
 * Content checks of the home slice (task 22): verbatim copy of teksty/01, no stop words,
 * well-formed internal links and the section sizes of the template.
 */

const ROOT = process.cwd();
const TEKSTY = path.join(ROOT, "res/inex-glass-handoff/teksty/01-glavnaya.md");
const PROTOTYPE = path.join(ROOT, "res/inex-glass-handoff/prototypes/Home.dc.html");
const META = path.join(ROOT, "docs/inex/17-meta.md");

/** Markdown of teksty without emphasis markers and escapes: `**21 год**` → `21 год`. */
function stripMarkdown(source: string): string {
  return source.replace(/\*\*/g, "").replace(/\\\*/g, "*");
}

/** Every displayed string of the page (links and icon names excluded). */
function contentStrings(): string[] {
  return [
    HOME_SEO.h1,
    HOME_SEO.title,
    HOME_SEO.description,
    ...HOME_HERO.eyebrow,
    HOME_HERO.lead,
    ...HOME_HERO.stats.flatMap((stat) => [stat.value, stat.text]),
    HOME_HERO.quizLabel,
    HOME_HERO.drawingLabel,
    HOME_WHY.heading,
    HOME_WHY.sub,
    HOME_WHY.leftTitle,
    HOME_WHY.rightTitle,
    ...HOME_WHY.rows.flatMap((row) => [row.left, row.right]),
    HOME_WHY.footLink.label,
    HOME_GLASS.heading,
    HOME_GLASS.footnote,
    ...HOME_GLASS.items.flatMap((item) => [
      item.title,
      item.text,
      ...("priceHint" in item ? [item.priceHint] : []),
    ]),
    HOME_PROCESSING.heading,
    HOME_PROCESSING.sub,
    ...HOME_PROCESSING.tiles.map((tile) => tile.title),
    HOME_CONSTRUCTIONS.heading,
    HOME_CONSTRUCTIONS.sub,
    ...HOME_CONSTRUCTIONS.items.map((item) => item.title),
    HOME_SEGMENTS.heading,
    ...HOME_SEGMENTS.items.flatMap((item) => [item.title, item.text]),
    HOME_STEPS.heading,
    ...HOME_STEPS.items.flatMap((item) => [item.title, item.text]),
    HOME_STEPS.footnote,
    HOME_STEPS.buttonLabel,
    HOME_OBJECTS.heading,
    HOME_OBJECTS.sub,
    HOME_OBJECTS.allLinkLabel,
    ...HOME_OBJECTS.fallback,
    HOME_USEFUL.heading,
    ...HOME_USEFUL.items.flatMap((item) => [item.title, item.text]),
    HOME_FORM.heading,
    ...HOME_FORM.bullets,
    HOME_FORM.submitLabel,
  ];
}

function contentLinks(): string[] {
  return [
    HOME_WHY.footLink.url,
    ...HOME_GLASS.items.map((item) => item.url),
    ...HOME_PROCESSING.tiles.map((tile) => tile.url),
    HOME_PROCESSING.accent.url,
    ...HOME_CONSTRUCTIONS.items.map((item) => item.url),
    ...HOME_SEGMENTS.items.map((item) => item.url),
    ...HOME_USEFUL.items.map((item) => item.url),
  ];
}

const hasSources = existsSync(TEKSTY) && existsSync(PROTOTYPE) && existsSync(META);

describe("home content", () => {
  it.skipIf(!hasSources)("copies every string verbatim from teksty/01", () => {
    const teksty = stripMarkdown(readFileSync(TEKSTY, "utf8"));
    const missing = contentStrings().filter((text) => !teksty.includes(text));
    expect(missing).toEqual([]);
  });

  it.skipIf(!hasSources)("takes the prototype-only labels from Home.dc.html", () => {
    const prototype = readFileSync(PROTOTYPE, "utf8");
    const missing = HOME_PROTOTYPE_STRINGS.filter((text) => !prototype.includes(text));
    expect(missing).toEqual([]);
  });

  it.skipIf(!hasSources)("uses H1, title and description of 17-meta", () => {
    const meta = readFileSync(META, "utf8");
    const row = meta.split("\n").find((line) => line.startsWith("| / |"));
    expect(row).toBeDefined();
    const cells = (row ?? "").split("|").map((cell) => cell.trim());
    expect(cells.slice(2, 5)).toEqual([HOME_SEO.h1, HOME_SEO.title, HOME_SEO.description]);
  });

  it("has no stop words", () => {
    const findings = [...contentStrings(), ...HOME_PROTOTYPE_STRINGS].flatMap((text) =>
      checkStopWords(text).map((finding) => `${finding.rule}: ${finding.match}`)
    );
    expect(findings).toEqual([]);
  });

  it("labels the 21 years as the specialists' experience (Inex does not manufacture)", () => {
    expect(HOME_HERO.stats[0]).toEqual({ value: "21 год", text: "опыт специалистов Inex" });
  });

  it("uses lower-case internal links with a trailing slash (anchors only #vidy, #kalkulyator)", () => {
    const anchors = new Set<string>();
    for (const url of contentLinks()) {
      expect(url).toMatch(/^\/(?:[a-z0-9-]+\/)*(?:#[a-z0-9-]+)?$/);
      const hash = url.split("#")[1];
      if (hash) anchors.add(hash);
    }
    expect([...anchors].sort()).toEqual(["kalkulyator", "vidy"]);
  });

  it("has the section sizes of the template", () => {
    expect(HOME_WHY.rows).toHaveLength(8);
    expect(HOME_STEPS.items).toHaveLength(6);
    expect(HOME_CONSTRUCTIONS.items).toHaveLength(9);
    expect(HOME_PROCESSING.tiles).toHaveLength(7);
    expect(HOME_PROCESSING.accent.title).toBeTruthy();
    expect(HOME_GLASS.items).toHaveLength(4);
    expect(HOME_SEGMENTS.items).toHaveLength(4);
    expect(HOME_USEFUL.items).toHaveLength(4);
    expect(HOME_OBJECTS.fallback).toHaveLength(8);
    expect(HOME_HERO.stats).toHaveLength(3);
    expect(HOME_HERO.eyebrow).toHaveLength(3);
  });

  it("starts the objects subtitle with the only allowed experience phrase", () => {
    expect(HOME_OBJECTS.sub.startsWith(EXPERIENCE_PHRASE)).toBe(true);
  });
});
