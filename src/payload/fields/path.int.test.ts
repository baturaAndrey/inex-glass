/**
 * Local API integration tests for task-07 schema hooks: path computation and cascade, slug,
 * cross-collection path uniqueness, delete guard, publish validation and team read access.
 *
 * Skipped unless `PAYLOAD_INT_DATABASE_URL` points to a throwaway database whose name ends with
 * `_test`. The suite drops and recreates that database, pushes the current schema into it
 * (`PAYLOAD_DB_PUSH=true`, allowed only on a personal throwaway DB) and drops it afterwards:
 *
 *   PAYLOAD_INT_DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/inex_glass_t07_test \
 *     pnpm vitest run --project unit src/payload/fields/path.int.test.ts
 *
 * The admin connection defaults to the `postgres` database on the same server
 * (override with `DATABASE_ADMIN_URL`).
 */
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, dropTestDb, resolveTestDbTarget } from "../../../e2e/helpers/test-db";
import { rel } from "../slugs";
import type { Payload, Where } from "payload";

const DATABASE_URL = process.env.PAYLOAD_INT_DATABASE_URL;
/** Schema push of ~600 tables plus Payload init takes a while on a cold database. */
const SETUP_TIMEOUT_MS = 600_000;
const TEST_SECRET = "int-test-secret-int-test-secret-0000";

type Doc = Record<string, unknown> & { id: string };

/**
 * Asserts that `promise` rejects and that the error (its message or, for a `ValidationError`,
 * the field messages in `data.errors`) matches `pattern`.
 */
async function expectRejection(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason
  );
  expect(error, "expected the operation to fail").toBeInstanceOf(Error);
  const details = (error as { data?: { errors?: { message?: string }[] } }).data?.errors ?? [];
  const text = [(error as Error).message, ...details.map((item) => item.message ?? "")].join(" | ");
  expect(text).toMatch(pattern);
}

describe.skipIf(!DATABASE_URL)("task-07 schema hooks (Local API, throwaway DB)", () => {
  let payload: Payload;
  const target = DATABASE_URL
    ? resolveTestDbTarget(DATABASE_URL, process.env.DATABASE_ADMIN_URL)
    : null;

  // Untyped wrappers: collection slugs are not in `payload-types.ts` until the schema freeze.
  const create = async (collection: string, data: Record<string, unknown>, draft = false) =>
    (await payload.create({
      collection: rel(collection),
      data: data as never,
      draft,
    })) as unknown as Doc;
  const update = async (
    collection: string,
    id: string,
    data: Record<string, unknown>,
    draft = false
  ) =>
    (await payload.update({
      collection: rel(collection),
      id,
      data: data as never,
      draft,
    })) as unknown as Doc;
  const read = async (collection: string, id: string, draft = false) =>
    (await payload.findByID({
      collection: rel(collection),
      id,
      depth: 0,
      draft,
    })) as unknown as Doc;
  const remove = (collection: string, id: string) =>
    payload.delete({ collection: rel(collection), id });
  type VersionDoc = { id: string; version: Doc; latest?: boolean; updatedAt: string };
  const versions = async (collection: string, id: string) => {
    const where: Where = { parent: { equals: id } };
    const { docs } = await payload.findVersions({
      collection: rel(collection),
      where,
      sort: "-createdAt",
      pagination: false,
      depth: 0,
    });
    return docs as unknown as VersionDoc[];
  };

  beforeAll(async () => {
    if (!target || !DATABASE_URL) return;
    await dropTestDb(target);
    await createTestDb(target);

    // `getEnv()` memoizes on first use: set everything before the config is imported.
    process.env.DATABASE_URL = DATABASE_URL;
    process.env.PAYLOAD_DB_PUSH = "true";
    process.env.PAYLOAD_SECRET ??= TEST_SECRET;
    process.env.MEDIA_DIR = path.join(os.tmpdir(), "inex-glass-int-media");
    process.env.JOBS_ENABLED = "false";

    const [{ getPayload }, { default: config }] = await Promise.all([
      import("payload"),
      import("@payload-config"),
    ]);
    // Outside production Payload regenerates `payload-types.ts` on init; the suite must not
    // touch tracked files, so type generation is switched off for this instance.
    const sanitized = await config;
    sanitized.typescript = { ...sanitized.typescript, autoGenerate: false };
    payload = await getPayload({ config: sanitized });
  }, SETUP_TIMEOUT_MS);

  afterAll(async () => {
    // `destroy()` leaves the pg pool open; DROP … WITH (FORCE) then kills its idle clients.
    // Swallow that expected disconnect instead of letting it surface as an uncaught error.
    const pool = (
      payload?.db as unknown as
        { pool?: { on: (event: "error", fn: () => void) => void } } | undefined
    )?.pool;
    pool?.on("error", () => undefined);
    await payload?.destroy();
    if (target) await dropTestDb(target);
  }, SETUP_TIMEOUT_MS);

  describe("slug", () => {
    it("is generated from a Cyrillic title and kept on partial updates", async () => {
      const page = await create("pages", { title: "Стеклянные перегородки", _status: "published" });
      expect(page.slug).toBe("steklyannye-peregorodki");
      expect(page.path).toBe("/steklyannye-peregorodki/");

      const renamed = await update("pages", page.id, { title: "Другое название" });
      expect(renamed.slug).toBe("steklyannye-peregorodki");
    });

    it("rejects a non-kebab-case slug", async () => {
      await expectRejection(
        create("pages", { title: "Плохой слаг", slug: "Bad_Slug", _status: "published" }),
        /латиница/
      );
    });
  });

  describe("path cascade", () => {
    it("rewrites child paths on publish without publishing the child's pending draft", async () => {
      const parent = await create("pages", {
        title: "Раздел",
        slug: "razdel",
        _status: "published",
      });
      const child = await create("pages", {
        title: "Дочерняя",
        slug: "dochernyaya",
        parent: parent.id,
        _status: "published",
      });
      const grandchild = await create("pages", {
        title: "Внучка",
        slug: "vnuchka",
        parent: child.id,
        _status: "published",
      });
      expect(grandchild.path).toBe("/razdel/dochernyaya/vnuchka/");

      // Pending draft on the child.
      await update("pages", child.id, { title: "Дочерняя (черновик)" }, true);

      await update("pages", parent.id, { slug: "razdel-2", _status: "published" });

      const published = await read("pages", child.id);
      expect(published.path).toBe("/razdel-2/dochernyaya/");
      expect(published.title).toBe("Дочерняя");
      expect(published._status).toBe("published");

      const draft = await read("pages", child.id, true);
      expect(draft.title).toBe("Дочерняя (черновик)");
      expect(draft.path).toBe("/razdel-2/dochernyaya/");
      expect(draft._status).toBe("draft");

      const history = await versions("pages", child.id);
      const latest = history.find((row) => row.latest);
      expect(latest?.version._status).toBe("draft");
      expect(latest?.version.path).toBe("/razdel-2/dochernyaya/");
      const lastPublished = history.find((row) => row.version._status === "published");
      expect(lastPublished?.version.path).toBe("/razdel-2/dochernyaya/");
      // Only the path changed: no new version rows, the newest row is still the draft.
      expect(history).toHaveLength(2);
      expect(history[0]?.id).toBe(latest?.id);
      // …and the cascade kept version timestamps, so the draft is still the most recent one.
      const byUpdatedAt = [...history].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      expect(byUpdatedAt[0]?.id).toBe(latest?.id);

      expect((await read("pages", grandchild.id)).path).toBe("/razdel-2/dochernyaya/vnuchka/");
    });

    it("waits for publish: a draft save of the parent keeps children, publishing cascades", async () => {
      const parent = await create("pages", { title: "Хаб", slug: "hab", _status: "published" });
      const child = await create("pages", {
        title: "Лист",
        slug: "list",
        parent: parent.id,
        _status: "published",
      });

      await update("pages", parent.id, { slug: "hab-novyj" }, true);
      expect((await read("pages", child.id)).path).toBe("/hab/list/");

      // Usual admin flow: the latest draft already holds the new path, then it is published.
      await update("pages", parent.id, { _status: "published" });
      expect((await read("pages", parent.id)).path).toBe("/hab-novyj/");
      expect((await read("pages", child.id)).path).toBe("/hab-novyj/list/");
    });

    it("cascades constructions too", async () => {
      const hub = await create("constructions", {
        title: "Остекление",
        slug: "osteklenie",
        kind: "hub",
        _status: "published",
      });
      const leaf = await create("constructions", {
        title: "Фасады",
        slug: "fasadov",
        parent: hub.id,
        _status: "published",
      });
      expect(leaf.path).toBe("/osteklenie/fasadov/");
      await update("constructions", hub.id, { slug: "osteklenie-2", _status: "published" });
      expect((await read("constructions", leaf.id)).path).toBe("/osteklenie-2/fasadov/");
    });

    it("skips a child whose new path is taken, without failing the parent's save", async () => {
      await create(
        "articles",
        {
          title: "Занятый адрес",
          slug: "zanyato",
        },
        true
      );
      const parent = await create("pages", {
        title: "Не блог",
        slug: "ne-blog",
        _status: "published",
      });
      const child = await create("pages", {
        title: "Занято",
        slug: "zanyato",
        parent: parent.id,
        _status: "published",
      });

      const saved = await update("pages", parent.id, { slug: "blog", _status: "published" });
      expect(saved.path).toBe("/blog/");
      // `/blog/zanyato/` belongs to the article: the child keeps its old path.
      expect((await read("pages", child.id)).path).toBe("/ne-blog/zanyato/");
    });
  });

  describe("cross-collection uniqueness", () => {
    it("rejects a page path already used by an article or an object", async () => {
      await create("articles", { title: "Статья", slug: "statya" }, true);
      await expectRejection(
        create("pages", {
          title: "Конфликт",
          slug: "statya",
          pathPrefix: "/blog/",
          _status: "published",
        }),
        /Такой адрес уже занят: \/blog\/statya\//
      );

      await create("objects", { name: "Объект", slug: "obekt-1" }, true);
      await expectRejection(
        create("pages", {
          title: "Конфликт 2",
          slug: "obekt-1",
          pathPrefix: "/obekty/",
          _status: "published",
        }),
        /Такой адрес уже занят: \/obekty\/obekt-1\//
      );
    });

    it("rejects reserved prefixes", async () => {
      await expectRejection(
        create("pages", { title: "Админ", slug: "x", pathPrefix: "/admin/", _status: "published" }),
        /зарезервирован/
      );
    });
  });

  describe("delete guard", () => {
    it("refuses to delete a parent with children, allows it once they are moved", async () => {
      const parent = await create("pages", {
        title: "Родитель",
        slug: "roditel",
        _status: "published",
      });
      const child = await create("pages", {
        title: "Ребёнок",
        slug: "rebenok",
        parent: parent.id,
        _status: "published",
      });

      await expectRejection(remove("pages", parent.id), /Нельзя удалить/);
      expect((await read("pages", parent.id)).id).toBe(parent.id);

      await update("pages", child.id, { parent: null, _status: "published" });
      expect((await read("pages", child.id)).path).toBe("/rebenok/");
      await remove("pages", parent.id);
    });

    it("counts children that exist only in a pending draft", async () => {
      const parent = await create("pages", {
        title: "Родитель 2",
        slug: "roditel-2",
        _status: "published",
      });
      const child = await create("pages", {
        title: "Сирота",
        slug: "sirota",
        _status: "published",
      });
      await update("pages", child.id, { parent: parent.id }, true);
      await expectRejection(remove("pages", parent.id), /Нельзя удалить/);
    });
  });

  describe("publish validation", () => {
    it("lets an object be saved as an empty draft but not published", async () => {
      const draft = await create("objects", { name: "Импорт", slug: "import-1" }, true);
      expect(draft._status).toBe("draft");
      await expectRejection(update("objects", draft.id, { _status: "published" }), /город/);
    });

    it("requires datePublished to publish an article", async () => {
      const article = await create("articles", { title: "Без даты", slug: "bez-daty" }, true);
      await expectRejection(
        update("articles", article.id, { _status: "published" }),
        /дату публикации/
      );
    });
  });

  describe("team read access", () => {
    it("hides hidden members and contacts from anonymous reads", async () => {
      await create("team", { name: "Видимый", email: "v@example.com", phone: "+7 000" });
      await create("team", { name: "Скрытый", hidden: true });
      const { docs } = await payload.find({
        collection: rel("team"),
        overrideAccess: false,
        depth: 0,
      });
      const names = docs.map((doc) => (doc as unknown as Doc).name);
      expect(names).toContain("Видимый");
      expect(names).not.toContain("Скрытый");
      const visible = docs[0] as unknown as Doc;
      expect(visible.email).toBeUndefined();
      expect(visible.phone).toBeUndefined();
    });
  });
});
