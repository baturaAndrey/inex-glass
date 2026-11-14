import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

export const StatsBlock: Block = {
  slug: "stats",
  dbName: scopedDbName("blk_stats"),
  interfaceName: "StatsBlock",
  labels: { singular: "Цифры", plural: "Цифры" },
  fields: [
    ...sectionFields(),
    {
      name: "variant",
      type: "select",
      label: "Вид",
      defaultValue: "tiles",
      options: [
        { label: "Стеклянные плитки", value: "glass" },
        { label: "Плитки", value: "tiles" },
        { label: "Простой", value: "plain" },
      ],
    },
    {
      name: "items",
      type: "array",
      label: "Показатели",
      labels: { singular: "Показатель", plural: "Показатели" },
      minRows: 1,
      fields: [
        {
          type: "row",
          fields: [
            { name: "value", type: "text", label: "Значение", required: true },
            { name: "text", type: "text", label: "Подпись" },
          ],
        },
      ],
    },
  ],
};
