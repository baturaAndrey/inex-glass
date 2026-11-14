import { isAdmin, isAnyone } from "../../access";
import { slugField } from "../../fields/slug";
import { revalidateCollection } from "../../hooks/revalidate";
import { GROUP_OBJECT_REFERENCES } from "../shared";
import type { CollectionConfig } from "payload";

const SLUG = "cities";
const revalidate = revalidateCollection(SLUG);

/** Cities of portfolio objects (filter on `/obekty/`). */
export const Cities: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Город", plural: "Города" },
  admin: {
    group: GROUP_OBJECT_REFERENCES,
    useAsTitle: "name",
    defaultColumns: ["name", "region", "order"],
    listSearchableFields: ["name", "slug", "region"],
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
    {
      type: "row",
      fields: [
        { name: "region", type: "text", label: "Регион" },
        { name: "order", type: "number", label: "Порядок" },
      ],
    },
  ],
};
