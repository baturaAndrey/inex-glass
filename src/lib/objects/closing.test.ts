import { describe, expect, it } from "vitest";
import { splitClosingBody, splitQuestion } from "./closing";

const text = (value: string, format = 0) => ({ type: "text", text: value, format });
const paragraph = (...children: object[]) => ({ type: "paragraph", children });
const body = (...children: object[]) => ({ root: { type: "root", children } });

const AMONG = paragraph(text("Среди объектов:", 1), text(" ТРЦ «Алмаз», Челябинск"));
const CTA_TEXT = "Ищете решение для похожего объекта? Пришлите проект — подберём стекло и узлы.";

describe("splitClosingBody", () => {
  it("takes the last paragraph as the CTA and keeps the rest as rich nodes", () => {
    const parts = splitClosingBody(body(AMONG, paragraph(text(CTA_TEXT))));
    expect(parts.cta).toBe(CTA_TEXT);
    expect(parts.lead).toEqual([AMONG]);
  });

  it("skips empty paragraphs", () => {
    const parts = splitClosingBody(body(AMONG, paragraph(text(CTA_TEXT)), paragraph(text("  "))));
    expect(parts.cta).toBe(CTA_TEXT);
    expect(parts.lead).toHaveLength(1);
  });

  it("returns nothing for a missing or malformed body", () => {
    expect(splitClosingBody(null)).toEqual({ lead: [], cta: "" });
    expect(splitClosingBody({ root: {} })).toEqual({ lead: [], cta: "" });
  });

  it("keeps non-paragraph nodes in the lead when there is no paragraph", () => {
    const heading = { type: "heading", children: [text("Заголовок")] };
    expect(splitClosingBody(body(heading))).toEqual({ lead: [heading], cta: "" });
  });
});

describe("splitQuestion", () => {
  it("splits the question from the rest, verbatim", () => {
    const { heading, sub } = splitQuestion(CTA_TEXT);
    expect(heading).toBe("Ищете решение для похожего объекта?");
    expect(sub).toBe("Пришлите проект — подберём стекло и узлы.");
    expect(`${heading} ${sub}`).toBe(CTA_TEXT);
  });

  it("keeps a text without a leading question as the sub", () => {
    expect(splitQuestion("Пришлите проект.")).toEqual({ heading: "", sub: "Пришлите проект." });
    expect(splitQuestion("Как заказать?")).toEqual({ heading: "", sub: "Как заказать?" });
  });
});
