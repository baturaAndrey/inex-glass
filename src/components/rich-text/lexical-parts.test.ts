import { describe, expect, it } from "vitest";
import { lexicalToPlainText } from "@/payload/utils/lexical-text";
import { splitFirstList, splitLeadingHeading, splitTrailingLinks } from "./lexical-parts";
import type { RichTextData } from "./rich-text";

const text = (value: string, format = 0) => ({ type: "text", text: value, format, version: 1 });
const link = (label: string, url: string) => ({
  type: "link",
  fields: { linkType: "custom", url, newTab: false },
  children: [text(label)],
});
const paragraph = (...children: object[]) => ({ type: "paragraph", children });
const heading = (value: string) => ({ type: "heading", tag: "h2", children: [text(value)] });
const list = (tag: "ol" | "ul", ...items: object[][]) => ({
  type: "list",
  tag,
  listType: tag === "ol" ? "number" : "bullet",
  children: items.map((children) => ({ type: "listitem", children })),
});
const state = (...children: object[]): RichTextData => ({ root: { type: "root", children } });
const plain = (data: RichTextData | null) => (data ? lexicalToPlainText(data) : null);

describe("splitTrailingLinks", () => {
  it("cuts the links that close the last paragraph", () => {
    const { body, links } = splitTrailingLinks(
      state(paragraph(text("Оригиналы едут вместе с партией. "), link("Документы", "/dok/")))
    );
    expect(plain(body)).toBe("Оригиналы едут вместе с партией.");
    expect(links).toEqual([{ label: "Документы", href: "/dok/", external: false }]);
  });

  it("drops a paragraph made only of links and separators", () => {
    const { body, links } = splitTrailingLinks(
      state(
        paragraph(text("Поэтому:")),
        paragraph(link("Как снять размеры", "/a/"), text(" · "), link("Требования", "/b/"))
      )
    );
    expect(plain(body)).toBe("Поэтому:");
    expect(links.map((item) => item.href)).toEqual(["/a/", "/b/"]);
  });

  it("keeps a link in the middle of the text and unsafe links", () => {
    const inline = state(paragraph(link("Триплекс", "/t/"), text(" — для витрин.")));
    expect(splitTrailingLinks(inline).links).toEqual([]);
    const unsafe = state(paragraph(text("Текст "), link("x", "javascript:alert(1)")));
    expect(splitTrailingLinks(unsafe).links).toEqual([]);
    expect(plain(splitTrailingLinks(unsafe).body)).toBe("Текст x");
  });
});

describe("splitLeadingHeading", () => {
  it("returns the first heading and the rest", () => {
    const { heading: title, body } = splitLeadingHeading(
      state(heading("Документы для сдачи объекта"), paragraph(text("Паспорт")))
    );
    expect(title).toBe("Документы для сдачи объекта");
    expect(plain(body)).toBe("Паспорт");
  });

  it("keeps a text without a heading", () => {
    expect(splitLeadingHeading(state(paragraph(text("a")))).heading).toBeNull();
  });
});

describe("splitFirstList", () => {
  it("splits the lead, the items and the rest", () => {
    const parts = splitFirstList(
      state(
        paragraph(text("Поэтому:")),
        list("ol", [text("Размеры", 1), text(" — после отделки.")], [text("Зазоры")]),
        paragraph(link("Как снять размеры", "/a/"))
      )
    );
    expect(plain(parts.before)).toBe("Поэтому:");
    expect(parts.ordered).toBe(true);
    expect(parts.items.map(plain)).toEqual(["Размеры — после отделки.", "Зазоры"]);
    expect(plain(parts.after)).toBe("Как снять размеры");
  });

  it("returns the whole text as the lead without a list", () => {
    const parts = splitFirstList(state(paragraph(text("Текст"))));
    expect(parts.items).toEqual([]);
    expect(plain(parts.before)).toBe("Текст");
    expect(parts.after).toBeNull();
  });
});
