import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable } from "./data-table";

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
});
