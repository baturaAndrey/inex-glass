import { describe, expect, it } from "vitest";
import {
  BLOG_PAGE_SIZE,
  blogPageHref,
  isPageInRange,
  pageLinks,
  pageSlice,
  parsePageParam,
  totalPages,
} from "./pagination";

const items = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe("blog pagination", () => {
  it("uses 12 articles per page", () => {
    expect(BLOG_PAGE_SIZE).toBe(12);
  });

  it("counts pages at the 12/13 boundary", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(6)).toBe(1);
    expect(totalPages(12)).toBe(1);
    expect(totalPages(13)).toBe(2);
    expect(totalPages(24)).toBe(2);
    expect(totalPages(25)).toBe(3);
  });

  it("slices pages", () => {
    expect(pageSlice(items(13), 1)).toHaveLength(12);
    expect(pageSlice(items(13), 2)).toEqual([13]);
    expect(pageSlice(items(13), 3)).toEqual([]);
    expect(pageSlice(items(13), 0)).toEqual([]);
  });

  it("checks the range", () => {
    expect(isPageInRange(1, 0)).toBe(true);
    expect(isPageInRange(2, 12)).toBe(false);
    expect(isPageInRange(2, 13)).toBe(true);
    expect(isPageInRange(3, 13)).toBe(false);
    expect(isPageInRange(0, 13)).toBe(false);
  });

  it("parses only canonical positive integers", () => {
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam("12")).toBe(12);
    for (const raw of ["0", "02", "-1", "1.5", "2.0", "abc", "", " 2", undefined]) {
      expect(parsePageParam(raw)).toBeNull();
    }
    expect(parsePageParam("99999999999999999999")).toBeNull();
  });

  it("builds page URLs", () => {
    expect(blogPageHref(1)).toBe("/blog/");
    expect(blogPageHref(2)).toBe("/blog/page/2/");
    expect(pageLinks(2, 25)).toEqual([
      { page: 1, href: "/blog/", current: false },
      { page: 2, href: "/blog/page/2/", current: true },
      { page: 3, href: "/blog/page/3/", current: false },
    ]);
    expect(pageLinks(1, 3)).toHaveLength(1);
  });
});
