import { rel } from "../slugs";
import type { Field, GroupField, TextFieldSingleValidation } from "payload";

/** Recommended limits (Yandex/Google snippets). Exceeding them is allowed, see `admin.description`. */
export const SEO_TITLE_SOFT_LIMIT = 70;
export const SEO_DESCRIPTION_SOFT_LIMIT = 170;

const INTERNAL_PATH = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/;
const ABSOLUTE_URL = /^https?:\/\/\S+$/i;

const validateCanonical: TextFieldSingleValidation = (value) => {
  if (!value) return true;
  if (INTERNAL_PATH.test(value) || ABSOLUTE_URL.test(value)) return true;
  return "Путь со слешами по краям (/zakalennoe-steklo/) или абсолютный адрес https://…";
};

type SeoFieldOptions = {
  /** Adds `titleNoPrice` — title without a price (15/19 mm and prices older than 45 days). */
  priceVariant?: boolean;
};

/**
 * SEO group. Values may contain placeholders (`{N}`, `{цена}`, `{вес}`…) resolved at render
 * time; texts come from `docs/inex/17-meta.md`.
 *
 * Over-limit title/description are not blocked: any string returned by a Payload `validate`
 * prevents saving, so the soft limits are shown as hints instead.
 */
export function seoField(opts: SeoFieldOptions = {}): GroupField {
  const { priceVariant = false } = opts;

  const fields: Field[] = [
    {
      name: "h1",
      type: "text",
      label: "H1",
      admin: { description: "Если пусто — используется название документа." },
    },
    {
      name: "title",
      type: "text",
      label: "Title",
      admin: {
        description: `Рекомендуется до ${SEO_TITLE_SOFT_LIMIT} знаков (длиннее — допустимо). Метки {N}, {цена} подставляются при выводе.`,
      },
    },
  ];

  if (priceVariant) {
    fields.push({
      name: "titleNoPrice",
      type: "text",
      label: "Title без цены",
      admin: {
        description: "Используется для 15/19 мм и когда цена старше 45 дней («Цена по расчёту»).",
      },
    });
  }

  fields.push(
    {
      name: "description",
      type: "textarea",
      label: "Description",
      admin: {
        description: `Рекомендуется до ${SEO_DESCRIPTION_SOFT_LIMIT} знаков (длиннее — допустимо).`,
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "noindex",
          type: "checkbox",
          label: "Закрыть от индексации (noindex)",
          defaultValue: false,
        },
        {
          name: "canonical",
          type: "text",
          label: "Canonical",
          validate: validateCanonical,
          admin: { description: "Если пусто — canonical указывает на сам адрес страницы." },
        },
      ],
    },
    {
      name: "ogImage",
      type: "upload",
      label: "Изображение для соцсетей (OG)",
      relationTo: rel("media"),
    }
  );

  return { name: "seo", type: "group", label: "SEO", fields };
}
