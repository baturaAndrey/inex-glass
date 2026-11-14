import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkStopWords } from "@/lib/domain";
import { RESERVED_OBJECT_SLUG } from "@/lib/objects/filters";
import { LISTING_DESCRIPTION, LISTING_TITLE } from "@/lib/objects/seo";
import {
  CITY_SEEDS,
  LISTING_AMONG,
  LISTING_CTA_BUTTON,
  LISTING_CTA_TEXT,
  LISTING_INTRO,
  LISTING_SEO,
  OBJECT_DRAFTS,
  OBJECT_TYPE_SEEDS,
  PRODUCT_SEEDS,
} from "../content/objects";

const SLUG = /^[a-z0-9-]+$/;
const TEKSTY = path.resolve("res/inex-glass-handoff/teksty/17-matirovanie-markirovka-listingi.md");

describe("objects seed content", () => {
  it("has 11 drafts with unique, valid, non-reserved slugs", () => {
    const slugs = OBJECT_DRAFTS.map((draft) => draft.slug);
    expect(slugs).toHaveLength(11);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(slug).toMatch(SLUG);
      expect(slug).not.toBe(RESERVED_OBJECT_SLUG);
    }
  });

  it("taxonomy slugs are unique and valid; drafts reference existing ones", () => {
    for (const seeds of [PRODUCT_SEEDS, OBJECT_TYPE_SEEDS, CITY_SEEDS]) {
      const slugs = seeds.flatMap((seed) => [seed.slug, ...(seed.aliases ?? [])]);
      expect(new Set(slugs).size).toBe(slugs.length);
      for (const slug of slugs) expect(slug).toMatch(SLUG);
    }
    const cities = new Set(CITY_SEEDS.map((seed) => seed.slug));
    const types = new Set(OBJECT_TYPE_SEEDS.map((seed) => seed.slug));
    for (const draft of OBJECT_DRAFTS) {
      if (draft.city) expect(cities.has(draft.city)).toBe(true);
      if (draft.type) expect(types.has(draft.type)).toBe(true);
    }
  });

  it("listing meta equals the route fallbacks (one source of truth for 17-meta)", () => {
    expect(LISTING_SEO.title).toBe(LISTING_TITLE);
    expect(LISTING_SEO.description).toBe(LISTING_DESCRIPTION);
  });

  it("has no stop words", () => {
    // The meta description is verbatim from 17-meta: its short «1500+ проектов за 21 год» is the
    // approved snippet form of the experience phrase, so only that rule is waived for it.
    expect(checkStopWords(LISTING_SEO.description, { ignoreRules: ["experience"] })).toEqual([]);
    const texts = [
      LISTING_SEO.title,
      LISTING_INTRO,
      LISTING_AMONG,
      LISTING_CTA_TEXT,
      LISTING_CTA_BUTTON,
      ...OBJECT_DRAFTS.map((draft) => draft.name),
    ];
    for (const text of texts) expect(checkStopWords(text), text).toEqual([]);
  });

  it.skipIf(!existsSync(TEKSTY))("listing texts are verbatim from teksty §5", () => {
    const source = readFileSync(TEKSTY, "utf8");
    for (const text of [
      LISTING_INTRO,
      LISTING_AMONG,
      LISTING_CTA_TEXT,
      `[${LISTING_CTA_BUTTON}]`,
      `**Title:** ${LISTING_SEO.title}`,
      `**Description:** ${LISTING_SEO.description}`,
    ]) {
      expect(source).toContain(text);
    }
  });
});
