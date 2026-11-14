import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SEED_PRICES_2026_10_15, type PlaceholderContext } from "@/lib/domain";
import { FaqBlock, faqBlockItems, faqJsonLdIndex } from "./faq-block";
import type { BlockOf } from "./types";

// The JSON-LD module reads CMS globals (contacts) for other schemas; keep Payload out of the test.
vi.mock("@/lib/cms/globals", () => ({
  getContacts: vi.fn(),
  primaryEmail: vi.fn(),
  primaryPhone: vi.fn(),
}));

const ctx: PlaceholderContext = {
  prices: SEED_PRICES_2026_10_15,
  promo: null,
  now: new Date("2026-10-20T09:00:00Z"),
  conditions: "",
  contacts: "",
  requisites: "",
  phone: "+7 (351) 247-05-57",
};

const answer = (value: string) => ({
  root: {
    type: "root",
    version: 1,
    direction: "ltr" as const,
    format: "" as const,
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: "ltr",
        format: "",
        indent: 0,
        children: [
          {
            type: "text",
            version: 1,
            text: value,
            format: 0,
            detail: 0,
            mode: "normal",
            style: "",
          },
        ],
      },
    ],
  },
});

const faqBlock = (id: string, questions: string[]): BlockOf<"faq"> => ({
  blockType: "faq",
  id,
  mode: "inline",
  heading: `FAQ ${id}`,
  items: questions.map((question) => ({ question, answer: answer(`Ответ: ${question}`) })),
});

const ldScripts = (container: HTMLElement) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')].map(
    (script) => JSON.parse(script.textContent ?? "") as { "@type": string; mainEntity: unknown[] }
  );

describe("FaqBlock JSON-LD", () => {
  it("emits FAQPage when rendered on its own", () => {
    const { container } = render(
      <FaqBlock
        block={faqBlock("a", ["Сроки?"])}
        ctx={ctx}
        section={{ index: 0, variant: "bg", headingId: "h-a" }}
      />
    );
    const [ld] = ldScripts(container);
    expect(ld?.["@type"]).toBe("FAQPage");
  });

  it("skips JSON-LD when the page already has one (faqJsonLd: false)", () => {
    const { container } = render(
      <FaqBlock
        block={faqBlock("a", ["Сроки?"])}
        ctx={ctx}
        section={{ index: 0, variant: "bg", headingId: "h-a", faqJsonLd: false }}
      />
    );
    expect(ldScripts(container)).toHaveLength(0);
    expect(container.textContent).toContain("Сроки?");
  });

  it("emits a single FAQPage for several FAQ blocks (RenderBlocks wiring)", () => {
    const blocks = [
      { blockType: "hero" },
      // Empty FAQ block renders nothing, so the next one carries the JSON-LD.
      faqBlock("empty", ["  "]),
      faqBlock("first", ["Сроки?", "Доставка?"]),
      faqBlock("second", ["Гарантия?"]),
    ];
    const ldIndex = faqJsonLdIndex(blocks, undefined);
    expect(ldIndex).toBe(2);
    // Same props RenderBlocks passes: `faqJsonLd` is true only for the selected block.
    const { container } = render(
      <>
        {blocks.slice(1).map((block, offset) => (
          <FaqBlock
            key={offset}
            block={block as BlockOf<"faq">}
            ctx={ctx}
            section={{
              index: offset + 1,
              variant: "bg",
              headingId: `h-${offset}`,
              faqJsonLd: offset + 1 === ldIndex,
            }}
          />
        ))}
      </>
    );
    const lds = ldScripts(container);
    expect(lds).toHaveLength(1);
    expect(lds[0]?.["@type"]).toBe("FAQPage");
    expect(lds[0]?.mainEntity).toHaveLength(2);
    // Both accordions are still rendered.
    expect(container.textContent).toContain("Гарантия?");
  });

  it("faqBlockItems reads the document FAQ in `doc` mode and skips blank questions", () => {
    const block: BlockOf<"faq"> = { blockType: "faq", mode: "doc" };
    const faq = [
      { question: "Сроки?", answer: answer("3 дня") },
      { question: " ", answer: answer("—") },
    ];
    expect(faqBlockItems(block, { faq })).toHaveLength(1);
    expect(faqBlockItems(block, undefined)).toHaveLength(0);
    expect(faqJsonLdIndex([block], undefined)).toBe(-1);
    expect(faqJsonLdIndex([block], { faq })).toBe(0);
  });
});
