import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NBSP, SEED_PRICES_2026_10_15 } from "@/lib/domain";
import type { PlaceholderContext } from "@/lib/domain";
import type { BuildMetadataInput } from "./metadata";

/**
 * `getEnv()` memoizes the environment, so every test stubs the env first and then imports a
 * fresh copy of the module graph.
 */
async function loadBuildMetadata(env: { SITE_ENV?: string; SITE_URL?: string } = {}) {
  vi.stubEnv("SITE_ENV", env.SITE_ENV ?? "production");
  vi.stubEnv("SITE_URL", env.SITE_URL ?? "https://inexglass.ru");
  // Required by the env schema; never used (nothing connects to a database here).
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:1/test");
  vi.stubEnv("PAYLOAD_SECRET", "unit-test-placeholder-not-a-secret-0000");
  vi.stubEnv("NODE_ENV", "test");
  vi.resetModules();
  return (await import("./metadata")).buildMetadata;
}

const PRICE_DATE_FRESH_NOW = new Date("2026-10-20T07:00:00Z");
const PRICE_DATE_STALE_NOW = new Date("2027-01-10T07:00:00Z");

function placeholders(now: Date, thickness?: number): PlaceholderContext {
  return {
    prices: SEED_PRICES_2026_10_15,
    promo: null,
    now,
    conditions: "Заказы от 50 м²",
    contacts: "+7 (351) 247-05-57",
    requisites: "ИП",
    phone: "+7 (351) 247-05-57",
    ...(thickness === undefined ? {} : { thickness }),
  };
}

const BASE: BuildMetadataInput = {
  seo: {
    title: "Закалённое стекло на заказ 4–19 мм по чертежу | Inex Glass",
    description: "Проверим чертёж и согласуем спецификацию до закалки.",
  },
  path: "/zakalennoe-steklo/",
  fallbackTitle: "Закалённое стекло",
};

describe("buildMetadata", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the SEO title as an absolute title and the description", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata(BASE);
    expect(meta.title).toEqual({ absolute: BASE.seo?.title });
    expect(meta.description).toBe(BASE.seo?.description);
  });

  it("falls back to the document title with the brand suffix", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata({ ...BASE, seo: null, fallbackTitle: "О компании" });
    expect(meta.title).toEqual({ absolute: "О компании | Inex Glass" });
    expect(meta.description).toBeUndefined();
  });

  it("production: index, follow", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata(BASE);
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("staging: noindex, nofollow for every page", async () => {
    const buildMetadata = await loadBuildMetadata({ SITE_ENV: "staging" });
    const meta = await buildMetadata(BASE);
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("development: noindex, nofollow", async () => {
    const buildMetadata = await loadBuildMetadata({ SITE_ENV: "development" });
    const meta = await buildMetadata(BASE);
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("seo.noindex and forceNoindex give noindex, follow", async () => {
    const buildMetadata = await loadBuildMetadata();
    const bySeo = await buildMetadata({ ...BASE, seo: { ...BASE.seo, noindex: true } });
    const forced = await buildMetadata({ ...BASE, forceNoindex: true });
    expect(bySeo.robots).toEqual({ index: false, follow: true });
    expect(forced.robots).toEqual({ index: false, follow: true });
  });

  it("canonical is absolute with a trailing slash, from the runtime SITE_URL", async () => {
    const buildMetadata = await loadBuildMetadata({ SITE_URL: "https://staging.inexglass.ru/" });
    const meta = await buildMetadata({ ...BASE, path: "/zakalennoe-steklo/10-mm" });
    expect(meta.alternates?.canonical).toBe(
      "https://staging.inexglass.ru/zakalennoe-steklo/10-mm/"
    );
    expect(meta.openGraph?.url).toBe("https://staging.inexglass.ru/zakalennoe-steklo/10-mm/");
  });

  it("canonical priority: canonicalOverride → seo.canonical → path", async () => {
    const buildMetadata = await loadBuildMetadata();
    const bySeo = await buildMetadata({
      ...BASE,
      path: "/obekty/",
      seo: { ...BASE.seo, canonical: "/zakalennoe-steklo/" },
    });
    expect(bySeo.alternates?.canonical).toBe("https://inexglass.ru/zakalennoe-steklo/");

    const byOverride = await buildMetadata({
      ...BASE,
      path: "/obekty/",
      seo: { ...BASE.seo, canonical: "/zakalennoe-steklo/" },
      canonicalOverride: "/obekty/",
      forceNoindex: true,
    });
    expect(byOverride.alternates?.canonical).toBe("https://inexglass.ru/obekty/");
  });

  it("pagination inserts «— страница N» before « | Inex Glass», canonical to itself, indexable", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata({
      seo: { title: "Объекты — стекло на реальных проектах | Inex Glass" },
      path: "/obekty/page/2/",
      fallbackTitle: "Объекты",
      pagination: { page: 2 },
    });
    expect(meta.title).toEqual({
      absolute: "Объекты — стекло на реальных проектах — страница 2 | Inex Glass",
    });
    expect(meta.alternates?.canonical).toBe("https://inexglass.ru/obekty/page/2/");
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it("page 1 has no page number", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata({ ...BASE, pagination: { page: 1 } });
    expect(meta.title).toEqual({ absolute: BASE.seo?.title });
  });

  it("substitutes placeholders: {цена} for 10 mm → «1 400»", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata({
      seo: {
        title: "Закалённое стекло {N} мм — от {цена} ₽/м² | Inex Glass",
        description: "Закалённое стекло {N} мм: вес {вес} кг/м².",
      },
      path: "/zakalennoe-steklo/10-mm/",
      fallbackTitle: "Закалённое стекло 10 мм",
      placeholders: placeholders(PRICE_DATE_FRESH_NOW, 10),
    });
    expect(meta.title).toEqual({
      absolute: `Закалённое стекло 10 мм — от 1${NBSP}400 ₽/м² | Inex Glass`,
    });
    expect(meta.description).toBe("Закалённое стекло 10 мм: вес 25 кг/м².");
  });

  it("time, not edits: a price older than 45 days disappears from the title", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata({
      seo: { title: "Закалённое стекло {N} мм — от {цена} ₽/м² | Inex Glass" },
      path: "/zakalennoe-steklo/10-mm/",
      fallbackTitle: "Закалённое стекло 10 мм",
      placeholders: placeholders(PRICE_DATE_STALE_NOW, 10),
    });
    const title = (meta.title as { absolute: string }).absolute;
    expect(title).not.toContain("1" + NBSP + "400");
    expect(title).toContain("по расчёту");
  });

  it("Open Graph and Twitter: default image, ru_RU, site name", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata(BASE);
    expect(meta.openGraph).toMatchObject({
      locale: "ru_RU",
      siteName: "Inex Glass",
      type: "website",
      title: BASE.seo?.title,
      images: [{ url: "https://inexglass.ru/og-default.jpg", width: 1200, height: 630 }],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("Open Graph uses the document image as an absolute URL", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata({
      ...BASE,
      type: "article",
      image: { url: "/api/media/file/hero.jpg", alt: "Стекло" },
    });
    expect(meta.openGraph).toMatchObject({
      type: "article",
      images: [{ url: "https://inexglass.ru/api/media/file/hero.jpg", alt: "Стекло" }],
    });
  });

  it("adds no verification tags (task 36)", async () => {
    const buildMetadata = await loadBuildMetadata();
    const meta = await buildMetadata(BASE);
    expect(meta.verification).toBeUndefined();
  });
});
