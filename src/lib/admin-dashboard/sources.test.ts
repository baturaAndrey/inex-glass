import { describe, expect, it } from "vitest";
import { buildSources } from "./sources";

const of = (formType: string, n: number) => Array.from({ length: n }, () => ({ formType }));

describe("buildSources", () => {
  it("groups by form, drops empty sources and sorts by count", () => {
    const rows = buildSources([...of("drawing", 9), ...of("quiz", 18), ...of("contacts", 4)]);
    expect(rows.map((row) => [row.formType, row.label, row.count])).toEqual([
      ["quiz", "Квиз", 18],
      ["drawing", "Отправить чертёж", 9],
      ["contacts", "Контакты", 4],
    ]);
  });

  it("sizes bars relative to the biggest source", () => {
    const rows = buildSources([...of("quiz", 4), ...of("callback", 1)]);
    expect(rows.map((row) => row.width)).toEqual([100, 25]);
  });

  it("breaks ties by the form order and ignores unknown forms", () => {
    const rows = buildSources([...of("sample", 2), ...of("quiz", 2), { formType: "bogus" }, {}]);
    expect(rows.map((row) => row.formType)).toEqual(["quiz", "sample"]);
  });

  it("returns nothing for an empty period", () => {
    expect(buildSources([])).toEqual([]);
  });
});
