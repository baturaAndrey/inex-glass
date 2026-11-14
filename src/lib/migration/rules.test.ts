import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import {
  NOTES,
  OBJECTS_LISTING,
  classify,
  fixRow,
  fixRows,
  isShowerConfigUrl,
  isValidNewUrl,
  parseUrlRegistry,
  summarize,
  toLatinSlug,
  validateRows,
  type Row,
} from "./rules";

const row = (old_url: string, new_url = "", action: Row["action"] = "301", note = ""): Row => ({
  old_url,
  new_url,
  action,
  note,
});

/** `/portfolio/ograzhdeniya/atriumnye/kolоnna-08` with a Cyrillic «о» (U+043E). */
const CYRILLIC_O = "о";
const KOLONNA_08 = `/portfolio/ograzhdeniya/atriumnye/kol${CYRILLIC_O}nna-08`;

describe("toLatinSlug", () => {
  it("lower-cases Latin slugs", () => {
    expect(toLatinSlug("Steklyannyy-kozyrek")).toBe("steklyannyy-kozyrek");
    expect(toLatinSlug("Peregorodka-01")).toBe("peregorodka-01");
  });

  it("replaces Cyrillic homoglyphs inside Latin words", () => {
    expect(toLatinSlug(`kol${CYRILLIC_O}nna-08`)).toBe("kolonna-08");
    // «с» inside a Latin word is the Latin «c», not the transliteration «s».
    expect(toLatinSlug("oblizovka-сteklom")).toBe("oblizovka-cteklom");
  });

  it("transliterates Cyrillic words", () => {
    expect(toLatinSlug("Ресторан Стар")).toBe("restoran-star");
    expect(toLatinSlug("ТРК «Родник»")).toBe("trk-rodnik");
  });

  it("collapses and trims separators", () => {
    expect(toLatinSlug("--metalokarkas--")).toBe("metalokarkas");
    expect(toLatinSlug("a__b  c")).toBe("a-b-c");
  });
});

describe("classify", () => {
  it.each([
    ["/portfolio/lestnicy/betonnye/kottedzh-32-beton", "stairs"],
    ["/portfolio/otdelka-interera/vip-studiya", "interior"],
    ["/portfolio/dushevye", "category"],
    ["/portfolio/dushevye/pryamye", "category"],
    ["/portfolio/peregorodki/celnosteklyannye/2", "pagination"],
    ["/portfolio/fasady/aluminievyi-vitrag-01", "object"],
    ["/portfolio/peregorodki/celnosteklyannye/restostar", "object"],
    ["/produkciya/dushevye/pryamaya-peregorodka", "produkciya"],
    ["/materialy/steklo", "produkciya"],
    ["/kontakty", "other"],
  ] as const)("%s → %s", (url, expected) => {
    expect(classify({ old_url: url })).toBe(expected);
  });

  it("recognises shower configuration pages", () => {
    expect(isShowerConfigUrl("/produkciya/dushevye/pryamaya-peregorodka")).toBe(true);
    expect(isShowerConfigUrl("/produkciya/dushevye")).toBe(false);
    expect(isShowerConfigUrl("/produkciya/zerkala/zerkala-s-podsvetkoi")).toBe(false);
  });
});

describe("fixRow / fixRows — rules", () => {
  it("R0 keeps stay rows untouched (also upper-case/Cyrillic old URLs)", () => {
    const source = row("/portfolio/peregorodki/santehnicheskie/Peregorodka-02", "", "stay", "x");
    expect(fixRow(source)).toEqual({ ...source, rule: "R0", disputed: false });
    const cyr = row(`/portfolio/kolonny/kol${CYRILLIC_O}nna-09`, "", "stay", "y");
    expect(fixRow(cyr)).toMatchObject({ old_url: cyr.old_url, new_url: "", rule: "R0" });
  });

  it("R1 turns stairs into stay", () => {
    const fixed = fixRow(
      row("/portfolio/lestnicy/betonnye/kottedzh-32-beton", "/obekty/kottedzh-32-beton/")
    );
    expect(fixed).toMatchObject({ action: "stay", new_url: "", rule: "R1", disputed: false });
  });

  it("R2 turns interior finishing into stay; leaf objects are disputed", () => {
    expect(
      fixRow(row("/portfolio/otdelka-interera/vitrag-01", "/obekty/vitrag-01/"))
    ).toMatchObject({ action: "stay", new_url: "", rule: "R2", disputed: true });
    expect(fixRow(row("/portfolio/otdelka-interera/2", "/obekty/2/"))).toMatchObject({
      rule: "R2",
      disputed: false,
    });
    expect(fixRow(row("/portfolio/otdelka-interera", "/obekty/otdelka-interera/"))).toMatchObject({
      rule: "R2",
      disputed: false,
    });
  });

  it("R3 sends category pages to the listing", () => {
    expect(fixRow(row("/portfolio/dushevye/pryamye", "/obekty/pryamye/"))).toMatchObject({
      new_url: OBJECTS_LISTING,
      action: "301",
      rule: "R3",
    });
  });

  it("R4 sends old pagination to the listing", () => {
    expect(fixRow(row("/portfolio/peregorodki/celnosteklyannye/3", "/obekty/3/"))).toMatchObject({
      new_url: OBJECTS_LISTING,
      rule: "R4",
    });
  });

  it("R5 builds a lower-case Latin object URL", () => {
    const [upper, cyr] = fixRows([
      row("/portfolio/kozyrki/Steklyannyy-kozyrek", "/obekty/Steklyannyy-kozyrek/"),
      row(KOLONNA_08, `/obekty/kol${CYRILLIC_O}nna-08/`),
    ]);
    expect(upper).toMatchObject({ new_url: "/obekty/steklyannyy-kozyrek/", rule: "R5" });
    expect(cyr).toMatchObject({ old_url: KOLONNA_08, new_url: "/obekty/kolonna-08/", rule: "R5" });
    expect(cyr?.note).toContain(
      "percent-encoded: /portfolio/ograzhdeniya/atriumnye/kol%D0%BEnna-08"
    );
  });

  it("R5 marks doors inside partitions as disputed but keeps the 301", () => {
    const [door] = fixRows([
      row("/portfolio/peregorodki/celnosteklyannye/dveri-08", "/obekty/dveri-08/"),
    ]);
    expect(door).toMatchObject({ action: "301", new_url: "/obekty/dveri-08/", disputed: true });
  });

  it("R5 prefers the slug actually written by the import", () => {
    const [fixed] = fixRows([row("/portfolio/fasady/aluminievyi-vitrag-01")], {
      importedSlug: () => "aluminievyj-vitrazh-01",
    });
    expect(fixed?.new_url).toBe("/obekty/aluminievyj-vitrazh-01/");
  });

  it("R6 keeps /produkciya/* and /materialy/steklo", () => {
    const source = row("/produkciya/dushevye/pryamaya-peregorodka", "/dushevye-peregorodki/");
    expect(fixRow(source)).toEqual({ ...source, rule: "R6", disputed: false });
    expect(fixRow(row("/materialy/steklo", "/zakalennoe-steklo/"))?.rule).toBe("R6");
  });

  it("R7 sends objects whose page failed to import to the listing, disputed", () => {
    const [fixed] = fixRows(
      [row("/portfolio/fasady/aluminievyi-vitrag-01", "/obekty/aluminievyi-vitrag-01/")],
      {
        importStatus: () => "failed",
      }
    );
    expect(fixed).toMatchObject({ new_url: OBJECTS_LISTING, rule: "R7", disputed: true });
  });
});

describe("fixRows — slug collisions (R5)", () => {
  const rows = [
    row("/portfolio/ograzhdeniya/lestnichnye/restostar", "/obekty/restostar/"),
    row("/portfolio/peregorodki/celnosteklyannye/restostar", "/obekty/restostar/"),
  ];

  it("merges the same object into one URL", () => {
    const fixed = fixRows(rows, { sameObject: () => true });
    expect(fixed.map((r) => r.new_url)).toEqual(["/obekty/restostar/", "/obekty/restostar/"]);
    expect(fixed[1]?.note).toContain(rows[0]?.old_url);
  });

  it("suffixes a different object with its portfolio category", () => {
    const fixed = fixRows(rows, { sameObject: () => false });
    expect(fixed.map((r) => r.new_url)).toEqual([
      "/obekty/restostar/",
      "/obekty/restostar-peregorodki/",
    ]);
  });

  it("suffixes when no sameObject callback is given", () => {
    expect(fixRows(rows)[1]?.new_url).toBe("/obekty/restostar-peregorodki/");
  });

  it("notes the collision with its pair URL when suffixing", () => {
    const fixed = fixRows(rows, { sameObject: () => false });
    expect(fixed[0]?.note).toBe("");
    expect(fixed[1]?.note).toBe(`${NOTES.suffixed} (пара: ${rows[0]?.old_url})`);
  });

  it("still reports a collision the import already split via importedSlug", () => {
    const slugs: Record<string, string> = {
      "/portfolio/ograzhdeniya/lestnichnye/restostar": "restostar",
      "/portfolio/peregorodki/celnosteklyannye/restostar": "restostar-peregorodki",
    };
    const fixed = fixRows(rows, { importedSlug: (url) => slugs[url] });
    expect(fixed.map((r) => r.new_url)).toEqual([
      "/obekty/restostar/",
      "/obekty/restostar-peregorodki/",
    ]);
    expect(fixed[0]?.note).toBe("");
    expect(fixed[1]?.note).toBe(`${NOTES.suffixed} (пара: ${rows[0]?.old_url})`);
  });

  it("does not flag a row whose imported slug merely differs from its base slug", () => {
    const [fixed] = fixRows([rows[0]!], { importedSlug: () => "restostar-2" });
    expect(fixed?.note).toBe("");
  });
});

describe("validation", () => {
  it("accepts only lower-case, slash-terminated paths", () => {
    expect(isValidNewUrl("/obekty/")).toBe(true);
    expect(isValidNewUrl("/obekty/trk-rodnik/")).toBe(true);
    expect(isValidNewUrl("/obekty/Peregorodka-01/")).toBe(false);
    expect(isValidNewUrl("/obekty/x")).toBe(false);
    expect(isValidNewUrl("/obekty//x/")).toBe(false);
    expect(isValidNewUrl(`/obekty/kol${CYRILLIC_O}nna-08/`)).toBe(false);
  });

  it("parses the URL registry of 17-meta.md", () => {
    const registry = parseUrlRegistry(
      [
        "| URL | H1 |",
        "|---|---|",
        "| / | Главная |",
        "| /zakalennoe-steklo/{N}-mm/ | x |",
        "| /obekty/{slug}/ | y |",
        "| /dushevye-peregorodki/ | z |",
      ].join("\n")
    );
    expect(registry.has("/")).toBe(true);
    expect(registry.has("/zakalennoe-steklo/19-mm/")).toBe(true);
    expect(registry.has("/dushevye-peregorodki/")).toBe(true);
    expect([...registry].some((url) => url.includes("{"))).toBe(false);
  });
});

/* ------------------------------------------------------------------------------------------ */
/* The real CSV                                                                               */
/* ------------------------------------------------------------------------------------------ */

const CSV_PATH = path.resolve(import.meta.dirname, "../../../docs/inex/12-migration-inex-su.csv");

function readRealCsv(): Row[] {
  const records = parse(readFileSync(CSV_PATH, "utf8"), {
    delimiter: ";",
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as Row[];
  return records;
}

describe("docs/inex/12-migration-inex-su.csv", () => {
  const source = readRealCsv();
  const fixed = fixRows(source);
  const summary = summarize(source, fixed);

  it("has 446 rows and the expected totals after fixing", () => {
    expect(source).toHaveLength(446);
    expect(summary.redirect).toBe(231);
    expect(summary.stay).toBe(215);
  });

  it("has the expected group sizes", () => {
    expect(summary.byRule).toMatchObject({
      R0: 163,
      R1: 42,
      R2: 10,
      R3: 20,
      R4: 3,
      R5: 168,
      R6: 40,
      R7: 0,
    });
    // 39 /produkciya/* + /materialy/steklo.
    expect(
      fixed.filter((r) => r.old_url.startsWith("/produkciya/") && r.rule === "R6")
    ).toHaveLength(39);
    // Interior finishing: 8 leaf objects are disputed.
    expect(fixed.filter((r) => r.rule === "R2" && r.disputed)).toHaveLength(8);
  });

  it("produces only valid targets: lower-case, trailing slash, stay rows empty", () => {
    expect(validateRows(fixed)).toEqual([]);
    for (const r of fixed) {
      if (r.action === "stay") expect(r.new_url).toBe("");
      else expect(r.new_url).toMatch(/^\/[a-z0-9/-]*\/$/);
    }
  });

  it("resolves the known slug collisions", () => {
    const targetOf = (old: string) => fixed.find((r) => r.old_url === old)?.new_url;
    expect(targetOf("/portfolio/ograzhdeniya/lestnichnye/restostar")).toBe("/obekty/restostar/");
    expect(targetOf("/portfolio/peregorodki/celnosteklyannye/restostar")).toBe(
      "/obekty/restostar-peregorodki/"
    );
    expect(targetOf("/portfolio/peregorodki/celnosteklyannye/tk-kolco")).toBe(
      "/obekty/tk-kolco-peregorodki/"
    );
    // kottedzh-1 under stairs stays on inex.su, so the canopy keeps the plain slug.
    expect(targetOf("/portfolio/kozyrki/kottedzh-1")).toBe("/obekty/kottedzh-1/");
    expect(targetOf("/portfolio/kozyrki/Steklyannyy-kozyrek")).toBe("/obekty/steklyannyy-kozyrek/");
    expect(targetOf(KOLONNA_08)).toBe("/obekty/kolonna-08/");
  });

  it("keeps the row order and the old URLs verbatim", () => {
    expect(fixed.map((r) => r.old_url)).toEqual(source.map((r) => r.old_url));
  });

  it("every 301 into the categories / pagination goes to the listing", () => {
    for (const r of fixed) {
      if (r.action === "301" && ["category", "pagination"].includes(classify(r))) {
        expect(r.new_url).toBe(OBJECTS_LISTING);
      }
    }
  });
});
