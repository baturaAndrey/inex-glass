import { ValidationError } from "payload";
import { buildPreviewUrl } from "@/lib/preview/preview-url";
import { isAdmin, publishedOrLoggedIn } from "../../access";
import { faqField } from "../../fields/faq";
import {
  assertNoParentCycle,
  assertUniquePath,
  capturePublishedPath,
  cascadePathsAfterChange,
  findDocPath,
  joinPath,
  normalizeBasePath,
  pathFields,
  preventDeleteWithChildren,
  relationId,
  ROOT_PATH,
} from "../../fields/path";
import { LOOKUP_MAX_DEPTH } from "../../fields/populate";
import { quizPrefillField } from "../../fields/quiz-prefill";
import { seoField } from "../../fields/seo";
import { slugField } from "../../fields/slug";
import { revalidateCollection } from "../../hooks/revalidate";
import { setUpdatedBy, updatedByField } from "../../hooks/set-updated-by";
import { rel } from "../../slugs";
import { DRAFT_VERSIONS, GROUP_CONTENT, layoutField, legacyUrlsField } from "../shared";
import type { CollectionBeforeValidateHook, CollectionConfig, Where } from "payload";

const SLUG = "pages";
const revalidate = revalidateCollection(SLUG);

type PageData = {
  id?: string | number;
  isHome?: unknown;
  parent?: unknown;
  pathPrefix?: unknown;
  slug?: unknown;
};

/** Only one document may be the home page. */
async function assertSingleHome(
  req: Parameters<CollectionBeforeValidateHook>[0]["req"],
  selfId: string | number | null
): Promise<void> {
  const conditions: Where[] = [{ isHome: { equals: true } }];
  if (selfId !== null) conditions.push({ id: { not_equals: selfId } });
  const { totalDocs } = await req.payload.count({
    collection: rel(SLUG),
    where: { and: conditions },
    overrideAccess: true,
    req,
  });
  if (totalDocs > 0) {
    throw new ValidationError({
      collection: SLUG,
      errors: [{ path: "isHome", message: "Главная страница уже есть — снимите флаг с неё" }],
    });
  }
}

/**
 * Path: home → `/`; otherwise `(parent.path ?? pathPrefix) + slug + "/"`. Checks the single home
 * page, parent cycles and global path uniqueness.
 */
const computePagePath: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;
  const merged: PageData = { ...(originalDoc as PageData | undefined), ...(data as PageData) };
  const selfId = (originalDoc as PageData | undefined)?.id ?? null;
  const selfIdString = selfId === null ? null : String(selfId);

  let path: string | null = null;
  if (merged.isHome === true) {
    await assertSingleHome(req, selfId);
    path = ROOT_PATH;
  } else {
    const slug = typeof merged.slug === "string" && merged.slug !== "" ? merged.slug : null;
    if (slug) {
      const parentId = relationId(merged.parent);
      if (parentId) {
        await assertNoParentCycle(req, SLUG, selfIdString, parentId);
        const parentPath = await findDocPath(req, SLUG, parentId);
        path = joinPath(parentPath ?? ROOT_PATH, slug);
      } else {
        const prefix = typeof merged.pathPrefix === "string" ? merged.pathPrefix : ROOT_PATH;
        path = joinPath(normalizeBasePath(prefix), slug);
      }
    }
  }

  if (!path) return data;
  await assertUniquePath(req, path, SLUG, selfId);
  return { ...data, path };
};

export const Pages: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Страница", plural: "Страницы" },
  admin: {
    group: GROUP_CONTENT,
    useAsTitle: "title",
    defaultColumns: ["title", "path", "template", "_status", "updatedAt"],
    listSearchableFields: ["title", "slug", "path"],
    preview: buildPreviewUrl,
  },
  /** When populated from another document: link and card fields only, never `layout`. */
  defaultPopulate: {
    title: true,
    slug: true,
    path: true,
    breadcrumbLabel: true,
    template: true,
    isHome: true,
    _status: true,
  },
  access: {
    read: publishedOrLoggedIn,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  versions: DRAFT_VERSIONS,
  hooks: {
    beforeValidate: [computePagePath],
    beforeChange: [capturePublishedPath(SLUG), setUpdatedBy],
    afterChange: [cascadePathsAfterChange(SLUG), revalidate.afterChange],
    beforeDelete: [preventDeleteWithChildren(SLUG)],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    { name: "title", type: "text", label: "Название", required: true },
    {
      name: "template",
      type: "select",
      label: "Шаблон",
      required: true,
      defaultValue: "generic",
      options: [
        { label: "Главная", value: "home" },
        { label: "Хаб раздела", value: "hub" },
        { label: "Услуга / сервис", value: "service" },
        { label: "Сегмент клиентов", value: "segment" },
        { label: "О компании", value: "company" },
        { label: "Контакты", value: "contacts" },
        { label: "Юридический документ", value: "legal" },
        { label: "Листинг", value: "listing" },
        { label: "Инструмент / калькулятор", value: "tool" },
        { label: "Обычная", value: "generic" },
      ],
      admin: { position: "sidebar" },
    },
    {
      name: "isHome",
      type: "checkbox",
      label: "Главная страница",
      admin: { position: "sidebar", description: "Адрес «/». Может быть только одна." },
    },
    {
      name: "parent",
      type: "relationship",
      label: "Родительская страница",
      relationTo: rel(SLUG),
      maxDepth: LOOKUP_MAX_DEPTH,
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
      admin: {
        position: "sidebar",
        condition: (data) => !data?.isHome,
      },
    },
    {
      name: "pathPrefix",
      type: "text",
      label: "Раздел адреса",
      defaultValue: ROOT_PATH,
      admin: {
        position: "sidebar",
        description: "Если родитель не задан, напр. /instrumenty/.",
        condition: (data) => !data?.isHome && !data?.parent,
      },
    },
    slugField({ from: "title" }),
    ...pathFields(),
    {
      name: "breadcrumbLabel",
      type: "text",
      label: "Название в хлебных крошках",
      admin: { position: "sidebar" },
    },
    {
      name: "publishedAt",
      type: "date",
      label: "Дата публикации",
      admin: { position: "sidebar" },
    },
    {
      ...updatedByField(),
      admin: {
        readOnly: true,
        position: "sidebar",
        components: { Field: "/payload/admin/pages/updated-by-field#UpdatedByField" },
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Содержимое",
          fields: [layoutField("Секции страницы"), faqField()],
        },
        {
          label: "SEO",
          fields: [seoField()],
        },
        {
          label: "Настройки",
          fields: [
            quizPrefillField(),
            {
              type: "row",
              fields: [
                {
                  name: "hideConditions",
                  type: "checkbox",
                  label: "Скрыть автоблок «Условия»",
                },
                { name: "hideQuizCta", type: "checkbox", label: "Скрыть призыв к квизу" },
              ],
            },
            {
              name: "documentVersion",
              type: "text",
              label: "Версия документа",
              admin: {
                description: "Для юридических документов (политика ПДн, согласие).",
                condition: (data) => data?.template === "legal",
              },
            },
            legacyUrlsField(),
          ],
        },
      ],
    },
  ],
};
