import { FORM_KEY_OPTIONS } from "./_cta";
import { sectionFields } from "./_section";
import { scopedDbName } from "../fields/db-name";
import type { Block } from "payload";

/** Inline site form (registry of task 21). */
export const FormBlock: Block = {
  slug: "form",
  dbName: scopedDbName("blk_form"),
  interfaceName: "FormBlock",
  labels: { singular: "Форма", plural: "Формы" },
  fields: [
    ...sectionFields(),
    {
      type: "row",
      fields: [
        {
          name: "formKey",
          type: "select",
          label: "Форма",
          required: true,
          options: [...FORM_KEY_OPTIONS],
        },
        {
          name: "variant",
          type: "select",
          label: "Вид",
          defaultValue: "card",
          options: [
            { label: "Карточка", value: "card" },
            { label: "В строку", value: "inline" },
            { label: "Страница", value: "page" },
          ],
        },
        { name: "showContacts", type: "checkbox", label: "Показывать контакты" },
      ],
    },
    {
      name: "bullets",
      type: "array",
      label: "Пункты рядом с формой",
      labels: { singular: "Пункт", plural: "Пункты" },
      fields: [{ name: "text", type: "text", label: "Текст", required: true }],
    },
    {
      type: "row",
      fields: [
        { name: "submitLabel", type: "text", label: "Текст кнопки отправки" },
        { name: "fileLabel", type: "text", label: "Подпись поля файла" },
        {
          name: "sourceLabel",
          type: "text",
          label: "Источник в заявке",
          admin: { description: "Метка, с которой заявка придёт менеджеру." },
        },
      ],
    },
    {
      name: "params",
      type: "json",
      label: "Параметры формы",
      admin: { description: 'Напр. { "label": "Отправить проект", "accept": ".dwg,.dxf,.pdf" }' },
    },
  ],
};
