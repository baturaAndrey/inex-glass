import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain/stop-words";
import {
  EMPTY_HEADER,
  HUB,
  HUB_PATH,
  LINKS,
  SERVICES,
  type LayoutSeed,
  type ServiceSeed,
  type TableSeed,
} from "../content/processing";

/**
 * Content checks of the «processing» slice (task 25): texts are verbatim from teksty, no stop
 * words, meta equal to `docs/inex/17-meta.md`, internal links lowercase with a trailing slash,
 * and the holes page carries the calculator, 4 FAQ and the 3-row tolerance table.
 */

const ROOT = process.cwd();
const TEKSTY_DIR = join(ROOT, "res/inex-glass-handoff/teksty");
const TEKSTY_FILES = [
  "07-obrabotka-stekla.md",
  "12-p2-konstrukcii-steklo.md",
  "17-matirovanie-markirovka-listingi.md",
];
const META_FILE = join(ROOT, "docs/inex/17-meta.md");
const hasSources = TEKSTY_FILES.every((file) => existsSync(join(TEKSTY_DIR, file)));
const hasMeta = existsSync(META_FILE);

/* ------------------------------------------------------------------------------------------ */
/* Text extraction                                                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * Markdown → comparable plain text: `[label](url)` → `[label]` (teksty write links as
 * `[Название]`), no `**`/`##`/list markers, collapsed whitespace.
 */
function normalize(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "[$1]")
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lines of a markdown snippet that carry text (each must occur in teksty). */
const mdUnits = (md: string) =>
  md
    .split("\n")
    .map(normalize)
    .filter((line) => line !== "");

const cellValue = (cell: TableSeed["rows"][number][number]) =>
  typeof cell === "string" ? cell : cell.value;

function tableUnits(table: TableSeed): string[] {
  return [
    table.heading,
    table.lead,
    table.footnote,
    ...table.columns.filter((column) => column !== EMPTY_HEADER),
    ...table.rows.flat().map(cellValue),
  ].filter((value): value is string => Boolean(value));
}

function layoutUnits(block: LayoutSeed): string[] {
  switch (block.blockType) {
    case "richText":
      return [...(block.heading ? [block.heading] : []), ...mdUnits(block.md)];
    case "table":
      return [...(block.heading ? [block.heading] : []), ...tableUnits(block.table)];
    case "callout":
      return [
        ...(block.title ? [block.title] : []),
        ...(block.md ? mdUnits(block.md) : []),
        // «**Лид.** текст» in teksty: lead and text are one line.
        ...(block.items ?? []).map((item) => normalize(`${item.lead ?? ""} ${item.md}`)),
      ];
    case "holesCalculator":
      return [block.heading, block.sub, block.note].filter((v): v is string => Boolean(v));
  }
}

/** Body texts of a service (meta excluded: it is checked against 17-meta). */
function serviceUnits(service: ServiceSeed): string[] {
  return [
    service.keyLimit,
    ...mdUnits(service.introMd).map((line) => line.replace(/\s*\{условия\}$/, "")),
    ...service.tables.flatMap(tableUnits),
    ...service.layout.flatMap(layoutUnits),
    ...(service.howToSpecifyMd ? mdUnits(service.howToSpecifyMd) : []),
    ...(service.callouts ?? []).flatMap((callout) => [callout.title, ...mdUnits(callout.md)]),
    ...(service.faq ?? []).flatMap((item) => [item.question, ...mdUnits(item.answerMd)]),
    ...(service.ctaSecondaryLabel ? [service.ctaSecondaryLabel] : []),
  ];
}

const hubUnits = (): string[] => [
  HUB.lead,
  HUB.primaryLabel,
  HUB.secondaryLabel,
  ...HUB.layout.flatMap(layoutUnits),
  ...SERVICES.flatMap((service) => [service.cardTitle, service.keyLimit]),
];

/** Every string of the slice, raw (stop words, links). */
function allStrings(): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(HUB);
  walk(SERVICES);
  return out;
}

/* ------------------------------------------------------------------------------------------ */
/* Tests                                                                                      */
/* ------------------------------------------------------------------------------------------ */

describe.skipIf(!hasSources)("processing content is verbatim from teksty", () => {
  const teksty = hasSources
    ? normalize(TEKSTY_FILES.map((file) => readFileSync(join(TEKSTY_DIR, file), "utf8")).join("\n"))
    : "";

  it.each(SERVICES.map((service) => [service.slug, service] as const))("%s", (_, service) => {
    const missing = serviceUnits(service).filter((unit) => !teksty.includes(normalize(unit)));
    expect(missing).toEqual([]);
  });

  it("hub", () => {
    const missing = hubUnits().filter((unit) => !teksty.includes(normalize(unit)));
    expect(missing).toEqual([]);
  });
});

describe("processing content rules", () => {
  it("has no stop words (ТЗ §11)", () => {
    const findings = allStrings().flatMap((text) =>
      checkStopWords(text).map((finding) => `${finding.match}: ${text}`)
    );
    expect(findings).toEqual([]);
  });

  it("internal links are lowercase with a trailing slash", () => {
    const hrefs = [
      ...Object.values(LINKS),
      ...allStrings().flatMap((text) => [...text.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]!)),
    ];
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) {
      expect(href).toBe(href.toLowerCase());
      expect(href).toMatch(/^\/(?:[a-z0-9-]+\/)*$/);
    }
  });

  it("facet is described for mirrors only", () => {
    const facet = SERVICES.find((service) => service.slug === "facet")!;
    expect(facet.quizType).toBe("mirrors");
    const text = JSON.stringify(facet);
    expect(text).toContain("На закалённом стекле фацет не делаем.");
    expect(text).not.toMatch(/до 30 мм/);
  });

  it("services come in the hub order 1…6", () => {
    expect(SERVICES.map((service) => [service.order, service.slug])).toEqual([
      [1, "kromka"],
      [2, "otverstiya-i-vyrezy"],
      [3, "facet"],
      [4, "matirovanie"],
      [5, "pechat"],
      [6, "plenki"],
    ]);
  });

  it("otverstiya-i-vyrezy: calculator #kalkulyator, 4 FAQ, tolerance table of 3 rows", () => {
    const holes = SERVICES.find((service) => service.slug === "otverstiya-i-vyrezy")!;
    const calculator = holes.layout.find((block) => block.blockType === "holesCalculator");
    expect(calculator).toMatchObject({ anchorId: "kalkulyator", defaultThickness: "10" });
    expect(holes.hasHoleCalculator).toBe(true);
    expect(holes.faq).toHaveLength(4);
    const tolerances = holes.layout.find(
      (block) => block.blockType === "table" && block.heading === "Допуски диаметра"
    );
    expect(tolerances?.blockType === "table" ? tolerances.table.rows : []).toHaveLength(3);
  });
});

describe.skipIf(!hasMeta)("processing meta = docs/inex/17-meta.md", () => {
  const rows = hasMeta
    ? readFileSync(META_FILE, "utf8")
        .split("\n")
        .filter((line) => line.startsWith("| /obrabotka-stekla/"))
        .map((line) =>
          line
            .split(/(?<!\\)\|/)
            .slice(1, -1)
            .map((cell) => cell.trim().replace(/\\\|/g, "|"))
        )
    : [];
  const byUrl = new Map(rows.map((cells) => [cells[0], cells]));

  const pages = [
    { url: HUB_PATH, seo: HUB.seo },
    ...SERVICES.map((service) => ({ url: `${HUB_PATH}${service.slug}/`, seo: service.seo })),
  ];

  it("covers 7 URLs", () => {
    expect(pages).toHaveLength(7);
    expect(rows).toHaveLength(7);
  });

  it.each(pages.map((page) => [page.url, page] as const))("%s", (url, page) => {
    const cells = byUrl.get(url);
    expect(cells, url).toBeDefined();
    // Columns: URL | H1 | Title | Description (first) | …
    expect(page.seo).toEqual({ h1: cells![1], title: cells![2], description: cells![3] });
  });
});
