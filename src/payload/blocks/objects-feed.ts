import { scopedDbName } from "../fields/db-name";
import { rel } from "../slugs";
import { sectionFields } from "./_section";
import { CARD_MAX_DEPTH, LOOKUP_MAX_DEPTH } from "../fields/populate";
import type { Block } from "payload";

const DEFAULT_LIMIT = 4;

/** Portfolio objects feed: featured, by product tag or hand-picked. */
export const ObjectsFeedBlock: Block = {
  slug: "objectsFeed",
  dbName: scopedDbName("blk_objects"),
  interfaceName: "ObjectsFeedBlock",
  labels: { singular: "Лента объектов", plural: "Ленты объектов" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "mode",
          type: "select",
          label: "Отбор",
          defaultValue: "featured",
          options: [
            { label: "Избранные", value: "featured" },
            { label: "По изделию", value: "byProduct" },
            { label: "Вручную", value: "manual" },
          ],
        },
        {
          name: "limit",
          type: "number",
          label: "Сколько показать",
          defaultValue: DEFAULT_LIMIT,
          min: 1,
          max: 12,
        },
      ],
    },
    {
      name: "product",
      type: "relationship",
      label: "Изделие",
      relationTo: rel("products"),
      maxDepth: LOOKUP_MAX_DEPTH,
      admin: { condition: (_, sibling) => sibling?.mode === "byProduct" },
    },
    {
      name: "objects",
      type: "relationship",
      label: "Объекты",
      relationTo: rel("objects"),
      maxDepth: CARD_MAX_DEPTH,
      hasMany: true,
      admin: { condition: (_, sibling) => sibling?.mode === "manual" },
    },
    {
      type: "row",
      fields: [
        {
          name: "showAllLink",
          type: "checkbox",
          label: "Ссылка «Все объекты»",
          defaultValue: true,
        },
        {
          name: "allLinkLabel",
          type: "text",
          label: "Текст ссылки",
          defaultValue: "Все объекты",
          admin: { condition: (_, sibling) => Boolean(sibling?.showAllLink) },
        },
      ],
    },
  ],
};
