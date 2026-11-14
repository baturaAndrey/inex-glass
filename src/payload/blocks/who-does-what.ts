import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block, Field, GroupField } from "payload";

/** Plain list of `{ text }` rows with a short, collection-scoped table name. */
export const textItemsField = (name: string, label: string, dbSuffix: string): Field => ({
  name,
  type: "array",
  label,
  dbName: scopedDbName(dbSuffix),
  labels: { singular: "Пункт", plural: "Пункты" },
  fields: [{ name: "text", type: "text", label: "Текст", required: true }],
});

/** "Нужен монтаж «под ключ»?" strip leading to inex.su (shared with `constructions`). */
export function inexSuStripField(name = "strip", label = "Полоса «Монтаж под ключ»"): GroupField {
  return {
    name,
    type: "group",
    label,
    fields: [
      { name: "enabled", type: "checkbox", label: "Показывать" },
      { name: "title", type: "text", label: "Заголовок" },
      { name: "text", type: "textarea", label: "Текст" },
      {
        type: "row",
        fields: [
          { name: "buttonLabel", type: "text", label: "Текст кнопки" },
          { name: "url", type: "text", label: "Адрес", defaultValue: "https://inex.su" },
        ],
      },
    ],
  };
}

/** Who does what: Inex Glass supplies glass, the client's crew installs it. */
export const WhoDoesWhatBlock: Block = {
  slug: "whoDoesWhat",
  dbName: scopedDbName("blk_wdw"),
  interfaceName: "WhoDoesWhatBlock",
  labels: { singular: "Кто что делает", plural: "Кто что делает" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        { name: "leftTitle", type: "text", label: "Левая колонка", defaultValue: "Inex Glass" },
        { name: "rightTitle", type: "text", label: "Правая колонка", defaultValue: "Ваша бригада" },
      ],
    },
    textItemsField("leftItems", "Пункты слева", "left"),
    textItemsField("rightItems", "Пункты справа", "right"),
    inexSuStripField(),
  ],
};
