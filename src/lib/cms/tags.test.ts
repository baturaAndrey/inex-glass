import { describe, expect, it } from "vitest";
import { allCmsTags, lookupTag } from "./tags";

describe("cms tags", () => {
  it("builds the lookup tag", () => {
    expect(lookupTag("pages")).toBe("lookup:pages");
  });

  it("lists collection, lookup and global tags once each", () => {
    expect(allCmsTags(["pages", "redirects", "pages"], ["prices"])).toEqual([
      "collection:pages",
      "lookup:pages",
      "collection:redirects",
      "lookup:redirects",
      "global:prices",
    ]);
  });
});
