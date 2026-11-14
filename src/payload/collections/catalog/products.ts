import { isAdmin, isAnyone } from "../../access";
import { LOOKUP_MAX_DEPTH } from "../../fields/populate";
import { QUIZ_TYPE_OPTIONS } from "../../fields/quiz-prefill";
import { slugField } from "../../fields/slug";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import { GROUP_OBJECT_REFERENCES } from "../shared";
import type { CollectionConfig } from "payload";

const SLUG = "products";
const revalidate = revalidateCollection(SLUG);

/** Product tags of portfolio objects (Перегородки, Ограждения, Козырьки, Фасады, Душевые…). */
export const Products: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Изделие", plural: "Изделия" },
  admin: {
    group: GROUP_OBJECT_REFERENCES,
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "quizType", "order"],
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
    {
      name: "quizType",
      type: "select",
      label: "Тип изделия в квизе",
      options: [...QUIZ_TYPE_OPTIONS],
    },
    {
      name: "construction",
      type: "relationship",
      label: "Страница конструкции",
      relationTo: rel("constructions"),
      maxDepth: LOOKUP_MAX_DEPTH,
    },
  ],
};
