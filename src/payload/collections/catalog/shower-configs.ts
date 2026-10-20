import { adminFieldAccess, isAdmin, publishedOrLoggedIn } from "../../access";
import { LOOKUP_MAX_DEPTH } from "../../fields/populate";
import { slugField } from "../../fields/slug";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import { DRAFT_VERSIONS, GROUP_CATALOG } from "../shared";
import type { CollectionConfig } from "payload";

const SLUG = "shower-configs";
const revalidate = revalidateCollection(SLUG);

/** Shower enclosure configurations (~20 cards imported from inex.su as drafts, task 37). */
export const ShowerConfigs: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Конфигурация душевой", plural: "Конфигурации душевых" },
  admin: {
    group: GROUP_CATALOG,
    useAsTitle: "name",
    defaultColumns: ["name", "configType", "order", "_status"],
    listSearchableFields: ["name", "slug", "legacyId"],
  },
  defaultSort: "order",
  access: {
    read: publishedOrLoggedIn,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  versions: DRAFT_VERSIONS,
  hooks: {
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "name", type: "text", label: "Название", required: true },
    slugField({ from: "name" }),
    {
      type: "row",
      fields: [
        {
          name: "construction",
          type: "relationship",
          label: "Конструкция",
          relationTo: rel("constructions"),
          maxDepth: LOOKUP_MAX_DEPTH,
        },
        {
          name: "configType",
          type: "select",
          label: "Тип",
          options: [
            { label: "Прямая с дверью", value: "straight-door" },
            { label: "Угловая", value: "corner" },
            { label: "Трапеция", value: "trapezoid" },
            { label: "Walk-in", value: "walk-in" },
            { label: "Раздвижная", value: "sliding" },
            { label: "Другое", value: "other" },
          ],
        },
        {
          name: "glassThicknesses",
          type: "select",
          label: "Толщины стекла",
          hasMany: true,
          options: [
            { label: "8 мм", value: "8" },
            { label: "10 мм", value: "10" },
          ],
        },
      ],
    },
    { name: "image", type: "upload", label: "Изображение", relationTo: rel("media") },
    {
      name: "gallery",
      type: "array",
      label: "Галерея",
      labels: { singular: "Фото", plural: "Фото" },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "image",
              type: "upload",
              label: "Изображение",
              relationTo: rel("media"),
              required: true,
            },
            { name: "alt", type: "text", label: "Alt" },
          ],
        },
      ],
    },
    { name: "description", type: "textarea", label: "Описание" },
    { name: "order", type: "number", label: "Порядок", admin: { position: "sidebar" } },
    {
      type: "collapsible",
      label: "Импорт",
      admin: { initCollapsed: true },
      fields: [
        { name: "legacyUrl", type: "text", label: "Старый адрес" },
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
  ],
};
