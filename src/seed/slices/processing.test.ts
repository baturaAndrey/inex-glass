import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain/stop-words";
import {
  EMPTY_HEADER,
  HUB,
  HUB_MOCKUP_COPY,
  HUB_PATH,
  LINKS,
  SERVICES,
  type LayoutSeed,
  type ServiceSeed,
  type TableSeed,
} from "../content/processing";

/**
 * Content checks of the «processing» slice (task 25 + service pages of the Paper mockups):
 * services with `copy.source: "teksty"` are verbatim from teksty, mockup services list their
 * «[уточнить]» statements (and the drafts doc carries them), no stop words, meta equal to
 * `docs/inex/17-meta.md`, internal links lowercase with a trailing slash, every image and
 * diagram ships with the seed, and the holes page carries the calculator, no FAQ and the 3-row
 * tolerance panel.
 */

const ROOT = process.cwd();
const TEKSTY_DIR = join(ROOT, "res/inex-glass-handoff/teksty");
const TEKSTY_FILES = [
  "07-obrabotka-stekla.md",
  "12-p2-konstrukcii-steklo.md",
  "17-matirovanie-markirovka-listingi.md",
];
const META_FILE = join(ROOT, "docs/inex/17-meta.md");
const MEDIA_DIR = join(ROOT, "src/seed/media/processing");
const DRAFTS_FILE = join(ROOT, "docs/inex/drafts/service-pages-paper-drafts.md");
const hasSources = TEKSTY_FILES.every((file) => existsSync(join(TEKSTY_DIR, file)));
const hasMeta = existsSync(META_FILE);

/* ------------------------------------------------------------------------------------------ */
/* Text extraction                                                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * Markdown → comparable plain text: `[label](url)` → `[label]` (teksty write links as
 * `[Название]`), no `**`/`##`/`>`/list markers, collapsed whitespace.
 */
function normalize(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "[$1]")
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
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
      return [
        ...(block.heading ? [block.heading] : []),
        ...mdUnits(block.md),
        ...(block.figure?.caption ? [block.figure.caption] : []),
      ];
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
    case "cards":
      return [
        block.heading,
        ...(block.sub ? [block.sub] : []),
        ...block.items.flatMap((item) => [item.title, ...(item.text ? [item.text] : [])]),
      ];
    case "twoColumns":
      return [block.left, ...(block.right ? [block.right] : [])].flatMap((column) => [
        column.heading,
        ...mdUnits(column.md),
      ]);
  }
}

/** Body texts of a service (meta excluded: it is checked against 17-meta). */
function serviceUnits(service: ServiceSeed): string[] {
  return [
    service.keyLimit,
    ...mdUnits(service.introMd).map((line) => line.replace(/\s*\{условия\}$/, "")),
    ...(service.specs ?? []).flatMap((spec) => [
      spec.label,
      spec.value,
      ...(spec.text ? [spec.text] : []),
    ]),
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
  // Card texts of mockup services are checked with the service (`copy.source: "paper"`).
  ...SERVICES.filter((service) => service.copy.source === "teksty").flatMap((service) => [
    service.cardTitle,
    service.keyLimit,
  ]),
];

/**
 * The hub panels restructure teksty/07 §1 by the Paper mockup: list items and sub-headings are
 * teksty phrases with a capital letter / a colon, the lead is the mockup wording.
 */
const hubPanelUnits = (): string[] =>
  HUB.layout.flatMap(layoutUnits).filter((unit) => !HUB_MOCKUP_COPY.includes(unit));

/** Case-insensitive comparable form without trailing «:» / «!». */
const loose = (text: string) => normalize(text).replace(/[:!]$/, "").toLowerCase();

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

  const verbatim = SERVICES.filter((service) => service.copy.source === "teksty");
  it.each(verbatim.map((service) => [service.slug, service] as const))("%s", (_, service) => {
    const missing = serviceUnits(service).filter((unit) => !teksty.includes(normalize(unit)));
    expect(missing).toEqual([]);
  });

  it("hub", () => {
    const missing = hubUnits().filter((unit) => !teksty.includes(normalize(unit)));
    expect(missing).toEqual([]);
  });

  it("hub panels: teksty phrases (mockup wording listed in HUB_MOCKUP_COPY)", () => {
    const lower = teksty.toLowerCase();
    const missing = hubPanelUnits().filter((unit) => !lower.includes(loose(unit)));
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

  it("facet: glass and mirrors 5–40 mm, never on tempered glass", () => {
    const facet = SERVICES.find((service) => service.slug === "facet")!;
    expect(facet.quizType).toBe("mirrors");
    expect(facet.keyLimit).toBe("На зеркалах и стекле, ширина 5–40 мм");
    const text = JSON.stringify(facet);
    expect(text).toContain("На закалённом стекле фацет не делаем.");
    expect(text).not.toMatch(/30 (?:и|или) 50 мм|до 30 мм/);
  });

  it("every service, figure and the hub hero have an image with a Russian alt", () => {
    const figures = SERVICES.flatMap((service) =>
      service.layout.flatMap((block) =>
        block.blockType === "richText" && block.figure ? [block.figure.image] : []
      )
    );
    const images = [HUB.heroImage, ...SERVICES.map((service) => service.image), ...figures];
    for (const image of images) {
      expect(image.alt).toMatch(/[А-Яа-яЁё]/);
      expect(existsSync(join(MEDIA_DIR, image.file)), image.file).toBe(true);
    }
  });

  it("mockup services: every «[уточнить]» statement is in the copy and in the drafts doc", () => {
    const drafts = existsSync(DRAFTS_FILE) ? normalize(readFileSync(DRAFTS_FILE, "utf8")) : null;
    for (const service of SERVICES) {
      if (service.copy.source !== "paper") continue;
      const units = normalize(serviceUnits(service).join(" "));
      for (const statement of service.copy.pendingApproval) {
        expect(units, `${service.slug}: ${statement}`).toContain(normalize(statement));
        expect(statement).not.toMatch(/уточнить/i);
        if (drafts !== null) {
          expect(drafts, `drafts doc: ${statement}`).toContain(normalize(statement));
        }
      }
      expect(JSON.stringify(service)).not.toMatch(/\[уточнить\]/i);
    }
  });

  it("«Другая обработка»: three other services, no duplicates", () => {
    for (const service of SERVICES) {
      if (!service.related) continue;
      expect(new Set(service.related).size, service.slug).toBe(3);
      expect(service.related, service.slug).not.toContain(service.slug);
    }
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

  it("otverstiya-i-vyrezy: calculator #kalkulyator, no FAQ, tolerance panel of 3 rows", () => {
    const holes = SERVICES.find((service) => service.slug === "otverstiya-i-vyrezy")!;
    const calculator = holes.layout.find((block) => block.blockType === "holesCalculator");
    expect(calculator).toMatchObject({ anchorId: "kalkulyator", defaultThickness: "10" });
    expect(holes.hasHoleCalculator).toBe(true);
    // The approved mockup has no FAQ on this page.
    expect(holes.faq ?? []).toEqual([]);
    // The tolerances are a markdown table inside the «Допуски диаметра» how-to-order panel.
    const panel = holes.layout
      .flatMap((block) =>
        block.blockType === "twoColumns" ? [block.left, ...(block.right ? [block.right] : [])] : []
      )
      .find((column) => column.heading === "Допуски диаметра");
    expect(panel, "twoColumns panel «Допуски диаметра»").toBeDefined();
    const rows = panel!.md
      .split("\n")
      .filter((line) => line.startsWith("|"))
      .slice(2)
      .map((line) => line.split("|")[1]!.trim());
    expect(rows).toEqual(["4–20 мм", "20–100 мм", "свыше 100 мм"]);
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
