import { describe, expect, it } from "vitest";
import { HUB_OBJECTS_ALL_KEY, hubObjectGroups } from "./hub-feed";
import type { ObjectCardData, TaxonomyRef } from "./filters";

const PARTITIONS: TaxonomyRef = { slug: "peregorodki", name: "Перегородки", order: 30 };
const RAILINGS: TaxonomyRef = { slug: "ograzhdeniya", name: "Ограждения", order: 40 };
const MIRRORS: TaxonomyRef = { slug: "zerkala", name: "Зеркала", order: 100 };

function object(id: string, products: TaxonomyRef[]): ObjectCardData {
  return {
    id,
    slug: id,
    href: `/obekty/${id}/`,
    name: `Объект ${id}`,
    city: null,
    type: null,
    products,
    chips: [],
    photo: null,
    sortDate: "2026-01-01",
    related: [],
  };
}

describe("hubObjectGroups", () => {
  it("returns no groups without objects", () => {
    expect(hubObjectGroups([])).toEqual([]);
  });

  it("puts «Все» first, then the used product types in taxonomy order", () => {
    const groups = hubObjectGroups([
      object("a", [MIRRORS]),
      object("b", [RAILINGS, PARTITIONS]),
      object("c", []),
    ]);
    expect(groups.map((group) => group.key)).toEqual([
      HUB_OBJECTS_ALL_KEY,
      "peregorodki",
      "ograzhdeniya",
      "zerkala",
    ]);
    expect(groups[0]?.objects.map((card) => [card.id, card.type])).toEqual([
      ["a", "Зеркала"],
      ["b", "Перегородки"],
      ["c", ""],
    ]);
    // In a type group the label is that type, even for an object with several tags.
    expect(groups[2]?.objects.map((card) => [card.id, card.type])).toEqual([["b", "Ограждения"]]);
  });

  it("keeps the input order and the limit in every group", () => {
    const objects = ["1", "2", "3", "4", "5"].map((id) => object(id, [PARTITIONS]));
    const groups = hubObjectGroups(objects, 4);
    for (const group of groups) {
      expect(group.objects.map((card) => card.id)).toEqual(["1", "2", "3", "4"]);
    }
  });
});
