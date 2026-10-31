import { adminOrManagerFieldAccess, getRole, isAdmin, isAnyone } from "../access";
import { revalidateGlobal } from "../hooks/revalidate";
import { rel } from "../slugs";
import { GROUP_REFERENCES } from "./shared";
import type { FieldAccess, GlobalConfig, TextFieldSingleValidation } from "payload";

/** Validates an optional string of exactly one of the given digit counts. */
const digits =
  (lengths: readonly number[], message: string): TextFieldSingleValidation =>
  (value) => {
    if (!value) return true;
    return /^\d+$/.test(value) && lengths.includes(value.length) ? true : message;
  };

/**
 * The legal address is a residential flat: staff always see it, the public API returns it only
 * after Inex opts in via `publishLegalAddress`. On read Payload passes the stored document as
 * `doc`/`siblingData`; where no document is available (permission maps) the public is denied.
 */
const legalAddressReadAccess: FieldAccess = ({ req: { user }, doc, siblingData }) => {
  if (getRole(user) !== null) return true;
  const source = (siblingData ?? doc) as { publishLegalAddress?: unknown } | undefined;
  return source?.publishLegalAddress === true;
};

export const Requisites: GlobalConfig = {
  slug: "requisites",
  label: "Реквизиты",
  admin: {
    group: GROUP_REFERENCES,
    description: "Метка {реквизиты}, блок реквизитов на странице контактов, тексты ПДн.",
  },
  access: { read: isAnyone, update: isAdmin },
  versions: { max: 20 },
  hooks: { afterChange: [revalidateGlobal("requisites")] },
  fields: [
    {
      name: "legalName",
      type: "text",
      label: "Полное наименование",
      defaultValue: "Индивидуальный предприниматель Копылов Александр Михайлович",
    },
    {
      name: "shortName",
      type: "text",
      label: "Краткое наименование",
      defaultValue: "ИП Копылов А. М.",
    },
    {
      type: "row",
      fields: [
        {
          name: "inn",
          type: "text",
          label: "ИНН",
          defaultValue: "744700156319",
          validate: digits([10, 12], "ИНН — 10 или 12 цифр"),
        },
        {
          name: "ogrnip",
          type: "text",
          label: "ОГРНИП",
          defaultValue: "323745600102871",
          validate: digits([15], "ОГРНИП — 15 цифр"),
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "ogrn",
          type: "text",
          label: "ОГРН",
          validate: digits([13], "ОГРН — 13 цифр"),
        },
        {
          name: "kpp",
          type: "text",
          label: "КПП",
          validate: digits([9], "КПП — 9 цифр"),
        },
      ],
    },
    {
      name: "actualAddress",
      type: "text",
      label: "Фактический адрес",
      defaultValue: "г. Челябинск, Свердловский тракт, 7В",
    },
    {
      name: "legalAddress",
      type: "text",
      label: "Юридический адрес",
      access: { read: legalAddressReadAccess },
    },
    {
      name: "publishLegalAddress",
      type: "checkbox",
      label: "Публиковать юридический адрес",
      defaultValue: false,
      admin: {
        description: "Юридический адрес — жилое помещение: не публиковать без решения Inex.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "phone",
          type: "text",
          label: "Телефон",
          admin: { description: "Если пусто — берётся из «Контактов»." },
        },
        {
          name: "email",
          type: "email",
          label: "E-mail",
          admin: { description: "Если пусто — берётся из «Контактов»." },
        },
      ],
    },
    {
      name: "bank",
      type: "group",
      label: "Банк",
      // Bank details are not public: only staff can read them through the API.
      access: { read: adminOrManagerFieldAccess },
      fields: [
        { name: "name", type: "text", label: "Банк", defaultValue: "ООО «Банк Точка»" },
        {
          type: "row",
          fields: [
            { name: "bik", type: "text", label: "БИК", validate: digits([9], "БИК — 9 цифр") },
            {
              name: "account",
              type: "text",
              label: "Расчётный счёт",
              validate: digits([20], "Расчётный счёт — 20 цифр"),
            },
            {
              name: "corrAccount",
              type: "text",
              label: "Корр. счёт",
              validate: digits([20], "Корр. счёт — 20 цифр"),
            },
          ],
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "cardPdf",
          type: "upload",
          label: "Карточка предприятия (PDF)",
          relationTo: rel("media"),
        },
        {
          name: "cardLabel",
          type: "text",
          label: "Текст ссылки на карточку",
          defaultValue: "Скачать карточку предприятия",
        },
      ],
    },
    {
      name: "inlineText",
      type: "textarea",
      label: "Текст метки {реквизиты}",
      defaultValue: "ИП Копылов Александр Михайлович, ИНН 744700156319, ОГРНИП 323745600102871",
    },
    {
      type: "collapsible",
      label: "Отзыв согласия на обработку ПДн",
      fields: [
        { name: "pdContactEmail", type: "email", label: "E-mail для отзыва согласия" },
        { name: "pdPostalAddress", type: "text", label: "Почтовый адрес для отзыва согласия" },
      ],
    },
  ],
};
