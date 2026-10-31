import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { checkStopWords, THICKNESSES } from "@/lib/domain";
import { ANCHOR_PATTERN } from "@/payload/blocks/_section";
import { seed as seedThicknesses } from "./thicknesses";
import { seed as seedHub } from "./zak-hub";
import {
  INDEXABLE_THICKNESSES,
  THICKNESS_CTA_LABEL,
  THICKNESS_GROUPS,
  THICKNESS_SEO,
  THICKNESS_VALUES,
} from "../content/thicknesses";
import { HUB_ANCHORS, HUB_PATH, ZAK_HUB } from "../content/zak-hub";
import type { SeedContext } from "../context";

/*
 * The slices import `../context` (Payload config) and `../lexical` (editor config); tests never
 * boot Payload, so the upserts are recorded and markdown becomes a one-paragraph stub.
 */
const upserts = vi.hoisted(
  () =>
    [] as Array<{
      collection: string;
      where: unknown;
      data: Record<string, unknown>;
      overwrite: boolean | undefined;
    }>
);
vi.mock("../context", async () => {
  // The real «edited in the admin?» rule (`../marker` has no runtime Payload imports).
  const { mayOverwrite } = await import("../marker");
  const record = (
    collection: string,
    where: unknown,
    data: Record<string, unknown>,
    opts?: { overwrite?: boolean }
  ) => {
    upserts.push({ collection, where, data, overwrite: opts?.overwrite });
    return Promise.resolve({ doc: { id: `id-${upserts.length}`, ...data }, action: "created" });
  };
  return {
    mayOverwrite,
    upsertByField: vi.fn(
      (
        _ctx: unknown,
        collection: string,
        where: unknown,
        data: Record<string, unknown>,
        opts?: { overwrite?: boolean }
      ) => record(collection, where, data, opts)
    ),
    upsertByPath: vi.fn(
      (
        _ctx: unknown,
        collection: string,
        p: string,
        data: Record<string, unknown>,
        opts?: { overwrite?: boolean }
      ) => record(collection, { path: { equals: p } }, data, opts)
    ),
  };
});
vi.mock("../lexical", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lexical")>();
  return {
    ...actual,
    markdown: vi.fn(async (_ctx: unknown, md: string) => ({
      root: { type: "root", markdown: md },
    })),
  };
});

const ROOT = path.resolve(import.meta.dirname, "../../..");
const TEKSTY_02 = path.join(ROOT, "res/inex-glass-handoff/teksty/02-zakalennoe-steklo.md");
const TEKSTY_03 = path.join(ROOT, "res/inex-glass-handoff/teksty/03-kartochki-tolshchin.md");
const META = path.join(ROOT, "docs/inex/17-meta.md");
const HAS_SOURCES = existsSync(TEKSTY_02) && existsSync(TEKSTY_03) && existsSync(META);

// ---------------------------------------------------------------------------------------------
// Plain-text comparison of markdown content and teksty
// ---------------------------------------------------------------------------------------------

const MD_LINK = /\[([^\]]+)\]\([^)]*\)/g;
/** teksty links are bare `[Название]` (no URL). */
const BARE_LINK = /\[([^\]]+)\](?!\()/g;

function plain(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(MD_LINK, "$1")
    .replace(BARE_LINK, "$1")
    .replace(/\\\|/g, "|")
    .replace(/→/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** teksty write group texts after a lead-in («Подбор: подходит ли …»): the first letter may differ in case. */
const caseVariants = (text: string) => [
  text,
  text.charAt(0).toLowerCase() + text.slice(1),
  text.charAt(0).toUpperCase() + text.slice(1),
];

function hubStrings(): string[] {
  const { seo, hero, prices, checklist, risk, weights, kinds, processing, timing, audiences, faq } =
    ZAK_HUB;
  return [
    seo.h1,
    seo.title,
    seo.description,
    hero.facts,
    hero.strong,
    hero.quizLabel,
    hero.drawingLabel,
    prices.heading,
    prices.caption,
    checklist.heading,
    checklist.sub,
    ...checklist.items.flatMap((item) => [item.title, item.text]),
    ...checklist.links.map((link) => link.label),
    risk.heading,
    ...risk.items.flatMap((item) => [item.title, item.text]),
    weights.heading,
    weights.sub,
    weights.footnote,
    weights.loadLabel,
    weights.calculator.label,
    ...weights.columns,
    kinds.heading,
    ...kinds.items.flatMap((item) => [item.title, item.text]),
    kinds.bridge,
    processing.heading,
    ...processing.items.flatMap((item) => [item.title, item.text]),
    timing.heading,
    ...timing.markdown.split("\n").filter(Boolean),
    ...timing.links.map((link) => link.label),
    audiences.heading,
    ...audiences.items.flatMap((item) => [item.title, item.text]),
    faq.heading,
    ...faq.items.flat(),
  ];
}

function thicknessStrings(): string[] {
  return [
    ...THICKNESS_GROUPS.flatMap((group) => [group.podbor, group.obrabotka, ...group.faq.flat()]),
    ...THICKNESS_VALUES.flatMap((item) => [item.kindsText, item.sizeText ?? ""]).filter(Boolean),
    THICKNESS_SEO.h1,
    THICKNESS_SEO.description,
    THICKNESS_CTA_LABEL,
  ];
}

describe.skipIf(!HAS_SOURCES)("zak-hub / thicknesses content matches teksty and 17-meta", () => {
  let teksty02 = "";
  let teksty03 = "";
  let meta = "";
  beforeAll(() => {
    teksty02 = plain(readFileSync(TEKSTY_02, "utf8"));
    teksty03 = plain(readFileSync(TEKSTY_03, "utf8"));
    meta = plain(readFileSync(META, "utf8"));
  });

  it("hub strings are verbatim teksty/02 (meta from 17-meta)", () => {
    const missing = hubStrings().filter((text) => {
      const value = plain(text);
      return !teksty02.includes(value) && !meta.includes(value);
    });
    expect(missing).toEqual([]);
  });

  it("hub H1 / title / description come from 17-meta", () => {
    for (const value of Object.values(ZAK_HUB.seo)) expect(meta).toContain(plain(value));
  });

  it("thickness strings are verbatim teksty/03", () => {
    const missing = thicknessStrings().filter((text) => {
      const value = plain(text);
      return !caseVariants(value).some((variant) => teksty03.includes(variant));
    });
    expect(missing).toEqual([]);
  });

  it("thickness titles follow 17-meta (no «, до 3000 × 2000»)", () => {
    expect(meta).toContain(THICKNESS_SEO.title);
    expect(meta).toContain(THICKNESS_SEO.titleNoPrice);
    expect(meta).toContain(THICKNESS_SEO.description);
    expect(THICKNESS_SEO.title).not.toContain("до 3000");
  });
});

describe("zak-hub / thicknesses content rules", () => {
  it("has no stop-words", () => {
    const findings = [...hubStrings(), ...thicknessStrings()].flatMap((text) =>
      checkStopWords(text).map((finding) => `${finding.match}: ${text}`)
    );
    expect(findings).toEqual([]);
  });

  it("never mentions Heat Soak or glazing units (ТЗ §11)", () => {
    const all = [...hubStrings(), ...thicknessStrings()].join("\n");
    expect(all).not.toMatch(/heat\s*soak|стеклопакет/i);
  });

  it("covers every thickness once, in groups", () => {
    expect(THICKNESS_VALUES.map((item) => item.n)).toEqual([...THICKNESSES]);
    expect(THICKNESS_GROUPS.flatMap((group) => group.thicknesses)).toEqual([...THICKNESSES]);
    for (const item of THICKNESS_VALUES) {
      const group = THICKNESS_GROUPS.find((g) => g.label === item.groupLabel);
      expect(group?.thicknesses).toContain(item.n);
    }
  });

  it("indexes only 4, 6, 8, 10, 12 mm", () => {
    expect(INDEXABLE_THICKNESSES).toEqual([4, 6, 8, 10, 12]);
  });

  it("has 7 hub FAQ questions and valid anchors", () => {
    expect(ZAK_HUB.faq.items).toHaveLength(7);
    for (const anchor of Object.values(HUB_ANCHORS)) expect(anchor).toMatch(ANCHOR_PATTERN);
  });
});

// ---------------------------------------------------------------------------------------------
// Slices (Payload mocked)
// ---------------------------------------------------------------------------------------------

function fakeContext(
  existing: Record<string, unknown> | null,
  force = false,
  marker: { updatedAt: string } | null = null
): SeedContext {
  return {
    payload: {
      find: vi.fn(async () => ({ docs: existing ? [{ id: "doc-1", ...existing }] : [] })),
      kv: { get: vi.fn(async () => marker), set: vi.fn(async () => undefined) },
    } as unknown as SeedContext["payload"],
    log: vi.fn(),
    force,
    options: { minimal: false },
  };
}

const PRISTINE = { createdAt: "2026-10-15T10:00:00.000Z", updatedAt: "2026-10-15T10:00:00.500Z" };
const EDITED = { createdAt: "2026-10-15T10:00:00.000Z", updatedAt: "2026-10-16T09:00:00.000Z" };

describe("seed zak-hub", () => {
  it("builds the hub with its sections in order", async () => {
    upserts.length = 0;
    await seedHub(fakeContext(PRISTINE));
    expect(upserts).toHaveLength(1);
    const [hub] = upserts;
    expect(hub?.collection).toBe("pages");
    expect(hub?.where).toEqual({ path: { equals: HUB_PATH } });
    const data = hub?.data as {
      template: string;
      _status: string;
      layout: Array<Record<string, unknown>>;
    };
    expect(data.template).toBe("hub");
    expect(data._status).toBe("published");
    expect(
      data.layout.map((block) => `${String(block.blockType)}:${String(block.anchorId ?? "")}`)
    ).toEqual([
      "hero:",
      "pricesTable:ceny",
      "steps:checklist",
      "cards:risk",
      "table:weights",
      "cta:weights-cta",
      "cards:vidy",
      "richText:vidy-bridge",
      "cards:obrabotka",
      "richText:sroki",
      "cta:sroki-cta",
      "cards:forwhom",
      "objectsFeed:objects",
      "faq:faq",
      "form:form",
    ]);
    const faq = data.layout.find((block) => block.blockType === "faq") as { items: unknown[] };
    expect(faq.items).toHaveLength(7);
    const prices = data.layout.find((block) => block.blockType === "pricesTable");
    expect(prices).toMatchObject({
      variant: "table",
      showIncluded: true,
      showCaption: true,
      showPromo: true,
      showWeight: true,
      calloutFromConditions: true,
    });
  });

  it("skips an edited hub unless forced", async () => {
    upserts.length = 0;
    await seedHub(fakeContext(EDITED));
    expect(upserts).toHaveLength(0);
    await seedHub(fakeContext(EDITED, true));
    expect(upserts).toHaveLength(1);
  });
});

describe("seed thicknesses", () => {
  it("upserts 4 groups by label and 8 thicknesses by n, never touching indexable", async () => {
    upserts.length = 0;
    await seedThicknesses(fakeContext(PRISTINE));
    const groups = upserts.filter((u) => u.collection === "thickness-groups");
    const cards = upserts.filter((u) => u.collection === "thicknesses");
    expect(groups.map((g) => g.where)).toEqual(
      THICKNESS_GROUPS.map((g) => ({ label: { equals: g.label } }))
    );
    expect(cards.map((c) => c.where)).toEqual(THICKNESSES.map((n) => ({ n: { equals: n } })));
    expect(cards.every((c) => !("indexable" in c.data))).toBe(true);
    expect(cards.every((c) => c.overwrite === true)).toBe(true);
    const nineteen = cards.find((c) => c.data.n === 19);
    expect(nineteen?.data).toMatchObject({
      kindsText: "по запросу; крашеное и гнутое — нет",
      sizeText: "до 3000 × 2000 мм; точнее — после согласования с заводом",
      seo: THICKNESS_SEO,
    });
  });

  it("does not overwrite edited documents without --force", async () => {
    upserts.length = 0;
    await seedThicknesses(fakeContext(EDITED));
    expect(upserts.every((u) => u.overwrite === false)).toBe(true);
  });

  it("re-run after its own update (seed marker matches): overwrites without --force", async () => {
    // Mini-seed created the card, the slice updated it a day later and recorded the marker.
    upserts.length = 0;
    await seedThicknesses(fakeContext(EDITED, false, { updatedAt: EDITED.updatedAt }));
    expect(upserts.length).toBeGreaterThan(0);
    expect(upserts.every((u) => u.overwrite === true)).toBe(true);
  });

  it("an admin save after the seed's last write (marker differs): skipped", async () => {
    upserts.length = 0;
    await seedThicknesses(fakeContext(EDITED, false, { updatedAt: PRISTINE.updatedAt }));
    expect(upserts.every((u) => u.overwrite === false)).toBe(true);
  });
});
