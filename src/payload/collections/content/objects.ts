import { adminFieldAccess, isAdmin, publishedOrLoggedIn } from "../../access";
import { joinPath, pathFields } from "../../fields/path";
import { CARD_MAX_DEPTH, LOOKUP_MAX_DEPTH } from "../../fields/populate";
import { quizPrefillField } from "../../fields/quiz-prefill";
import { seoField } from "../../fields/seo";
import { slugField } from "../../fields/slug";
import { isPublishing, minRowsOnPublish, requiredOnPublish } from "../../fields/validators";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import {
  DRAFT_VERSIONS,
  GROUP_CONTENT,
  legacyUrlsField,
  slugOf,
  templatePathHook,
} from "../shared";
import type {
  ArrayFieldValidation,
  CollectionConfig,
  NumberFieldSingleValidation,
  RelationshipFieldManyValidation,
  RelationshipFieldSingleValidation,
  TextFieldSingleValidation,
} from "payload";

const SLUG = "objects";
const revalidate = revalidateCollection(SLUG);

const OBJECTS_BASE = "/obekty/";
const MIN_YEAR = 1990;
const MAX_TASK_LENGTH = 300;
const MAX_CHIPS = 3;
const MAX_RELATED = 4;

const computePath = templatePathHook(SLUG, (doc) => {
  const slug = slugOf(doc);
  return slug ? joinPath(OBJECTS_BASE, slug) : null;
});

const validateYear: NumberFieldSingleValidation = (value, { data }) => {
  if (value === null || value === undefined) {
    return isPublishing(data) ? "Укажите год объекта" : true;
  }
  const maxYear = new Date().getFullYear() + 1;
  if (!Number.isInteger(value) || value < MIN_YEAR || value > maxYear) {
    return `Год — от ${MIN_YEAR} до ${maxYear}`;
  }
  return true;
};

type SpecRow = { product?: unknown; thickness?: unknown };
const filled = (value: unknown) => typeof value === "string" && value.trim() !== "";

/** On publish at least one spec row must name the product and the thickness. */
const validateSpec: ArrayFieldValidation = (value, { data, siblingData }) => {
  if (!isPublishing(data)) return true;
  const rows = Array.isArray(value) ? value : (siblingData as { spec?: unknown }).spec;
  const complete = Array.isArray(rows)
    ? (rows as SpecRow[]).some((row) => filled(row?.product) && filled(row?.thickness))
    : false;
  return complete ? true : "Для публикации заполните спецификацию: изделие и толщину";
};

const validateChips: ArrayFieldValidation = (value) => {
  const count = Array.isArray(value) ? value.length : typeof value === "number" ? value : 0;
  return count <= MAX_CHIPS ? true : `Не больше ${MAX_CHIPS} меток`;
};

/**
 * Portfolio object. Drafts (import from inex.su) may be empty; publishing requires city, type,
 * products, year, task, spec and photos with alt (`requiredOnPublish`). Validation of drafts is
 * skipped by Payload, so the rules only apply on publish.
 */
export const Objects: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Объект", plural: "Объекты" },
  admin: {
    group: GROUP_CONTENT,
    useAsTitle: "name",
    defaultColumns: ["name", "city", "year", "featured", "_status"],
    listSearchableFields: ["name", "slug", "legacyId"],
  },
  defaultSort: "-sortDate",
  /** When populated from another document: link and card fields only, never `layout`. */
  defaultPopulate: {
    name: true,
    slug: true,
    path: true,
    city: true,
    objectType: true,
    year: true,
    chips: true,
    photos: true,
    featured: true,
    sortDate: true,
    _status: true,
  },
  access: { read: publishedOrLoggedIn, create: isAdmin, update: isAdmin, delete: isAdmin },
  versions: DRAFT_VERSIONS,
  hooks: {
    beforeValidate: [computePath],
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "name", type: "text", label: "Название", required: true },
    slugField({ from: "name" }),
    ...pathFields(),
    {
      name: "featured",
      type: "checkbox",
      label: "Избранный",
      index: true,
      admin: { position: "sidebar" },
    },
    {
      name: "sortDate",
      type: "date",
      label: "Дата для сортировки",
      index: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: "sidebar",
        date: { pickerAppearance: "dayOnly" },
        description: "Для сортировки «Сначала новые».",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Объект",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "city",
                  type: "relationship",
                  label: "Город",
                  relationTo: rel("cities"),
                  maxDepth: LOOKUP_MAX_DEPTH,
                  validate: requiredOnPublish<RelationshipFieldSingleValidation>(
                    "Для публикации укажите город"
                  ),
                },
                {
                  name: "objectType",
                  type: "relationship",
                  label: "Тип объекта",
                  relationTo: rel("object-types"),
                  maxDepth: LOOKUP_MAX_DEPTH,
                  validate: requiredOnPublish<RelationshipFieldSingleValidation>(
                    "Для публикации укажите тип объекта"
                  ),
                },
                {
                  name: "year",
                  type: "number",
                  label: "Год",
                  validate: validateYear,
                },
              ],
            },
            {
              name: "products",
              type: "relationship",
              label: "Изделия",
              relationTo: rel("products"),
              maxDepth: LOOKUP_MAX_DEPTH,
              hasMany: true,
              validate: requiredOnPublish<RelationshipFieldManyValidation>(
                "Для публикации укажите хотя бы одно изделие"
              ),
            },
            {
              name: "task",
              type: "textarea",
              label: "Задача и сложность одной фразой",
              maxLength: MAX_TASK_LENGTH,
              validate: requiredOnPublish("Для публикации опишите задачу объекта", (value) =>
                !value || value.length <= MAX_TASK_LENGTH
                  ? true
                  : `Не длиннее ${MAX_TASK_LENGTH} знаков`
              ),
            },
            {
              name: "spec",
              type: "array",
              label: "Спецификация",
              labels: { singular: "Позиция", plural: "Позиции" },
              validate: validateSpec,
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "product", type: "text", label: "Изделие" },
                    {
                      name: "thickness",
                      type: "text",
                      label: "Толщина",
                      admin: { description: "«10», «8+8»" },
                    },
                    { name: "kind", type: "text", label: "Вид стекла" },
                  ],
                },
                {
                  type: "row",
                  fields: [
                    { name: "triplexFormula", type: "text", label: "Формула триплекса" },
                    { name: "processing", type: "text", label: "Обработка" },
                  ],
                },
              ],
            },
            {
              name: "chips",
              type: "array",
              label: "Метки на карточке",
              labels: { singular: "Метка", plural: "Метки" },
              maxRows: MAX_CHIPS,
              validate: validateChips,
              admin: { description: "До трёх, напр. «закалённый триплекс 8+8»." },
              fields: [{ name: "text", type: "text", label: "Текст", required: true }],
            },
            {
              name: "photos",
              type: "array",
              label: "Фото",
              labels: { singular: "Фото", plural: "Фото" },
              validate: minRowsOnPublish(1, "Для публикации добавьте хотя бы одно фото"),
              fields: [
                {
                  name: "image",
                  type: "upload",
                  label: "Изображение",
                  relationTo: rel("media"),
                  required: true,
                },
                {
                  type: "row",
                  fields: [
                    {
                      name: "alt",
                      type: "text",
                      label: "Alt",
                      required: true,
                      validate: requiredOnPublish<TextFieldSingleValidation>(
                        "Для публикации заполните alt у каждого фото"
                      ),
                    },
                    { name: "caption", type: "text", label: "Подпись" },
                  ],
                },
              ],
            },
            {
              name: "related",
              type: "relationship",
              label: "Похожие объекты",
              relationTo: rel(SLUG),
              maxDepth: CARD_MAX_DEPTH,
              hasMany: true,
              maxRows: MAX_RELATED,
              filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
            },
          ],
        },
        {
          label: "Импорт",
          fields: [
            legacyUrlsField(),
            { name: "legacyId", type: "text", label: "Старый id", index: true },
            { name: "sourceUrl", type: "text", label: "Источник" },
            {
              name: "importNotes",
              type: "textarea",
              label: "Заметки импорта",
              access: { read: adminFieldAccess, update: adminFieldAccess },
            },
          ],
        },
        { label: "SEO", fields: [seoField()] },
        { label: "Квиз", fields: [quizPrefillField()] },
      ],
    },
  ],
};
