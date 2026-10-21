/**
 * Integration test of the site search (task 35) against a throwaway database: the migrations
 * (incl. `add_search`: generated `tsv` column + GIN index) on a clean DB, indexing through the
 * plugin hooks, ё/е equivalence, prefix search, priority, exclusions (drafts, legal pages),
 * un-publishing, the reindex, and the GIN index in the plan on 5000 synthetic rows.
 *
 * Skipped unless `PAYLOAD_INT_DATABASE_URL` points to a database whose name ends with `_test`.
 * The suite drops and recreates it, applies the MIGRATIONS (no schema push) and drops it after:
 *
 *   PAYLOAD_INT_DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/inex_glass_t35_test \
 *     pnpm vitest run --project unit src/lib/search/search.int.test.ts
 */
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, dropTestDb, resolveTestDbTarget } from "../../../e2e/helpers/test-db";
import { rel } from "../../payload/slugs";
import { paragraphs } from "../../seed/lexical";
import type { Payload } from "payload";

const DATABASE_URL = process.env.PAYLOAD_INT_DATABASE_URL;
const SETUP_TIMEOUT_MS = 600_000;
const TEST_SECRET = "int-test-secret-int-test-secret-0000";
/**
 * Synthetic volume of the plan check. With ~1500 rows the whole heap is a few dozen pages (the
 * bodies and `tsv` are TOASTed), so the planner rightly prefers a sequential scan; from a few
 * thousand rows on, the GIN index is used.
 */
const SYNTHETIC_ROWS = 5000;
/** Words per synthetic body (~2 KB of text, like a real content page). */
const BODY_WORDS = 60;

type Doc = { id: string };

describe.skipIf(!DATABASE_URL)("site search (Postgres FTS, throwaway DB)", () => {
  let payload: Payload;
  let searchSite: typeof import("./query").searchSite;
  let reindexSearch: typeof import("./reindex").reindexSearch;
  const target = DATABASE_URL
    ? resolveTestDbTarget(DATABASE_URL, process.env.DATABASE_ADMIN_URL)
    : null;

  const createPage = async (data: Record<string, unknown>, draft = false) =>
    (await payload.create({
      collection: rel("pages"),
      data: data as never,
      draft,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })) as unknown as Doc;

  const urls = async (q: string) => (await searchSite({ q }, payload)).hits.map((hit) => hit.url);

  beforeAll(async () => {
    if (!target || !DATABASE_URL) return;
    await dropTestDb(target);
    await createTestDb(target);

    process.env.DATABASE_URL = DATABASE_URL;
    process.env.PAYLOAD_DB_PUSH = "false";
    process.env.PAYLOAD_SECRET ??= TEST_SECRET;
    process.env.MEDIA_DIR = path.join(os.tmpdir(), "inex-glass-int-media");
    process.env.JOBS_ENABLED = "false";

    const [{ getPayload }, { default: config }, { migrations }, query, reindex] = await Promise.all(
      [
        import("payload"),
        import("@payload-config"),
        import("../../migrations"),
        import("./query"),
        import("./reindex"),
      ]
    );
    searchSite = query.searchSite;
    reindexSearch = reindex.reindexSearch;
    const sanitized = await config;
    sanitized.typescript = { ...sanitized.typescript, autoGenerate: false };
    payload = await getPayload({ config: sanitized });
    // Same list as `prodMigrations`; the adapter types its args loosely (`unknown`).
    type MigrateArgs = NonNullable<Parameters<Payload["db"]["migrate"]>[0]>;
    await payload.db.migrate({
      migrations: migrations as unknown as NonNullable<MigrateArgs["migrations"]>,
    });

    const body = (text: string) => [{ blockType: "richText", content: paragraphs(text) }];
    await createPage({
      title: "Стеклянные перегородки",
      slug: "steklyannye-peregorodki",
      _status: "published",
      layout: body("Офисные перегородки из закалённого стекла толщиной 10 и 12 мм."),
    });
    await createPage({
      title: "Закалённое стекло",
      slug: "zakalennoe-steklo",
      _status: "published",
      layout: body("Закалённое стекло на заказ: толщина 10 мм, кромка, отверстия."),
    });
    await createPage({
      title: "Политика обработки данных",
      slug: "politika",
      template: "legal",
      _status: "published",
      layout: body("Закалённое стекло упомянуто в служебном документе."),
    });
    await createPage(
      {
        title: "Черновик про закалённое стекло",
        slug: "chernovik",
        layout: body("Закалённое стекло в черновике."),
      },
      true
    );
  }, SETUP_TIMEOUT_MS);

  afterAll(async () => {
    const pool = (
      payload?.db as unknown as
        { pool?: { on: (event: "error", fn: () => void) => void } } | undefined
    )?.pool;
    pool?.on("error", () => undefined);
    await payload?.destroy();
    if (target) await dropTestDb(target);
  }, SETUP_TIMEOUT_MS);

  it("indexes published documents on save and treats ё and е alike", async () => {
    const withYo = await urls("закалённое");
    expect(withYo).toEqual(await urls("закаленное"));
    expect(withYo).toEqual(
      expect.arrayContaining(["/zakalennoe-steklo/", "/steklyannye-peregorodki/"])
    );
    expect(await urls("закаленное стекло")).toContain("/zakalennoe-steklo/");
  });

  it("finds by prefix and is case-insensitive", async () => {
    expect((await urls("перегор"))[0]).toBe("/steklyannye-peregorodki/");
    expect(await urls("ТОЛЩИНА 10")).toEqual(
      expect.arrayContaining(["/zakalennoe-steklo/", "/steklyannye-peregorodki/"])
    );
  });

  it("never returns drafts or legal pages", async () => {
    const found = await urls("закаленное стекло");
    expect(found).not.toContain("/politika/");
    expect(found).not.toContain("/chernovik/");
  });

  it("returns sanitized snippets with marks", async () => {
    const [hit] = (await searchSite({ q: "отверстия" }, payload)).hits;
    expect(hit?.snippet).toMatch(/<mark>отверстия<\/mark>/i);
  });

  it("drops a page from the index when it is unpublished, and the reindex keeps that", async () => {
    const page = await createPage({
      title: "Козырьки из триплекса",
      slug: "kozyrki",
      _status: "published",
    });
    expect(await urls("козырьки")).toContain("/kozyrki/");

    await payload.update({
      collection: rel("pages"),
      id: page.id,
      data: { _status: "draft" } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    });
    expect(await urls("козырьки")).not.toContain("/kozyrki/");

    const stats = await reindexSearch(payload, ["pages"]);
    expect(stats[0]).toMatchObject({ collection: "pages", indexed: 2, skipped: 1 });
    expect(await urls("козырьки")).not.toContain("/kozyrki/");
    expect(await urls("перегор")).toContain("/steklyannye-peregorodki/");
  });

  it("a number is not a prefix: «10» does not find a page about «100»", async () => {
    await createPage({
      title: "Нестандартная партия",
      slug: "partiya",
      _status: "published",
      layout: [{ blockType: "richText", content: paragraphs("Партия от 100 листов.") }],
    });
    expect(await urls("партия 100")).toContain("/partiya/");
    expect(await urls("партия 10")).not.toContain("/partiya/");
  });

  it("a draft with seo.noindex keeps the live entry; publishing it removes the entry", async () => {
    const page = await createPage({
      title: "Витражи",
      slug: "vitrazhi",
      _status: "published",
    });
    expect(await urls("витражи")).toContain("/vitrazhi/");

    const save = (data: Record<string, unknown>, draft: boolean) =>
      payload.update({
        collection: rel("pages"),
        id: page.id,
        data: data as never,
        draft,
        overrideAccess: true,
        context: { disableRevalidate: true },
      });
    await save({ seo: { noindex: true } }, true);
    expect(await urls("витражи")).toContain("/vitrazhi/");

    await save({ seo: { noindex: true }, _status: "published" }, false);
    expect(await urls("витражи")).not.toContain("/vitrazhi/");
  });

  it("after a parent's slug change the children's entries carry the new URLs", async () => {
    const parent = await createPage({ title: "Раздел", slug: "razdel", _status: "published" });
    await createPage({
      title: "Душевые кабины",
      slug: "dushevye",
      parent: parent.id,
      _status: "published",
    });
    expect(await urls("душевые")).toContain("/razdel/dushevye/");

    await payload.update({
      collection: rel("pages"),
      id: parent.id,
      data: { slug: "novyj-razdel", _status: "published" } as never,
      overrideAccess: true,
      context: { disableRevalidate: true },
    });
    const found = await urls("душевые");
    expect(found).toContain("/novyj-razdel/dushevye/");
    expect(found).not.toContain("/razdel/dushevye/");
  });

  it("uses the GIN index on 5000 synthetic rows", async () => {
    const { sql } = await import("@payloadcms/db-postgres");
    const { buildSearchSql, prepareQuery } = await import("./query");
    // Page-sized bodies: BODY_WORDS distinct pseudo-words + one topic word.
    await payload.db.drizzle.execute(sql`
      INSERT INTO search (title, title_norm, body_text, url, kind, priority)
      SELECT 'Документ ' || g, 'документ ' || g,
             (SELECT string_agg(md5(g::text || '-' || i::text), ' ')
                FROM generate_series(1, ${BODY_WORDS}) AS i) || ' про ' ||
               CASE WHEN g % 100 = 0 THEN 'витрины'
                  ELSE (ARRAY['зеркала','фасады','козырьки','ограждения'])[1 + g % 4] END,
             '/synthetic/' || g || '/', 'pages', 5
      FROM generate_series(1, ${SYNTHETIC_ROWS}) AS g`);
    // VACUUM moves the GIN pending list into the index proper (fastupdate), as autovacuum would.
    await payload.db.drizzle.execute(sql`VACUUM ANALYZE search`);

    const prepared = prepareQuery("витрины");
    if (!prepared) throw new Error("query must be searchable");
    const plan = await payload.db.drizzle.execute(sql`EXPLAIN ${buildSearchSql(prepared, 20, 0)}`);
    const text = (plan as unknown as { rows: Array<Record<string, string>> }).rows
      .map((row) => Object.values(row).join(" "))
      .join("\n");
    console.warn(`EXPLAIN (${SYNTHETIC_ROWS} rows):\n${text}`);
    expect(text).toContain("search_tsv_gin");
    // A selective word (1 row in 100), as real queries are.
    expect((await searchSite({ q: "витрины" }, payload)).total).toBe(SYNTHETIC_ROWS / 100);
  });
});
