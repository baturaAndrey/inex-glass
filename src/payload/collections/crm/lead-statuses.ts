import { isAdmin, isAdminOrManager } from "@/payload/access";
import { ensureSingleDefaultStatus } from "@/payload/hooks/lead-hooks";
import type { CollectionConfig, TextFieldValidation } from "payload";

const STATUS_SLUG_PATTERN = /^[a-z0-9-]+$/;

const validateStatusSlug: TextFieldValidation = (value) => {
  if (typeof value !== "string" || value === "") return "Укажите слаг";
  return STATUS_SLUG_PATTERN.test(value)
    ? true
    : "Только латиница в нижнем регистре, цифры и дефис";
};

/**
 * Editable lead funnel (ТЗ §6.1): «Новая», «В работе», «КП отправлено», «Договор», «Отказ».
 * Initial records come from the seed (task 16); only admins change them.
 */
export const LeadStatuses: CollectionConfig = {
  slug: "lead-statuses",
  labels: { singular: "Статус заявки", plural: "Статусы заявок" },
  admin: {
    group: "Заявки",
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "order", "isDefault", "isFinal"],
  },
  defaultSort: "order",
  access: {
    read: isAdminOrManager,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [ensureSingleDefaultStatus],
  },
  fields: [
    { name: "name", type: "text", label: "Название", required: true },
    {
      name: "slug",
      type: "text",
      label: "Слаг",
      required: true,
      unique: true,
      validate: validateStatusSlug,
      admin: {
        description: "Латиница, цифры и дефис: new, in-progress, kp-sent, contract, refused.",
      },
    },
    {
      name: "order",
      type: "number",
      label: "Порядок в воронке",
      required: true,
      admin: { step: 1 },
    },
    {
      name: "color",
      type: "text",
      label: "Цвет бейджа",
      admin: { description: "HEX (#2563eb) или токен дизайн-системы." },
    },
    {
      name: "isDefault",
      type: "checkbox",
      label: "Статус новых заявок",
      defaultValue: false,
      admin: { description: "Может быть только один: при сохранении флаг снимается с остальных." },
    },
    { name: "isFinal", type: "checkbox", label: "Финальный", defaultValue: false },
    {
      name: "requiresReason",
      type: "checkbox",
      label: "Требует причину",
      defaultValue: false,
      admin: { description: "Заявку в этом статусе нельзя сохранить без причины отказа." },
    },
    {
      name: "isContract",
      type: "checkbox",
      label: "Договор",
      defaultValue: false,
      admin: { description: "При переводе заявки в этот статус создаётся заказ." },
    },
  ],
};
