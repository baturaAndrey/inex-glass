import { isAdmin, isAdminOrManager } from "@/payload/access";
import {
  assignOrderNumber,
  computeOrderState,
  findRepeatedStatus,
} from "@/payload/hooks/order-hooks";
import type { StatusHistoryEntry } from "@/payload/hooks/order-hooks";
import { orderLifecycleAfterChange, syncStatusHistory } from "@/payload/hooks/order-lifecycle";
import { orderMaxNotify } from "@/payload/hooks/order-max-notify";
import { rel } from "@/payload/slugs";
import { ORDER_DOCUMENT_KINDS, ORDER_STATUSES, STAFF_ROLES, toOptions } from "./constants";
import { neverReadable, systemOnly } from "./field-access";
import type { ArrayFieldValidation, CollectionConfig, TextFieldValidation } from "payload";

/** Filled by hooks or by tasks 18/33 (Local API): read-only in the admin, closed for the APIs. */
const computed = { readOnly: true, position: "sidebar" } as const;
const dateTime = { pickerAppearance: "dayAndTime" } as const;

const STATUS_LABELS: ReadonlyMap<string, string> = new Map(
  ORDER_STATUSES.map(({ value, label }) => [value, label])
);

/** At least one stage, each stage at most once. */
const validateStatusHistory: ArrayFieldValidation = (value) => {
  if (!Array.isArray(value) || value.length === 0) return "Добавьте хотя бы один статус";
  const repeated = findRepeatedStatus(value as StatusHistoryEntry[]);
  if (repeated === null) return true;
  return `Статус «${STATUS_LABELS.get(repeated) ?? repeated}» уже есть в истории`;
};

const validateHttpUrl: TextFieldValidation = (value) => {
  if (typeof value !== "string" || value.trim() === "") return true;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:" ? true : "Нужна ссылка http(s)://…";
  } catch {
    return "Нужна ссылка http(s)://…";
  }
};

/**
 * Orders (ТЗ §6.2): created automatically when a lead reaches the «Договор» status (task 33).
 * The client sees the order at `/zakaz/<token>/` without registration; only the SHA-256 of the
 * token is stored. Client contacts are internal and never rendered on that page.
 */
export const Orders: CollectionConfig = {
  slug: "orders",
  labels: { singular: "Заказ", plural: "Заказы" },
  admin: {
    group: "Заказы",
    useAsTitle: "number",
    defaultColumns: ["number", "company", "currentStatus", "manager", "expiresAt", "createdAt"],
    listSearchableFields: ["number", "company", "composition"],
    components: {
      views: {
        edit: {
          // «Управление» (task 33): client link, status change, warnings.
          manage: {
            Component: "/payload/admin/orders/order-manage-view#OrderManageView",
            path: "/manage",
            tab: { label: "Управление", href: "/manage", order: 50 },
          },
        },
      },
    },
  },
  defaultSort: "-createdAt",
  access: {
    read: isAdminOrManager,
    create: isAdminOrManager,
    update: isAdminOrManager,
    delete: isAdmin,
  },
  hooks: {
    // `syncStatusHistory` must run before `computeOrderState`, which derives the status from it.
    beforeChange: [assignOrderNumber, syncStatusHistory, computeOrderState],
    afterChange: [orderLifecycleAfterChange, orderMaxNotify],
  },
  fields: [
    {
      name: "number",
      type: "text",
      label: "Номер",
      unique: true,
      access: systemOnly,
      admin: { ...computed, description: "ГГГГ-NNNN, присваивается автоматически." },
    },
    {
      name: "lead",
      type: "relationship",
      label: "Заявка",
      relationTo: rel("leads"),
      index: true,
      admin: { position: "sidebar" },
    },
    { name: "company", type: "text", label: "Компания" },
    {
      name: "composition",
      type: "textarea",
      label: "Состав заказа",
      admin: { description: "Например: «Закалённое стекло 10 мм, 86 м², 42 позиции»." },
    },

    // --- Client (internal, not shown on the order page) -------------------------------------
    {
      type: "collapsible",
      label: "Клиент (не показывается на странице заказа)",
      fields: [
        { name: "clientName", type: "text", label: "Контактное лицо" },
        {
          name: "clientEmail",
          type: "email",
          label: "E-mail для писем",
          admin: { description: "Без адреса письма клиенту не отправляются." },
        },
        { name: "clientPhone", type: "text", label: "Телефон" },
        {
          name: "notifyClient",
          type: "checkbox",
          label: "Уведомлять клиента о смене статуса",
          defaultValue: true,
        },
      ],
    },
    {
      name: "manager",
      type: "relationship",
      label: "Менеджер",
      relationTo: rel("users"),
      // Optional: task 33 creates the order without a manager when the lead has no assignee, and
      // deleting a staff user clears the reference (FK `ON DELETE SET NULL`).
      filterOptions: { role: { in: [...STAFF_ROLES] } },
      admin: {
        position: "sidebar",
        description: "Карточка «Ваш менеджер» на странице заказа. Пусто — карточка не выводится.",
      },
    },

    // --- Progress -------------------------------------------------------------------------
    {
      name: "statusHistory",
      type: "array",
      label: "История статусов",
      labels: { singular: "Статус", plural: "Статусы" },
      required: true,
      minRows: 1,
      validate: validateStatusHistory,
      admin: { description: "Каждый этап — один раз; записи упорядочиваются по этапам." },
      fields: [
        {
          name: "status",
          type: "select",
          label: "Статус",
          required: true,
          options: toOptions(ORDER_STATUSES),
        },
        { name: "date", type: "date", label: "Дата", required: true },
        { name: "plannedDate", type: "date", label: "Плановая дата" },
        { name: "note", type: "text", label: "Примечание" },
      ],
    },
    {
      name: "currentStatus",
      type: "select",
      label: "Текущий статус",
      options: toOptions(ORDER_STATUSES),
      access: systemOnly,
      // List cell only (task 33): coloured status badge.
      admin: {
        ...computed,
        components: { Cell: "/payload/admin/orders/cells/status-cell#StatusCell" },
      },
    },
    {
      name: "clientComment",
      type: "group",
      label: "Комментарий менеджера",
      fields: [
        { name: "text", type: "textarea", label: "Комментарий менеджера" },
        { name: "updatedAt", type: "date", label: "Обновлён", admin: { date: dateTime } },
      ],
    },
    {
      name: "packPhotos",
      type: "array",
      label: "Фото упаковки",
      labels: { singular: "Фото", plural: "Фото" },
      fields: [
        {
          name: "photo",
          type: "upload",
          label: "Фото",
          relationTo: rel("order-files"),
          required: true,
        },
        { name: "caption", type: "text", label: "Подпись" },
      ],
    },
    {
      name: "shipment",
      type: "group",
      label: "Отгрузка",
      fields: [
        { name: "carrier", type: "text", label: "Транспортная компания" },
        { name: "waybill", type: "text", label: "Номер накладной" },
        {
          name: "trackingUrl",
          type: "text",
          label: "Ссылка для отслеживания",
          validate: validateHttpUrl,
        },
      ],
    },
    {
      name: "documents",
      type: "array",
      label: "Документы",
      labels: { singular: "Документ", plural: "Документы" },
      fields: [
        { name: "title", type: "text", label: "Название", required: true },
        { name: "kind", type: "select", label: "Вид", options: toOptions(ORDER_DOCUMENT_KINDS) },
        {
          name: "file",
          type: "upload",
          label: "Файл",
          relationTo: rel("order-files"),
          required: true,
        },
      ],
    },

    // --- Client link (task 33) ------------------------------------------------------------
    {
      name: "tokenHash",
      type: "text",
      label: "Хэш токена",
      unique: true,
      access: neverReadable,
      admin: { hidden: true },
    },
    {
      name: "tokenCreatedAt",
      type: "date",
      label: "Ссылка выпущена",
      access: systemOnly,
      admin: { ...computed, date: dateTime },
    },
    {
      name: "tokenReissueCount",
      type: "number",
      label: "Перевыпусков ссылки",
      defaultValue: 0,
      access: systemOnly,
      admin: computed,
    },
    {
      name: "revoked",
      type: "checkbox",
      label: "Ссылка отозвана",
      defaultValue: false,
      admin: { position: "sidebar" },
    },
    {
      name: "receivedAt",
      type: "date",
      label: "Получено клиентом",
      access: systemOnly,
      admin: computed,
    },
    {
      name: "expiresAt",
      type: "date",
      label: "Ссылка действует до",
      access: systemOnly,
      admin: {
        ...computed,
        description: "Дата получения + срок из настроек сайта.",
        // List cell only (task 33): «Отозвана» / «Действует» / «До …» / «Истекла …».
        components: { Cell: "/payload/admin/orders/cells/link-expiry-cell#LinkExpiryCell" },
      },
    },

    // --- Notification idempotency (tasks 18/33) -------------------------------------------
    {
      name: "lastNotifiedStatus",
      type: "text",
      label: "Последнее уведомление о статусе",
      access: systemOnly,
      admin: computed,
    },
    {
      name: "lastNotifiedAt",
      type: "date",
      label: "Клиент уведомлён",
      access: systemOnly,
      admin: { ...computed, date: dateTime },
    },
  ],
};
