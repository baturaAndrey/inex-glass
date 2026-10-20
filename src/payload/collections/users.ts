import { getEnv } from "@/lib/env";
import { adminFieldAccess, getRole, isAdmin, isAdminOrSelf, isLoggedIn } from "../access";
import type { Role } from "../access";
import type { CollectionBeforeValidateHook, CollectionConfig } from "payload";

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;
const LOCK_TIME_MS = 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: "Администратор", value: "admin" },
  { label: "Менеджер", value: "manager" },
];

/**
 * The very first user becomes an admin regardless of the submitted role.
 * Runs after field-level access, which strips `role` for anonymous first registration.
 */
const forceAdminForFirstUser: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  if (operation !== "create" || !data) return data;

  const { totalDocs } = await req.payload.count({
    collection: "users",
    overrideAccess: true,
    req,
  });
  if (totalDocs === 0) return { ...data, role: "admin" satisfies Role };
  return data;
};

const env = getEnv();

export const Users: CollectionConfig = {
  slug: "users",
  labels: {
    singular: "Пользователь",
    plural: "Пользователи",
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role"],
  },
  auth: {
    tokenExpiration: ONE_WEEK_SECONDS,
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
    lockTime: LOCK_TIME_MS,
    cookies: {
      sameSite: "Lax",
      secure: env.SITE_ENV !== "development",
    },
  },
  access: {
    // Panel access for both staff roles.
    admin: ({ req: { user } }) => getRole(user) !== null,
    create: isAdmin,
    delete: isAdmin,
    // Deviation from the brief ("manager sees only themself"): managers need the staff
    // list for the "responsible" field on leads/orders.
    read: isLoggedIn,
    update: isAdminOrSelf,
  },
  hooks: {
    beforeValidate: [forceAdminForFirstUser],
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "Имя",
      required: true,
    },
    {
      name: "role",
      type: "select",
      label: "Роль",
      required: true,
      defaultValue: "manager" satisfies Role,
      options: ROLE_OPTIONS,
      saveToJWT: true,
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
    },
  ],
};
