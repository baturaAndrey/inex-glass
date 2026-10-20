import { ctaFields } from "./_cta";
import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import { linkField } from "../fields/link";
import type { Block } from "payload";

const MIN_STEPS = 2;

export const StepsBlock: Block = {
  slug: "steps",
  dbName: scopedDbName("blk_steps"),
  interfaceName: "StepsBlock",
  labels: { singular: "Шаги", plural: "Шаги" },
  fields: [
    ...sectionFields(),
    {
      name: "variant",
      type: "select",
      label: "Расположение",
      defaultValue: "horizontal",
      options: [
        { label: "Горизонтально", value: "horizontal" },
        { label: "Вертикально", value: "vertical" },
      ],
    },
    {
      name: "items",
      type: "array",
      label: "Шаги",
      labels: { singular: "Шаг", plural: "Шаги" },
      minRows: MIN_STEPS,
      fields: [
        { name: "title", type: "text", label: "Заголовок", required: true },
        { name: "text", type: "textarea", label: "Текст" },
        { name: "linkLabel", type: "text", label: "Текст ссылки" },
        linkField({ withLabel: false }),
      ],
    },
    { name: "footnote", type: "text", label: "Сноска" },
    ctaFields(),
  ],
};
