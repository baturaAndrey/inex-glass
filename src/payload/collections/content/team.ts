import { isAdmin } from "../../access";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import { GROUP_CONTENT } from "../shared";
import type { Access, CollectionConfig, FieldAccess, Where } from "payload";

const SLUG = "team";
const revalidate = revalidateCollection(SLUG);

/** Logged-in users see every member; visitors only those not hidden on the site. */
const visibleOrLoggedIn: Access = ({ req: { user } }) => {
  if (user) return true;
  return { hidden: { not_equals: true } } satisfies Where;
};

/**
 * Direct contacts are for internal use: the public team card shows photo, name, role and area
 * only (task 29), so e-mail and phone are not exposed to anonymous API reads.
 */
const loggedInOnly: FieldAccess = ({ req: { user } }) => Boolean(user);

/** Staff. The team page stays hidden while there are no visible members (task 29). */
export const Team: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Сотрудник", plural: "Сотрудники" },
  admin: {
    group: GROUP_CONTENT,
    useAsTitle: "name",
    defaultColumns: ["name", "role", "order", "hidden"],
    listSearchableFields: ["name", "role"],
  },
  defaultSort: "order",
  access: {
    read: visibleOrLoggedIn,
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
        { name: "name", type: "text", label: "Имя", required: true },
        { name: "role", type: "text", label: "Должность" },
      ],
    },
    { name: "area", type: "textarea", label: "Зона ответственности" },
    { name: "photo", type: "upload", label: "Фото", relationTo: rel("media") },
    {
      type: "row",
      fields: [
        { name: "email", type: "email", label: "E-mail", access: { read: loggedInOnly } },
        { name: "phone", type: "text", label: "Телефон", access: { read: loggedInOnly } },
      ],
    },
    { name: "order", type: "number", label: "Порядок", admin: { position: "sidebar" } },
    {
      name: "hidden",
      type: "checkbox",
      label: "Скрыть на сайте",
      admin: { position: "sidebar" },
    },
  ],
};
