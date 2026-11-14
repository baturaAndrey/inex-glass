import { describe, expect, it } from "vitest";
import { stripFileTrailingSlash, stripUploadUrlTrailingSlash } from "./media-urls";

describe("stripFileTrailingSlash", () => {
  it.each([
    ["/api/media/file/a.jpg/", "/api/media/file/a.jpg"],
    ["/api/media/file/a.jpg", "/api/media/file/a.jpg"],
    ["/api/media/file/a-800x600.webp//", "/api/media/file/a-800x600.webp"],
    ["/api/media/file/a.jpg/?2026", "/api/media/file/a.jpg?2026"],
    ["/api/media/file/a.jpg/#x", "/api/media/file/a.jpg#x"],
    [
      "http://localhost:3000/api/media/file/%D0%B0.png/",
      "http://localhost:3000/api/media/file/%D0%B0.png",
    ],
    // Not a file name: left alone.
    ["/api/media/", "/api/media/"],
    ["/api/media/file/", "/api/media/file/"],
    ["", ""],
  ])("%s → %s", (input, expected) => {
    expect(stripFileTrailingSlash(input)).toBe(expected);
  });

  it("passes non-strings through", () => {
    expect(stripFileTrailingSlash(null)).toBeNull();
    expect(stripFileTrailingSlash(undefined)).toBeUndefined();
  });
});

describe("stripUploadUrlTrailingSlash", () => {
  it("normalises url, thumbnailURL and every size url", () => {
    const doc = {
      id: "1",
      url: "/api/media/file/a.jpg/",
      thumbnailURL: "/api/media/file/a-400x300.jpg/",
      sizes: {
        thumbnail: { url: "/api/media/file/a-400x300.jpg/" },
        card: { url: "/api/media/file/a-800x600.jpg/" },
        hero: { url: null },
        og: {},
      },
    };
    const result = stripUploadUrlTrailingSlash({ doc } as unknown as Parameters<
      typeof stripUploadUrlTrailingSlash
    >[0]);
    expect(result).toEqual({
      id: "1",
      url: "/api/media/file/a.jpg",
      thumbnailURL: "/api/media/file/a-400x300.jpg",
      sizes: {
        thumbnail: { url: "/api/media/file/a-400x300.jpg" },
        card: { url: "/api/media/file/a-800x600.jpg" },
        hero: { url: null },
        og: {},
      },
    });
  });

  it("leaves docs without upload fields untouched", () => {
    const doc = { id: "2", alt: "x" };
    const result = stripUploadUrlTrailingSlash({ doc } as unknown as Parameters<
      typeof stripUploadUrlTrailingSlash
    >[0]);
    expect(result).toEqual({ id: "2", alt: "x" });
  });
});
