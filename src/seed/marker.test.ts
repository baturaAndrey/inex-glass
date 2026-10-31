import { describe, expect, it, vi } from "vitest";
import {
  isSeedPristine,
  LEGACY_PRISTINE_WINDOW_MS,
  mayOverwrite,
  rememberSeedWrite,
  parseSeedMarker,
  SEED_MARKER_PREFIX,
  seedMarkerKey,
} from "./marker";
import type { SeedContext } from "./context";

const CREATED = "2026-10-20T10:00:00.000Z";
/** A slice rewrote the mini-seed document a minute later — the case the markers fix. */
const SEED_UPDATED = "2026-10-20T10:01:00.000Z";
const EDITED = "2026-10-21T08:30:00.000Z";

describe("seedMarkerKey", () => {
  it("namespaces the key by collection and id", () => {
    expect(seedMarkerKey("thicknesses", "abc")).toBe(`${SEED_MARKER_PREFIX}thicknesses:abc`);
    expect(seedMarkerKey("pages", 7)).toBe(`${SEED_MARKER_PREFIX}pages:7`);
  });
});

describe("parseSeedMarker", () => {
  it("accepts a stored marker", () => {
    expect(parseSeedMarker({ updatedAt: SEED_UPDATED })).toEqual({ updatedAt: SEED_UPDATED });
  });

  it.each([null, undefined, "x", 1, {}, { updatedAt: 5 }, { updatedAt: "not a date" }])(
    "treats %j as no marker",
    (value) => {
      expect(parseSeedMarker(value)).toBeNull();
    }
  );
});

describe("isSeedPristine", () => {
  it("re-run after the seed's own second write: pristine (the bug the marker fixes)", () => {
    const doc = { createdAt: CREATED, updatedAt: SEED_UPDATED };
    expect(isSeedPristine(doc, { updatedAt: SEED_UPDATED })).toBe(true);
  });

  it("compares instants, not spellings", () => {
    const doc = { createdAt: CREATED, updatedAt: "2026-10-20T10:01:00Z" };
    expect(isSeedPristine(doc, { updatedAt: SEED_UPDATED })).toBe(true);
  });

  it("an admin save after the seed write: edited", () => {
    const doc = { createdAt: CREATED, updatedAt: EDITED };
    expect(isSeedPristine(doc, { updatedAt: SEED_UPDATED })).toBe(false);
  });

  it("an admin save within 2 s of creation still counts as an edit when a marker exists", () => {
    const doc = { createdAt: CREATED, updatedAt: "2026-10-20T10:00:01.000Z" };
    expect(isSeedPristine(doc, { updatedAt: CREATED })).toBe(false);
  });

  describe("legacy fallback (no marker)", () => {
    it("saved once: pristine", () => {
      expect(isSeedPristine({ createdAt: CREATED, updatedAt: CREATED }, null)).toBe(true);
    });

    it(`saved again after ${LEGACY_PRISTINE_WINDOW_MS} ms: edited`, () => {
      expect(isSeedPristine({ createdAt: CREATED, updatedAt: SEED_UPDATED }, null)).toBe(false);
    });

    it("missing or invalid timestamps: edited (never overwrite blindly)", () => {
      expect(isSeedPristine({}, null)).toBe(false);
      expect(isSeedPristine({ createdAt: CREATED, updatedAt: null }, null)).toBe(false);
      expect(isSeedPristine({ createdAt: "x", updatedAt: CREATED }, null)).toBe(false);
      expect(isSeedPristine({ updatedAt: "x" }, { updatedAt: CREATED })).toBe(false);
    });
  });
});

/** Fake seed context: one stored document (latest version) and an in-memory `payload.kv`. */
function fakeCtx(doc: Record<string, unknown> | null, force = false) {
  const store = new Map<string, unknown>();
  const find = vi.fn(async () => ({ docs: doc ? [doc] : [] }));
  const log = vi.fn();
  const ctx = {
    payload: {
      find,
      kv: {
        get: vi.fn(async (key: string) => store.get(key) ?? null),
        set: vi.fn(async (key: string, value: unknown) => void store.set(key, value)),
      },
    },
    log,
    force,
    options: { minimal: false },
  } as unknown as SeedContext;
  return { ctx, store, find, log };
}

describe("rememberSeedWrite / mayOverwrite", () => {
  it("a document the seed rewrote stays overwritable on the next run", async () => {
    const doc = { id: "t10", createdAt: CREATED, updatedAt: SEED_UPDATED };
    const { ctx, store, find } = fakeCtx(doc);
    await rememberSeedWrite(ctx, "thicknesses", "t10");
    expect(store.get(seedMarkerKey("thicknesses", "t10"))).toEqual({ updatedAt: SEED_UPDATED });
    // The latest version (drafts included) is what counts.
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ draft: true }));
    expect(await mayOverwrite(ctx, "thicknesses", { n: { equals: 10 } }, "10 мм")).toBe(true);
  });

  it("an admin edit after the marker is skipped with a log line; --force overrides", async () => {
    const { ctx, store, log } = fakeCtx({ id: "t10", createdAt: CREATED, updatedAt: EDITED });
    store.set(seedMarkerKey("thicknesses", "t10"), { updatedAt: SEED_UPDATED });
    expect(await mayOverwrite(ctx, "thicknesses", { n: { equals: 10 } }, "10 мм")).toBe(false);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("изменён в админке"));
    const forced = fakeCtx({ id: "t10", createdAt: CREATED, updatedAt: EDITED }, true);
    expect(await mayOverwrite(forced.ctx, "thicknesses", { n: { equals: 10 } }, "10 мм")).toBe(
      true
    );
    expect(forced.find).not.toHaveBeenCalled();
  });

  it("a missing document may be created", async () => {
    const { ctx } = fakeCtx(null);
    expect(await mayOverwrite(ctx, "pages", { path: { equals: "/x/" } }, "/x/")).toBe(true);
  });

  it("a failing KV write only logs (the seed goes on)", async () => {
    const { ctx, log } = fakeCtx({ id: "p1", createdAt: CREATED, updatedAt: CREATED });
    (ctx.payload.kv.set as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("kv down"));
    await expect(rememberSeedWrite(ctx, "pages", "p1")).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("маркер сида не сохранён"));
  });
});
