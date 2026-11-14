import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { tableFields } from "../fields/tables";
import type { Block } from "payload";

export const TableBlock: Block = {
  slug: "table",
  dbName: scopedDbName("blk_table"),
  interfaceName: "TableBlock",
  labels: { singular: "Таблица", plural: "Таблицы" },
  fields: [
    ...sectionFields(),
    {
      name: "table",
      type: "group",
      label: "Таблица",
      fields: [
        { name: "caption", type: "text", label: "Подпись таблицы" },
        ...tableFields(),
        {
          name: "highlightColumn",
          type: "number",
          label: "Выделенный столбец",
          min: 1,
          admin: { description: "Номер столбца (с 1), который подсвечивается." },
        },
      ],
    },
  ],
};
