import { scopedDbName } from "../fields/db-name";
import { rel } from "../slugs";
import { sectionFields } from "./_section";
import { CARD_MAX_DEPTH } from "../fields/populate";
import type { Block } from "payload";

const DEFAULT_LIMIT = 4;

export const ArticlesFeedBlock: Block = {
  slug: "articlesFeed",
  dbName: scopedDbName("blk_articles"),
  interfaceName: "ArticlesFeedBlock",
  labels: { singular: "Лента статей", plural: "Ленты статей" },
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
            { label: "Для главной (featuredOnHome)", value: "featured" },
            { label: "Последние", value: "latest" },
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
      name: "articles",
      type: "relationship",
      label: "Статьи",
      relationTo: rel("articles"),
      maxDepth: CARD_MAX_DEPTH,
      hasMany: true,
      admin: { condition: (_, sibling) => sibling?.mode === "manual" },
    },
  ],
};
