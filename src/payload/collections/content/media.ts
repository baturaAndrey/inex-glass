import path from "node:path";
import { getEnv } from "@/lib/env";
import { isAdmin, isAnyone } from "../../access";
import { revalidateCollection } from "../../hooks/revalidate";
import { GROUP_CONTENT } from "../shared";
import type { CollectionConfig, TextFieldSingleValidation } from "payload";

const SLUG = "media";
const revalidate = revalidateCollection(SLUG);

/**
 * Public raster images and PDFs. Lead attachments are private and stored elsewhere (task 17).
 *
 * SVG is deliberately not accepted (deviation from the task-07 brief): an SVG served from the
 * site origin can carry scripts (stored XSS). Schemes go to the admin-only inline SVG field
 * (`constructions.systems.schemeSvg`) or are uploaded as PNG/WebP.
 */
const MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif", "application/pdf"];

/** Alt text is mandatory for images (accessibility, SEO) and not needed for PDFs. */
const validateAlt: TextFieldSingleValidation = (value, { data, siblingData }) => {
  const mimeType =
    (siblingData as { mimeType?: unknown } | undefined)?.mimeType ??
    (data as { mimeType?: unknown } | undefined)?.mimeType;
  const isImage = typeof mimeType === "string" && mimeType.startsWith("image/");
  if (isImage && (!value || value.trim() === "")) return "Для изображения заполните alt";
  return true;
};

export const Media: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Медиафайл", plural: "Медиафайлы" },
  admin: {
    group: GROUP_CONTENT,
    useAsTitle: "filename",
    defaultColumns: ["filename", "alt", "kind", "isPlaceholder", "updatedAt"],
    listSearchableFields: ["filename", "alt"],
  },
  access: {
    read: isAnyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    staticDir: path.resolve(getEnv().MEDIA_DIR),
    mimeTypes: MIME_TYPES,
    adminThumbnail: "thumbnail",
    focalPoint: true,
    imageSizes: [
      { name: "thumbnail", width: 400 },
      { name: "card", width: 800 },
      { name: "hero", width: 1600 },
      { name: "og", width: 1200, height: 630, position: "centre" },
    ],
  },
  hooks: {
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      label: "Альтернативный текст (alt)",
      validate: validateAlt,
      admin: { description: "Обязателен для изображений: что изображено, без «фото…»." },
    },
    { name: "caption", type: "text", label: "Подпись" },
    {
      name: "kind",
      type: "select",
      label: "Тип",
      defaultValue: "photo",
      options: [
        { label: "Фото", value: "photo" },
        { label: "Иллюстрация", value: "illustration" },
        { label: "Фон", value: "background" },
        { label: "Схема", value: "scheme" },
        { label: "Документ", value: "document" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isPlaceholder",
      type: "checkbox",
      label: "Временное изображение",
      defaultValue: false,
      index: true,
      admin: {
        position: "sidebar",
        description: "Сгенерированная заглушка — заменить реальным фото.",
      },
    },
    {
      name: "generatedId",
      type: "text",
      label: "Id в манифесте генератора",
      index: true,
      admin: { position: "sidebar", readOnly: true },
    },
    { name: "credit", type: "text", label: "Автор / источник" },
    {
      name: "sourceUrl",
      type: "text",
      label: "Исходный адрес",
      admin: { description: "Откуда файл импортирован." },
    },
  ],
};
