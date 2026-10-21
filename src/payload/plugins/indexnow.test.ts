import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Config } from "payload";

/** IndexNow plugin hooks against a fake `req.payload` (no Payload instance, no database). */

const env = vi.hoisted(() => ({
  SITE_URL: "https://inexglass.ru",
  SITE_ENV: "production",
  INDEXNOW_KEY: "0123456789abcdef0123456789abcdef" as string | undefined,
}));
vi.mock("@/lib/env", () => ({ getEnv: () => env }));

const { changedPaths, indexNowPlugin, INDEXNOW_COLLECTIONS } = await import("./indexnow");

const existingHook = vi.fn();

async function pluginConfig() {
  const config = {
    collections: [
      { slug: "articles", fields: [], hooks: { afterChange: [existingHook] } },
      { slug: "leads", fields: [] },
    ],
  } as unknown as Config;
  return indexNowPlugin(config);
}

function makeReq(opts: { enabled?: boolean; mainStatus?: string; context?: object } = {}) {
  const queue = vi.fn(async () => ({}));
  const req = {
    context: opts.context ?? {},
    payload: {
      jobs: { queue },
      findGlobal: vi.fn(async () => ({ indexNow: { enabled: opts.enabled ?? true } })),
      findByID: vi.fn(async () => ({ _status: opts.mainStatus ?? "draft" })),
      logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    },
  };
  return { req, queue };
}

const article = (overrides: Record<string, unknown> = {}) => ({
  id: "a1",
  slug: "statya",
  path: "/blog/statya/",
  _status: "published",
  ...overrides,
});

async function hooks() {
  const config = await pluginConfig();
  const articles = config.collections?.find((c) => c.slug === "articles");
  const afterChange = articles?.hooks?.afterChange?.at(-1) as CollectionAfterChangeHook;
  const afterDelete = articles?.hooks?.afterDelete?.at(-1) as CollectionAfterDeleteHook;
  const call = (
    req: unknown,
    doc: unknown,
    previousDoc: unknown,
    operation: "create" | "update" = "update"
  ) =>
    (afterChange as unknown as (args: unknown) => Promise<unknown>)({
      collection: { slug: "articles" },
      doc,
      previousDoc,
      operation,
      req,
    });
  const remove = (req: unknown, doc: unknown) =>
    (afterDelete as unknown as (args: unknown) => Promise<unknown>)({
      collection: { slug: "articles" },
      doc,
      req,
    });
  return { call, remove };
}

beforeEach(() => {
  env.SITE_ENV = "production";
  env.INDEXNOW_KEY = "0123456789abcdef0123456789abcdef";
});

describe("indexNowPlugin", () => {
  it("appends hooks to the public collections only, keeping existing hooks", async () => {
    const config = await pluginConfig();
    const articles = config.collections?.find((c) => c.slug === "articles");
    const leads = config.collections?.find((c) => c.slug === "leads");
    expect(articles?.hooks?.afterChange?.[0]).toBe(existingHook);
    expect(articles?.hooks?.afterChange).toHaveLength(2);
    expect(articles?.hooks?.afterDelete).toHaveLength(1);
    expect(leads?.hooks).toBeUndefined();
    expect(INDEXNOW_COLLECTIONS).toContain("objects");
  });

  it("publishing queues the URL + listing with a delay", async () => {
    const { call } = await hooks();
    const { req, queue } = makeReq();
    await call(req, article(), article({ _status: "draft" }));
    expect(queue).toHaveBeenCalledTimes(1);
    const args = (queue.mock.calls[0] as unknown[])[0] as {
      task: string;
      input: { urls: string[] };
      waitUntil: Date;
    };
    expect(args.task).toBe("indexnow-submit");
    expect(args.input.urls).toEqual([
      "https://inexglass.ru/blog/statya/",
      "https://inexglass.ru/blog/",
    ]);
    expect(args.waitUntil.getTime()).toBeGreaterThan(Date.now() + 30_000);
  });

  it("un-publishing queues the old URL; a draft over a published doc does not", async () => {
    const { call } = await hooks();
    const unpublish = makeReq({ mainStatus: "draft" });
    await call(unpublish.req, article({ _status: "draft" }), article());
    expect(unpublish.queue).toHaveBeenCalledTimes(1);

    const draftSave = makeReq({ mainStatus: "published" });
    await call(draftSave.req, article({ _status: "draft" }), article());
    expect(draftSave.queue).not.toHaveBeenCalled();
  });

  it("skips seed/import writes, non-production, missing key and the settings switch", async () => {
    const { call } = await hooks();
    const seeded = makeReq({ context: { disableRevalidate: true } });
    await call(seeded.req, article(), undefined, "create");
    expect(seeded.queue).not.toHaveBeenCalled();

    const disabled = makeReq({ enabled: false });
    await call(disabled.req, article(), undefined, "create");
    expect(disabled.queue).not.toHaveBeenCalled();

    env.SITE_ENV = "staging";
    const staging = makeReq();
    await call(staging.req, article(), undefined, "create");
    expect(staging.queue).not.toHaveBeenCalled();

    env.SITE_ENV = "production";
    env.INDEXNOW_KEY = undefined;
    const noKey = makeReq();
    await call(noKey.req, article(), undefined, "create");
    expect(noKey.queue).not.toHaveBeenCalled();
  });

  it("drafts and noindex documents are not submitted", async () => {
    const { call } = await hooks();
    const { req, queue } = makeReq();
    await call(req, article({ _status: "draft" }), undefined, "create");
    await call(req, article({ seo: { noindex: true } }), article({ seo: { noindex: true } }));
    expect(queue).not.toHaveBeenCalled();
  });

  it("deleting a published document queues its URL", async () => {
    const { remove } = await hooks();
    const { req, queue } = makeReq();
    await remove(req, article());
    expect(queue).toHaveBeenCalledTimes(1);
  });

  it("a failing queue never breaks the save", async () => {
    const { call } = await hooks();
    const { req, queue } = makeReq();
    queue.mockRejectedValueOnce(new Error("db down"));
    await expect(call(req, article(), undefined, "create")).resolves.toBeDefined();
    expect(req.payload.logger.error).toHaveBeenCalled();
  });
});

describe("changedPaths", () => {
  it("a moved page submits both URLs", () => {
    expect(
      changedPaths(
        "pages",
        { _status: "published", path: "/novyj/" },
        { _status: "published", path: "/staryj/" }
      )
    ).toEqual(["/novyj/", "/staryj/"]);
  });

  it("thicknesses 5/15/19 mm are never submitted", () => {
    expect(changedPaths("thicknesses", { n: 5, indexable: false })).toEqual([]);
    expect(changedPaths("thicknesses", { n: 10, indexable: true })).toEqual([
      "/zakalennoe-steklo/10-mm/",
    ]);
  });
});
