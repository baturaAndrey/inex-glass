import { richTextEditor } from "../editor";
import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block, GroupField } from "payload";

const column = (name: string, label: string): GroupField => ({
  name,
  type: "group",
  label,
  fields: [
    { name: "heading", type: "text", label: "Заголовок" },
    { name: "body", type: "richText", label: "Текст", editor: richTextEditor },
  ],
});

export const TwoColumnsBlock: Block = {
  slug: "twoColumns",
  dbName: scopedDbName("blk_two_cols"),
  interfaceName: "TwoColumnsBlock",
  labels: { singular: "Две колонки", plural: "Две колонки" },
  fields: [...sectionFields(), column("left", "Левая колонка"), column("right", "Правая колонка")],
};
