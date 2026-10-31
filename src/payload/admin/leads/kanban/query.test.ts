import { describe, expect, it } from "vitest";
import { createdAtWhere, presetRange } from "@/lib/leads-admin/period";
import {
  DEFAULT_KANBAN_QUERY,
  kanbanExportHref,
  kanbanHref,
  kanbanWhere,
  parseKanbanQuery,
  phoneSearchDigits,
} from "./query";
import type { KanbanQuery } from "./query";

/** 2026-10-22 10:00 in Yekaterinburg (UTC+5). */
const NOW = new Date("2026-10-22T05:00:00.000Z");
const USER = "11111111-2222-3333-4444-555555555555";
const ctx = { userId: USER, now: NOW };
const query = (patch: Partial<KanbanQuery> = {}): KanbanQuery => ({
  ...DEFAULT_KANBAN_QUERY,
  ...patch,
});

describe("parseKanbanQuery", () => {
  it("returns the defaults for empty input", () => {
    expect(parseKanbanQuery(undefined)).toEqual(DEFAULT_KANBAN_QUERY);
    expect(parseKanbanQuery({})).toEqual(DEFAULT_KANBAN_QUERY);
  });

  it("falls back to the defaults on garbage", () => {
    expect(
      parseKanbanQuery({
        filter: "everything",
        source: "telegram",
        period: "year",
        expand: "1; drop table",
      })
    ).toEqual(DEFAULT_KANBAN_QUERY);
  });

  it("reads every valid parameter", () => {
    expect(
      parseKanbanQuery({
        filter: "mine",
        source: "drawing",
        period: "7d",
        search: "  ООО   Стекло ",
        expand: USER,
      })
    ).toEqual({
      filter: "mine",
      source: "drawing",
      period: "7d",
      search: "ООО Стекло",
      expand: USER,
    });
  });

  it("takes the first value of repeated params and caps the search at 100 characters", () => {
    const parsed = parseKanbanQuery({ filter: ["repeat", "mine"], search: "x".repeat(150) });
    expect(parsed.filter).toBe("repeat");
    expect(parsed.search).toHaveLength(100);
  });
});

describe("kanbanWhere", () => {
  it("is empty for the default query", () => {
    expect(kanbanWhere(query(), ctx)).toEqual([]);
  });

  it("maps every chip", () => {
    expect(kanbanWhere(query({ filter: "mine" }), ctx)).toEqual([{ assignee: { equals: USER } }]);
    expect(kanbanWhere(query({ filter: "unassigned" }), ctx)).toEqual([
      { assignee: { exists: false } },
    ]);
    expect(kanbanWhere(query({ filter: "repeat" }), ctx)).toEqual([
      { isDuplicate: { equals: true } },
    ]);
    expect(kanbanWhere(query({ filter: "flagged" }), ctx)).toEqual([
      {
        flags: {
          in: ["small_volume", "nonstandard_size", "urgent", "no_file", "needs_docs"],
        },
      },
    ]);
  });

  it("filters by source", () => {
    expect(kanbanWhere(query({ source: "quiz" }), ctx)).toEqual([{ formType: { equals: "quiz" } }]);
  });

  it("bounds the period by the company time zone", () => {
    const [today] = kanbanWhere(query({ period: "today" }), ctx);
    expect(today).toEqual(createdAtWhere(presetRange("today", NOW)));
    // Local midnight of 22.10 in Yekaterinburg is 21.10 19:00 UTC.
    expect(today).toEqual({
      createdAt: {
        greater_than_equal: "2026-10-21T19:00:00.000Z",
        less_than_equal: "2026-10-22T18:59:59.999Z",
      },
    });
    expect(kanbanWhere(query({ period: "quarter" }), ctx)).toEqual([
      createdAtWhere(presetRange("quarter", NOW)),
    ]);
  });

  it("searches the text contacts and, with 3+ digits, the phone", () => {
    expect(kanbanWhere(query({ search: "Стекло" }), ctx)).toEqual([
      {
        or: [
          { company: { like: "Стекло" } },
          { name: { like: "Стекло" } },
          { email: { like: "Стекло" } },
          { inn: { like: "Стекло" } },
        ],
      },
    ]);
    const [withPhone] = kanbanWhere(query({ search: "912 345" }), ctx);
    expect(withPhone).toEqual({
      or: [
        { company: { like: "912 345" } },
        { name: { like: "912 345" } },
        { email: { like: "912 345" } },
        { inn: { like: "912 345" } },
        { phone: { like: "912345" } },
      ],
    });
    const [twoDigits] = kanbanWhere(query({ search: "Ф2" }), ctx);
    expect(JSON.stringify(twoDigits)).not.toContain("phone");
  });

  it("combines the conditions", () => {
    expect(
      kanbanWhere(query({ filter: "repeat", source: "sample", search: "abc" }), ctx)
    ).toHaveLength(3);
  });
});

describe("phoneSearchDigits", () => {
  it("normalizes a Russian trunk prefix", () => {
    expect(phoneSearchDigits("8 (912) 345-67-89")).toBe("79123456789");
    expect(phoneSearchDigits("+7 912")).toBe("7912");
    expect(phoneSearchDigits("12")).toBeNull();
  });
});

describe("kanbanHref", () => {
  it("leaves the defaults out", () => {
    expect(kanbanHref(query(), {})).toBe("/admin/collections/leads/kanban/");
    expect(kanbanHref(query({ filter: "mine" }), { filter: "all" })).toBe(
      "/admin/collections/leads/kanban/"
    );
  });

  it("writes the non-default parameters", () => {
    expect(
      kanbanHref(query({ source: "quiz", period: "30d", search: "ООО Р" }), {
        filter: "unassigned",
        expand: USER,
      })
    ).toBe(
      `/admin/collections/leads/kanban/?filter=unassigned&source=quiz&period=30d&search=%D0%9E%D0%9E%D0%9E+%D0%A0&expand=${USER}`
    );
  });
});

describe("kanbanExportHref", () => {
  it("exports the filter's period, or lets the route pick its default", () => {
    expect(kanbanExportHref(query(), NOW)).toBe("/api/admin/leads/export/?format=xlsx");
    expect(kanbanExportHref(query({ period: "7d" }), NOW)).toBe(
      "/api/admin/leads/export/?format=xlsx&from=2026-10-16&to=2026-10-22"
    );
  });

  it("passes the source and the quick filters the export route supports", () => {
    expect(kanbanExportHref(query({ source: "quiz", filter: "mine" }), NOW)).toBe(
      "/api/admin/leads/export/?format=xlsx&source=quiz&assignee=me"
    );
    expect(kanbanExportHref(query({ filter: "repeat" }), NOW)).toBe(
      "/api/admin/leads/export/?format=xlsx&duplicates=1"
    );
    for (const filter of ["unassigned", "flagged"] as const) {
      expect(kanbanExportHref(query({ filter }), NOW)).toBe("/api/admin/leads/export/?format=xlsx");
    }
  });
});
