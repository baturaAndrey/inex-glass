import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { faqField } from "../fields/faq";
import type { Block } from "payload";

export const FaqBlock: Block = {
  slug: "faq",
  dbName: scopedDbName("blk_faq"),
  interfaceName: "FaqBlock",
  labels: { singular: "Частые вопросы", plural: "Частые вопросы" },
  fields: [
    ...sectionFields(),
    {
      name: "mode",
      type: "select",
      label: "Источник",
      defaultValue: "doc",
      options: [
        { label: "Вопросы документа (поле «Частые вопросы»)", value: "doc" },
        { label: "Свои вопросы", value: "inline" },
      ],
    },
    {
      ...faqField({ name: "items", label: "Вопросы" }),
      admin: { initCollapsed: true, condition: (_, sibling) => sibling?.mode === "inline" },
    },
  ],
};
