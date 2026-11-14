import { describe, expect, it } from "vitest";
import { pickOgImage } from "./og-image";

const real = { url: "/media/real.webp", alt: "Перегородка" };
const placeholder = { url: "/media/gen-hero-article.webp", alt: "Заглушка", isPlaceholder: true };

describe("pickOgImage", () => {
  it("returns the first real image in priority order", () => {
    expect(pickOgImage([real, { url: "/media/other.webp" }])).toEqual({
      url: "/media/real.webp",
      alt: "Перегородка",
    });
  });

  it("skips placeholder media and falls through to the next real one", () => {
    expect(pickOgImage([placeholder, real])).toEqual({
      url: "/media/real.webp",
      alt: "Перегородка",
    });
  });

  it("returns null when only placeholders exist (caller uses the default OG image)", () => {
    expect(pickOgImage([placeholder, { ...placeholder, url: "/media/gen-card.webp" }])).toBeNull();
  });

  it("ignores unpopulated ids, empty values and blank urls", () => {
    expect(pickOgImage(["media-id", null, undefined, { url: "  " }, { url: null }])).toBeNull();
  });

  it("normalises blank alt to null and trims the url", () => {
    expect(pickOgImage([{ url: " /media/a.webp ", alt: "  " }])).toEqual({
      url: "/media/a.webp",
      alt: null,
    });
  });

  it("treats isPlaceholder null/false as a real image", () => {
    expect(pickOgImage([{ url: "/a.webp", isPlaceholder: null }])?.url).toBe("/a.webp");
    expect(pickOgImage([{ url: "/b.webp", isPlaceholder: false }])?.url).toBe("/b.webp");
  });
});
