import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { sanitizeConfig } from "payload";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { GLAZING_MIRRORS_ROUTES, findGlazingMirrorsRoute } from "@/lib/cms/glazing-mirrors-routes";
import { checkStopWords } from "@/lib/domain";
import { ANCHOR_PATTERN } from "@/payload/blocks/_section";
import { LINKABLE_COLLECTIONS } from "@/payload/fields/link";
import { GLAZING_MIRRORS_CONTENT } from "../content/glazing-mirrors";
import { getEditorConfig, markdownToLexical } from "../lexical";
import { buildConstructionData, seed } from "./glazing-mirrors";
import type { GlazingMirrorsPageContent, LayoutContent } from "../content/glazing-mirrors";
import type { SeedContext } from "../context";
import type { MarkdownConverter } from "./glazing-mirrors";
import type { Payload } from "payload";

/*
 * The slice imports `../context`, which loads the Payload config; tests never boot Payload, so
 * the upsert helper is replaced by a recorder (see the «seed» suite).
 */
const upserts = vi.hoisted(
  () => [] as Array<{ collection: string; data: Record<string, unknown> }>
);
vi.mock("../context", () => ({
  upsertBySlug: vi.fn(async (_ctx: unknown, collection: string, data: Record<string, unknown>) => {
    upserts.push({ collection, data });
    const parent = data.parent ? upserts.find((u) => u.data.__id === data.parent) : undefined;
    const parentPath = (parent?.data.__path as string | undefined) ?? "/";
    const doc = { id: `id-${String(data.slug)}`, path: `${parentPath}${String(data.slug)}/` };
    Object.assign(data, { __id: doc.id, __path: doc.path });
    return { doc, action: "created" };
  }),
}));

const ROOT = path.resolve(import.meta.dirname, "../../..");
const TEKSTY_DIR = path.join(ROOT, "res/inex-glass-handoff/teksty");
const META_FILE = path.join(ROOT, "docs/inex/17-meta.md");
const HAS_SOURCES = existsSync(TEKSTY_DIR) && existsSync(META_FILE);

// ---------------------------------------------------------------------------------------------
// Text normalisation: markdown of the content and of teksty are compared as plain text
// ---------------------------------------------------------------------------------------------

const MD_LINK = /\[([^\]]+)\]\([^)]*\)/g;
/** teksty links are bare `[Название]` (no URL). */
const BARE_LINK = /\[([^\]]+)\](?!\()/g;
const LIST_MARKER = /^\s*(?:[-*]|\d+\.)\s+/gm;

function normalizeSpaces(text: string): string {
  return text.replace(/→/g, " ").replace(/\s+/g, " ").trim();
}

/** One content string (markdown allowed) → plain text. */
function plainContent(text: string): string {
  return normalizeSpaces(text.replace(LIST_MARKER, "").replace(/\*\*/g, "").replace(MD_LINK, "$1"));
}

/** Table rows lose their cell separators; a `|` inside a title line («… | Inex Glass») stays. */
function stripTablePipes(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trimStart().startsWith("|") ? line.replace(/\|/g, " ") : line))
    .join("\n");
}

/** A teksty section → plain text (bold, bare links, table pipes and list markers removed). */
function plainTeksty(text: string): string {
  return normalizeSpaces(
    stripTablePipes(text).replace(LIST_MARKER, "").replace(/\*\*/g, "").replace(BARE_LINK, "$1")
  );
}

/** Hub section whose overview lists the children (source of the card texts). */
const HUB_SECTIONS: Record<string, GlazingMirrorsPageContent["source"]> = {
  osteklenie: { file: "13-p3-kozyrki-osteklenie.md", section: 2 },
  zerkala: { file: "12-p2-konstrukcii-steklo.md", section: 3 },
};

/** Section `# N. …` of a teksty file (up to the next numbered section). */
function tekstySection(file: string, section: number): string {
  const source = readFileSync(path.join(TEKSTY_DIR, file), "utf8");
  const start = source.search(new RegExp(`^# ${section}\\. `, "m"));
  if (start === -1) throw new Error(`${file}: нет раздела ${section}`);
  const rest = source.slice(start + 1);
  const next = rest.search(/^# \d+\. /m);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Every human-readable string of a page that must come from teksty, split by lines. */
function tekstyStrings(page: GlazingMirrorsPageContent): string[] {
  const strings: Array<string | undefined> = [
    page.seo.title,
    page.seo.description,
    page.intro,
    page.secondaryLabel,
    page.systemsHeading,
    ...(page.systems ?? []).flatMap((s) => [s.name, s.subtitle, s.whereFits]),
    ...(page.profileSystems ?? []),
    page.glassHeading,
    ...(page.glassBullets ?? []),
    page.inexSuBridge?.title,
    page.inexSuBridge?.buttonLabel,
    ...page.layout.flatMap(blockStrings),
  ];
  return strings
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split("\n"))
    .map(plainContent)
    .filter(Boolean);
}

function blockStrings(block: LayoutContent): Array<string | undefined> {
  switch (block.type) {
    case "richText":
      return [block.heading, block.markdown];
    case "table":
      return [
        block.heading,
        ...(block.syntheticColumns ? [] : block.columns),
        ...block.rows.flat().map((cell) => cell.value),
      ];
    case "cards":
      return [block.heading, ...block.items.flatMap((item) => [item.title, item.text])];
    case "callout":
      return [
        block.heading,
        block.title,
        block.markdown,
        ...(block.items ?? []).flatMap((item) => [item.lead, item.markdown]),
      ];
  }
}

/** Every string of a page, including the SEO fields (stop-word check). */
function allText(page: GlazingMirrorsPageContent): string {
  return [page.title, page.seo.h1, page.card?.text ?? "", ...tekstyStrings(page)].join("\n");
}

// ---------------------------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------------------------

describe("glazing-mirrors routes", () => {
  it("cover exactly the 9 URLs, lower case with a trailing slash", () => {
    const paths = GLAZING_MIRRORS_ROUTES.map((route) => route.path);
    expect(paths).toEqual([
      "/osteklenie/",
      "/osteklenie/fasadov/",
      "/osteklenie/spajdernoe/",
      "/osteklenie/vitrin-i-magazinov/",
      "/osteklenie/liftovyh-shaht/",
      "/osteklenie/verand-terras-besedok/",
      "/zerkala/",
      "/zerkala/dlya-zalov/",
      "/zerkala/dlya-salonov/",
    ]);
    for (const route of GLAZING_MIRRORS_ROUTES) {
      expect(route.path).toMatch(/^\/[a-z0-9/-]+\/$/);
      expect(route.path).toBe(`/${route.segment}/`);
      expect(route.path.endsWith(`/${route.docSlug}/`)).toBe(true);
      expect(route.pathKey).toBe(route.segment.replace(/\//g, "-"));
    }
    expect(new Set(GLAZING_MIRRORS_ROUTES.map((route) => route.docSlug)).size).toBe(9);
  });

  it("have one content page per route", () => {
    expect(GLAZING_MIRRORS_CONTENT.map((page) => page.path).sort()).toEqual(
      GLAZING_MIRRORS_ROUTES.map((route) => route.path).sort()
    );
  });
});

describe.skipIf(!HAS_SOURCES)("glazing-mirrors content matches teksty and 17-meta", () => {
  for (const page of GLAZING_MIRRORS_CONTENT) {
    it(`${page.path}: every string is copied verbatim from teksty §${page.source.section}`, () => {
      const section = tekstySection(page.source.file, page.source.section);
      expect(section).toContain(`**URL:** ${page.path}`);
      const haystack = plainTeksty(section);
      const missing = tekstyStrings(page).filter((text) => !haystack.includes(text));
      expect(missing).toEqual([]);
    });

    if (page.card) {
      const cardText = page.card.text;
      it(`${page.path}: card text is copied from the hub overview`, () => {
        const hub = HUB_SECTIONS[page.path.split("/")[1] ?? ""];
        if (!hub) throw new Error(`нет хаба для ${page.path}`);
        expect(plainTeksty(tekstySection(hub.file, hub.section))).toContain(plainContent(cardText));
      });
    }

    it(`${page.path}: H1, title and description equal 17-meta`, () => {
      const meta = readFileSync(META_FILE, "utf8");
      const row = meta.split("\n").find((line) => line.startsWith(`| ${page.path} |`));
      expect(row, `17-meta: строка ${page.path}`).toBeDefined();
      const cells = (row ?? "")
        .replace(/\\\|/g, "\u0000")
        .split("|")
        .map((cell) => cell.replace(/\u0000/g, "|").trim());
      // ['', path, H1, Title, Description, …]
      expect(cells.slice(2, 5)).toEqual([page.seo.h1, page.seo.title, page.seo.description]);
    });
  }
});

describe("glazing-mirrors content rules", () => {
  it("has no stop words", () => {
    const findings = GLAZING_MIRRORS_CONTENT.flatMap((page) =>
      checkStopWords(allText(page)).map((finding) => `${page.path}: ${finding.match}`)
    );
    expect(findings).toEqual([]);
  });

  it("keeps the mirror facet widths exactly «30 или 50 мм»", () => {
    const text = GLAZING_MIRRORS_CONTENT.filter((page) => page.path.startsWith("/zerkala/"))
      .map(allText)
      .join("\n");
    const facetWidths = text.match(/\d+\s*(?:или|и|–|-)\s*\d+\s*мм/g) ?? [];
    expect(facetWidths.length).toBeGreaterThan(0);
    expect(facetWidths.every((match) => match === "30 или 50 мм")).toBe(true);
  });

  it("uses lower-case internal links with a trailing slash and no «→» in link texts", () => {
    const hrefs = GLAZING_MIRRORS_CONTENT.flatMap((page) => {
      const text = [page.intro, ...(page.glassBullets ?? []), ...page.layout.flatMap(blockStrings)];
      const fromMarkdown = text
        .filter((value): value is string => typeof value === "string")
        .flatMap((value) => [...value.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1] ?? ""));
      const fromBlocks = page.layout.flatMap((block) =>
        block.type === "cards"
          ? block.items.map((item) => item.href)
          : block.type === "table"
            ? block.rows.flat().flatMap((cell) => (cell.href ? [cell.href] : []))
            : []
      );
      return [...fromMarkdown, ...fromBlocks];
    });
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(href).toMatch(/^\/[a-z0-9/-]+\/$/);
  });
});

/** Real markdown → Lexical converter on a schema-less Payload config (as in `lexical.test.ts`). */
async function realConverter(): Promise<{ md: MarkdownConverter; payload: Payload }> {
  const config = await sanitizeConfig({
    secret: "test",
    editor: lexicalEditor(),
    db: { defaultIDType: "text", init: () => ({}) } as never,
    collections: LINKABLE_COLLECTIONS.map((slug) => ({
      slug,
      fields: [{ name: "title", type: "text" as const }],
    })),
  });
  const payload = { config } as unknown as Payload;
  const editorConfig = await getEditorConfig(payload);
  return { md: async (source) => markdownToLexical(source, editorConfig), payload };
}

type LexNode = { type: string; text?: string; fields?: { url?: string }; children?: LexNode[] };

function lexicalText(state: unknown): string {
  const walk = (node: LexNode): string =>
    node.text ?? (node.children ?? []).map(walk).join(node.type === "root" ? "\n" : "");
  return walk((state as { root: LexNode }).root);
}

function lexicalUrls(state: unknown): string[] {
  const walk = (node: LexNode): string[] => [
    ...(node.type === "link" && node.fields?.url ? [node.fields.url] : []),
    ...(node.children ?? []).flatMap(walk),
  ];
  return walk((state as { root: LexNode }).root);
}

describe("buildConstructionData", () => {
  let md: MarkdownConverter;
  beforeAll(async () => {
    ({ md } = await realConverter());
  }, 30_000);

  it("builds valid documents for all 9 pages", async () => {
    for (const page of GLAZING_MIRRORS_CONTENT) {
      const route = findGlazingMirrorsRoute(page.path);
      if (!route) throw new Error(page.path);
      const data = await buildConstructionData(page, route, { md, parentId: "hub" });

      expect(data.slug).toBe(route.docSlug);
      expect(data._status).toBe("published");
      expect(data.kind).toBe(route.kind);
      expect(data.seo).toEqual(page.seo);
      expect(data.quizPrefill?.type).toBe(route.quizType);
      expect(data.ctaPrimaryLabel).toBe("Рассчитать стоимость");
      expect(data.ctaSecondaryLabel).toBe(page.secondaryLabel);
      expect(data.secondaryFormKey).toBe("drawing");
      expect(lexicalText(data.intro)).toBe(page.intro);

      for (const block of data.layout ?? []) {
        if ("anchorId" in block && block.anchorId) expect(block.anchorId).toMatch(ANCHOR_PATTERN);
        if (block.blockType === "table") {
          const columns = block.table?.columns?.length ?? 0;
          expect(columns).toBeGreaterThanOrEqual(2);
          for (const row of block.table?.rows ?? []) expect(row.cells?.length).toBe(columns);
        }
      }
    }
  });

  it("converts markdown links of teksty into Lexical links", async () => {
    const page = GLAZING_MIRRORS_CONTENT.find((p) => p.path === "/osteklenie/fasadov/");
    const route = findGlazingMirrorsRoute("/osteklenie/fasadov/");
    if (!page || !route) throw new Error("fasadov");
    const data = await buildConstructionData(page, route, { md });
    const urls = (data.glassBullets ?? []).flatMap((bullet) => lexicalUrls(bullet.body));
    expect(urls).toEqual([
      "/proektirovanie/",
      "/zakalennoe-steklo/osvetlennoe/",
      "/zakalennoe-steklo/okrashennoe/",
    ]);
    expect(data.profileSystems?.map((item) => item.name)).toEqual(["СИАЛ", "Алютех"]);
    expect(data.systems).toHaveLength(4);
  });
});

describe("seed", () => {
  it("creates hubs before children and links children to their hub", async () => {
    const { payload } = await realConverter();
    const find = vi.fn(async () => ({
      docs: [
        { id: "p-facade", quizType: "facade" },
        { id: "p-mirrors", quizType: "mirrors" },
      ],
    }));
    const ctx = {
      payload: { ...payload, find } as unknown as Payload,
      log: () => undefined,
      force: false,
      options: { minimal: false },
    } as SeedContext;
    upserts.length = 0;

    await seed(ctx);

    expect(upserts.map((u) => u.data.slug)).toEqual(
      GLAZING_MIRRORS_ROUTES.map((route) => route.docSlug)
    );
    expect(upserts.every((u) => u.collection === "constructions")).toBe(true);
    const bySlug = new Map(upserts.map((u) => [u.data.slug, u.data]));
    expect(bySlug.get("osteklenie")?.parent).toBeNull();
    expect(bySlug.get("fasadov")?.parent).toBe("id-osteklenie");
    expect(bySlug.get("dlya-zalov")?.parent).toBe("id-zerkala");
    expect(bySlug.get("dlya-zalov")?.__path).toBe("/zerkala/dlya-zalov/");
    expect(bySlug.get("fasadov")?.productTag).toBe("p-facade");
    expect(bySlug.get("dlya-salonov")?.productTag).toBe("p-mirrors");
    expect(bySlug.get("liftovyh-shaht")?.productTag).toBeNull();
  }, 30_000);
});
