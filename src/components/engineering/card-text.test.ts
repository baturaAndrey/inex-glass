import { describe, expect, it } from "vitest";
import { parseCardText } from "./card-text";

describe("parseCardText", () => {
  it("splits the description from the bullets", () => {
    expect(parseCardText("Описание.\n- первый;\n— второй.")).toEqual({
      intro: ["Описание."],
      bullets: ["первый;", "второй."],
    });
  });

  it("handles empty text and blank lines", () => {
    expect(parseCardText(null)).toEqual({ intro: [], bullets: [] });
    expect(parseCardText("\n\n- один\n\n")).toEqual({ intro: [], bullets: ["один"] });
  });

  it("keeps a hyphen inside a line", () => {
    expect(parseCardText("3D-модель - узлы")).toEqual({ intro: ["3D-модель - узлы"], bullets: [] });
  });
});
