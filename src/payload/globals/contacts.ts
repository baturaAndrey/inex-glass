import { isAdmin, isAnyone } from "../access";
import { arrayValidator, GROUP_REFERENCES, options, uniqueBy, validateKey } from "./shared";
import { revalidateGlobal } from "../hooks/revalidate";
import type { GlobalConfig } from "payload";

const WORK_HOURS_FULL = "Пн–пт, 9:00–18:00";
const PRIMARY_EMAIL = "sale@inex.su";
const INEX_SU_LABEL = "Двери, лестницы и другие конструкции Inex — на inex.su";

/** Exactly one row of a contacts list must be marked as primary (used for `{телефон}` etc.). */
const exactlyOnePrimary =
  (message: string) =>
  (rows: Record<string, unknown>[]): string | true =>
    rows.filter((row) => Boolean(row.isPrimary)).length === 1 ? true : message;

const DEFAULT_LOCATIONS = [
  {
    key: "chelyabinsk-office",
    type: "office",
    title: "Челябинск — офис",
    city: "Челябинск",
    address: "ул. Артиллерийская, 124А",
    phones: [{ number: "+7 (351) 247-05-57" }, { number: "+7 951 489-04-09" }],
    email: PRIMARY_EMAIL,
    hours: WORK_HOURS_FULL,
    localBusiness: true,
  },
  {
    key: "chelyabinsk-warehouse",
    type: "warehouse",
    title: "Челябинск — склад и самовывоз",
    city: "Челябинск",
    address: "Свердловский тракт, 7В",
    phones: [],
    hours: WORK_HOURS_FULL,
    localBusiness: false,
  },
  {
    key: "ekaterinburg-office",
    type: "office",
    title: "Екатеринбург — офис",
    city: "Екатеринбург",
    address: "ул. Данилы Зверева, 17б",
    phones: [{ number: "+7 982 329-11-08" }],
    email: PRIMARY_EMAIL,
    hours: WORK_HOURS_FULL,
    localBusiness: true,
  },
];

export const Contacts: GlobalConfig = {
  slug: "contacts",
  label: "Контакты",
  admin: {
    group: GROUP_REFERENCES,
    description:
      "Телефоны, e-mail, адреса и мессенджеры. Метки {контакты} и {телефон} (основной телефон).",
  },
  access: { read: isAnyone, update: isAdmin },
  versions: { max: 20 },
  hooks: { afterChange: [revalidateGlobal("contacts")] },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "brandName",
          type: "text",
          label: "Название бренда",
          required: true,
          defaultValue: "Inex Glass",
        },
        {
          name: "copyrightHolder",
          type: "text",
          label: "Правообладатель (©)",
          required: true,
          defaultValue: "ИП Копылов А. М.",
        },
      ],
    },
    {
      name: "phones",
      type: "array",
      label: "Телефоны",
      labels: { singular: "Телефон", plural: "Телефоны" },
      required: true,
      minRows: 1,
      defaultValue: [
        { number: "+7 (351) 247-05-57", isPrimary: true },
        { number: "+7 951 489-04-09", isPrimary: false },
        { number: "+7 982 329-11-08", isPrimary: false },
      ],
      validate: arrayValidator(exactlyOnePrimary("Отметьте ровно один основной телефон")),
      admin: { description: "Ссылка tel: строится из цифр номера." },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "number",
              type: "text",
              label: "Номер",
              required: true,
              admin: { description: "В формате отображения: +7 (351) 247-05-57" },
            },
            { name: "label", type: "text", label: "Подпись" },
            { name: "isPrimary", type: "checkbox", label: "Основной", defaultValue: false },
          ],
        },
      ],
    },
    {
      name: "emails",
      type: "array",
      label: "E-mail",
      labels: { singular: "E-mail", plural: "E-mail" },
      required: true,
      minRows: 1,
      defaultValue: [{ address: PRIMARY_EMAIL, isPrimary: true }],
      validate: arrayValidator(exactlyOnePrimary("Отметьте ровно один основной e-mail")),
      fields: [
        {
          type: "row",
          fields: [
            { name: "address", type: "email", label: "Адрес", required: true },
            { name: "label", type: "text", label: "Подпись" },
            { name: "isPrimary", type: "checkbox", label: "Основной", defaultValue: false },
          ],
        },
      ],
    },
    {
      name: "workHours",
      type: "group",
      label: "Часы работы",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "full",
              type: "text",
              label: "Полностью",
              required: true,
              defaultValue: WORK_HOURS_FULL,
            },
            {
              name: "short",
              type: "text",
              label: "Кратко",
              required: true,
              defaultValue: "Пн–Пт 9–18",
            },
          ],
        },
      ],
    },
    {
      name: "callPrompt",
      type: "text",
      label: "Подпись над телефоном в шапке",
      required: true,
      defaultValue: "Звоните Пн–Пт 9–18",
    },
    {
      name: "locations",
      type: "array",
      label: "Адреса",
      labels: { singular: "Адрес", plural: "Адреса" },
      required: true,
      minRows: 1,
      defaultValue: DEFAULT_LOCATIONS,
      validate: arrayValidator(uniqueBy("key", "Ключ адреса повторяется")),
      admin: { initCollapsed: true },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "key",
              type: "text",
              label: "Ключ",
              required: true,
              validate: validateKey,
              admin: { description: "Например: chelyabinsk-office" },
            },
            {
              name: "type",
              type: "select",
              label: "Тип",
              required: true,
              options: options([
                ["office", "Офис"],
                ["warehouse", "Склад"],
              ]),
            },
          ],
        },
        { name: "title", type: "text", label: "Заголовок", required: true },
        {
          type: "row",
          fields: [
            { name: "city", type: "text", label: "Город", required: true },
            { name: "address", type: "text", label: "Адрес", required: true },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "postalCode", type: "text", label: "Индекс" },
            { name: "region", type: "text", label: "Регион" },
          ],
        },
        {
          name: "phones",
          type: "array",
          label: "Телефоны адреса",
          labels: { singular: "Телефон", plural: "Телефоны" },
          fields: [{ name: "number", type: "text", label: "Номер", required: true }],
        },
        {
          type: "row",
          fields: [
            { name: "email", type: "email", label: "E-mail" },
            {
              name: "hours",
              type: "text",
              label: "Часы работы",
              required: true,
              defaultValue: WORK_HOURS_FULL,
            },
          ],
        },
        {
          type: "row",
          fields: [
            { name: "lat", type: "number", label: "Широта", min: -90, max: 90 },
            { name: "lng", type: "number", label: "Долгота", min: -180, max: 180 },
          ],
        },
        { name: "mapUrl", type: "text", label: "Ссылка на Яндекс.Карты" },
        {
          name: "localBusiness",
          type: "checkbox",
          label: "Выводить в JSON-LD LocalBusiness",
          defaultValue: false,
        },
      ],
    },
    {
      name: "messengers",
      type: "array",
      label: "Мессенджеры",
      labels: { singular: "Мессенджер", plural: "Мессенджеры" },
      admin: { description: "Выпадающий список «Связаться с нами» в шапке." },
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text", label: "Название", required: true },
            { name: "url", type: "text", label: "Ссылка", required: true },
            {
              name: "icon",
              type: "select",
              label: "Иконка",
              required: true,
              defaultValue: "other",
              options: options([
                ["telegram", "Telegram"],
                ["whatsapp", "WhatsApp"],
                ["max", "MAX"],
                ["viber", "Viber"],
                ["vk", "VK"],
                ["other", "Другое"],
              ]),
            },
          ],
        },
      ],
    },
    {
      name: "sameAs",
      type: "array",
      label: "Соцсети (sameAs)",
      labels: { singular: "Ссылка", plural: "Ссылки" },
      admin: { description: "Профили компании для JSON-LD Organization." },
      fields: [{ name: "url", type: "text", label: "Ссылка", required: true }],
    },
    {
      name: "inlineText",
      type: "textarea",
      label: "Текст метки {контакты}",
      required: true,
      defaultValue: "+7 (351) 247-05-57, sale@inex.su, пн–пт 9:00–18:00",
    },
    {
      type: "collapsible",
      label: "Ссылка на inex.su",
      fields: [
        {
          name: "inexSuUrl",
          type: "text",
          label: "Адрес inex.su",
          required: true,
          defaultValue: "https://inex.su",
        },
        {
          name: "inexSuFooterLabel",
          type: "text",
          label: "Текст в подвале",
          required: true,
          defaultValue: INEX_SU_LABEL,
        },
        {
          name: "inexSuBridgeLabel",
          type: "text",
          label: "Текст моста на главной",
          required: true,
          defaultValue: INEX_SU_LABEL,
        },
      ],
    },
  ],
};
