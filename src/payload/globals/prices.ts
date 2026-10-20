import { isAdminOrManager, isAnyone } from "../access";
import { arrayValidator, DAY_ONLY, GROUP_REFERENCES, textRows, uniqueBy } from "./shared";
import { revalidateGlobal } from "../hooks/revalidate";
import type { GlobalConfig, NumberFieldSingleValidation } from "payload";

/** Thicknesses (mm) the site sells; exactly one price row per thickness. */
export const PRICE_THICKNESSES = [4, 5, 6, 8, 10, 12, 15, 19] as const;

const DEFAULT_ROWS: ReadonlyArray<{ thickness: number; priceFrom?: number; onRequest: boolean }> = [
  { thickness: 4, priceFrom: 700, onRequest: false },
  { thickness: 5, priceFrom: 750, onRequest: false },
  { thickness: 6, priceFrom: 800, onRequest: false },
  { thickness: 8, priceFrom: 1300, onRequest: false },
  { thickness: 10, priceFrom: 1400, onRequest: false },
  { thickness: 12, priceFrom: 2000, onRequest: false },
  { thickness: 15, onRequest: true },
  { thickness: 19, onRequest: true },
];

const validateThickness: NumberFieldSingleValidation = (value) => {
  if (value === null || value === undefined) return "Укажите толщину";
  return (PRICE_THICKNESSES as readonly number[]).includes(value)
    ? true
    : `Допустимые толщины: ${PRICE_THICKNESSES.join(", ")} мм`;
};

/** Price is required unless the row is marked "on request"; whole roubles, not negative. */
const validatePriceFrom: NumberFieldSingleValidation = (value, { siblingData }) => {
  const onRequest = Boolean((siblingData as { onRequest?: unknown } | undefined)?.onRequest);
  if (value === null || value === undefined) {
    return onRequest ? true : "Укажите цену или отметьте «по запросу»";
  }
  if (!Number.isInteger(value) || value < 0) return "Цена — целое число ≥ 0";
  return true;
};

export const Prices: GlobalConfig = {
  slug: "prices",
  label: "Цены от",
  admin: {
    group: GROUP_REFERENCES,
    description:
      "Цены «от» за м² по толщинам. Если дата цен старше порога, на сайте вместо цифры выводится «Цена по расчёту».",
  },
  access: { read: isAnyone, update: isAdminOrManager },
  versions: { max: 20 },
  hooks: { afterChange: [revalidateGlobal("prices")] },
  fields: [
    {
      name: "rows",
      type: "array",
      label: "Цены по толщинам",
      labels: { singular: "Толщина", plural: "Толщины" },
      required: true,
      minRows: PRICE_THICKNESSES.length,
      maxRows: PRICE_THICKNESSES.length,
      defaultValue: DEFAULT_ROWS.map((row) => ({ ...row })),
      validate: arrayValidator(uniqueBy("thickness", "Толщина повторяется")),
      admin: {
        initCollapsed: false,
        description: "Ровно 8 строк — по одной на толщину 4, 5, 6, 8, 10, 12, 15, 19 мм.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "thickness",
              type: "number",
              label: "Толщина, мм",
              required: true,
              validate: validateThickness,
            },
            {
              name: "priceFrom",
              type: "number",
              label: "Цена от, ₽/м²",
              min: 0,
              validate: validatePriceFrom,
            },
            {
              name: "onRequest",
              type: "checkbox",
              label: "По запросу",
              defaultValue: false,
            },
          ],
        },
        {
          name: "note",
          type: "text",
          label: "Примечание",
          admin: { description: "Например: «закалка по согласованию»" },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "priceDate",
          type: "date",
          label: "Дата актуальности цен",
          required: true,
          admin: {
            date: DAY_ONLY,
            description: "От этой даты считается правило «Цена по расчёту».",
          },
        },
        {
          name: "staleAfterDays",
          type: "number",
          label: "Цена устаревает через, дней",
          required: true,
          defaultValue: 45,
          min: 1,
        },
      ],
    },
    {
      name: "caption",
      type: "text",
      label: "Подпись к цене",
      required: true,
      defaultValue:
        "Ориентировочная цена на {дата_цен}. Точная стоимость — в КП; цена в договоре фиксируется",
      admin: { description: "{дата_цен} подставляется в формате ДД.ММ.ГГГГ." },
    },
    {
      type: "row",
      fields: [
        {
          name: "onRequestLabel",
          type: "text",
          label: "Текст «по запросу»",
          required: true,
          defaultValue: "по запросу",
        },
        {
          name: "staleLabel",
          type: "text",
          label: "Текст при устаревшей цене",
          required: true,
          defaultValue: "Цена по расчёту",
        },
      ],
    },
    {
      name: "includedTitle",
      type: "text",
      label: "Заголовок «Входит в цену»",
      required: true,
      defaultValue: "Входит в цену «от»",
    },
    {
      name: "included",
      type: "array",
      label: "Входит в цену",
      labels: { singular: "Пункт", plural: "Пункты" },
      required: true,
      minRows: 1,
      defaultValue: textRows([
        "Листовое стекло выбранной толщины",
        "Термическая закалка",
        "Проверка параметров заказа",
      ]),
      fields: [{ name: "text", type: "text", label: "Текст", required: true }],
    },
    {
      name: "extraTitle",
      type: "text",
      label: "Заголовок «Считается отдельно»",
      required: true,
      defaultValue: "Считается отдельно",
    },
    {
      name: "extra",
      type: "array",
      label: "Считается отдельно",
      labels: { singular: "Пункт", plural: "Пункты" },
      required: true,
      minRows: 1,
      defaultValue: textRows([
        "Фигурная резка и сложная форма",
        "Шлифовка, полировка кромки",
        "Отверстия, вырезы, печать, матирование",
      ]),
      admin: { description: "Фацет здесь не указывается: фацет делается только на зеркалах." },
      fields: [{ name: "text", type: "text", label: "Текст", required: true }],
    },
    {
      name: "footnote",
      type: "textarea",
      label: "Сноска",
      defaultValue:
        "Окончательная цена зависит от размеров, формы, обработки кромки, количества отверстий и объёма заказа.",
    },
  ],
};
