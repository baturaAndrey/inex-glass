import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

/** Staff grid from the `team` collection (hidden members excluded). */
export const TeamGridBlock: Block = {
  slug: "teamGrid",
  dbName: scopedDbName("blk_team"),
  interfaceName: "TeamGridBlock",
  labels: { singular: "Сотрудники", plural: "Сотрудники" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "limit",
          type: "number",
          label: "Сколько показать",
          min: 1,
          admin: { description: "Пусто — все." },
        },
        {
          name: "emptyBehavior",
          type: "select",
          label: "Если сотрудников нет",
          defaultValue: "hide",
          options: [
            { label: "Скрыть блок", value: "hide" },
            { label: "Показать сообщение", value: "message" },
          ],
        },
      ],
    },
  ],
};
