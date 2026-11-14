import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attribution } from "@/components/analytics/attribution";

const mocks = vi.hoisted(() => ({
  getAttribution: vi.fn<() => Attribution | null>(),
  getClientId: vi.fn<() => Promise<string | null>>(),
}));

vi.mock("@/components/analytics/attribution", () => ({ getAttribution: mocks.getAttribution }));
vi.mock("@/components/analytics/client-id", () => ({ getClientId: mocks.getClientId }));

const { getLeadAttribution } = await import("./attribution");

function visit(path: string, search = "") {
  vi.stubGlobal("window", { location: { pathname: path, search } });
}

beforeEach(() => {
  mocks.getAttribution.mockReturnValue(null);
  mocks.getClientId.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const SESSION: Attribution = {
  utm: { source: "yandex", medium: "cpc", campaign: "glass" },
  yclid: "123",
  landing: "/zakalennoe-steklo/?page=2",
  referrer: "https://ya.ru/",
  capturedAt: "2026-10-20T10:00:00.000Z",
};

describe("getLeadAttribution", () => {
  it("prefers the override, then the session landing, then the current path", async () => {
    visit("/raschet-stoimosti/");
    mocks.getAttribution.mockReturnValue(SESSION);
    expect((await getLeadAttribution("/triplex/")).entryPage).toBe("/triplex/");
    expect((await getLeadAttribution()).entryPage).toBe("/zakalennoe-steklo/?page=2");
    expect((await getLeadAttribution("  ")).entryPage).toBe("/zakalennoe-steklo/?page=2");
    mocks.getAttribution.mockReturnValue(null);
    expect((await getLeadAttribution()).entryPage).toBe("/raschet-stoimosti/");
  });

  it("reads UTM from the session, extra ids and the client id", async () => {
    visit("/raschet-stoimosti/", "?utm_source=google");
    mocks.getAttribution.mockReturnValue(SESSION);
    mocks.getClientId.mockResolvedValue("1700000000123");
    expect(await getLeadAttribution()).toEqual({
      entryPage: "/zakalennoe-steklo/?page=2",
      utm: { source: "yandex", medium: "cpc", campaign: "glass" },
      metrikaClientId: "1700000000123",
      extra: { yclid: "123", referrer: "https://ya.ru/" },
    });
  });

  it("falls back to utm_* of the URL when nothing was captured (no storage)", async () => {
    visit("/steklo/", "?utm_source=vk&utm_term=%20&utm_content=banner");
    const result = await getLeadAttribution();
    expect(result).toEqual({ entryPage: "/steklo/", utm: { source: "vk", content: "banner" } });
    expect(result).not.toHaveProperty("metrikaClientId");
    expect(mocks.getClientId).toHaveBeenCalledOnce();
  });

  it("truncates long values to the schema limits", async () => {
    visit("/x/");
    mocks.getAttribution.mockReturnValue({
      ...SESSION,
      utm: { source: "s".repeat(300) },
      landing: `/${"p".repeat(600)}`,
    });
    const result = await getLeadAttribution();
    expect(result.utm.source).toHaveLength(200);
    expect(result.entryPage).toHaveLength(500);
  });
});
