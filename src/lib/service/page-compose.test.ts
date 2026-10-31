import { describe, expect, it } from "vitest";
import type { LayoutBlock } from "@/components/blocks/types";
import { paragraphs } from "@/seed/lexical";
import {
  isQuizUrl,
  listItemsOf,
  pickAll,
  pickFirst,
  pickNth,
  splitPayer,
  splitStepText,
  withExplicitBackgrounds,
} from "./page-compose";

const layout = [
  { blockType: "hero", variant: "p5Top" },
  { blockType: "table", heading: "A", table: {} },
  { blockType: "richText", content: paragraphs("x"), background: "auto" },
  { blockType: "table", heading: "B", table: {}, background: "dark" },
] as unknown as LayoutBlock[];

describe("pick*", () => {
  it("selects blocks by type and order", () => {
    expect(pickAll(layout, "table").map((block) => block.heading)).toEqual(["A", "B"]);
    expect(pickFirst(layout, "table")?.heading).toBe("A");
    expect(pickNth(layout, "table", 1)?.heading).toBe("B");
  });

  it("returns null for a missing block", () => {
    expect(pickFirst(layout, "steps")).toBeNull();
    expect(pickNth(layout, "table", 2)).toBeNull();
    expect(pickFirst(null, "hero")).toBeNull();
  });
});

describe("splitStepText", () => {
  it("cuts trailing markdown links off the text", () => {
    expect(
      splitStepText(
        "Доставка или самовывоз. [Упаковка](/a/) · [Документы](/kak-zakazat/dokumenty/)"
      )
    ).toEqual({
      text: "Доставка или самовывоз.",
      links: [
        { label: "Упаковка", url: "/a/" },
        { label: "Документы", url: "/kak-zakazat/dokumenty/" },
      ],
    });
  });

  it("keeps text without links and inline brackets as is", () => {
    expect(splitStepText("Стекло [в проёме] по чертежу.")).toEqual({
      text: "Стекло [в проёме] по чертежу.",
      links: [],
    });
    expect(splitStepText(null)).toEqual({ text: "", links: [] });
  });
});

describe("isQuizUrl", () => {
  it("recognizes the quiz page with or without a query", () => {
    expect(isQuizUrl("/raschet-stoimosti/")).toBe(true);
    expect(isQuizUrl("/raschet-stoimosti/?src=%2F")).toBe(true);
    expect(isQuizUrl("/raschet-stoimosti")).toBe(true);
    expect(isQuizUrl("/kak-zakazat/sroki/")).toBe(false);
    expect(isQuizUrl(undefined)).toBe(false);
  });
});

describe("splitPayer", () => {
  it("splits the payer badge off the cell", () => {
    expect(splitPayer("Завод — стекло переделывают за его счёт")).toEqual({
      payer: "factory",
      badge: "Завод",
      rest: " — стекло переделывают за его счёт",
    });
    expect(splitPayer("Заказчик")).toEqual({ payer: "customer", badge: "Заказчик", rest: "" });
  });

  it("does not treat a longer word as a payer", () => {
    expect(splitPayer("Заводы-партнёры")).toEqual({
      payer: null,
      badge: "",
      rest: "Заводы-партнёры",
    });
    expect(splitPayer("Перевозчик").payer).toBeNull();
  });
});

describe("listItemsOf", () => {
  it("reads paragraphs when there is no list", () => {
    expect(listItemsOf(paragraphs("Заказы от 50 м²", "", "Монтаж не выполняем"))).toEqual([
      "Заказы от 50 м²",
      "Монтаж не выполняем",
    ]);
  });

  it("reads list items", () => {
    const text = (value: string) => ({ type: "text", text: value });
    const state = {
      root: {
        type: "root",
        children: [
          {
            type: "list",
            children: [
              { type: "listitem", children: [text("Первый")] },
              { type: "listitem", children: [text("Второй")] },
            ],
          },
        ],
      },
    };
    expect(listItemsOf(state)).toEqual(["Первый", "Второй"]);
    expect(listItemsOf(null)).toEqual([]);
  });
});

describe("withExplicitBackgrounds", () => {
  it("freezes the bg ↔ sf rhythm and keeps explicit choices", () => {
    const result = withExplicitBackgrounds(layout).map((block) =>
      "background" in block ? block.background : "—"
    );
    expect(result).toEqual(["—", "sf", "bg", "dark"]);
  });
});
