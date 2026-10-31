import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

/** Company requisites from the `requisites` global. */
export const RequisitesBlock: Block = {
  slug: "requisites",
  dbName: scopedDbName("blk_requisites"),
  interfaceName: "RequisitesBlock",
  labels: { singular: "Реквизиты", plural: "Реквизиты" },
  fields: [
    ...sectionFields({ anchorDefault: "rekvizity" }),
    {
      name: "showDownload",
      type: "checkbox",
      label: "Кнопка «Скачать реквизиты»",
      defaultValue: true,
    },
  ],
};
