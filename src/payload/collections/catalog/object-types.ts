import { isAdmin, isAnyone } from "../../access";
import { slugField } from "../../fields/slug";
import { revalidateCollection } from "../../hooks/revalidate";
import { GROUP_OBJECT_REFERENCES } from "../shared";
import type { CollectionConfig } from "payload";

const SLUG = "object-types";
const revalidate = revalidateCollection(SLUG);

/** Object types for the portfolio filter (ТЦ, банк, офис, арена, аэропорт…). */
export const ObjectTypes: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Тип объекта", plural: "Типы объектов" },
  admin: {
    group: GROUP_OBJECT_REFERENCES,
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "order"],
    listSearchableFields: ["name", "slug"],
  },
  defaultSort: "order",
  access: {
    read: isAnyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "name", type: "text", label: "Название", required: true },
    slugField({ from: "name" }),
    { name: "order", type: "number", label: "Порядок" },
  ],
};
