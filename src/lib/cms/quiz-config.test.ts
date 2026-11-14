import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getQuizConfig` reads every global once. The real loaders of `./globals` run against a fake
 * Payload client (`./cache` is a pass-through, i.e. a cold cache), so the test counts the
 * `findGlobal` queries per slug.
 */
const findGlobal = vi.hoisted(() => vi.fn());

vi.mock("./payload", () => ({ getPayloadClient: async () => ({ findGlobal }) }));
vi.mock("./cache", () => ({ cached: <T>(fn: T): T => fn }));

const { getQuizConfig } = await import("./quiz-config");

const SITE_SETTINGS = {
  id: 1,
  holidays: [
    { date: "2026-11-04T00:00:00.000Z", isWorkday: false },
    { date: "2026-11-01T00:00:00.000Z", isWorkday: true },
    { date: "not a date", isWorkday: false },
  ],
  forms: { thankYouTitle: "Спасибо!" },
};

describe("getQuizConfig", () => {
  beforeEach(() => {
    findGlobal.mockReset();
    findGlobal.mockImplementation(async ({ slug }: { slug: string }) =>
      slug === "site-settings" ? SITE_SETTINGS : { id: 1 }
    );
  });

  it("reads site-settings once and derives the production calendar from it", async () => {
    const config = await getQuizConfig();

    const slugs = findGlobal.mock.calls.map(([args]) => (args as { slug: string }).slug);
    expect(slugs.filter((slug) => slug === "site-settings")).toHaveLength(1);
    // Every global is read exactly once.
    expect(new Set(slugs).size).toBe(slugs.length);

    expect(config.holidays).toEqual(["2026-11-04"]);
    expect(config.workdays).toEqual(["2026-11-01"]);
    expect(config.forms.thankYouTitle).toBe("Спасибо!");
  });

  it("falls back to an empty calendar when site-settings is empty", async () => {
    findGlobal.mockResolvedValue({ id: 1 });
    const config = await getQuizConfig();
    expect(config.holidays).toEqual([]);
    expect(config.workdays).toEqual([]);
  });
});
