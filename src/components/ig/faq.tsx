import type { ReactNode } from "react";
import { Accordion, type AccordionProps } from "./accordion";

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

export interface FaqProps {
  items: FaqItem[];
  /** Level of the question headings (3 by default: FAQ sits under a section `<h2>`). */
  headingLevel?: AccordionProps["headingLevel"];
  className?: string | undefined;
}

/**
 * FAQ block: questions as accordion headers, all answers in the HTML.
 * FAQPage JSON-LD is rendered by the page framework (task-15), not here.
 */
export function Faq({ items, headingLevel, className }: FaqProps) {
  return (
    <Accordion
      type="multiple"
      items={items.map((item, index) => ({
        id: `faq-${index}`,
        title: item.question,
        content: item.answer,
      }))}
      {...(headingLevel ? { headingLevel } : {})}
      className={className}
    />
  );
}
