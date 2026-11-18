import { describe, expect, it } from "vitest";
import { mediaUrl, mediaVersion } from "./media-url";

const UPDATED_AT = "2026-11-18T10:00:00.000Z";
const VERSION = Date.parse(UPDATED_AT).toString(36);

describe("mediaVersion", () => {
  it("encodes updatedAt as base-36 epoch milliseconds", () => {
    expect(mediaVersion(UPDATED_AT)).toBe(VERSION);
    expect(mediaVersion(UPDATED_AT)).toBe("mwly9ts0");
  });

  it("changes when the document is updated", () => {
    expect(mediaVersion("2026-11-18T10:00:00.001Z")).not.toBe(VERSION);
  });

  it("returns null for missing or invalid dates", () => {
    expect(mediaVersion(undefined)).toBeNull();
    expect(mediaVersion(null)).toBeNull();
    expect(mediaVersion("")).toBeNull();
    expect(mediaVersion("not a date")).toBeNull();
  });
});

describe("mediaUrl", () => {
  it("appends the version to a site-relative file URL", () => {
    expect(mediaUrl("/api/media/file/design.webp", UPDATED_AT)).toBe(
      `/api/media/file/design.webp?v=${VERSION}`
    );
  });

  it("drops the origin of absolute URLs", () => {
    expect(mediaUrl("http://localhost:3000/api/media/file/a-800x600.jpg", UPDATED_AT)).toBe(
      `/api/media/file/a-800x600.jpg?v=${VERSION}`
    );
  });

  it("replaces an existing version and keeps other parameters", () => {
    expect(mediaUrl("/api/media/file/a.jpg?v=old&x=1", UPDATED_AT)).toBe(
      `/api/media/file/a.jpg?v=${VERSION}&x=1`
    );
  });

  it("is idempotent", () => {
    const once = mediaUrl("/api/media/file/a.jpg", UPDATED_AT);
    expect(mediaUrl(once, UPDATED_AT)).toBe(once);
    expect(mediaUrl(once)).toBe(once);
  });

  it("returns the path unversioned without a valid updatedAt", () => {
    expect(mediaUrl("/api/media/file/a.jpg")).toBe("/api/media/file/a.jpg");
    expect(mediaUrl(" /api/media/file/a.jpg ", "")).toBe("/api/media/file/a.jpg");
  });

  it("returns null for empty input", () => {
    expect(mediaUrl(null, UPDATED_AT)).toBeNull();
    expect(mediaUrl(undefined)).toBeNull();
    expect(mediaUrl("   ", UPDATED_AT)).toBeNull();
  });
});
