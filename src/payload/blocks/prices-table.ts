import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

/** Price table rendered from the `prices` global (45-day rule applies at render time). */
export const PricesTableBlock: Block = {
  slug: "pricesTable",
  dbName: scopedDbName("blk_prices"),
  interfaceName: "PricesTableBlock",
  labels: { singular: "Таблица цен", plural: "Таблицы цен" },
  fields: [
    ...sectionFields({ anchorDefault: "ceny" }),
    {
      name: "variant",
      type: "select",
      label: "Вид",
      defaultValue: "both",
      options: [
        { label: "Таблица", value: "table" },
        { label: "Карточки", value: "cards" },
        { label: "Таблица и карточки", value: "both" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "showIncluded", type: "checkbox", label: "Что входит в цену", defaultValue: true },
        { name: "showCaption", type: "checkbox", label: "Подпись (дата цен)", defaultValue: true },
        { name: "showPromo", type: "checkbox", label: "Подпись акции" },
        { name: "showWeight", type: "checkbox", label: "Вес 1 м²", defaultValue: true },
        {
          name: "calloutFromConditions",
          type: "checkbox",
          label: "Плашка из «Условий»",
        },
      ],
    },
  ],
};
