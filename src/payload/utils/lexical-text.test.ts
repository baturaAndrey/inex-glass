import { describe, expect, it } from "vitest";
import { countWords, lexicalToPlainText, readingTimeMinutes } from "./lexical-text";

const text = (value: string) => ({ type: "text", text: value, version: 1 });
const paragraph = (...children: unknown[]) => ({ type: "paragraph", children, version: 1 });

const doc = {
  root: {
    type: "root",
    children: [
      { type: "heading", tag: "h2", children: [text("Коротко")] },
      paragraph(
        text("Закалённое  стекло "),
        { type: "link", children: [text("режут")] },
        text(" до закалки.")
      ),
      paragraph(text("Строка 1"), { type: "linebreak" }, text("Строка 2")),
      {
        type: "list",
        children: [
          { type: "listitem", children: [text("пункт {N} мм")] },
          { type: "listitem", children: [text("второй")] },
        ],
      },
      paragraph(),
    ],
  },
};

describe("lexicalToPlainText", () => {
  it("joins blocks with line breaks, keeps inline text together and placeholders as is", () => {
    expect(lexicalToPlainText(doc)).toBe(
      [
        "Коротко",
        "Закалённое стекло режут до закалки.",
        "Строка 1",
        "Строка 2",
        "пункт {N} мм",
        "второй",
      ].join("\n")
    );
  });

  it("accepts the root node directly", () => {
    expect(lexicalToPlainText(doc.root)).toContain("Коротко");
  });

  it("returns an empty string for empty or invalid input", () => {
    expect(lexicalToPlainText(null)).toBe("");
    expect(lexicalToPlainText(undefined)).toBe("");
    expect(lexicalToPlainText("text")).toBe("");
    expect(lexicalToPlainText({ root: { type: "root", children: [] } })).toBe("");
  });
});

describe("countWords / readingTimeMinutes", () => {
  it("counts Cyrillic, Latin, digits and hyphenated words", () => {
    expect(countWords("Закалённое стекло 10 мм, low-iron!")).toBe(5);
  });

  it("rounds reading time up at 180 words per minute", () => {
    const words = (n: number) => ({
      root: { type: "root", children: [paragraph(text("слово ".repeat(n)))] },
    });
    expect(readingTimeMinutes(words(0))).toBe(0);
    expect(readingTimeMinutes(words(1))).toBe(1);
    expect(readingTimeMinutes(words(180))).toBe(1);
    expect(readingTimeMinutes(words(181))).toBe(2);
  });
});
