import { isAdmin, isAnyone } from "../../access";
import { richTextEditor } from "../../editor";
import { faqField } from "../../fields/faq";
import { slugField } from "../../fields/slug";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import { GROUP_CATALOG } from "../shared";
import type { CollectionConfig } from "payload";

const SLUG = "thickness-groups";
const revalidate = revalidateCollection(SLUG);

/** Shared texts of thickness cards («4–5 мм», «6–8 мм», «10–12 мм», «15–19 мм»). */
export const ThicknessGroups: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Группа толщин", plural: "Группы толщин" },
  admin: {
    group: GROUP_CATALOG,
    useAsTitle: "label",
    defaultColumns: ["label", "order", "updatedAt"],
    listSearchableFields: ["label", "slug"],
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
    {
      type: "row",
      fields: [
        { name: "label", type: "text", label: "Название", required: true },
        { name: "order", type: "number", label: "Порядок" },
      ],
    },
    slugField({ from: "label" }),
    {
      name: "thicknesses",
      type: "join",
      label: "Толщины группы",
      collection: rel("thicknesses"),
      on: "group",
    },
    {
      name: "podborText",
      type: "richText",
      label: "Подбор",
      required: true,
      editor: richTextEditor,
      admin: { description: "Метки {N}, {2N} подставляются для каждой толщины." },
    },
    {
      name: "obrabotkaText",
      type: "richText",
      label: "Обработка",
      required: true,
      editor: richTextEditor,
    },
    faqField(),
  ],
};
