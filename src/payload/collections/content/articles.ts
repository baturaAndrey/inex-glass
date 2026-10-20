import { isAdmin, publishedOrLoggedIn } from "../../access";
import { richTextEditor } from "../../editor";
import { cardField } from "../../fields/card";
import { linkField } from "../../fields/link";
import { joinPath, pathFields } from "../../fields/path";
import { CARD_MAX_DEPTH } from "../../fields/populate";
import { quizPrefillField } from "../../fields/quiz-prefill";
import { seoField } from "../../fields/seo";
import { slugField } from "../../fields/slug";
import { isPublishing, requiredOnPublish } from "../../fields/validators";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import { readingTimeMinutes } from "../../utils/lexical-text";
import { DRAFT_VERSIONS, GROUP_CONTENT, slugOf, templatePathHook } from "../shared";
import type { CollectionBeforeValidateHook, CollectionConfig } from "payload";

const SLUG = "articles";
const revalidate = revalidateCollection(SLUG);

const BLOG_BASE = "/blog/";
const MAX_RELATED = 3;

const computePath = templatePathHook(SLUG, (doc) => {
  const slug = slugOf(doc);
  return slug ? joinPath(BLOG_BASE, slug) : null;
});

type ArticleData = {
  body?: unknown;
  readingTimeMinutes?: unknown;
  dateModified?: unknown;
};

const isEmptyNumber = (value: unknown) =>
  value === undefined || value === null || value === "" || value === 0;

/**
 * - `readingTimeMinutes`: computed from the body when empty, and kept in sync while it still
 *   holds the auto-computed value (a manual override is left alone);
 * - `dateModified`: bumped on every published save of an existing article unless the editor
 *   changed it by hand.
 */
const computeArticleMeta: CollectionBeforeValidateHook = ({ data, originalDoc, operation }) => {
  if (!data) return data;
  const original = originalDoc as ArticleData | undefined;
  const incoming = data as ArticleData;
  const body = incoming.body ?? original?.body;
  const next: Record<string, unknown> = { ...data };

  const current = incoming.readingTimeMinutes ?? original?.readingTimeMinutes;
  const wasAuto =
    original !== undefined &&
    original.readingTimeMinutes === readingTimeMinutes(original.body) &&
    (incoming.readingTimeMinutes === undefined ||
      incoming.readingTimeMinutes === original.readingTimeMinutes);
  if (body && (isEmptyNumber(current) || wasAuto)) {
    next.readingTimeMinutes = readingTimeMinutes(body);
  }

  const editedByHand =
    incoming.dateModified !== undefined && incoming.dateModified !== original?.dateModified;
  if (operation === "update" && isPublishing(data) && !editedByHand) {
    next.dateModified = new Date().toISOString();
  }
  return next;
};

export const Articles: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Статья", plural: "Статьи" },
  admin: {
    group: GROUP_CONTENT,
    useAsTitle: "title",
    defaultColumns: ["title", "datePublished", "featuredOnHome", "_status"],
    listSearchableFields: ["title", "slug"],
  },
  defaultSort: "-datePublished",
  /** When populated from another document: link and card fields only, never `layout`. */
  defaultPopulate: {
    title: true,
    slug: true,
    path: true,
    datePublished: true,
    card: true,
    heroImage: true,
    _status: true,
  },
  access: { read: publishedOrLoggedIn, create: isAdmin, update: isAdmin, delete: isAdmin },
  versions: DRAFT_VERSIONS,
  hooks: {
    beforeValidate: [computeArticleMeta, computePath],
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "title", type: "text", label: "Заголовок", required: true },
    slugField({ from: "title" }),
    ...pathFields(),
    {
      name: "datePublished",
      type: "date",
      label: "Дата публикации",
      index: true,
      validate: requiredOnPublish("Укажите дату публикации"),
      admin: { position: "sidebar", date: { pickerAppearance: "dayOnly" } },
    },
    {
      name: "dateModified",
      type: "date",
      label: "Дата обновления",
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly" },
        description: "Обновляется автоматически при сохранении опубликованной статьи.",
      },
    },
    {
      name: "readingTimeMinutes",
      type: "number",
      label: "Время чтения, мин",
      min: 0,
      admin: {
        position: "sidebar",
        description: "Если пусто — считается по тексту (180 слов/мин).",
      },
    },
    {
      type: "row",
      fields: [
        { name: "featuredOnHome", type: "checkbox", label: "На главной" },
        {
          name: "homeOrder",
          type: "number",
          label: "Порядок на главной",
          admin: { condition: (data) => Boolean(data?.featuredOnHome) },
        },
      ],
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Текст",
          fields: [
            {
              name: "lead",
              type: "richText",
              label: "Коротко",
              editor: richTextEditor,
              admin: { description: "Плашка «Коротко» в начале статьи." },
            },
            {
              name: "body",
              type: "richText",
              label: "Текст статьи",
              required: true,
              editor: richTextEditor,
              admin: { description: "Оглавление строится из заголовков H2." },
            },
            { name: "heroImage", type: "upload", label: "Обложка", relationTo: rel("media") },
          ],
        },
        {
          label: "Автор и ссылки",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "author",
                  type: "relationship",
                  label: "Автор",
                  relationTo: rel("team"),
                  maxDepth: CARD_MAX_DEPTH,
                },
                {
                  name: "authorName",
                  type: "text",
                  label: "Имя автора",
                  defaultValue: "Inex Glass",
                  admin: { description: "Если автор не выбран." },
                },
              ],
            },
            cardField(),
            {
              name: "commercialLink",
              type: "group",
              label: "Следующий шаг (коммерческая ссылка)",
              fields: [
                { name: "label", type: "text", label: "Текст" },
                linkField({ withLabel: false }),
              ],
            },
            {
              name: "ctaCard",
              type: "group",
              label: "Карточка призыва",
              fields: [
                { name: "title", type: "text", label: "Заголовок" },
                { name: "text", type: "textarea", label: "Текст" },
                {
                  type: "row",
                  fields: [
                    { name: "buttonLabel", type: "text", label: "Текст кнопки" },
                    {
                      name: "formKey",
                      type: "select",
                      label: "Форма",
                      options: [
                        { label: "Отправить чертёж", value: "drawing" },
                        { label: "Подобрать под нагрузку", value: "load" },
                        { label: "Заказать звонок", value: "callback" },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: "related",
              type: "relationship",
              label: "Читать также",
              relationTo: rel(SLUG),
              maxDepth: CARD_MAX_DEPTH,
              hasMany: true,
              maxRows: MAX_RELATED,
              filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
            },
            {
              name: "tools",
              type: "array",
              label: "Инструменты",
              labels: { singular: "Инструмент", plural: "Инструменты" },
              fields: [
                { name: "label", type: "text", label: "Название", required: true },
                linkField({ withLabel: false }),
              ],
            },
          ],
        },
        { label: "SEO", fields: [seoField()] },
        { label: "Квиз", fields: [quizPrefillField()] },
      ],
    },
  ],
};
