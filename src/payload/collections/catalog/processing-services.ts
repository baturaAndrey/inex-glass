import { isAdmin, isAnyone } from "../../access";
import { richTextEditor } from "../../editor";
import { cardField } from "../../fields/card";
import { faqField } from "../../fields/faq";
import { joinPath, pathFields } from "../../fields/path";
import { quizPrefillField } from "../../fields/quiz-prefill";
import { seoField } from "../../fields/seo";
import { slugField } from "../../fields/slug";
import { tablesField } from "../../fields/tables";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import {
  GROUP_CATALOG,
  importantFields,
  layoutField,
  relatedLinksField,
  slugOf,
  templatePathHook,
} from "../shared";
import type { CollectionConfig } from "payload";

const SLUG = "processing-services";
const revalidate = revalidateCollection(SLUG);

const HUB_BASE = "/obrabotka-stekla/";

const computePath = templatePathHook(SLUG, (doc) => {
  const slug = slugOf(doc);
  return slug ? joinPath(HUB_BASE, slug) : null;
});

export const ProcessingServices: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Обработка", plural: "Обработка" },
  admin: {
    group: GROUP_CATALOG,
    useAsTitle: "title",
    defaultColumns: ["title", "path", "order", "updatedAt"],
    listSearchableFields: ["title", "slug"],
  },
  defaultSort: "order",
  /** When populated from another document: link and card fields only, never `layout`. */
  defaultPopulate: {
    title: true,
    slug: true,
    path: true,
    order: true,
    card: true,
    keyLimit: true,
    heroImage: true,
  },
  access: {
    read: isAnyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [computePath],
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "title", type: "text", label: "Название", required: true },
    slugField({
      from: "title",
      description: "kromka, otverstiya-i-vyrezy, facet, matirovanie, plenki, pechat",
    }),
    ...pathFields(),
    { name: "order", type: "number", label: "Порядок", admin: { position: "sidebar" } },
    {
      type: "tabs",
      tabs: [
        {
          label: "Содержимое",
          fields: [
            cardField(),
            {
              name: "keyLimit",
              type: "text",
              label: "Главное ограничение (на карточке хаба)",
              admin: { description: "Напр. «Ø 4–130 мм»." },
            },
            { name: "heroImage", type: "upload", label: "Изображение", relationTo: rel("media") },
            { name: "intro", type: "richText", label: "Вводный абзац", editor: richTextEditor },
            tablesField(),
            {
              name: "howToSpecify",
              type: "richText",
              label: "Как указать в чертеже",
              editor: richTextEditor,
            },
            ...importantFields(),
            {
              name: "callouts",
              type: "array",
              label: "Плашки",
              labels: { singular: "Плашка", plural: "Плашки" },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "tone",
                      type: "select",
                      label: "Тон",
                      defaultValue: "warning",
                      options: [
                        { label: "Предупреждение", value: "warning" },
                        { label: "Информация", value: "info" },
                      ],
                    },
                    { name: "title", type: "text", label: "Заголовок" },
                  ],
                },
                { name: "body", type: "richText", label: "Текст", editor: richTextEditor },
              ],
            },
            {
              name: "hasHoleCalculator",
              type: "checkbox",
              label: "Калькулятор отверстий на странице",
            },
            {
              type: "row",
              fields: [
                { name: "ctaPrimaryLabel", type: "text", label: "Текст главной кнопки" },
                { name: "ctaSecondaryLabel", type: "text", label: "Текст второй кнопки" },
              ],
            },
            relatedLinksField(),
            faqField(),
            layoutField(),
          ],
        },
        { label: "SEO", fields: [seoField()] },
        { label: "Квиз", fields: [quizPrefillField()] },
      ],
    },
  ],
};
