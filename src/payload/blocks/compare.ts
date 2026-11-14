import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { linkField } from "../fields/link";
import type { Block } from "payload";

export const CompareBlock: Block = {
  slug: "compare",
  dbName: scopedDbName("blk_compare"),
  interfaceName: "CompareBlock",
  labels: { singular: "Сравнение", plural: "Сравнения" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        { name: "topicTitle", type: "text", label: "Заголовок столбца тем", defaultValue: "Этап" },
        {
          name: "leftTitle",
          type: "text",
          label: "Левый столбец",
          defaultValue: "Когда заказываете на заводе сами",
        },
        {
          name: "rightTitle",
          type: "text",
          label: "Правый столбец",
          defaultValue: "Когда через Inex Glass",
        },
      ],
    },
    {
      name: "rows",
      type: "array",
      label: "Строки",
      labels: { singular: "Строка", plural: "Строки" },
      minRows: 1,
      fields: [
        { name: "topic", type: "text", label: "Тема", required: true },
        {
          type: "row",
          fields: [
            { name: "left", type: "textarea", label: "Слева" },
            { name: "right", type: "textarea", label: "Справа" },
          ],
        },
      ],
    },
    linkField({ name: "footLink", label: "Ссылка под таблицей" }),
  ],
};
