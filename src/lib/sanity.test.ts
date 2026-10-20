import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

// Smoke test: proves the Vitest `unit` project runs and the `@/` alias resolves to `src/`.
describe("vitest sanity", () => {
  it("resolves the @/ alias and merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("lets later Tailwind classes win", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
