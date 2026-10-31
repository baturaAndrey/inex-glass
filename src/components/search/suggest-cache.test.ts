import { describe, expect, it } from "vitest";
import { SuggestCache } from "./suggest-cache";

describe("SuggestCache", () => {
  it("evicts the least recently used entry beyond the limit", () => {
    const cache = new SuggestCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.size).toBe(2);
    expect(cache.peek("a")).toBeUndefined();
    expect(cache.peek("b")).toBe(2);
    expect(cache.peek("c")).toBe(3);
  });

  it("touch() refreshes the recency, peek() does not", () => {
    const cache = new SuggestCache<number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.touch("a")).toBe(true);
    cache.set("c", 3);
    expect(cache.peek("a")).toBe(1);
    expect(cache.peek("b")).toBeUndefined();

    cache.peek("a");
    cache.set("d", 4);
    // `peek` left "a" the oldest entry.
    expect(cache.peek("a")).toBeUndefined();
    expect(cache.touch("missing")).toBe(false);
  });

  it("re-setting a key replaces the value without growing", () => {
    const cache = new SuggestCache<number>(2);
    cache.set("a", 1);
    cache.set("a", 5);
    expect(cache.size).toBe(1);
    expect(cache.peek("a")).toBe(5);
  });

  it("rejects a non-positive limit", () => {
    expect(() => new SuggestCache(0)).toThrow(RangeError);
  });
});
