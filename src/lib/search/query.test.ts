import { PgDialect } from "@payloadcms/db-postgres/drizzle/pg-core";
import { describe, expect, it, vi } from "vitest";
import {
  buildPrefixQuery,
  buildSearchSql,
  clampLimit,
  clampOffset,
  prepareQuery,
  queryTokens,
  rowsToResult,
  searchSite,
} from "./query";
import type { Payload } from "payload";

// `searchSite` falls back to the Payload singleton; the tests always pass a fake instance.
vi.mock("@/lib/cms/payload", () => ({ getPayloadClient: vi.fn() }));

describe("queryTokens / buildPrefixQuery", () => {
  it("strips tsquery syntax characters", () => {
    const tokens = queryTokens("стекло & | ! ( ) : ' * <-> 10");
    expect(tokens).toEqual(["стекло", "10"]);
    expect(buildPrefixQuery(tokens)).toBe("стекло & 10");
  });

  it("drops one-character words", () => {
    expect(queryTokens("а и стекло в 5 мм")).toEqual(["стекло", "мм"]);
  });

  it("never makes a number a prefix («10» must not find «100»)", () => {
    expect(buildPrefixQuery(["10"])).toBe("10");
    expect(buildPrefixQuery(["стекло", "10"])).toBe("стекло & 10");
    expect(buildPrefixQuery(["10", "мм"])).toBe("10 & мм:*");
    // Mixed letters/digits are still prefixes (`10мм` is typed letter by letter).
    expect(buildPrefixQuery(["м10"])).toBe("м10:*");
  });

  it("marks only the last word as a prefix", () => {
    expect(buildPrefixQuery(["стеклянные", "перегор"])).toBe("стеклянные & перегор:*");
    expect(buildPrefixQuery([])).toBe("");
  });

  it("caps the number of tokens", () => {
    expect(queryTokens(Array.from({ length: 20 }, (_, i) => `слово${i}`).join(" "))).toHaveLength(
      8
    );
  });
});

describe("prepareQuery", () => {
  it("normalizes case and ё", () => {
    expect(prepareQuery("Закалённое СТЕКЛО")).toEqual({
      exact: "закаленное стекло",
      prefix: "закаленное & стекло:*",
    });
    expect(prepareQuery("закалённое")).toEqual(prepareQuery("закаленное"));
  });

  it("returns null without searchable words", () => {
    expect(prepareQuery("")).toBeNull();
    expect(prepareQuery("   ")).toBeNull();
    expect(prepareQuery("& | !")).toBeNull();
    expect(prepareQuery("я")).toBeNull();
    expect(prepareQuery(undefined)).toBeNull();
  });

  it("cuts the input to 100 characters", () => {
    expect(prepareQuery("а".repeat(150) + " стекло")?.exact).toHaveLength(100);
  });
});

describe("clampLimit / clampOffset", () => {
  it("bounds the limit to 1…20", () => {
    expect(clampLimit(undefined)).toBe(10);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(500)).toBe(20);
    expect(clampLimit(6.7)).toBe(6);
  });

  it("keeps the offset non-negative", () => {
    expect(clampOffset(-5)).toBe(0);
    expect(clampOffset(40)).toBe(40);
    expect(clampOffset(Number.NaN)).toBe(0);
  });
});

describe("buildSearchSql", () => {
  it("passes every user value as a bound parameter", () => {
    const evil = "'); DROP TABLE search; --";
    const prepared = { exact: evil, prefix: "drop & table:*" };
    const { sql, params } = new PgDialect().sqlToQuery(buildSearchSql(prepared, 20, 40));
    expect(sql).not.toContain("DROP TABLE");
    // One index condition: both tsqueries OR-ed, user input only as `$n` placeholders.
    expect(sql).toMatch(
      /s\.tsv @@ \(websearch_to_tsquery\('russian'::regconfig, \$\d+\) \|\| to_tsquery\('russian'::regconfig, \$\d+\)\)/
    );
    expect(params).toContain(evil);
    expect(params).toContain("drop & table:*");
    expect(params).toContain(20);
    expect(params).toContain(40);
  });
});

describe("rowsToResult", () => {
  it("sanitizes snippets, drops unknown kinds and reads the total", () => {
    const result = rowsToResult([
      {
        title: "Стекло",
        url: "/zakalennoe-steklo/",
        kind: "pages",
        total: "3",
        snippet: "<mark>стекло</mark> <script>",
      },
      { title: "?", url: "/x/", kind: "users", total: "3", snippet: "" },
      { title: "Без адреса", url: null, kind: "pages", total: "3", snippet: "" },
    ]);
    expect(result.total).toBe(3);
    expect(result.hits).toEqual([
      {
        title: "Стекло",
        url: "/zakalennoe-steklo/",
        kind: "pages",
        snippet: "<mark>стекло</mark> &lt;script&gt;",
      },
    ]);
  });
});

describe("searchSite", () => {
  it("does not query the database for an empty query", async () => {
    const execute = vi.fn();
    const payload = { db: { drizzle: { execute } } } as unknown as Payload;
    await expect(searchSite({ q: " ! " }, payload)).resolves.toEqual({ hits: [], total: 0 });
    expect(execute).not.toHaveBeenCalled();
  });

  it("executes the statement and maps the rows", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ title: "Т", url: "/t/", kind: "articles", total: 1, snippet: "т" }],
    });
    const payload = { db: { drizzle: { execute } } } as unknown as Payload;
    const result = await searchSite({ q: "перегор", limit: 6 }, payload);
    expect(execute).toHaveBeenCalledOnce();
    expect(result).toEqual({
      hits: [{ title: "Т", url: "/t/", kind: "articles", snippet: "т" }],
      total: 1,
    });
  });
});
