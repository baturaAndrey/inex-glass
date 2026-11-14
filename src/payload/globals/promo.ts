import { isAdminOrManager, isAnyone } from "../access";
import { DAY_ONLY, GROUP_REFERENCES } from "./shared";
import { revalidateGlobal } from "../hooks/revalidate";
import type { DateFieldValidation, GlobalConfig, TextFieldSingleValidation } from "payload";

/** Field names match `PromoInput` in the domain library (task 11). */
type PromoData = { active?: unknown; startDate?: unknown } | undefined;

const isActive = (data: unknown) => Boolean((data as PromoData)?.active);

/** Date fields arrive as ISO strings from the admin form and as `Date` from the Local API. */
const toTime = (value: unknown): number | null => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" && value !== "") {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }
  return null;
};

const validateText: TextFieldSingleValidation = (value, { data }) =>
  isActive(data) && !value ? "Укажите текст акции" : true;

/** The end date is required for an active promo and cannot precede the start date. */
const validateEndDate: DateFieldValidation = (value, { data }) => {
  const endDate = toTime(value);
  if (endDate === null) return isActive(data) ? "Укажите дату окончания активной акции" : true;
  const startDate = toTime((data as PromoData)?.startDate);
  if (startDate !== null && endDate < startDate) {
    return "Дата окончания не может быть раньше даты начала";
  }
  return true;
};

export const Promo: GlobalConfig = {
  slug: "promo",
  label: "Акция",
  admin: {
    group: GROUP_REFERENCES,
    description:
      "Плашка в шапке, подпись под ценами и подсказка в квизе. После даты окончания скрываются автоматически.",
  },
  access: { read: isAnyone, update: isAdminOrManager },
  versions: { max: 20 },
  hooks: { afterChange: [revalidateGlobal("promo")] },
  fields: [
    {
      name: "active",
      type: "checkbox",
      label: "Акция включена",
      required: true,
      defaultValue: false,
    },
    {
      name: "text",
      type: "text",
      label: "Текст акции",
      // U+2212 MINUS SIGN, not a hyphen.
      defaultValue: "−5% на закалённое стекло при заказе от 100 м²",
      validate: validateText,
      admin: { description: "Метка {акция_текст}. Обязателен, если акция включена." },
    },
    {
      name: "badgeText",
      type: "text",
      label: "Текст плашки в шапке",
      admin: { description: "Если пусто — используется текст акции." },
    },
    {
      type: "row",
      fields: [
        {
          name: "startDate",
          type: "date",
          label: "Начало",
          admin: { date: DAY_ONLY },
        },
        {
          name: "endDate",
          type: "date",
          label: "Окончание",
          validate: validateEndDate,
          admin: {
            date: DAY_ONLY,
            description:
              "Обязательна для активной акции. После этой даты акция скрывается на сайте.",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "thresholdArea",
          type: "number",
          label: "Порог площади, м²",
          required: true,
          defaultValue: 100,
          min: 0,
          admin: { description: "С этой площади в квизе показывается подсказка об акции." },
        },
        {
          name: "discountPercent",
          type: "number",
          label: "Скидка, %",
          defaultValue: 5,
          min: 0,
          max: 100,
          admin: { description: "Справочно." },
        },
      ],
    },
    {
      name: "linkUrl",
      type: "text",
      label: "Ссылка акции",
      required: true,
      defaultValue: "/zakalennoe-steklo/#ceny",
      admin: { description: "Куда ведут пункт «Акции» и плашка." },
    },
    {
      name: "quizHint",
      type: "text",
      label: "Подсказка в квизе",
      admin: { description: "Если пусто — используется текст акции ({акция_текст})." },
    },
  ],
};
