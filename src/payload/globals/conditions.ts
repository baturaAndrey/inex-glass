import { isAdmin, isAnyone } from "../access";
import { richTextEditor } from "../editor";
import { GROUP_REFERENCES, lexicalParagraphs, textRows } from "./shared";
import { revalidateGlobal } from "../hooks/revalidate";
import type { GlobalConfig } from "payload";

const TERMS_BAR = [
  "Заказы от 50 м²",
  "Срок от 10 рабочих дней с даты договора",
  "КП в среднем за 2–3 рабочих дня",
  "Цена в договоре фиксируется",
] as const;

/** Default Lucide icon for terms-bar items. */
const DEFAULT_TERMS_ICON = "check";

export const Conditions: GlobalConfig = {
  slug: "conditions",
  label: "Условия",
  admin: {
    group: GROUP_REFERENCES,
    description: "Метка {условия}, полоса условий и блок «Что нужно учесть».",
  },
  access: { read: isAnyone, update: isAdmin },
  hooks: { afterChange: [revalidateGlobal("conditions")] },
  fields: [
    {
      type: "collapsible",
      label: "Минимальный заказ",
      fields: [
        {
          name: "minOrderM2",
          type: "number",
          label: "Минимальный заказ, м²",
          required: true,
          defaultValue: 50,
          min: 0,
          admin: { description: "Порог флага «малый объём» в квизе." },
        },
        {
          name: "minOrderText",
          type: "text",
          label: "Текст минимального заказа",
          required: true,
          defaultValue: "Заказы от 50 м²",
        },
        {
          name: "minOrderFaqText",
          type: "text",
          label: "Минимальный заказ для FAQ",
          required: true,
          defaultValue: "50–100 м²",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Сроки",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "leadTimeDays",
              type: "number",
              label: "Срок, рабочих дней",
              required: true,
              defaultValue: 10,
              min: 1,
              admin: { description: "Порог флага «срочно» в квизе." },
            },
            {
              name: "triplexLeadTimeDays",
              type: "number",
              label: "Срок для триплекса, рабочих дней",
              required: true,
              defaultValue: 14,
              min: 1,
            },
          ],
        },
        {
          name: "leadTimeText",
          type: "text",
          label: "Текст срока",
          required: true,
          defaultValue: "Срок от 10 рабочих дней с даты договора",
        },
        {
          name: "triplexLeadTimeText",
          type: "text",
          label: "Текст срока для триплекса",
          required: true,
          defaultValue: "Срок для триплекса — от 14 рабочих дней с даты договора",
        },
        {
          type: "row",
          fields: [
            {
              name: "kpDaysMin",
              type: "number",
              label: "КП от, рабочих дней",
              required: true,
              defaultValue: 2,
              min: 0,
            },
            {
              name: "kpDaysMax",
              type: "number",
              label: "КП до, рабочих дней",
              required: true,
              defaultValue: 3,
              min: 0,
            },
          ],
        },
        {
          name: "kpText",
          type: "text",
          label: "Текст срока КП",
          required: true,
          defaultValue: "КП в среднем за 2–3 рабочих дня",
        },
      ],
    },
    {
      type: "collapsible",
      label: "Прочие условия",
      fields: [
        {
          name: "priceFixedText",
          type: "text",
          label: "Фиксация цены",
          required: true,
          defaultValue: "Цена в договоре фиксируется",
        },
        {
          name: "noUrgentText",
          type: "text",
          label: "Без срочного изготовления",
          required: true,
          defaultValue: "Срочного изготовления нет",
        },
        {
          name: "noInstallText",
          type: "text",
          label: "Без монтажа",
          required: true,
          defaultValue: "Монтаж не выполняем",
        },
      ],
    },
    {
      name: "inlineText",
      type: "textarea",
      label: "Текст метки {условия}",
      required: true,
      defaultValue:
        "Заказы от 50 м², срок от 10 рабочих дней с даты договора, КП в среднем за 2–3 рабочих дня.",
    },
    {
      name: "termsBar",
      type: "array",
      label: "Полоса условий",
      labels: { singular: "Пункт", plural: "Пункты" },
      required: true,
      minRows: 3,
      maxRows: 5,
      defaultValue: TERMS_BAR.map((text) => ({ text, icon: DEFAULT_TERMS_ICON })),
      fields: [
        {
          type: "row",
          fields: [
            { name: "text", type: "text", label: "Текст", required: true },
            {
              name: "icon",
              type: "text",
              label: "Иконка",
              defaultValue: DEFAULT_TERMS_ICON,
              admin: { description: "Имя иконки Lucide, например check." },
            },
          ],
        },
      ],
    },
    {
      name: "termsBarShort",
      type: "array",
      label: "Короткая полоса условий",
      labels: { singular: "Пункт", plural: "Пункты" },
      maxRows: 5,
      defaultValue: textRows(TERMS_BAR.slice(0, 3)),
      admin: { description: "Для страниц видов стекла — без «Цена в договоре фиксируется»." },
      fields: [{ name: "text", type: "text", label: "Текст", required: true }],
    },
    {
      name: "calloutTitle",
      type: "text",
      label: "Заголовок блока «Что нужно учесть»",
      required: true,
      defaultValue: "Что нужно учесть",
    },
    {
      name: "callout",
      type: "richText",
      label: "Блок «Что нужно учесть»",
      editor: richTextEditor,
      defaultValue: lexicalParagraphs([
        "Что нужно учесть: минимальный заказ — от 50 м². Размер одного стекла — от 150 × 300 до 3000 × 2000 мм. Срочного изготовления нет. Стекло заказчика не закаливаем.",
      ]),
    },
  ],
};
