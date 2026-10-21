import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";

const COLUMNS = [
  { key: "name", label: "Название" },
  { key: "value", label: "Значение" },
];

/** Rich-text cells render their own paragraphs (`RichText` → `<p>`). */
const ROWS = [
  { name: <p>Закалённое стекло</p>, value: <p>от 2 900 ₽</p> },
  { name: "Триплекс", value: "от 4 100 ₽" },
];

describe("DataTable", () => {
  it("never nests a <p> inside a <p> when cells hold rich text (hydration #418)", () => {
    // The server markup is what the browser parses: `<p><p>` would be split by the HTML parser
    // and the client tree would no longer match it.
    const html = renderToStaticMarkup(<DataTable columns={COLUMNS} rows={ROWS} />);
    const container = document.createElement("div");
    container.innerHTML = html;

    expect(container.querySelectorAll("p p")).toHaveLength(0);
    expect(html).not.toMatch(/<p[^>]*>\s*<p/);
  });

  it("renders the mobile card title as a block wrapper with the title content", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={COLUMNS} rows={ROWS} rowHref={() => "/zakalennoe-steklo/"} />
    );
    const container = document.createElement("div");
    container.innerHTML = html;

    const cards = container.querySelectorAll(".ig-mcard");
    expect(cards).toHaveLength(2);
    const title = cards[0]?.firstElementChild;
    expect(title?.tagName).toBe("DIV");
    expect(title?.querySelector("a")?.getAttribute("href")).toMatch(/^\/zakalennoe-steklo\/?$/);
    expect(title?.textContent).toBe("Закалённое стекло");
    expect(cards[1]?.firstElementChild?.textContent).toBe("Триплекс");
  });

  describe("blank header labels", () => {
    // Seed tables mark «no header» with no-break spaces (e.g. «Отверстия — главный узел»).
    const NBSP = String.fromCharCode(0xa0);
    const BLANK: DataTableColumn[] = [
      { key: "name", label: NBSP },
      { key: "value", label: ` ${NBSP} `, width: "40%" },
    ];

    function render(columns: DataTableColumn[], mobile?: "cards" | "scroll") {
      const container = document.createElement("div");
      container.innerHTML = renderToStaticMarkup(
        <DataTable columns={columns} rows={ROWS} {...(mobile ? { mobile } : {})} />
      );
      return container;
    }

    it("drops the empty header band and keeps column widths in a colgroup", () => {
      const container = render(BLANK);
      expect(container.querySelector("thead")).toBeNull();
      expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
      const cols = container.querySelectorAll("colgroup col");
      expect(cols).toHaveLength(2);
      expect(cols[1]?.getAttribute("style")).toContain("width:40%");
    });

    it("scrolls horizontally on phones instead of rendering label-less cards", () => {
      const container = render(BLANK, "cards");
      expect(container.querySelector(".ig-mcard")).toBeNull();
      const wrap = container.querySelector(".ig-table-wrap");
      expect(wrap?.className).not.toContain("max-sm:hidden");
      expect(container.querySelector("table")?.className).toContain("max-sm:w-max");
    });

    it("keeps the header when at least one label is visible", () => {
      const container = render([
        { key: "name", label: NBSP },
        { key: "value", label: "Цена" },
      ]);
      expect(container.querySelectorAll("thead th")).toHaveLength(2);
      expect(container.querySelector("colgroup")).toBeNull();
      expect(container.querySelectorAll(".ig-mcard")).toHaveLength(2);
    });
  });
});
