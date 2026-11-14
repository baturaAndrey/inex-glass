import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

export const WeightCalculatorBlock: Block = {
  slug: "weightCalculator",
  dbName: scopedDbName("blk_weight"),
  interfaceName: "WeightCalculatorBlock",
  labels: { singular: "Калькулятор веса", plural: "Калькуляторы веса" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "defaultMode",
          type: "select",
          label: "Режим по умолчанию",
          defaultValue: "single",
          options: [
            { label: "Одинарное стекло", value: "single" },
            { label: "Триплекс", value: "triplex" },
          ],
        },
        { name: "showTable", type: "checkbox", label: "Таблица веса", defaultValue: true },
        { name: "showFormula", type: "checkbox", label: "Формула", defaultValue: true },
      ],
    },
  ],
};
