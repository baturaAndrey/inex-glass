import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { THICKNESS_OPTIONS } from "../fields/quiz-prefill";
import type { Block } from "payload";

/** Hole calculator (GOST 30698-2014); logic lives in the domain library (task 11/25). */
export const HolesCalculatorBlock: Block = {
  slug: "holesCalculator",
  dbName: scopedDbName("blk_holes"),
  interfaceName: "HolesCalculatorBlock",
  labels: { singular: "Калькулятор отверстий", plural: "Калькуляторы отверстий" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "defaultThickness",
          type: "select",
          label: "Толщина по умолчанию",
          defaultValue: "10",
          options: THICKNESS_OPTIONS,
        },
        { name: "showScheme", type: "checkbox", label: "Показывать схему", defaultValue: true },
      ],
    },
    { name: "note", type: "textarea", label: "Примечание" },
    { name: "ctaLabel", type: "text", label: "Текст кнопки" },
  ],
};
