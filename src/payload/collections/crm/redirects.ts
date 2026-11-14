import { isAdmin, isAnyone } from "@/payload/access";
import { revalidateCollection } from "@/payload/hooks/revalidate";
import { REDIRECT_CODES, toOptions } from "./constants";
import type { CollectionConfig, FieldHook, TextFieldValidation } from "payload";

const REDIRECTS_SLUG = "redirects";
const revalidateRedirects = revalidateCollection(REDIRECTS_SLUG);

/** Site path form: leading and trailing slash, no query/hash/whitespace. */
const SITE_PATH_PATTERN = /^\/(?:[^\s?#/]+\/)*$/;

/** `%D0%BA` → `к`; malformed escapes are kept as typed (validation reports the path then). */
function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Brings an old URL path to the site form `/…/`: percent-decoded, lower case, trailing slash,
 * without origin, query and hash (redirect lookup in task 15 matches on the decoded pathname
 * only). Decoding makes `/%D0%BA%D0%B0%D1%82/` and `/кат/` the same, unique key.
 */
export function normalizeRedirectPath(raw: string): string {
  let value = raw.trim();
  if (value === "") return value;
  try {
    // Pasted absolute URL → keep the pathname only (the URL parser percent-encodes it).
    if (/^https?:\/\//i.test(value)) value = new URL(value).pathname;
  } catch {
    return value;
  }
  value = decodePath(value.split(/[?#]/)[0] ?? "");
  if (!value.startsWith("/")) value = `/${value}`;
  if (!value.endsWith("/")) value = `${value}/`;
  return value.toLowerCase();
}

const normalizeFrom: FieldHook = ({ value }) =>
  typeof value === "string" ? normalizeRedirectPath(value) : value;

export const validateFrom: TextFieldValidation = (value) => {
  if (typeof value !== "string" || value === "") return "Укажите исходный путь";
  return SITE_PATH_PATTERN.test(normalizeRedirectPath(value))
    ? true
    : "Путь вида /staryj-razdel/stranica/";
};

const TARGET_FORMAT_MESSAGE = "Путь /…/ или ссылка http(s)://…";

/** Site-relative target or absolute http(s) URL; a target equal to `from` would loop. */
export const validateTo: TextFieldValidation = (value, { siblingData }) => {
  if (typeof value !== "string" || value.trim() === "") return "Укажите адрес назначения";
  const target = value.trim();

  if (target.startsWith("/") && !target.startsWith("//")) {
    const from = (siblingData as { from?: unknown } | undefined)?.from;
    const loops =
      typeof from === "string" &&
      from.trim() !== "" &&
      normalizeRedirectPath(target) === normalizeRedirectPath(from);
    return loops ? "Адрес назначения совпадает с исходным путём" : true;
  }
  try {
    const { protocol } = new URL(target);
    return protocol === "https:" || protocol === "http:" ? true : TARGET_FORMAT_MESSAGE;
  } catch {
    return TARGET_FORMAT_MESSAGE;
  }
};

/**
 * Redirects from old URLs. Consumer: task 15 (`getRedirect(path)` in the catch-all before
 * `notFound()`, cached under `collection:redirects`, only `active`). It always answers with
 * `permanentRedirect` (308); `code` is informational.
 */
export const Redirects: CollectionConfig = {
  slug: REDIRECTS_SLUG,
  labels: { singular: "Редирект", plural: "Редиректы" },
  admin: {
    group: "Служебное",
    useAsTitle: "from",
    defaultColumns: ["from", "to", "code", "active"],
    listSearchableFields: ["from", "to", "note"],
  },
  access: {
    read: isAnyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [revalidateRedirects.afterChange],
    afterDelete: [revalidateRedirects.afterDelete],
  },
  fields: [
    {
      name: "from",
      type: "text",
      label: "Откуда",
      required: true,
      unique: true,
      validate: validateFrom,
      hooks: { beforeValidate: [normalizeFrom] },
      admin: { description: "Путь со слешем на конце, в нижнем регистре: /old-page/." },
    },
    {
      name: "to",
      type: "text",
      label: "Куда",
      required: true,
      validate: validateTo,
      admin: { description: "Путь на сайте (/catalog/) или абсолютная ссылка." },
    },
    {
      name: "code",
      type: "select",
      label: "Код",
      defaultValue: "301",
      options: toOptions(REDIRECT_CODES),
      admin: { description: "Справочно: сайт всегда отвечает постоянным редиректом 308." },
    },
    { name: "active", type: "checkbox", label: "Активен", defaultValue: true },
    { name: "note", type: "text", label: "Примечание" },
  ],
};
