import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CUSTOM_TEXT_SIZES, cn } from "./utils";

describe("cn()", () => {
  it("keeps a text colour next to a custom font size", () => {
    expect(cn("text-ink-2", "text-lead-l")).toBe("text-ink-2 text-lead-l");
    expect(cn("text-lead", "text-text-2")).toBe("text-lead text-text-2");
    expect(cn("text-small text-muted", "text-caption")).toBe("text-muted text-caption");
  });

  it("lets a later custom font size replace an earlier one", () => {
    expect(cn("text-small", "text-lead-m")).toBe("text-lead-m");
    expect(cn("text-sm", "text-hero-stat")).toBe("text-hero-stat");
    expect(cn("text-h2", "max-sm:text-h4", "max-sm:text-h5")).toBe("text-h2 max-sm:text-h5");
  });

  it("treats px-gutter as horizontal padding", () => {
    expect(cn("px-4", "px-gutter")).toBe("px-gutter");
    expect(cn("px-gutter", "px-6")).toBe("px-6");
    expect(cn("py-8 px-gutter", "pt-2")).toBe("py-8 px-gutter pt-2");
  });

  it("still merges standard utilities", () => {
    expect(cn("p-2", "p-4", false, undefined, ["m-1"])).toBe("p-4 m-1");
  });

  it("lists every --text-* size declared in globals.css", () => {
    const css = readFileSync(
      path.resolve(import.meta.dirname, "../app/(site)/globals.css"),
      "utf8"
    );
    const declared = new Set(
      [...css.matchAll(/--text-([a-z0-9-]+?)(?:--[a-z-]+)?\s*:/g)].map((m) => m[1])
    );
    expect([...declared].sort()).toEqual([...CUSTOM_TEXT_SIZES].sort());
  });
});
