import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `collectSitemapEntries` with a mocked Local API: no Payload, no database. The fake `find`
 * honours the `_status = published` filter the loader sends, so drafts in the fixtures prove
 * that the query and the rules exclude them.
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  docs: {} as Record<string, Row[]>,
  globals: {} as Record<string, string | undefined>,
  teamIndexable: false,
  finds: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({ SITE_URL: "https://inexglass.ru", SITE_ENV: "production" }),
}));
vi.mock("@/lib/cms/cache", () => ({
  cached: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => fn,
  isBuildPhase: () => false,
}));
vi.mock("@/lib/cms/team", () => ({ isTeamIndexable: async () => state.teamIndexable }));
vi.mock("@/lib/cms/payload", () => ({
  getPayloadClient: async () => ({
    find: async (args: { collection: string; where?: { _status?: { equals: string } } }) => {
      state.finds.push(args);
      const all = state.docs[args.collection] ?? [];
      const status = args.where?._status?.equals;
      return { docs: status ? all.filter((doc) => doc._status === status) : all };
    },
    findGlobal: async ({ slug }: { slug: string }) => ({ updatedAt: state.globals[slug] }),
  }),
}));

const { collectSitemapEntries, buildSitemapEntries } = await import("./sitemap-entries");

const ORIGIN = "https://inexglass.ru";
const OLD = "2026-01-01T00:00:00.000Z";
const pub = { _status: "published", updatedAt: OLD };

function objects(count: number, prefix = "obj", status = "published"): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    slug: `${prefix}-${index + 1}`,
    path: `/obekty/${prefix}-${index + 1}/`,
    _status: status,
    updatedAt: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));
}

function articles(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    slug: `statya-${index + 1}`,
    path: `/blog/statya-${index + 1}/`,
    ...pub,
  }));
}

beforeEach(() => {
  state.finds = [];
  state.teamIndexable = false;
  state.globals = { prices: "2026-05-10T00:00:00.000Z", promo: "2026-04-01T00:00:00.000Z" };
  state.docs = {
    pages: [
      { path: "/", isHome: true, slug: "glavnaya", ...pub },
      { path: "/kontakty/", slug: "kontakty", ...pub },
      { path: "/o-kompanii/", slug: "o-kompanii", ...pub },
      { path: "/o-kompanii/sotrudniki/", slug: "sotrudniki", ...pub },
      { path: "/politika-konfidencialnosti/", slug: "p", ...pub, seo: { noindex: true } },
      {
        path: "/soglasie-na-obrabotku-personalnyh-dannyh/",
        slug: "s",
        ...pub,
        seo: { noindex: true },
      },
      { path: "/poisk/", slug: "poisk", ...pub },
      { path: "/chernovik/", slug: "chernovik", _status: "draft", updatedAt: OLD },
      { path: "/obekty/", slug: "obekty", ...pub },
      { path: "/blog/", slug: "blog", ...pub },
    ],
    thicknesses: [4, 5, 6, 8, 10, 12, 15, 19].map((n) => ({
      n,
      path: `/zakalennoe-steklo/${n}-mm/`,
      indexable: ![5, 15, 19].includes(n),
      updatedAt: OLD,
    })),
    "glass-types": [
      { slug: "matovoe", path: "/zakalennoe-steklo/matovoe/", ...pub },
      { slug: "tripleks", path: "/tripleks/", ...pub },
    ],
    "processing-services": [{ slug: "facet", path: "/obrabotka-stekla/facet/", updatedAt: OLD }],
    constructions: [{ slug: "osteklenie", path: "/osteklenie/", ...pub }],
    articles: articles(13),
    // 49 published objects + 3 drafts (import, task 37).
    objects: [...objects(49), ...objects(3, "draft-obj", "draft")],
  };
});

const paths = (entries: { url: string }[]) => entries.map((entry) => entry.url.replace(ORIGIN, ""));

describe("collectSitemapEntries", () => {
  it("lists absolute URLs with a trailing slash, home first, no duplicates, no query", async () => {
    const entries = await collectSitemapEntries();
    const urls = entries.map((entry) => entry.url);
    expect(urls[0]).toBe(`${ORIGIN}/`);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/inexglass\.ru\/(?:[a-z0-9-]+\/)*$/);
      expect(url).not.toContain("?");
    }
    for (const entry of entries) expect(entry.lastModified).toBeInstanceOf(Date);
  });

  it("excludes noindex, service, draft pages and thicknesses 5/15/19 mm", async () => {
    const list = paths(await collectSitemapEntries());
    for (const excluded of [
      "/politika-konfidencialnosti/",
      "/soglasie-na-obrabotku-personalnyh-dannyh/",
      "/poisk/",
      "/chernovik/",
      "/zakalennoe-steklo/5-mm/",
      "/zakalennoe-steklo/15-mm/",
      "/zakalennoe-steklo/19-mm/",
      "/obekty/draft-obj-1/",
    ]) {
      expect(list).not.toContain(excluded);
    }
    for (const n of [4, 6, 8, 10, 12]) expect(list).toContain(`/zakalennoe-steklo/${n}-mm/`);
    expect(list).toEqual(
      expect.arrayContaining([
        "/zakalennoe-steklo/matovoe/",
        "/tripleks/",
        "/obrabotka-stekla/facet/",
        "/osteklenie/",
        "/blog/statya-1/",
        "/obekty/obj-1/",
      ])
    );
  });

  it("paginates listings: ⌈n / size⌉ pages, page 1 is the listing itself", async () => {
    const list = paths(await collectSitemapEntries());
    // 49 published objects / 24 per page → pages 2 and 3; drafts do not count.
    expect(list).toContain("/obekty/page/2/");
    expect(list).toContain("/obekty/page/3/");
    expect(list).not.toContain("/obekty/page/4/");
    expect(list).not.toContain("/obekty/page/1/");
    // 13 articles / 12 per page → page 2.
    expect(list).toContain("/blog/page/2/");
    expect(list).not.toContain("/blog/page/3/");
    expect(list).not.toContain("/blog/page/1/");
  });

  it("an empty team keeps /o-kompanii/sotrudniki/ out; a visible member brings it in", async () => {
    expect(paths(await collectSitemapEntries())).not.toContain("/o-kompanii/sotrudniki/");
    state.teamIndexable = true;
    expect(paths(await collectSitemapEntries())).toContain("/o-kompanii/sotrudniki/");
  });

  it("adds fixed routes without documents (quiz, weight calculator) once", async () => {
    const list = paths(await collectSitemapEntries());
    expect(list).toContain("/raschet-stoimosti/");
    expect(list).toContain("/instrumenty/kalkulyator-vesa-stekla/");
    expect(list.filter((path) => path === "/kontakty/")).toHaveLength(1);
  });

  it("lastModified: thickness and home follow the prices global, listings the newest doc", async () => {
    const entries = await collectSitemapEntries();
    const at = (path: string) =>
      entries.find((entry) => entry.url === `${ORIGIN}${path}`)?.lastModified.toISOString();
    expect(at("/zakalennoe-steklo/10-mm/")).toBe("2026-05-10T00:00:00.000Z");
    expect(at("/")).toBe("2026-05-10T00:00:00.000Z");
    expect(at("/kontakty/")).toBe(OLD);
    expect(at("/obekty/")).toBe("2026-03-28T00:00:00.000Z");
    expect(at("/obekty/page/2/")).toBe("2026-03-28T00:00:00.000Z");
  });

  it("queries published documents of draft-enabled collections, without access checks", async () => {
    await collectSitemapEntries();
    const pagesQuery = state.finds.find((args) => args.collection === "pages");
    expect(pagesQuery).toMatchObject({
      where: { _status: { equals: "published" } },
      overrideAccess: true,
      pagination: false,
      depth: 0,
    });
    expect(state.finds.find((args) => args.collection === "thicknesses")?.where).toBeUndefined();
  });

  it("an empty site lists the home page and fixed routes, but not the empty listings", () => {
    const empty = {
      docs: {
        pages: [],
        thicknesses: [],
        "glass-types": [],
        "processing-services": [],
        constructions: [],
        articles: [],
        objects: [],
      },
      pricesUpdatedAt: null,
      promoUpdatedAt: null,
      teamIndexable: false,
    };
    const now = new Date("2026-10-21T00:00:00.000Z");
    const list = buildSitemapEntries(empty, `${ORIGIN}/`, now);
    expect(list[0]).toEqual({ url: `${ORIGIN}/`, lastModified: now });
    expect(paths(list)).toEqual(expect.arrayContaining(["/kontakty/", "/raschet-stoimosti/"]));
    expect(paths(list)).not.toContain("/obekty/");
    expect(paths(list)).not.toContain("/blog/");
  });

  it("drops a listing without published documents even when a page backs it", async () => {
    state.docs.objects = objects(2, "draft-obj", "draft");
    state.docs.articles = [];
    let list = paths(await collectSitemapEntries());
    expect(list).not.toContain("/obekty/");
    expect(list).not.toContain("/blog/");
    expect(list.some((path) => path.startsWith("/obekty/page/"))).toBe(false);

    state.docs.objects = objects(1);
    state.docs.articles = articles(1);
    list = paths(await collectSitemapEntries());
    expect(list).toContain("/obekty/");
    expect(list).toContain("/blog/");
  });

  it("keeps a noindex listing and its pagination out even with published documents", async () => {
    state.docs.pages = (state.docs.pages ?? []).map((doc) =>
      doc.path === "/obekty/" || doc.path === "/blog/" ? { ...doc, seo: { noindex: true } } : doc
    );
    const list = paths(await collectSitemapEntries());
    expect(list).not.toContain("/obekty/");
    expect(list).not.toContain("/blog/");
    expect(list.some((path) => /^\/(obekty|blog)\/page\//.test(path))).toBe(false);
    // The detail pages themselves stay listed.
    expect(list).toContain("/obekty/obj-1/");
    expect(list).toContain("/blog/statya-1/");
  });
});
