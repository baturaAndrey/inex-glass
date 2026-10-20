import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

/** Terms bar: by default taken from the `conditions.termsBar` global. */
export const TermsBlock: Block = {
  slug: "terms",
  dbName: scopedDbName("blk_terms"),
  interfaceName: "TermsBlock",
  labels: { singular: "Условия", plural: "Условия" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "mode",
          type: "select",
          label: "Источник",
          defaultValue: "global",
          options: [
            { label: "Справочник «Условия»", value: "global" },
            { label: "Справочник «Условия» (кратко)", value: "globalShort" },
            { label: "Свои пункты", value: "custom" },
          ],
        },
        {
          name: "variant",
          type: "select",
          label: "Вид",
          defaultValue: "bar",
          options: [
            { label: "Полоса", value: "bar" },
            { label: "Простой список", value: "plain" },
          ],
        },
      ],
    },
    {
      name: "items",
      type: "array",
      label: "Пункты",
      labels: { singular: "Пункт", plural: "Пункты" },
      admin: { condition: (_, sibling) => sibling?.mode === "custom" },
      fields: [
        {
          type: "row",
          fields: [
            { name: "text", type: "text", label: "Текст", required: true },
            { name: "icon", type: "text", label: "Иконка (Lucide)" },
          ],
        },
      ],
    },
  ],
};
