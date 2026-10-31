import { describe, expect, it } from "vitest";
import type { Media } from "@/payload-types";
import { toFormParams } from "./cta-buttons";
import { iconByName, mediaSrc, resolveLink, sectionVariant } from "./shared";

const media = (url: string, card?: string): Media =>
  ({
    id: "m1",
    url,
    updatedAt: "",
    createdAt: "",
    ...(card ? { sizes: { card: { url: card } } } : {}),
  }) as Media;

describe("sectionVariant", () => {
  it("alternates bg ↔ sf by index for `auto` / empty background", () => {
    expect([0, 1, 2, 3].map((index) => sectionVariant("auto", index))).toEqual([
      "bg",
      "sf",
      "bg",
      "sf",
    ]);
    expect(sectionVariant(null, 1)).toBe("sf");
  });

  it("keeps an explicit background", () => {
    expect(sectionVariant("sf", 0)).toBe("sf");
    expect(sectionVariant("primaryDark", 1)).toBe("primary-dark");
    expect(sectionVariant("dark", 2)).toBe("dark");
  });
});

describe("resolveLink", () => {
  it("resolves documents through docUrl with the document title as label", () => {
    expect(
      resolveLink({
        type: "doc",
        doc: { relationTo: "thicknesses", value: { id: "t", n: 10 } as never },
      })
    ).toEqual({ href: "/zakalennoe-steklo/10-mm/", label: "10 мм", newTab: false });
  });

  it("returns custom URLs and explicit labels", () => {
    expect(
      resolveLink({ type: "custom", url: "https://inex.su/", label: "inex.su", newTab: true })
    ).toEqual({ href: "https://inex.su/", label: "inex.su", newTab: true });
  });

  it("returns null for empty or unpopulated targets", () => {
    expect(resolveLink(null)).toBeNull();
    expect(resolveLink({ type: "custom", url: "" })).toBeNull();
    expect(resolveLink({ type: "doc", doc: { relationTo: "pages", value: "id-only" } })).toBeNull();
  });
});

describe("mediaSrc", () => {
  it("makes absolute media URLs site-relative and prefers the requested size", () => {
    expect(mediaSrc(media("http://localhost:3000/api/media/file/a.jpg"))).toBe(
      "/api/media/file/a.jpg"
    );
    expect(mediaSrc(media("/api/media/file/a.jpg", "/api/media/file/a-card.jpg"), "card")).toBe(
      "/api/media/file/a-card.jpg"
    );
    expect(mediaSrc(media("/api/media/file/a.jpg"), "hero")).toBe("/api/media/file/a.jpg");
  });
});

describe("toFormParams", () => {
  it("maps the editor JSON to FormParams", () => {
    expect(
      toFormParams({
        label: "Отправить проект",
        sourceLabel: "Перегородки",
        accept: ".dwg, .pdf",
        extra: 1,
      })
    ).toEqual({
      label: "Отправить проект",
      source: "Перегородки",
      accept: [".dwg", ".pdf"],
      extra: 1,
    });
  });

  it("falls back to the page path as the source and ignores non-objects", () => {
    expect(toFormParams(null, "/kak-zakazat/")).toEqual({ source: "/kak-zakazat/" });
    expect(toFormParams("text")).toEqual({});
  });
});

describe("iconByName", () => {
  it("accepts Lucide names in any style", () => {
    expect(iconByName("FileText")).not.toBeNull();
    expect(iconByName("file-text")).toBe(iconByName("FileText"));
    expect(iconByName("no-such-icon")).toBeNull();
    expect(iconByName(null)).toBeNull();
  });
});
