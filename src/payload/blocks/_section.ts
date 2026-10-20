import type { Field, TextFieldSingleValidation } from "payload";

/** In-page anchor: starts with a letter, lowercase Latin, digits and hyphens (`ceny`). */
export const ANCHOR_PATTERN = /^[a-z][a-z0-9-]*$/;

const validateAnchor: TextFieldSingleValidation = (value) => {
  if (!value) return true;
  return ANCHOR_PATTERN.test(value) ? true : "Строчная латиница, цифры и дефис, с буквы: ceny";
};

type SectionFieldsOptions = {
  /** Default anchor (e.g. `ceny` for prices, `rekvizity` for requisites). */
  anchorDefault?: string;
};

/**
 * Section chrome shared by blocks: anchor, background, heading and subheading.
 * `background: auto` lets the page shell alternate backgrounds automatically.
 */
export function sectionFields(opts: SectionFieldsOptions = {}): Field[] {
  return [
    {
      type: "row",
      fields: [
        { name: "heading", type: "text", label: "Заголовок секции" },
        {
          name: "headingLevel",
          type: "select",
          label: "Уровень заголовка",
          defaultValue: "h2",
          options: [
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
          ],
          admin: { width: "120px" },
        },
      ],
    },
    { name: "sub", type: "textarea", label: "Подзаголовок" },
    {
      type: "row",
      fields: [
        {
          name: "anchorId",
          type: "text",
          label: "Якорь (id секции)",
          validate: validateAnchor,
          ...(opts.anchorDefault ? { defaultValue: opts.anchorDefault } : {}),
          admin: { description: "Для ссылок вида #ceny." },
        },
        {
          name: "background",
          type: "select",
          label: "Фон",
          defaultValue: "auto",
          options: [
            { label: "Авто (чередование)", value: "auto" },
            { label: "Основной (bg)", value: "bg" },
            { label: "Поверхность (sf)", value: "sf" },
            { label: "Тёмный", value: "dark" },
            { label: "Тёмный фирменный", value: "primaryDark" },
          ],
        },
      ],
    },
  ];
}
