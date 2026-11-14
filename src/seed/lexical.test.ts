import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { sanitizeConfig } from "payload";
import { describe, expect, it } from "vitest";
import { LINKABLE_COLLECTIONS } from "@/payload/fields/link";
import { getEditorConfig, markdownToLexical, paragraphs } from "./lexical";
import type { Payload } from "payload";

type Node = {
  type: string;
  text?: string;
  format?: number | string;
  tag?: string;
  listType?: string;
  fields?: { url?: string; linkType?: string };
  children?: Node[];
};

const childrenOf = (state: { root: { children: unknown[] } }) => state.root.children as Node[];

describe("paragraphs", () => {
  it("builds one Lexical paragraph per argument with verbatim text", () => {
    const children = childrenOf(paragraphs("Цена от {цена_10мм} на {дата_цен}", "Второй абзац"));
    expect(children.map((node) => node.type)).toEqual(["paragraph", "paragraph"]);
    expect(children[0]?.children).toEqual([
      expect.objectContaining({
        type: "text",
        text: "Цена от {цена_10мм} на {дата_цен}",
        format: 0,
      }),
    ]);
    expect(children[1]?.children?.[0]?.text).toBe("Второй абзац");
  });

  it("keeps markdown syntax as plain text (no parsing)", () => {
    const [paragraph] = childrenOf(paragraphs("**не жирный**"));
    expect(paragraph?.children?.[0]?.text).toBe("**не жирный**");
  });

  it("returns an empty paragraph for an empty string and an empty root without arguments", () => {
    expect(childrenOf(paragraphs(""))[0]).toMatchObject({ type: "paragraph", children: [] });
    expect(childrenOf(paragraphs())).toEqual([]);
  });
});

describe("markdownToLexical", () => {
  /**
   * Minimal sanitized config (no database): the link feature only needs the linkable
   * collections to exist. In the seed the real config comes from `payload run`.
   */
  async function editorConfig() {
    const config = await sanitizeConfig({
      secret: "test",
      editor: lexicalEditor(),
      db: { defaultIDType: "text", init: () => ({}) } as never,
      collections: LINKABLE_COLLECTIONS.map((slug) => ({
        slug,
        fields: [{ name: "title", type: "text" as const }],
      })),
    });
    return getEditorConfig({ config } as unknown as Payload);
  }

  it("converts headings, paragraphs, bold, links and both list types", async () => {
    const state = markdownToLexical(
      [
        "## Заголовок",
        "",
        "Образцы — **бесплатно**, *быстро*. → [Триплекс](/tripleks/) {условия}",
        "",
        "- один",
        "- два",
        "",
        "1. первый",
      ].join("\n"),
      await editorConfig()
    );
    const [heading, paragraph, bullets, numbers] = childrenOf(state);

    expect(heading).toMatchObject({ type: "heading", tag: "h2" });
    expect(paragraph?.type).toBe("paragraph");
    const inline = paragraph?.children ?? [];
    expect(inline.find((node) => node.text === "бесплатно")?.format).toBe(1);
    expect(inline.find((node) => node.text === "быстро")?.format).toBe(2);
    expect(inline.find((node) => node.type === "link")?.fields).toMatchObject({
      url: "/tripleks/",
      linkType: "custom",
    });
    expect(inline.some((node) => node.text?.includes("{условия}"))).toBe(true);
    expect(bullets).toMatchObject({ type: "list", listType: "bullet" });
    expect(bullets?.children).toHaveLength(2);
    expect(numbers).toMatchObject({ type: "list", listType: "number" });
  });

  it("converts GFM tables: header row, trimmed cells, inline formats", async () => {
    const state = markdownToLexical(
      [
        "| | Обычное | Закалённое |",
        "|---|---|---|",
        "| Прочность | Базовая | **В 5–6 раз** выше |",
      ].join("\n"),
      await editorConfig()
    );
    const [table] = childrenOf(state);
    expect(table?.type).toBe("table");
    const [head, row] = table?.children ?? [];
    const cells = (node: Node | undefined) => node?.children ?? [];
    const cellText = (cell: Node | undefined) =>
      (cell?.children?.[0]?.children ?? []).map((node) => node.text).join("");
    expect(cells(head).map((cell) => (cell as { headerState?: number }).headerState)).toEqual([
      1, 1, 1,
    ]);
    expect(cells(head).map(cellText)).toEqual(["", "Обычное", "Закалённое"]);
    expect(cells(row).map(cellText)).toEqual(["Прочность", "Базовая", "В 5–6 раз выше"]);
    expect(cells(row)[2]?.children?.[0]?.children?.[0]).toMatchObject({
      text: "В 5–6 раз",
      format: 1,
    });
  });
});
