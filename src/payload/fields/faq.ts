import { richTextEditor } from "../editor";
import type { ArrayField } from "payload";

type FaqFieldOptions = {
  name?: string;
  label?: string;
};

/**
 * FAQ list. The plain text of each answer (`lexicalToPlainText`) feeds the `FAQPage` JSON-LD.
 */
export function faqField(opts: FaqFieldOptions = {}): ArrayField {
  const { name = "faq", label = "Частые вопросы" } = opts;
  return {
    name,
    type: "array",
    label,
    labels: { singular: "Вопрос", plural: "Вопросы" },
    admin: { initCollapsed: true },
    fields: [
      { name: "question", type: "text", label: "Вопрос", required: true },
      { name: "answer", type: "richText", label: "Ответ", required: true, editor: richTextEditor },
    ],
  };
}
