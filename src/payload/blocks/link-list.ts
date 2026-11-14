import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { linkField } from "../fields/link";
import type { Block } from "payload";

export const LinkListBlock: Block = {
  slug: "linkList",
  dbName: scopedDbName("blk_links"),
  interfaceName: "LinkListBlock",
  labels: { singular: "Список ссылок", plural: "Списки ссылок" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "variant",
          type: "select",
          label: "Вид",
          defaultValue: "chips",
          options: [
            { label: "Чипсы", value: "chips" },
            { label: "Мост к разделам", value: "bridge" },
            { label: "Кнопки", value: "buttons" },
          ],
        },
        {
          name: "label",
          type: "text",
          label: "Подпись",
          admin: { description: "Напр. «Рядом:»." },
        },
      ],
    },
    {
      name: "items",
      type: "array",
      label: "Ссылки",
      labels: { singular: "Ссылка", plural: "Ссылки" },
      fields: [linkField(), { name: "description", type: "textarea", label: "Описание" }],
    },
  ],
};
