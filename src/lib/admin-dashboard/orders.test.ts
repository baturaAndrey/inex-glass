import { describe, expect, it } from "vitest";
import { buildOrderTiles, nearestShipment } from "./orders";

/** 2026-10-22 10:30 in Yekaterinburg. */
const NOW = new Date("2026-10-22T05:30:00.000Z");

describe("buildOrderTiles", () => {
  it("lists the four work stages with labels, missing counts as 0", () => {
    expect(buildOrderTiles({ in_production: 5, packed: 2 })).toEqual([
      { status: "spec_agreed", label: "Спецификация согласована", count: 0 },
      { status: "in_production", label: "В производстве", count: 5 },
      { status: "packed", label: "Упаковано", count: 2 },
      { status: "shipped", label: "Отгружено", count: 0 },
    ]);
  });
});

describe("nearestShipment", () => {
  it("takes the plannedDate of the packed row and the earliest date from today on", () => {
    const result = nearestShipment(
      [
        {
          id: "a",
          number: "2026-0137",
          statusHistory: [
            { status: "in_production", plannedDate: "2026-10-23T12:00:00.000Z" },
            { status: "packed", plannedDate: "2026-10-28T12:00:00.000Z" },
          ],
        },
        {
          id: "b",
          number: "2026-0138",
          statusHistory: [{ status: "packed", plannedDate: "2026-10-24T12:00:00.000Z" }],
        },
        {
          // Past plan: skipped.
          id: "c",
          number: "2026-0139",
          statusHistory: [{ status: "packed", plannedDate: "2026-10-20T12:00:00.000Z" }],
        },
        // No plan: skipped.
        { id: "d", number: "2026-0140", statusHistory: [{ status: "packed", plannedDate: null }] },
        { id: "e", number: "2026-0141", statusHistory: null },
      ],
      NOW
    );
    expect(result).toEqual({
      id: "b",
      number: "2026-0138",
      dateKey: "2026-10-24",
      label: "2026-0138 · 24.10",
    });
  });

  it("counts a shipment planned for today", () => {
    const result = nearestShipment(
      [
        {
          id: "a",
          number: "1",
          statusHistory: [{ status: "packed", plannedDate: "2026-10-22T12:00:00.000Z" }],
        },
      ],
      NOW
    );
    expect(result?.dateKey).toBe("2026-10-22");
  });

  it("returns null without plans", () => {
    expect(nearestShipment([], NOW)).toBeNull();
    expect(
      nearestShipment(
        [
          {
            id: "a",
            statusHistory: [{ status: "in_production", plannedDate: "2026-10-25T12:00:00.000Z" }],
          },
        ],
        NOW
      )
    ).toBeNull();
  });
});
