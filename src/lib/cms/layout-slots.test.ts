import { describe, expect, it } from "vitest";
import { layoutSlotOf, splitLayoutBySlot } from "./layout-slots";

type Block = { id: string; blockType: string; anchorId?: string | null };

const block = (id: string, anchorId?: string | null): Block => ({
  id,
  blockType: "richText",
  ...(anchorId === undefined ? {} : { anchorId }),
});

describe("splitLayoutBySlot", () => {
  it("distributes blocks by the anchorId prefix", () => {
    const slots = splitLayoutBySlot([
      block("a"),
      block("b", "slot-profile-intro"),
      block("c", "slot-objects-text"),
      block("d", "slot-b-why"),
      block("e", "slot-systems-note"),
      block("f", "ceny"),
    ]);
    expect(slots.main.map((b) => b.id)).toEqual(["a", "f"]);
    expect(slots.profile.map((b) => b.id)).toEqual(["b"]);
    expect(slots.objects.map((b) => b.id)).toEqual(["c"]);
    expect(slots.after.map((b) => b.id)).toEqual(["d"]);
    expect(slots.systems.map((b) => b.id)).toEqual(["e"]);
  });

  it("keeps the document order inside a slot", () => {
    const slots = splitLayoutBySlot([
      block("1", "slot-b-first"),
      block("2"),
      block("3", "slot-b-second"),
      block("4", "slot-b-third"),
    ]);
    expect(slots.after.map((b) => b.id)).toEqual(["1", "3", "4"]);
  });

  it("puts blocks without anchorId (missing, null, blank) into main", () => {
    const slots = splitLayoutBySlot([block("x"), block("y", null), block("z", "  ")]);
    expect(slots.main.map((b) => b.id)).toEqual(["x", "y", "z"]);
  });

  it("handles an empty or missing layout", () => {
    expect(splitLayoutBySlot(null)).toEqual({
      main: [],
      profile: [],
      systems: [],
      objects: [],
      after: [],
    });
    expect(splitLayoutBySlot(undefined).main).toEqual([]);
  });

  it("matches only whole prefixes, case-insensitively", () => {
    expect(layoutSlotOf({ anchorId: "SLOT-B-Why" })).toBe("after");
    expect(layoutSlotOf({ anchorId: "slot-b" })).toBe("main");
    expect(layoutSlotOf({ anchorId: "slot-bonus" })).toBe("main");
    expect(layoutSlotOf({ anchorId: "my-slot-profile-x" })).toBe("main");
  });
});
