import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Accordion } from "./accordion";
import { Faq } from "./faq";

const ITEMS = [
  { id: "a", title: "Первый", content: <p>Ответ А</p> },
  { id: "b", title: "Второй", content: <p>Ответ Б</p> },
  { id: "c", title: "Третий", content: <p>Ответ В</p> },
];

function panelOf(button: HTMLElement): HTMLElement {
  const id = button.getAttribute("aria-controls");
  const panel = id ? document.getElementById(id) : null;
  if (!panel) throw new Error("panel not found");
  return panel;
}

function getButtons(): [HTMLElement, HTMLElement, HTMLElement] {
  const [first, second, third] = screen.getAllByRole("button");
  if (!first || !second || !third) throw new Error("buttons missing");
  return [first, second, third];
}

describe("Accordion", () => {
  it("wires buttons and regions with ARIA and keeps closed panels in the DOM", () => {
    render(<Accordion items={ITEMS} defaultOpen={["a"]} />);
    const [first, second] = getButtons();

    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "false");
    expect(panelOf(first)).toHaveAttribute("role", "region");
    expect(panelOf(first)).toHaveAttribute("aria-labelledby", first.id);
    expect(panelOf(first)).not.toHaveAttribute("inert");
    // Closed panel: inert, but its content is still rendered (indexable).
    expect(panelOf(second)).toHaveAttribute("inert");
    expect(panelOf(second)).toHaveTextContent("Ответ Б");
    // Triggers sit inside headings (WAI-ARIA accordion pattern).
    expect(first.closest("h3")).not.toBeNull();
  });

  it("drops the region landmark from panels of long lists (> 6 items)", () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      id: `q${index}`,
      title: `Вопрос ${index}`,
      content: <p>Ответ {index}</p>,
    }));
    render(<Accordion items={many} />);
    const [first] = screen.getAllByRole("button");
    if (!first) throw new Error("button missing");
    expect(panelOf(first)).not.toHaveAttribute("role");
    expect(panelOf(first)).toHaveAttribute("aria-labelledby", first.id);
    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });

  it("type=single keeps one item open; clicking the open one closes it", async () => {
    const user = userEvent.setup();
    render(<Accordion items={ITEMS} defaultOpen={["a", "b"]} />);
    const [first, second] = getButtons();

    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "false");

    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(second).toHaveAttribute("aria-expanded", "true");

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
  });

  it("type=multiple toggles items independently", async () => {
    const user = userEvent.setup();
    render(<Accordion type="multiple" items={ITEMS} />);
    const [first, second] = getButtons();

    await user.click(first);
    await user.click(second);
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });

  it("supports Enter / Space and ArrowUp / ArrowDown / Home / End", async () => {
    const user = userEvent.setup();
    render(<Accordion items={ITEMS} />);
    const [first, second, third] = getButtons();

    first.focus();
    await user.keyboard("{Enter}");
    expect(first).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    await user.keyboard(" ");
    expect(second).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(first).toHaveFocus(); // wraps around
    await user.keyboard("{ArrowUp}");
    expect(third).toHaveFocus();
    await user.keyboard("{Home}");
    expect(first).toHaveFocus();
    await user.keyboard("{End}");
    expect(third).toHaveFocus();
  });
});

describe("Faq", () => {
  it("renders questions as headings with all answers in the DOM", () => {
    render(
      <Faq
        items={[
          { question: "Вопрос 1?", answer: "Ответ 1" },
          { question: "Вопрос 2?", answer: "Ответ 2" },
        ]}
      />
    );
    expect(screen.getByRole("heading", { level: 3, name: "Вопрос 1?" })).toBeInTheDocument();
    expect(screen.getByText("Ответ 1")).toBeInTheDocument();
    expect(screen.getByText("Ответ 2")).toBeInTheDocument();
  });
});
