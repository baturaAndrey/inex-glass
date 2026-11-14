import { describe, expect, it } from "vitest";
import { compareArticles, pickRelated, type ArticleSummary } from "./articles";

const summary = (id: string, title: string, date: string | null): ArticleSummary => ({
  id,
  slug: id,
  title,
  path: `/blog/${id}/`,
  datePublished: date,
  description: "",
  readingTimeMinutes: 1,
  image: null,
});

const a = summary("a", "Альфа", "2026-10-20T12:00:00.000Z");
const b = summary("b", "Бета", "2026-10-19T12:00:00.000Z");
const c = summary("c", "Вега", "2026-10-19T12:00:00.000Z");
const d = summary("d", "Гамма", "2026-10-18T12:00:00.000Z");
const e = summary("e", "Дельта", null);

describe("compareArticles", () => {
  it("sorts by date descending, ties by title, missing dates last", () => {
    expect([e, d, c, b, a].sort(compareArticles).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });
});

describe("pickRelated", () => {
  const index = [a, b, c, d, e];

  it("keeps the editor's order and skips itself", () => {
    expect(pickRelated({ id: "a", related: ["d", "a", "b", "c"] }, index).map((x) => x.id)).toEqual(
      ["d", "b", "c"]
    );
  });

  it("tops up with the newest articles without duplicates", () => {
    expect(pickRelated({ id: "b", related: ["d"] }, index).map((x) => x.id)).toEqual([
      "d",
      "a",
      "c",
    ]);
    expect(pickRelated({ id: "a", related: null }, index).map((x) => x.id)).toEqual([
      "b",
      "c",
      "d",
    ]);
  });

  it("accepts populated documents and ignores unpublished ids", () => {
    const related = [{ id: "c" }, "missing"] as never;
    expect(pickRelated({ id: "a", related }, index, 2).map((x) => x.id)).toEqual(["c", "b"]);
  });
});
