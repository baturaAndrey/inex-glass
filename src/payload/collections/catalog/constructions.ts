import { isAdmin, publishedOrLoggedIn } from "../../access";
import { CONSTRUCTION_GROUP_OPTIONS } from "../../blocks/collection-cards";
import { systemFields, systemsLayoutField } from "../../blocks/systems";
import { inexSuStripField, textItemsField } from "../../blocks/who-does-what";
import { richTextEditor } from "../../editor";
import { cardField } from "../../fields/card";
import { faqField } from "../../fields/faq";
import {
  assertNoParentCycle,
  assertUniquePath,
  capturePublishedPath,
  cascadePathsAfterChange,
  findDocPath,
  joinPath,
  pathFields,
  preventDeleteWithChildren,
  relationId,
  ROOT_PATH,
} from "../../fields/path";
import { LOOKUP_MAX_DEPTH } from "../../fields/populate";
import { quizPrefillField } from "../../fields/quiz-prefill";
import { seoField } from "../../fields/seo";
import { slugField } from "../../fields/slug";
import { tablesField } from "../../fields/tables";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import { DRAFT_VERSIONS, GROUP_CATALOG, layoutField, legacyUrlsField } from "../shared";
import type { CollectionBeforeValidateHook, CollectionConfig } from "payload";

const SLUG = "constructions";
const revalidate = revalidateCollection(SLUG);

type ConstructionData = { id?: string | number; parent?: unknown; slug?: unknown };

/** `(parent.path ?? "/") + slug + "/"`: `/steklyannye-peregorodki/`, `/osteklenie/fasadov/`. */
const computePath: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;
  const merged: ConstructionData = {
    ...(originalDoc as ConstructionData | undefined),
    ...(data as ConstructionData),
  };
  const slug = typeof merged.slug === "string" && merged.slug !== "" ? merged.slug : null;
  if (!slug) return data;

  const selfId = (originalDoc as ConstructionData | undefined)?.id ?? null;
  const parentId = relationId(merged.parent);
  let base = ROOT_PATH;
  if (parentId) {
    await assertNoParentCycle(req, SLUG, selfId === null ? null : String(selfId), parentId);
    base = (await findDocPath(req, SLUG, parentId)) ?? ROOT_PATH;
  }
  const path = joinPath(base, slug);
  await assertUniquePath(req, path, SLUG, selfId);
  return { ...data, path };
};

const enabledOnly = (_: unknown, sibling: { enabled?: unknown } | undefined) =>
  Boolean(sibling?.enabled);

export const Constructions: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Конструкция", plural: "Конструкции" },
  admin: {
    group: GROUP_CATALOG,
    useAsTitle: "title",
    defaultColumns: ["title", "path", "kind", "group", "_status"],
    listSearchableFields: ["title", "slug", "path"],
  },
  defaultSort: "order",
  /** When populated from another document: link and card fields only, never `layout`. */
  defaultPopulate: {
    title: true,
    slug: true,
    path: true,
    kind: true,
    group: true,
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
    beforeChange: [capturePublishedPath(SLUG)],
    afterChange: [cascadePathsAfterChange(SLUG), revalidate.afterChange],
    beforeDelete: [preventDeleteWithChildren(SLUG)],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "title", type: "text", label: "Название", required: true },
    {
      type: "row",
      fields: [
        {
          name: "kind",
          type: "select",
          label: "Тип страницы",
          required: true,
          defaultValue: "construction",
          options: [
            { label: "Хаб раздела", value: "hub" },
            { label: "Конструкция", value: "construction" },
          ],
        },
        {
          name: "group",
          type: "select",
          label: "Группа",
          required: true,
          defaultValue: "constructions",
          options: [...CONSTRUCTION_GROUP_OPTIONS],
        },
      ],
    },
    {
      name: "parent",
      type: "relationship",
      label: "Родитель",
      relationTo: rel(SLUG),
      maxDepth: LOOKUP_MAX_DEPTH,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
      admin: { position: "sidebar" },
    },
    slugField({ from: "title" }),
    ...pathFields({ description: "Вычисляется: адрес родителя + слаг." }),
    {
      name: "breadcrumbLabel",
      type: "text",
      label: "Название в хлебных крошках",
      admin: { position: "sidebar" },
    },
    { name: "order", type: "number", label: "Порядок", admin: { position: "sidebar" } },
    {
      name: "productTag",
      type: "relationship",
      label: "Изделие (для объектов)",
      relationTo: rel("products"),
      maxDepth: LOOKUP_MAX_DEPTH,
      admin: { position: "sidebar" },
    },
    {
      name: "children",
      type: "join",
      label: "Вложенные страницы",
      collection: rel(SLUG),
      on: "parent",
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Первый экран",
          fields: [
            cardField(),
            { name: "heroImage", type: "upload", label: "Изображение", relationTo: rel("media") },
            { name: "intro", type: "richText", label: "Вводный абзац", editor: richTextEditor },
            {
              type: "row",
              fields: [
                {
                  name: "ctaPrimaryLabel",
                  type: "text",
                  label: "Текст главной кнопки",
                  admin: { description: "Напр. «Рассчитать комплект»." },
                },
                { name: "ctaSecondaryLabel", type: "text", label: "Текст второй кнопки" },
                {
                  name: "secondaryFormKey",
                  type: "select",
                  label: "Форма второй кнопки",
                  defaultValue: "drawing",
                  options: [
                    { label: "Отправить чертёж / проект", value: "drawing" },
                    { label: "Подобрать под нагрузку", value: "load" },
                    { label: "Без второй кнопки", value: "none" },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: "Системы и стекло",
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "systemsHeading",
                  type: "text",
                  label: "Заголовок систем",
                  defaultValue: "Какую систему выбрать",
                },
                systemsLayoutField("systemsLayout"),
              ],
            },
            {
              name: "systems",
              type: "array",
              label: "Системы",
              labels: { singular: "Система", plural: "Системы" },
              admin: { initCollapsed: true },
              fields: systemFields(),
            },
            {
              name: "profileSystems",
              type: "array",
              label: "Профильные системы",
              labels: { singular: "Система", plural: "Системы" },
              admin: { description: "Алютех, СИАЛ, Loft-Gratec, Доксал, Татпроф, Фристайл…" },
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "name", type: "text", label: "Название", required: true },
                    { name: "note", type: "text", label: "Примечание" },
                    { name: "url", type: "text", label: "Сайт" },
                  ],
                },
              ],
            },
            { name: "glassHeading", type: "text", label: "Заголовок блока о стекле" },
            {
              name: "glassBullets",
              type: "array",
              label: "Пункты о стекле",
              labels: { singular: "Пункт", plural: "Пункты" },
              fields: [{ name: "body", type: "richText", label: "Текст", editor: richTextEditor }],
            },
            tablesField(),
            {
              name: "riskCallout",
              type: "group",
              label: "Плашка о рисках",
              fields: [
                { name: "enabled", type: "checkbox", label: "Показывать" },
                {
                  name: "title",
                  type: "text",
                  label: "Заголовок",
                  admin: { condition: enabledOnly },
                },
                {
                  name: "body",
                  type: "richText",
                  label: "Текст",
                  editor: richTextEditor,
                  admin: { condition: enabledOnly },
                },
              ],
            },
            { name: "documents", type: "richText", label: "Документы", editor: richTextEditor },
          ],
        },
        {
          label: "Блоки страницы",
          fields: [
            { name: "objectsHeading", type: "text", label: "Заголовок блока объектов" },
            {
              name: "whoDoesWhat",
              type: "group",
              label: "Кто что делает",
              fields: [
                { name: "enabled", type: "checkbox", label: "Показывать" },
                textItemsField("leftItems", "Inex Glass", "wdw_left"),
                textItemsField("rightItems", "Ваша бригада", "wdw_right"),
              ],
            },
            inexSuStripField("inexSuBridge", "Мост на inex.su («Нужен монтаж под ключ?»)"),
            {
              name: "snowCalcBlock",
              type: "group",
              label: "«Расчёт под снег» (CTA, не калькулятор)",
              fields: [
                { name: "enabled", type: "checkbox", label: "Показывать" },
                { name: "title", type: "text", label: "Заголовок" },
                { name: "body", type: "richText", label: "Текст", editor: richTextEditor },
                { name: "sideText", type: "textarea", label: "Текст в плашке" },
                { name: "ctaLabel", type: "text", label: "Текст кнопки" },
                {
                  name: "formParams",
                  type: "json",
                  label: "Параметры формы",
                  admin: { description: 'Напр. { "label": "Отправить проект" }' },
                },
              ],
            },
            {
              name: "showShowerConfigs",
              type: "checkbox",
              label: "Показывать каталог душевых",
            },
            faqField(),
            layoutField(),
            legacyUrlsField(),
          ],
        },
        { label: "SEO", fields: [seoField()] },
        { label: "Квиз", fields: [quizPrefillField()] },
      ],
    },
  ],
};
