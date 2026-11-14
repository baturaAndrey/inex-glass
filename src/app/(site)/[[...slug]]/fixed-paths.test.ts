import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pathFromSegments } from "@/lib/cms/path";
import { FIXED_PATHS, isFixedPath } from "./fixed-paths";

/** `src/app/(site)` — the route group the dispatcher lives in. */
const SITE_DIR = path.resolve(import.meta.dirname, "..");

/** `/kak-zakazat/oplata/` → `kak-zakazat/oplata` (empty for `/`). */
function relativeDir(urlPath: string): string {
  return urlPath.split("/").filter(Boolean).join("/");
}

describe("fixed paths of the [[...slug]] dispatcher", () => {
  it("are unique and canonical (what pathFromSegments yields for the URL)", () => {
    expect(new Set(FIXED_PATHS).size).toBe(FIXED_PATHS.length);
    for (const fixedPath of FIXED_PATHS) {
      if (fixedPath === "/") continue;
      expect(fixedPath).toBe(fixedPath.toLowerCase());
      expect(pathFromSegments(fixedPath.split("/").filter(Boolean))).toBe(fixedPath);
    }
  });

  it("each has its template module under _fixed/", () => {
    for (const fixedPath of FIXED_PATHS) {
      const file = path.join(SITE_DIR, "_fixed", relativeDir(fixedPath), "page.tsx");
      expect(existsSync(file), file).toBe(true);
    }
  });

  it("none is also a route folder (it would shadow the dispatcher and lose ISR)", () => {
    for (const fixedPath of FIXED_PATHS) {
      const file = path.join(SITE_DIR, relativeDir(fixedPath), "page.tsx");
      expect(existsSync(file), file).toBe(false);
    }
  });

  it("isFixedPath matches only the listed paths", () => {
    expect(isFixedPath("/kontakty/")).toBe(true);
    expect(isFixedPath("/")).toBe(true);
    expect(isFixedPath("/kontakty")).toBe(false);
    expect(isFixedPath("/kak-zakazat/sroki/")).toBe(false);
    expect(isFixedPath("/blog/page/2/")).toBe(false);
  });
});
