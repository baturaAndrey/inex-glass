import { rel } from "../slugs";
import type { Field, GroupField, TextFieldSingleValidation } from "payload";

/** Collections an internal link may point to (resolved to URLs by task 15, `resolveLink`). */
const LINKABLE_COLLECTIONS = [
  "pages",
  "glass-types",
  "thicknesses",
  "processing-services",
  "constructions",
  "articles",
  "objects",
].map(rel);

/** Absolute/special URLs that are accepted as-is. */
const EXTERNAL_URL = /^(https?:\/\/|tel:|mailto:)/i;
/**
 * Internal path: leading slash, trailing slash (trailingSlash: true), optional query/hash.
 * Segments must be non-empty, so protocol-relative `//evil.com/` and `/a//b/` are rejected.
 */
const INTERNAL_PATH = /^\/(?!\/)(?:[^\s?#/]+\/)*(?:[?#]\S*)?$/;

/** Custom validation replaces Payload's built-in `required` check, so it is handled here. */
const validateUrl =
  (required: boolean): TextFieldSingleValidation =>
  (value, { siblingData }) => {
    const type = (siblingData as { type?: unknown } | undefined)?.type;
    if (type !== "custom") return true;
    if (!value) return required ? "Укажите адрес ссылки" : true;
    if (value.startsWith("#") || EXTERNAL_URL.test(value)) return true;
    if (INTERNAL_PATH.test(value)) return true;
    return "Внутренний путь должен начинаться и заканчиваться слешем: /kontakty/";
  };

type LinkFieldOptions = {
  name?: string;
  label?: string;
  required?: boolean;
  withLabel?: boolean;
};

/** Shared "link" group: either a CMS document or a custom URL. */
export function linkField(opts: LinkFieldOptions = {}): GroupField {
  const { name = "link", label = "Ссылка", required = false, withLabel = true } = opts;

  const fields: Field[] = [
    {
      name: "type",
      type: "radio",
      label: "Тип ссылки",
      defaultValue: "doc",
      options: [
        { label: "Страница сайта", value: "doc" },
        { label: "Произвольный адрес", value: "custom" },
      ],
      admin: { layout: "horizontal" },
    },
    {
      name: "doc",
      type: "relationship",
      label: "Документ",
      relationTo: LINKABLE_COLLECTIONS,
      required,
      admin: { condition: (_, sibling) => sibling?.type !== "custom" },
    },
    {
      name: "url",
      type: "text",
      label: "Адрес",
      validate: validateUrl(required),
      admin: {
        condition: (_, sibling) => sibling?.type === "custom",
        description: "/путь/ со слешем на конце, #якорь, https://…, tel: или mailto:",
      },
    },
  ];

  if (withLabel) {
    fields.push({ name: "label", type: "text", label: "Текст ссылки", required });
  }

  fields.push({ name: "newTab", type: "checkbox", label: "Открывать в новой вкладке" });

  return { name, label, type: "group", fields };
}
