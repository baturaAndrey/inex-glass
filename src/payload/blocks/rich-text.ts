import { richTextEditor } from "../editor";
import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

export const RichTextBlock: Block = {
  slug: "richText",
  dbName: scopedDbName("blk_text"),
  interfaceName: "RichTextBlock",
  labels: { singular: "Текст", plural: "Тексты" },
  fields: [
    ...sectionFields(),
    {
      name: "content",
      type: "richText",
      label: "Текст",
      required: true,
      editor: richTextEditor,
    },
    {
      name: "width",
      type: "select",
      label: "Ширина",
      defaultValue: "normal",
      options: [
        { label: "Узкая", value: "narrow" },
        { label: "Обычная", value: "normal" },
        { label: "Широкая", value: "wide" },
      ],
    },
  ],
};
