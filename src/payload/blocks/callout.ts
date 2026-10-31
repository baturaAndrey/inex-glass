import { richTextEditor } from "../editor";
import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

export const CalloutBlock: Block = {
  slug: "callout",
  dbName: scopedDbName("blk_callout"),
  interfaceName: "CalloutBlock",
  labels: { singular: "Плашка-предупреждение", plural: "Плашки-предупреждения" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "tone",
          type: "select",
          label: "Тон",
          defaultValue: "warning",
          options: [
            { label: "Предупреждение", value: "warning" },
            { label: "Информация", value: "info" },
          ],
        },
        {
          name: "icon",
          type: "text",
          label: "Иконка",
          admin: { description: "Имя иконки Lucide." },
        },
      ],
    },
    { name: "title", type: "text", label: "Заголовок плашки" },
    { name: "body", type: "richText", label: "Текст", editor: richTextEditor },
    {
      name: "items",
      type: "array",
      label: "Пункты",
      labels: { singular: "Пункт", plural: "Пункты" },
      admin: { description: "Маркированный список, напр. «Что важно знать до заказа»." },
      fields: [
        { name: "lead", type: "text", label: "Начало (жирным)" },
        { name: "text", type: "richText", label: "Текст", editor: richTextEditor },
      ],
    },
  ],
};
