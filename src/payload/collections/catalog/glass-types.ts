import { isAdmin, publishedOrLoggedIn } from "../../access";
import { richTextEditor } from "../../editor";
import { cardField } from "../../fields/card";
import { faqField } from "../../fields/faq";
import { linkField } from "../../fields/link";
import { joinPath, pathFields } from "../../fields/path";
import { LOOKUP_MAX_DEPTH } from "../../fields/populate";
import { quizPrefillField } from "../../fields/quiz-prefill";
import { seoField } from "../../fields/seo";
import { slugField } from "../../fields/slug";
import { tablesField } from "../../fields/tables";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import {
  DRAFT_VERSIONS,
  GROUP_CATALOG,
  importantFields,
  layoutField,
  relatedLinksField,
  slugOf,
  templatePathHook,
} from "../shared";
import type { CollectionConfig } from "payload";

const SLUG = "glass-types";
const revalidate = revalidateCollection(SLUG);

const HUB_BASE = "/zakalennoe-steklo/";

/** `/zakalennoe-steklo/<slug>/`, or `/<slug>/` for types living at the root (triplex). */
const computePath = templatePathHook(SLUG, (doc) => {
  const slug = slugOf(doc);
  if (!slug) return null;
  return joinPath(doc.urlBase === "root" ? "/" : HUB_BASE, slug);
});

export const GlassTypes: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Вид стекла", plural: "Виды стекла" },
  admin: {
    group: GROUP_CATALOG,
    useAsTitle: "title",
    defaultColumns: ["title", "path", "order", "showInHub", "_status"],
    listSearchableFields: ["title", "slug"],
  },
  defaultSort: "order",
  /** When populated from another document: link and card fields only, never `layout`. */
  defaultPopulate: {
    title: true,
    slug: true,
    path: true,
    breadcrumbLabel: true,
    order: true,
    card: true,
    heroImage: true,
    _status: true,
  },
  access: {
    read: publishedOrLoggedIn,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  versions: DRAFT_VERSIONS,
  hooks: {
    beforeValidate: [computePath],
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "title", type: "text", label: "Название", required: true },
    slugField({
      from: "title",
      description:
        "matovoe, okrashennoe, osvetlennoe, tonirovannoe, dlya-mebeli, riflenoe, mollirovannoe, tripleks",
    }),
    {
      name: "urlBase",
      type: "select",
      label: "Раздел адреса",
      defaultValue: "zakalennoe-steklo",
      options: [
        { label: "/zakalennoe-steklo/…/", value: "zakalennoe-steklo" },
        { label: "Корень сайта /…/ (триплекс)", value: "root" },
      ],
      admin: { position: "sidebar" },
    },
    ...pathFields(),
    {
      name: "breadcrumbLabel",
      type: "text",
      label: "Название в хлебных крошках",
      admin: { position: "sidebar" },
    },
    { name: "order", type: "number", label: "Порядок", admin: { position: "sidebar" } },
    {
      name: "showInHub",
      type: "checkbox",
      label: "Показывать в хабе",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Первый экран",
          fields: [
            cardField(),
            { name: "heroImage", type: "upload", label: "Изображение", relationTo: rel("media") },
            {
              name: "intro",
              type: "richText",
              label: "Вводный абзац (ct-facts)",
              editor: richTextEditor,
              admin: { description: "Допускает метку {условия}." },
            },
            {
              name: "heroPhotos",
              type: "array",
              label: "Фото первого экрана",
              labels: { singular: "Фото", plural: "Фото" },
              fields: [
                {
                  name: "image",
                  type: "upload",
                  label: "Изображение",
                  relationTo: rel("media"),
                  required: true,
                },
                { name: "caption", type: "text", label: "Подпись" },
              ],
            },
          ],
        },
        {
          label: "Варианты",
          fields: [
            {
              name: "variantsHeading",
              type: "text",
              label: "Заголовок",
              defaultValue: "Варианты",
            },
            {
              name: "variants",
              type: "array",
              label: "Варианты",
              labels: { singular: "Вариант", plural: "Варианты" },
              admin: { initCollapsed: true },
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "key", type: "text", label: "Ключ" },
                    { name: "name", type: "text", label: "Название", required: true },
                  ],
                },
                { name: "description", type: "textarea", label: "Описание" },
                { name: "application", type: "textarea", label: "Где чаще применяют" },
                {
                  type: "row",
                  fields: [
                    {
                      name: "swatchKind",
                      type: "select",
                      label: "Образец",
                      defaultValue: "color",
                      options: [
                        { label: "Цвет", value: "color" },
                        { label: "Изображение", value: "image" },
                        { label: "Узор", value: "pattern" },
                      ],
                    },
                    {
                      name: "swatchColor",
                      type: "text",
                      label: "Цвет (hex)",
                      admin: { condition: (_, sibling) => sibling?.swatchKind === "color" },
                    },
                    {
                      name: "patternKey",
                      type: "text",
                      label: "Узор (CSS-класс)",
                      admin: {
                        description: "Напр. moru.",
                        condition: (_, sibling) => sibling?.swatchKind === "pattern",
                      },
                    },
                  ],
                },
                {
                  name: "swatchImage",
                  type: "upload",
                  label: "Изображение образца",
                  relationTo: rel("media"),
                  admin: { condition: (_, sibling) => sibling?.swatchKind === "image" },
                },
              ],
            },
            {
              name: "variantsNote",
              type: "richText",
              label: "Примечание к вариантам",
              editor: richTextEditor,
            },
            {
              name: "variantsCallout",
              type: "group",
              label: "Плашка к вариантам",
              fields: [
                { name: "title", type: "text", label: "Заголовок" },
                { name: "body", type: "richText", label: "Текст", editor: richTextEditor },
              ],
            },
          ],
        },
        {
          label: "Параметры",
          fields: [
            tablesField(),
            ...importantFields(),
            {
              name: "limits",
              type: "group",
              label: "Ограничения",
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "thickMin", type: "number", label: "Толщина от, мм" },
                    { name: "thickMax", type: "number", label: "Толщина до, мм" },
                    {
                      name: "allowedThicknesses",
                      type: "number",
                      label: "Только толщины, мм",
                      hasMany: true,
                      admin: { description: "Напр. рифлёное: 4, 6, 8." },
                    },
                  ],
                },
                {
                  type: "row",
                  fields: [
                    { name: "sizeMinW", type: "number", label: "Мин. ширина, мм" },
                    { name: "sizeMinH", type: "number", label: "Мин. высота, мм" },
                    { name: "sizeMaxW", type: "number", label: "Макс. ширина, мм" },
                    { name: "sizeMaxH", type: "number", label: "Макс. высота, мм" },
                  ],
                },
                {
                  name: "radius",
                  type: "array",
                  label: "Минимальный радиус гиба",
                  labels: { singular: "Диапазон", plural: "Диапазоны" },
                  fields: [
                    {
                      type: "row",
                      fields: [
                        { name: "thicknessFrom", type: "number", label: "Толщина от, мм" },
                        { name: "thicknessTo", type: "number", label: "Толщина до, мм" },
                        { name: "minRadius", type: "number", label: "Мин. радиус, мм" },
                      ],
                    },
                  ],
                },
                { name: "notes", type: "textarea", label: "Примечания" },
              ],
            },
          ],
        },
        {
          label: "Применение и ссылки",
          fields: [
            {
              name: "applications",
              type: "array",
              label: "Где применяют",
              labels: { singular: "Применение", plural: "Применения" },
              fields: [
                { name: "text", type: "text", label: "Название", required: true },
                { name: "description", type: "textarea", label: "Описание" },
                linkField(),
              ],
            },
            relatedLinksField(),
            {
              type: "row",
              fields: [
                { name: "showSamples", type: "checkbox", label: "Блок «Образцы»" },
                {
                  name: "samplesSnippetKey",
                  type: "text",
                  label: "Ключ фрагмента «Образцы»",
                  defaultValue: "samples",
                  admin: { condition: (_, sibling) => Boolean(sibling?.showSamples) },
                },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "showObjects", type: "checkbox", label: "Блок «Объекты»" },
                {
                  name: "objectsProduct",
                  type: "relationship",
                  label: "Изделие для объектов",
                  relationTo: rel("products"),
                  maxDepth: LOOKUP_MAX_DEPTH,
                  admin: { condition: (_, sibling) => Boolean(sibling?.showObjects) },
                },
              ],
            },
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
