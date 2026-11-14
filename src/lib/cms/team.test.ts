import { describe, expect, it, vi } from "vitest";

// The loader module imports the Payload client; only the pure sorter is under test here.
vi.mock("./payload", () => ({ getPayloadClient: vi.fn() }));

const { sortTeamMembers } = await import("./team");

describe("sortTeamMembers", () => {
  it("orders by `order` ascending, then by name; members without `order` go last", () => {
    const members: Array<{ name: string; order?: number | null }> = [
      { name: "Яков", order: null },
      { name: "Борис", order: 20 },
      { name: "Анна", order: 20 },
      { name: "Вера", order: 10 },
      { name: "Глеб" },
    ];
    expect(sortTeamMembers(members).map((member) => member.name)).toEqual([
      "Вера",
      "Анна",
      "Борис",
      "Глеб",
      "Яков",
    ]);
  });

  it("does not mutate the input", () => {
    const members: Array<{ name: string; order?: number | null }> = [
      { name: "Б", order: 2 },
      { name: "А", order: 1 },
    ];
    sortTeamMembers(members);
    expect(members.map((member) => member.name)).toEqual(["Б", "А"]);
  });
});
