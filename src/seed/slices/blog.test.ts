import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { paragraphMarkdown, WEIGHT_PAGE_COPY } from "@/components/calculators/weight-copy";
import { estimateReadingMinutes } from "@/lib/blog/reading-time";
import { checkStopWords } from "@/lib/domain/stop-words";
import { ARTICLES, articleMarkdown, BLOG_LISTING, WEIGHT_TOOL_PAGE } from "../content/blog";
import { ARTICLE_TEXTS } from "../content/blog-texts";

/**
 * Seed content of the blog slice (task 31): verbatim copies of teksty, no stop words, slugs.
 * The verbatim checks need `res/inex-glass-handoff/teksty` (not shipped in every checkout).
 */

const TEKSTY = path.resolve(__dirname, "../../../res/inex-glass-handoff/teksty");
const hasSources = existsSync(TEKSTY);
const read = (file: string) => readFileSync(path.join(TEKSTY, file), "utf8").replace(/\r\n/g, "\n");

/** Lines of a `# N. …` section up to the next `---`. */
function section(file: string, startsWith: string): string[] {
  const lines = read(file).split("\n");
  const start = lines.findIndex((line) => line.startsWith(startsWith));
  if (start < 0) throw new Error(`${file}: ${startsWith}`);
  const end = lines.findIndex((line, index) => index > start && line.trim() === "---");
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

/** Article content after its H1, without the final button line. */
function articleSource(lines: string[]): string {
  const h1 = lines.findIndex((line) => /^# /.test(line));
  return lines
    .slice(h1 + 1)
    .join("\n")
    .trim()
    .replace(/\n+(?:\[[^\]]+\]\s*)+$/, "")
    .trim();
}

const SOURCES: Record<string, () => string[]> = {
  "mozhno-li-rezat-zakalennoe-steklo": () => section("10-blog-kalkulyator.md", "# 2. "),
  "chem-otlichaetsya-zakalennoe-steklo-ot-obychnogo": () =>
    section("10-blog-kalkulyator.md", "# 3. "),
  "kak-vybrat-tolshchinu-stekla": () => section("10-blog-kalkulyator.md", "# 4. "),
  "kak-snyat-razmery-dlya-stekla": () => section("10-blog-kalkulyator.md", "# 5. "),
  "tripleks-ili-zakalennoe-dlya-ograzhdenij": () => {
    const lines = read("14-blog-tripleks-ili-zakalennoe.md").split("\n");
    return lines.slice(lines.findIndex((line) => line.startsWith("**URL:**")));
  },
  "markirovka-zakalennogo-stekla": () => section("17-matirovanie-markirovka-listingi.md", "# 2. "),
};

/** Markdown links back to the source form: `[Название](/url/)` → `[Название]`. */
const unlink = (markdown: string) => markdown.replace(/\[([^\]]+)\]\([^)]*\)/g, "[$1]");

/** Every text of the slice that reaches the site. */
function allTexts(): string[] {
  const articleTexts = ARTICLES.flatMap((article) => {
    const { lead, body } = articleMarkdown(article);
    return [article.title, article.seo.title, article.seo.description, lead ?? "", body];
  });
  return [
    ...articleTexts,
    BLOG_LISTING.intro,
    BLOG_LISTING.seo.title,
    BLOG_LISTING.seo.description,
    ...BLOG_LISTING.tools.map((tool) => tool.label),
    WEIGHT_TOOL_PAGE.seo.title,
    WEIGHT_TOOL_PAGE.seo.description,
    JSON.stringify(WEIGHT_PAGE_COPY),
  ];
}

describe("blog seed content", () => {
  it.skipIf(!hasSources)("article texts are verbatim copies of teksty", () => {
    for (const article of ARTICLES) {
      const source = articleSource(SOURCES[article.slug]!());
      const { lead, body } = articleMarkdown(article);
      const seeded = [lead, body].filter(Boolean).join("\n\n");
      expect(unlink(seeded), article.slug).toBe(source);
    }
  });

  it.skipIf(!hasSources)("listing intro and calculator copy are verbatim", () => {
    const listing = section("17-matirovanie-markirovka-listingi.md", "# 4. ").join("\n");
    expect(listing).toContain(BLOG_LISTING.intro);
    for (const tool of BLOG_LISTING.tools) expect(listing).toContain(`[${tool.label}]`);

    const tool = section("10-blog-kalkulyator.md", "# 1. ").join("\n");
    const copy = WEIGHT_PAGE_COPY;
    const lines = [
      copy.table.heading,
      copy.table.note,
      copy.manual.heading,
      paragraphMarkdown(copy.manual.intro),
      copy.manual.formula,
      ...copy.manual.examples.map(paragraphMarkdown),
      copy.why.heading,
      ...copy.why.items,
      `[${copy.links.tempered.label}]`,
      `[${copy.links.quiz.label}]`,
    ];
    for (const line of lines) expect(tool, line).toContain(line);
  });

  it("«Коротко» lead only where teksty start with it", () => {
    const withLead = ARTICLES.filter((article) => ARTICLE_TEXTS[article.slug]?.lead).map(
      (article) => article.slug
    );
    expect(withLead).toEqual([
      "mozhno-li-rezat-zakalennoe-steklo",
      "tripleks-ili-zakalennoe-dlya-ograzhdenij",
      "markirovka-zakalennogo-stekla",
    ]);
    for (const slug of withLead) expect(ARTICLE_TEXTS[slug]?.lead).toMatch(/^\*\*Коротко/);
  });

  it("has no stop words (М1 is a glass grade, no partner factories)", () => {
    for (const text of allTexts()) {
      expect(checkStopWords(text, { partnerFactories: [] }), text.slice(0, 60)).toEqual([]);
    }
    const all = allTexts().join("\n");
    expect(all).not.toMatch(/heat\s*soak|HST/i);
  });

  it("has six valid, unique slugs with resolvable related articles", () => {
    const slugs = ARTICLES.map((article) => article.slug);
    expect(slugs).toHaveLength(6);
    expect(new Set(slugs).size).toBe(6);
    for (const article of ARTICLES) {
      expect(article.slug).toMatch(/^[a-z0-9-]+$/);
      expect(article.slug).not.toBe("page");
      expect(article.related.length).toBeLessThanOrEqual(3);
      for (const slug of article.related) {
        expect(slugs).toContain(slug);
        expect(slug).not.toBe(article.slug);
      }
    }
  });

  it("estimates at least one minute of reading per article", () => {
    for (const article of ARTICLES) {
      const { lead, body } = articleMarkdown(article);
      expect(estimateReadingMinutes(`${lead ?? ""}\n${body}`)).toBeGreaterThanOrEqual(1);
    }
  });

  it("resolves every link of the texts to a URL", () => {
    for (const article of ARTICLES) {
      const { body } = articleMarkdown(article);
      expect(body).not.toMatch(/\[[^\]]+\](?!\()/);
    }
  });
});
