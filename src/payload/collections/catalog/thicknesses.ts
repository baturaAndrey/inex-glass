import { number as validateNumber } from "payload/shared";
import { adminFieldAccess, isAdmin, isAnyone } from "../../access";
import { richTextEditor } from "../../editor";
import { cardField } from "../../fields/card";
import { faqField } from "../../fields/faq";
import { assertUniquePath } from "../../fields/path";
import { LOOKUP_MAX_DEPTH } from "../../fields/populate";
import { quizPrefillField, THICKNESS_VALUES } from "../../fields/quiz-prefill";
import { seoField } from "../../fields/seo";
import { revalidateCollection } from "../../hooks/revalidate";
import { rel } from "../../slugs";
import { GROUP_CATALOG, layoutField, readOnlySidebar } from "../shared";
import type {
  CollectionBeforeValidateHook,
  CollectionConfig,
  NumberFieldSingleValidation,
} from "payload";

const SLUG = "thicknesses";
const revalidate = revalidateCollection(SLUG);

/** Weight of 1 m² of glass per mm of thickness, kg (density 2500 kg/m³). */
const KG_PER_M2_PER_MM = 2.5;
/** Thicknesses closed from indexing by default (SSoT: 5, 15, 19 mm). */
const NOINDEX_BY_DEFAULT: ReadonlySet<number> = new Set([5, 15, 19]);
const MAX_PAINTABLE = 15;
const MIN_BENDABLE = 4;
const MAX_BENDABLE = 12;

const ALLOWED = new Set<number>(THICKNESS_VALUES);

export const thicknessSlug = (n: number) => `${n}-mm`;
export const thicknessPath = (n: number) => `/zakalennoe-steklo/${thicknessSlug(n)}/`;
export const weightPerM2 = (n: number) => n * KG_PER_M2_PER_MM;

const validateN: NumberFieldSingleValidation = async (value, options) => {
  const base = await validateNumber(value, options);
  if (base !== true) return base;
  if (value === null || value === undefined) return true;
  return ALLOWED.has(value) ? true : `Допустимые толщины: ${THICKNESS_VALUES.join(", ")} мм`;
};

type ThicknessData = {
  id?: string | number;
  n?: unknown;
  indexable?: unknown;
  canPaint?: unknown;
  canBend?: unknown;
  quizPrefill?: { type?: unknown; thickness?: unknown } | null;
};

const isUnset = (value: unknown) => value === undefined || value === null;

/**
 * Derives slug, path and weight from `n`; on create fills thickness-dependent defaults
 * (indexable, canPaint, canBend, quiz pre-fill) that a static `defaultValue` cannot express.
 */
const computeDerived: CollectionBeforeValidateHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (!data) return data;
  const merged: ThicknessData = {
    ...(originalDoc as ThicknessData | undefined),
    ...(data as ThicknessData),
  };
  const n = typeof merged.n === "number" ? merged.n : Number(merged.n);
  if (!Number.isFinite(n) || !ALLOWED.has(n)) return data;

  const next: Record<string, unknown> = {
    ...data,
    slug: thicknessSlug(n),
    path: thicknessPath(n),
    weightPerM2: weightPerM2(n),
  };

  if (operation === "create") {
    if (isUnset(merged.indexable)) next.indexable = !NOINDEX_BY_DEFAULT.has(n);
    if (isUnset(merged.canPaint)) next.canPaint = n <= MAX_PAINTABLE;
    if (isUnset(merged.canBend)) next.canBend = n >= MIN_BENDABLE && n <= MAX_BENDABLE;
  }

  const prefill = merged.quizPrefill ?? {};
  next.quizPrefill = {
    ...prefill,
    type: prefill.type || "tempered",
    thickness: prefill.thickness || String(n),
  };

  const selfId = (originalDoc as ThicknessData | undefined)?.id ?? null;
  await assertUniquePath(req, thicknessPath(n), SLUG, selfId);
  return next;
};

export const Thicknesses: CollectionConfig = {
  slug: SLUG,
  labels: { singular: "Толщина", plural: "Толщины" },
  admin: {
    group: GROUP_CATALOG,
    useAsTitle: "slug",
    defaultColumns: ["n", "slug", "group", "indexable", "updatedAt"],
    listSearchableFields: ["slug", "kindsText"],
  },
  defaultSort: "n",
  /** When populated from another document: link and card fields only, never `layout`. */
  defaultPopulate: {
    n: true,
    slug: true,
    path: true,
    indexable: true,
    card: true,
  },
  access: { read: isAnyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  hooks: {
    beforeValidate: [computeDerived],
    afterChange: [revalidate.afterChange],
    afterDelete: [revalidate.afterDelete],
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "n",
          type: "number",
          label: "Толщина N, мм",
          required: true,
          unique: true,
          validate: validateN,
          admin: { description: THICKNESS_VALUES.join(", ") },
        },
        {
          name: "group",
          type: "relationship",
          label: "Группа толщин",
          relationTo: rel("thickness-groups"),
          maxDepth: LOOKUP_MAX_DEPTH,
          required: true,
        },
      ],
    },
    {
      name: "slug",
      type: "text",
      label: "Слаг",
      index: true,
      unique: true,
      admin: { ...readOnlySidebar, description: "= N-mm" },
    },
    {
      name: "path",
      type: "text",
      label: "Адрес страницы",
      index: true,
      unique: true,
      admin: { ...readOnlySidebar, description: "= /zakalennoe-steklo/N-mm/" },
    },
    {
      name: "weightPerM2",
      type: "number",
      label: "Вес 1 м², кг",
      admin: { ...readOnlySidebar, description: "= N × 2,5" },
    },
    {
      name: "indexable",
      type: "checkbox",
      label: "Индексировать",
      admin: {
        position: "sidebar",
        description:
          "Если не задано при создании: включено, кроме 5, 15, 19 мм. Итог: noindex = !индексировать || seo.noindex.",
      },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Карточка толщины",
          fields: [
            {
              name: "kindsText",
              type: "text",
              label: "Виды",
              required: true,
              admin: { description: "Напр. «все, включая крашеное и гнутое»." },
            },
            {
              type: "row",
              fields: [
                {
                  name: "canPaint",
                  type: "checkbox",
                  label: "Можно красить",
                  admin: { description: "По умолчанию — до 15 мм." },
                },
                {
                  name: "canBend",
                  type: "checkbox",
                  label: "Можно гнуть",
                  admin: { description: "По умолчанию — 4–12 мм." },
                },
              ],
            },
            {
              type: "row",
              fields: [
                {
                  name: "sizeText",
                  type: "text",
                  label: "Размеры (переопределение)",
                  admin: { description: "По умолчанию — из «Техпараметров»." },
                },
                {
                  name: "leadTimeText",
                  type: "text",
                  label: "Срок (переопределение)",
                },
              ],
            },
            {
              name: "podborOverride",
              type: "richText",
              label: "Подбор (вместо текста группы)",
              editor: richTextEditor,
            },
            {
              name: "obrabotkaOverride",
              type: "richText",
              label: "Обработка (вместо текста группы)",
              editor: richTextEditor,
            },
            faqField({ name: "faqOverride", label: "Частые вопросы (вместо вопросов группы)" }),
            {
              name: "internalApplications",
              type: "textarea",
              label: "Применения (внутреннее)",
              access: { read: adminFieldAccess, update: adminFieldAccess },
              admin: {
                description: "Не публикуется — колонка «применения» из структуры карточек.",
              },
            },
            cardField(),
            layoutField(),
          ],
        },
        { label: "SEO", fields: [seoField({ priceVariant: true })] },
        { label: "Квиз", fields: [quizPrefillField()] },
      ],
    },
  ],
};
