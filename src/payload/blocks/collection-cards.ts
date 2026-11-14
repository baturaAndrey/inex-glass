import { scopedDbName } from "../fields/db-name";
import { rel } from "../slugs";
import { sectionFields } from "./_section";
import { CARD_MAX_DEPTH } from "../fields/populate";
import type { Block } from "payload";

/** Construction groups (same values as `constructions.group`). */
export const CONSTRUCTION_GROUP_OPTIONS = [
  { label: "Конструкции", value: "constructions" },
  { label: "Остекление", value: "glazing" },
  { label: "Зеркала", value: "mirrors" },
  { label: "Фурнитура", value: "hardware" },
] as const;

/** Cards generated from a collection (hubs, "Читать также"). */
export const CollectionCardsBlock: Block = {
  slug: "collectionCards",
  dbName: scopedDbName("blk_coll_cards"),
  interfaceName: "CollectionCardsBlock",
  labels: { singular: "Карточки из каталога", plural: "Карточки из каталога" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "source",
          type: "select",
          label: "Источник",
          required: true,
          defaultValue: "glassTypes",
          options: [
            { label: "Виды стекла", value: "glassTypes" },
            { label: "Обработка", value: "processingServices" },
            { label: "Конструкции", value: "constructions" },
            { label: "Толщины", value: "thicknesses" },
            { label: "Статьи", value: "articles" },
          ],
        },
        {
          name: "mode",
          type: "select",
          label: "Отбор",
          defaultValue: "all",
          options: [
            { label: "Все", value: "all" },
            { label: "Вручную", value: "manual" },
            { label: "Группа конструкций", value: "group" },
          ],
        },
        {
          name: "group",
          type: "select",
          label: "Группа",
          options: [...CONSTRUCTION_GROUP_OPTIONS],
          admin: {
            condition: (_, sibling) =>
              sibling?.source === "constructions" && sibling?.mode === "group",
          },
        },
        {
          name: "columns",
          type: "select",
          label: "Колонок",
          defaultValue: "3",
          options: [
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
      ],
    },
    {
      name: "items",
      type: "relationship",
      label: "Документы",
      hasMany: true,
      maxDepth: CARD_MAX_DEPTH,
      relationTo: [
        rel("glass-types"),
        rel("processing-services"),
        rel("constructions"),
        rel("thicknesses"),
        rel("articles"),
      ],
      admin: { condition: (_, sibling) => sibling?.mode === "manual" },
    },
    {
      name: "showPrices",
      type: "checkbox",
      label: "Показывать цены и вес",
      admin: {
        description: "Для толщин: цена и вес из справочника «Цены».",
        condition: (_, sibling) => sibling?.source === "thicknesses",
      },
    },
  ],
};
