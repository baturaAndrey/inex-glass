import { scopedDbName } from "../fields/db-name";
import { linkField } from "../fields/link";
import { rel } from "../slugs";
import { sectionFields } from "./_section";
import type { Block } from "payload";

export const CardsBlock: Block = {
  slug: "cards",
  dbName: scopedDbName("blk_cards"),
  interfaceName: "CardsBlock",
  labels: { singular: "Карточки", plural: "Карточки" },
  fields: [
    ...sectionFields(),
    {
      name: "layout",
      type: "select",
      label: "Сетка",
      defaultValue: "g3",
      options: [
        { label: "3 в ряд (g3)", value: "g3" },
        { label: "4 в ряд (g4)", value: "g4" },
        { label: "Карточки каталога (ct-cards)", value: "ctCards" },
        { label: "Карточки толщин (p5-cards)", value: "p5Cards" },
        { label: "Сегменты (seg)", value: "seg" },
      ],
    },
    {
      name: "items",
      type: "array",
      label: "Карточки",
      labels: { singular: "Карточка", plural: "Карточки" },
      fields: [
        { name: "title", type: "text", label: "Заголовок", required: true },
        { name: "text", type: "textarea", label: "Текст" },
        linkField(),
        {
          type: "row",
          fields: [
            { name: "image", type: "upload", label: "Изображение", relationTo: rel("media") },
            { name: "icon", type: "text", label: "Иконка (Lucide)" },
            { name: "priceHint", type: "text", label: "Подсказка о цене" },
            {
              name: "tone",
              type: "select",
              label: "Тон",
              defaultValue: "default",
              options: [
                { label: "Обычная", value: "default" },
                { label: "Отрицательная", value: "negative" },
                { label: "Акцент", value: "accent" },
              ],
              admin: {
                description: "«Отрицательная» — плашка вида «физические шаблоны не принимаем».",
              },
            },
          ],
        },
      ],
    },
  ],
};
