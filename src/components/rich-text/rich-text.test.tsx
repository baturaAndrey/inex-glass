import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEED_PRICES_2026_10_15, type PlaceholderContext } from "@/lib/domain";
import {
  RichText,
  safeExternalHref,
  serializePlaceholderContext,
  type RichTextData,
} from "./rich-text";

const NBSP = " ";

const ctx: PlaceholderContext = {
  prices: SEED_PRICES_2026_10_15,
  promo: null,
  now: new Date("2026-10-20T09:00:00Z"),
  conditions: "Заказы от 50 м²",
  contacts: "",
  requisites: "",
  phone: "+7 (351) 247-05-57",
};

const text = (value: string, format = 0) => ({
  type: "text",
  version: 1,
  text: value,
  format,
  detail: 0,
  mode: "normal",
  style: "",
});

const element = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  version: 1,
  children,
  direction: "ltr",
  format: "",
  indent: 0,
  ...extra,
});

const doc = (...children: unknown[]): RichTextData => ({ root: element("root", children) });

describe("RichText", () => {
  it("substitutes placeholders inside Lexical text nodes and keeps unknown ones", () => {
    const { container } = render(
      <RichText
        ctx={ctx}
        data={doc(
          element("paragraph", [
            text("Цена от {цена_10мм} ₽/м² на {дата_цен}. "),
            text("Звоните: {телефон}", 1),
            text(" {виды}"),
          ])
        )}
      />
    );
    const content = container.textContent ?? "";
    expect(content).toContain(`1${NBSP}400`);
    expect(content).toContain("15.10.2026");
    expect(content).toContain("{виды}");
    // Formatting survives substitution.
    expect(container.querySelector("strong")?.textContent).toBe("Звоните: +7 (351) 247-05-57");
  });

  it("leaves placeholders untouched without a context", () => {
    const { container } = render(
      <RichText data={doc(element("paragraph", [text("{цена_10мм}")]))} />
    );
    expect(container.textContent).toBe("{цена_10мм}");
  });

  it("maps headings, lists and links to the design system", () => {
    const { container } = render(
      <RichText
        ctx={ctx}
        data={doc(
          element("heading", [text("Раздел")], { tag: "h2" }),
          element("heading", [text("Лишний h1")], { tag: "h1" }),
          element("list", [element("listitem", [text("Пункт")], { value: 1 })], {
            tag: "ul",
            listType: "bullet",
            start: 1,
          }),
          element("paragraph", [
            element("link", [text("толщина")], {
              fields: {
                linkType: "internal",
                newTab: false,
                doc: { relationTo: "thicknesses", value: { id: "t10", n: 10 } },
              },
            }),
            element("link", [text("inex.su")], {
              fields: { linkType: "custom", newTab: true, url: "https://inex.su/" },
            }),
            element("link", [text("черновик")], {
              fields: {
                linkType: "internal",
                newTab: false,
                doc: { relationTo: "articles", value: "id-only" },
              },
            }),
          ])
        )}
      />
    );
    expect(container.querySelector("h2.ig-h2")?.textContent).toBe("Раздел");
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("ul li")?.textContent).toBe("Пункт");

    // next/link drops the trailing slash outside Next (trailingSlash config).
    const internal = container.querySelector('a[href^="/zakalennoe-steklo/10-mm"]');
    expect(internal?.textContent).toBe("толщина");
    const external = container.querySelector('a[href="https://inex.su/"]');
    expect(external).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(external).toHaveAttribute("target", "_blank");
    // Unresolvable internal link: text stays, anchor is dropped.
    expect(container.textContent).toContain("черновик");
    expect(container.querySelectorAll("a")).toHaveLength(2);
  });

  it("renders custom links with a disallowed scheme as plain text", () => {
    const custom = (label: string, url: string) =>
      element("link", [text(label)], { fields: { linkType: "custom", newTab: false, url } });
    const { container } = render(
      <RichText
        data={doc(
          element("paragraph", [
            custom("js", "javascript:alert(1)"),
            custom("js-tab", "java\tscript:alert(1)"),
            custom("data", "data:text/html,<script>alert(1)</script>"),
            custom("mail", "mailto:info@inex.su"),
            custom("phone", "tel:+73512470557"),
            custom("anchor", "#price"),
          ])
        )}
      />
    );
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["mailto:info@inex.su", "tel:+73512470557", "#price"]);
    expect(container.innerHTML).not.toMatch(/javascript|data:/i);
    expect(container.textContent).toContain("jsjs-tabdata");
  });

  it.each([
    ["https://inex.su/", "https://inex.su/"],
    ["HTTP://inex.su", "HTTP://inex.su"],
    ["mailto:info@inex.su", "mailto:info@inex.su"],
    ["tel:+7351", "tel:+7351"],
    ["/kontakty/", "/kontakty/"],
    ["#faq", "#faq"],
    ["javascript:alert(1)", null],
    [" JavaScript:alert(1)", null],
    ["java\nscript:alert(1)", null],
    ["data:text/html;base64,PHNjcmlwdD4=", null],
    ["vbscript:msgbox(1)", null],
    ["//evil.example/", null],
    ["/\\evil.example/", null],
    // Browsers drop tab / newline inside URLs: these become `//evil.example/`.
    ["/\t/evil.example/", null],
    ["/\n/evil.example/", null],
    ["/\r\\evil.example/", null],
    ["/ \u0000/evil.example/", null],
    ["/kontakty/\t", "/kontakty/"],
    ["ftp://inex.su/", null],
    ["inex.su", null],
    ["", null],
    [null, null],
  ])("safeExternalHref(%j) → %j", (input, expected) => {
    expect(safeExternalHref(input)).toBe(expected);
  });

  describe("tables", () => {
    /** Lexical table cell: `headerState` 1 = row header (Lexical `TableCellHeaderStates.ROW`). */
    const cell = (children: unknown[], headerState = 0) =>
      element("tablecell", [element("paragraph", children)], {
        headerState,
        colSpan: 1,
        backgroundColor: null,
      });
    const row = (...cells: unknown[]) => element("tablerow", cells);
    const table = (...rows: unknown[]) => element("table", rows, { colWidths: [120, 120] });

    it("renders a header row as <thead>, cells as rich text, and phone cards", () => {
      const { container } = render(
        <RichText
          ctx={ctx}
          data={doc(
            table(
              row(cell([text("Сегмент")], 1), cell([text("Цена")], 1)),
              row(
                cell([text("Дизайнеры", 1)]),
                cell([
                  text("от {цена_10мм} ₽ "),
                  element("link", [text("подробнее")], {
                    fields: { linkType: "custom", newTab: false, url: "/klientam/" },
                  }),
                ])
              )
            )
          )}
        />
      );

      const wrap = container.querySelector(".ig-table-wrap");
      expect(wrap?.querySelector("table.ig-table")).not.toBeNull();
      const headers = [...container.querySelectorAll("thead th")];
      expect(headers.map((th) => th.textContent)).toEqual(["Сегмент", "Цена"]);
      headers.forEach((th) => expect(th).toHaveAttribute("scope", "col"));
      // The header row is not repeated in the body.
      const bodyRows = container.querySelectorAll("tbody tr");
      expect(bodyRows).toHaveLength(1);

      const cells = bodyRows[0]!.querySelectorAll("td");
      expect(cells[0]?.querySelector("strong")?.textContent).toBe("Дизайнеры");
      expect(cells[1]?.textContent).toContain(`1${NBSP}400`);
      expect(cells[1]?.querySelector('a[href^="/klientam"]')?.textContent).toBe("подробнее");
      // No Payload default inline styles (borders, padding) on the table.
      expect(container.querySelectorAll("table [style]")).toHaveLength(0);

      // Phone view: one `.ig-mcard` per body row with «label — value» lines.
      const cards = container.querySelectorAll("li.ig-mcard");
      expect(cards).toHaveLength(1);
      expect(cards[0]?.textContent).toContain("Дизайнеры");
      expect(cards[0]?.querySelector("dt")?.textContent).toBe("Цена");
    });

    it("keeps a table without a header row in the body and scrolls it on phones", () => {
      const { container } = render(
        <RichText
          ctx={ctx}
          data={doc(table(row(cell([text("А")]), cell([text("Б")])), row(cell([text("В")]))))}
        />
      );
      expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
      // DataTable always has a <thead>; without labels it is hidden.
      expect(container.querySelector('[class*="[&_thead]:hidden"] thead')).not.toBeNull();
      expect(container.querySelector(".ig-mcard")).toBeNull();
      // A short row is padded to the table width.
      expect(container.querySelectorAll("tbody tr")[1]?.querySelectorAll("td")).toHaveLength(2);
    });
  });

  it("renders nothing for an empty value", () => {
    const { container } = render(<RichText data={null} ctx={ctx} />);
    expect(container.innerHTML).toBe("");
  });

  it("serializes the context with ISO dates", () => {
    const serialized = serializePlaceholderContext(ctx);
    expect(serialized.now).toBe("2026-10-20T09:00:00.000Z");
    expect(serialized.prices.priceDate).toBe("2026-10-15");
  });
});
