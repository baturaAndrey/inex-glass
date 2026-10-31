import { pageBlocks } from "../blocks";
import { richTextEditor } from "../editor";
import { linkField } from "../fields/link";
import { assertUniquePath } from "../fields/path";
import type {
  ArrayField,
  BlocksField,
  CollectionBeforeValidateHook,
  CollectionConfig,
  Field,
} from "payload";

/**
 * Helpers shared by content and catalog collections (task 07). CRM collections (task 08) do not
 * use this module.
 */

export const GROUP_CONTENT = "Контент";
export const GROUP_CATALOG = "Каталог";
export const GROUP_OBJECT_REFERENCES = "Справочники объектов";

/** Drafts without autosave, 20 versions per document. */
export const DRAFT_VERSIONS: NonNullable<CollectionConfig["versions"]> = {
  drafts: true,
  maxPerDoc: 20,
};

type DocData = Record<string, unknown>;

/**
 * `beforeValidate` that sets `path` from a template (`/blog/${slug}/` …) and checks it is unique
 * across all collections with a path. A document without a slug yet (empty draft) gets no path.
 */
export function templatePathHook(
  collection: string,
  build: (doc: DocData) => string | null
): CollectionBeforeValidateHook {
  return async ({ data, originalDoc, req }) => {
    if (!data) return data;
    const merged: DocData = { ...(originalDoc as DocData | undefined), ...data };
    const path = build(merged);
    if (!path) return data;
    const selfId = (originalDoc as { id?: string | number } | undefined)?.id ?? null;
    await assertUniquePath(req, path, collection, selfId);
    return { ...data, path };
  };
}

/** Slug of the merged document or `null` when not set yet. */
export const slugOf = (doc: DocData): string | null =>
  typeof doc.slug === "string" && doc.slug !== "" ? doc.slug : null;

/** Optional extra sections rendered after the template's typed sections. */
export function layoutField(label = "Дополнительные секции"): BlocksField {
  return {
    name: "layout",
    type: "blocks",
    label,
    labels: { singular: "Секция", plural: "Секции" },
    blocks: pageBlocks,
    admin: { initCollapsed: true },
  };
}

/** Old inex.su URLs redirected to this document (input for the redirects CSV). */
export function legacyUrlsField(): ArrayField {
  return {
    name: "legacyUrls",
    type: "array",
    label: "Старые адреса",
    labels: { singular: "Адрес", plural: "Адреса" },
    admin: { description: "Адреса на inex.su, которые ведут на эту страницу." },
    fields: [{ name: "url", type: "text", label: "Адрес", required: true }],
  };
}

/** "Читать также" / bridge links. */
export function relatedLinksField(): ArrayField {
  return {
    name: "relatedLinks",
    type: "array",
    label: "Связанные ссылки",
    labels: { singular: "Ссылка", plural: "Ссылки" },
    fields: [linkField(), { name: "description", type: "textarea", label: "Описание" }],
  };
}

export const DEFAULT_IMPORTANT_TITLE = "Что важно знать до заказа";

/** "Что важно знать до заказа": title plus bullet items with a bold lead. */
export function importantFields(): Field[] {
  return [
    {
      name: "importantTitle",
      type: "text",
      label: "Заголовок блока «Важно»",
      defaultValue: DEFAULT_IMPORTANT_TITLE,
    },
    {
      name: "importantItems",
      type: "array",
      label: "Что важно знать",
      labels: { singular: "Пункт", plural: "Пункты" },
      fields: [
        { name: "lead", type: "text", label: "Начало (жирным)" },
        { name: "text", type: "richText", label: "Текст", editor: richTextEditor },
      ],
    },
  ];
}

/** Read-only text in the sidebar (computed values). */
export const readOnlySidebar = { readOnly: true, position: "sidebar" } as const;
