import { describe, expect, it } from "vitest";
import { documentToText, isLexicalState, lexicalToText } from "./lexical-to-text";

const text = (value: string) => ({ type: "text", text: value });
const paragraph = (...children: unknown[]) => ({ type: "paragraph", children });
const state = (...children: unknown[]) => ({ root: { type: "root", children } });

describe("lexicalToText", () => {
  it("joins nested nodes with spaces", () => {
    const value = state(
      { type: "heading", tag: "h2", children: [text("Толщина")] },
      paragraph(text("Стекло "), { type: "link", children: [text("10 мм")] }, text(" и 12 мм"))
    );
    expect(lexicalToText(value)).toBe("Толщина Стекло 10 мм и 12 мм");
  });

  it("reads lists and tables", () => {
    const value = state(
      {
        type: "list",
        children: [
          { type: "listitem", children: [text("Кромка")] },
          { type: "listitem", children: [text("Отверстия")] },
        ],
      },
      {
        type: "table",
        children: [
          {
            type: "tablerow",
            children: [
              { type: "tablecell", children: [paragraph(text("4 мм"))] },
              { type: "tablecell", children: [paragraph(text("10 кг"))] },
            ],
          },
        ],
      }
    );
    expect(lexicalToText(value)).toBe("Кромка Отверстия 4 мм 10 кг");
  });

  it("accepts the bare root and ignores garbage", () => {
    expect(lexicalToText({ type: "root", children: [paragraph(text("Да"))] })).toBe("Да");
    expect(lexicalToText(null)).toBe("");
    expect(lexicalToText("строка")).toBe("");
  });
});

describe("isLexicalState", () => {
  it("detects the { root: { children } } shape", () => {
    expect(isLexicalState(state())).toBe(true);
    expect(isLexicalState({ root: {} })).toBe(false);
    expect(isLexicalState([])).toBe(false);
  });
});

describe("documentToText", () => {
  const doc = {
    id: "2c3a7f4e-0b4a-4a0e-9a57-1f1d2b3c4d5e",
    title: "Стеклянные перегородки",
    slug: "steklyannye-peregorodki",
    path: "/steklyannye-peregorodki/",
    template: "hub",
    createdAt: "2026-10-20T10:00:00.000Z",
    intro: state(paragraph(text("Перегородки из закалённого стекла."))),
    layout: [
      {
        id: "64f0c1a2b3c4d5e6f7a8b9c0",
        blockType: "cards",
        variant: "primary",
        heading: "Варианты",
        items: [{ id: "a1", title: "В профиле", text: "Алюминиевый профиль" }],
        image: "6a1d0b2c-1111-4222-8333-944455556666",
      },
      {
        blockType: "table",
        rows: [{ cells: [{ value: "10" }, { value: "Офис" }] }],
      },
    ],
    faq: [{ question: "Какая толщина?", answer: state(paragraph(text("От 10 мм."))) }],
    related: { id: "x", title: "Чужой документ", updatedAt: "2026-10-20T10:00:00.000Z" },
    legacyUrls: [{ url: "https://inex.su/old/" }],
    seo: { h1: "H1 из SEO", title: "Title | Inex Glass", description: "Описание страницы." },
  };

  it("collects copy in document order and appends the SEO description", () => {
    expect(documentToText(doc, { lead: "Стеклянные перегородки" })).toBe(
      "Стеклянные перегородки Перегородки из закалённого стекла. Варианты В профиле " +
        "Алюминиевый профиль 10 Офис Какая толщина? От 10 мм. Описание страницы."
    );
  });

  it("skips identifiers, enum values, URLs, populated relations and other SEO fields", () => {
    const result = documentToText(doc);
    for (const fragment of [
      "steklyannye",
      "/steklyannye",
      "hub",
      "primary",
      "cards",
      "Чужой документ",
      "inex.su",
      "Title | Inex Glass",
      "H1 из SEO",
      "2026-10-20",
      "6a1d0b2c",
    ]) {
      expect(result).not.toContain(fragment);
    }
  });

  it("keeps a repeated short string once", () => {
    expect(documentToText({ title: "Матовое стекло" }, { lead: "Матовое стекло" })).toBe(
      "Матовое стекло"
    );
  });

  it("cuts the result to maxLength", () => {
    expect(documentToText({ text: "а".repeat(500) }, { maxLength: 100 })).toHaveLength(100);
  });
});
