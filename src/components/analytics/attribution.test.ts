import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ATTRIBUTION_STORAGE_KEY,
  captureAttribution,
  getAttribution,
  mergeAttribution,
  type Attribution,
} from "./attribution";

const ORIGIN = "https://inex-glass.ru";
const NOW = new Date("2026-10-20T10:00:00.000Z");

/** In-memory `sessionStorage`. */
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

/** Node has no DOM: install `window`/`document` for a page load at `path`. */
function visit(path: string, storage: unknown, referrer = "") {
  vi.stubGlobal("window", { location: { href: `${ORIGIN}${path}` }, sessionStorage: storage });
  vi.stubGlobal("document", { referrer });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mergeAttribution", () => {
  it("parses UTM tags, click ids and the clean landing path", () => {
    const result = mergeAttribution(
      null,
      `${ORIGIN}/steklo/?utm_source=yandex&utm_medium=cpc&utm_campaign=x&yclid=1&page=2`,
      "https://yandex.ru/",
      NOW
    );
    expect(result).toEqual<Attribution>({
      utm: { source: "yandex", medium: "cpc", campaign: "x" },
      yclid: "1",
      landing: "/steklo/?page=2",
      referrer: "https://yandex.ru/",
      capturedAt: NOW.toISOString(),
    });
  });

  it("ignores internal referrers", () => {
    expect(mergeAttribution(null, `${ORIGIN}/`, `${ORIGIN}/steklo/`, NOW).referrer).toBeUndefined();
  });

  it("masks the order token in the landing path", () => {
    expect(mergeAttribution(null, `${ORIGIN}/zakaz/secret-token/`, "", NOW).landing).toBe(
      "/zakaz/"
    );
  });

  it("keeps the first landing and replaces UTM with the latest tags", () => {
    const first = mergeAttribution(null, `${ORIGIN}/a/?utm_source=yandex&utm_term=t`, "", NOW);
    const later = mergeAttribution(first, `${ORIGIN}/b/?utm_source=google`, "", new Date());
    expect(later.landing).toBe("/a/");
    expect(later.capturedAt).toBe(NOW.toISOString());
    expect(later.utm).toEqual({ source: "google" });
  });

  it("returns the existing record untouched when the URL has no tags", () => {
    const first = mergeAttribution(null, `${ORIGIN}/a/?utm_source=yandex`, "", NOW);
    expect(mergeAttribution(first, `${ORIGIN}/b/`, "", new Date())).toBe(first);
  });
});

describe("captureAttribution / getAttribution", () => {
  it("persists between pages of the session; a page without UTM does not overwrite", () => {
    const storage = memoryStorage();
    visit("/?utm_source=yandex&utm_medium=cpc&utm_campaign=x&yclid=1", storage);
    captureAttribution();

    visit("/kontakty/", storage, `${ORIGIN}/`);
    captureAttribution();

    expect(getAttribution()).toMatchObject({
      utm: { source: "yandex", medium: "cpc", campaign: "x" },
      yclid: "1",
      landing: "/",
    });
  });

  it("does not throw when sessionStorage methods throw", () => {
    const fail = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    visit("/?utm_source=yandex", { getItem: fail, setItem: fail, removeItem: fail });
    expect(() => captureAttribution()).not.toThrow();
    expect(getAttribution()).toBeNull();
  });

  it("does not throw when sessionStorage access itself throws", () => {
    vi.stubGlobal("window", {
      location: { href: `${ORIGIN}/` },
      get sessionStorage() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    expect(() => captureAttribution()).not.toThrow();
    expect(getAttribution()).toBeNull();
  });

  it("returns null for corrupt stored data and on the server", () => {
    const storage = memoryStorage();
    storage.setItem(ATTRIBUTION_STORAGE_KEY, "{not json");
    visit("/", storage);
    expect(getAttribution()).toBeNull();
    vi.unstubAllGlobals();
    expect(getAttribution()).toBeNull();
  });
});
