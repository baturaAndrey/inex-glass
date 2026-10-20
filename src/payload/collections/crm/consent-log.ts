import { isAdmin, isAdminOrManager } from "@/payload/access";
import { rel } from "@/payload/slugs";
import type { CollectionConfig } from "payload";

/**
 * Immutable personal-data consent journal (152-ФЗ). Records are written by public forms through
 * the Local API (task 17). Nobody edits them through REST/admin; the only change is the
 * anonymization on a data-subject erasure request (task 32, Local API with `overrideAccess`).
 * When the lead is deleted, `lead` becomes empty and the record itself stays.
 */
export const ConsentLog: CollectionConfig = {
  slug: "consent-log",
  labels: { singular: "Согласие", plural: "Журнал согласий" },
  admin: {
    group: "Заявки",
    useAsTitle: "givenAt",
    defaultColumns: ["givenAt", "formType", "consentVersion", "lead", "anonymizedAt"],
  },
  defaultSort: "-givenAt",
  access: {
    read: isAdminOrManager,
    create: isAdmin,
    update: () => false,
    delete: isAdmin,
  },
  fields: [
    {
      name: "lead",
      type: "relationship",
      label: "Заявка",
      relationTo: rel("leads"),
      index: true,
    },
    { name: "formType", type: "text", label: "Форма" },
    { name: "consentVersion", type: "text", label: "Версия согласия" },
    { name: "policyVersion", type: "text", label: "Версия политики" },
    { name: "consentText", type: "textarea", label: "Текст согласия (снимок)" },
    { name: "ip", type: "text", label: "IP" },
    { name: "userAgent", type: "text", label: "User-Agent" },
    { name: "pageUrl", type: "text", label: "Страница" },
    {
      name: "givenAt",
      type: "date",
      label: "Дата согласия",
      defaultValue: () => new Date().toISOString(),
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    // One hash per contact (not one over both), so an erasure request naming only a phone or
    // only an e-mail still finds the records. Computed with `consentPhoneHash` /
    // `consentEmailHash` (`@/payload/utils/normalize`, key FORM_HMAC_SECRET); empty when the
    // form did not provide that contact.
    {
      name: "phoneHash",
      type: "text",
      label: "Хэш телефона",
      index: true,
      admin: {
        description: "HMAC-SHA256 нормализованного телефона: поиск записей после удаления заявки.",
      },
    },
    {
      name: "emailHash",
      type: "text",
      label: "Хэш e-mail",
      index: true,
      admin: {
        description: "HMAC-SHA256 нормализованного e-mail: поиск записей после удаления заявки.",
      },
    },
    {
      name: "anonymizedAt",
      type: "date",
      label: "Анонимизировано",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
