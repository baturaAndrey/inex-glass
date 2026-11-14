import { describe, expect, it } from "vitest";
import {
  extractToc,
  lexicalFromNodes,
  slugifyHeading,
  splitChunks,
  splitSections,
  type LexicalNodeLike,
} from "./toc";

const text = (value: string) => ({ type: "text", text: value, format: 0, version: 1 });
const paragraph = (value: string): LexicalNodeLike => ({
  type: "paragraph",
  children: [text(value)],
});
const heading = (tag: string, value: string): LexicalNodeLike => ({
  type: "heading",
  tag,
  children: [text(value)],
});
const table: LexicalNodeLike = { type: "table", children: [] };
const doc = (...children: LexicalNodeLike[]) => lexicalFromNodes(children);

describe("slugifyHeading", () => {
  it("transliterates and lower-cases", () => {
    expect(slugifyHeading("Почему оно рассыпается", new Set())).toBe("pochemu-ono-rassypaetsya");
    expect(slugifyHeading("А подшлифовать кромку?", new Set())).toBe("a-podshlifovat-kromku");
    expect(slugifyHeading("Что значит «4М1»", new Set())).toBe("chto-znachit-4m1");
  });

  it("deduplicates with -2, -3", () => {
    const used = new Set<string>();
    expect(slugifyHeading("Зазоры", used)).toBe("zazory");
    expect(slugifyHeading("Зазоры", used)).toBe("zazory-2");
    expect(slugifyHeading("Зазоры!", used)).toBe("zazory-3");
  });

  it("falls back for headings without letters", () => {
    expect(slugifyHeading("—", new Set())).toBe("razdel");
  });
});

describe("splitSections / extractToc", () => {
  const body = doc(
    paragraph("Вступление"),
    heading("h2", "Почему оно рассыпается"),
    paragraph("Текст 1"),
    heading("h3", "Подзаголовок"),
    paragraph("Текст 2"),
    heading("h2", "Зазоры"),
    table,
    heading("h2", "Зазоры")
  );

  it("splits the root by H2 only", () => {
    const sections = splitSections(body);
    expect(sections.map((section) => section.heading?.id ?? null)).toEqual([
      null,
      "pochemu-ono-rassypaetsya",
      "zazory",
      "zazory-2",
    ]);
    expect(sections[0]?.nodes).toHaveLength(1);
    expect(sections[1]?.nodes).toHaveLength(3);
    expect(sections[3]?.nodes).toEqual([]);
  });

  it("omits an empty intro", () => {
    const sections = splitSections(doc(heading("h2", "Один"), paragraph("x")));
    expect(sections).toHaveLength(1);
    expect(sections[0]?.heading).toEqual({ id: "odin", text: "Один" });
  });

  it("extracts the TOC with the same anchors", () => {
    expect(extractToc(body)).toEqual([
      { id: "pochemu-ono-rassypaetsya", text: "Почему оно рассыпается" },
      { id: "zazory", text: "Зазоры" },
      { id: "zazory-2", text: "Зазоры" },
    ]);
  });

  it("tolerates invalid values", () => {
    expect(splitSections(null)).toEqual([]);
    expect(extractToc({ root: {} })).toEqual([]);
  });
});

describe("splitChunks", () => {
  it("separates tables from rich-text runs", () => {
    const a = paragraph("a");
    const b = paragraph("b");
    expect(splitChunks([a, table, b, paragraph("c")]).map((chunk) => chunk.kind)).toEqual([
      "rich",
      "table",
      "rich",
    ]);
    expect(splitChunks([table])).toEqual([{ kind: "table", node: table }]);
    expect(splitChunks([])).toEqual([]);
  });
});
