import { describe, expect, it } from "vitest";
import {
  paginationItems,
  readPageParam,
  readQueryParam,
  searchOffset,
  searchPageCount,
  searchPageHref,
} from "./pagination";

describe("search pagination", () => {
  it("reads the query and page params", () => {
    expect(readQueryParam(["  стекло ", "x"])).toBe("стекло");
    expect(readQueryParam(undefined)).toBe("");
    expect(readQueryParam("а".repeat(150))).toHaveLength(100);
    expect(readPageParam("3")).toBe(3);
    for (const raw of ["0", "-1", "02", "2.5", "abc", undefined, "9999999"]) {
      expect(readPageParam(raw)).toBe(1);
    }
  });

  it("computes offsets and page counts (20 per page)", () => {
    expect(searchOffset(1)).toBe(0);
    expect(searchOffset(3)).toBe(40);
    expect(searchPageCount(0)).toBe(0);
    expect(searchPageCount(20)).toBe(1);
    expect(searchPageCount(21)).toBe(2);
  });

  it("builds encoded links", () => {
    expect(searchPageHref("стекло 10 мм")).toBe(
      "/poisk/?q=%D1%81%D1%82%D0%B5%D0%BA%D0%BB%D0%BE+10+%D0%BC%D0%BC"
    );
    expect(searchPageHref("a&b", 2)).toBe("/poisk/?q=a%26b&page=2");
  });

  it("windows long page lists", () => {
    expect(paginationItems(1, 1)).toEqual([]);
    expect(paginationItems(2, 4)).toEqual([1, 2, 3, 4]);
    expect(paginationItems(6, 12)).toEqual([1, null, 4, 5, 6, 7, 8, null, 12]);
  });
});
