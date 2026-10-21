import { adminOrManagerFieldAccess, isAdmin, isAdminOrManager } from "@/payload/access";
import { notifyAssigneeChange } from "@/payload/hooks/lead-assignee-notify";
import { stampInternalComments } from "@/payload/hooks/lead-comments";
import {
  assignDefaultStatus,
  detectDuplicate,
  normalizeContacts,
  touchStatusChangedAt,
  validateInn,
  validateLeadStatus,
  validatePhone,
  validateRefuseReason,
} from "@/payload/hooks/lead-hooks";
import { validateLeadStatusReason } from "@/payload/hooks/lead-status-validation";
import { orderFromLead } from "@/payload/hooks/order-from-lead";
import { rel } from "@/payload/slugs";
import {
  DUPLICATE_REASONS,
  LEAD_FLAGS,
  LEAD_FORM_TYPES,
  LEAD_PRODUCT_TYPES,
  LEAD_ROLES,
  STAFF_ROLES,
  toOptions,
} from "./constants";
import { systemOnly } from "./field-access";
import type { CollectionConfig, Field } from "payload";

const MAX_VERSIONS_PER_LEAD = 50;

/** Admin components of the leads module (task 32), paths relative to `importMap.baseDir` (src). */
const ADMIN_LEADS = "/payload/admin/leads";
const LEADS_PAGE_SIZE = 25;

const UTM_KEYS = [
  "source",
  "medium",
  "campaign",
  "term",
  "content",
  "yclid",
  "gclid",
  "openstat",
] as const;

/** Filled by hooks or by tasks 17/18 (Local API): read-only in the admin, closed for the APIs. */
const computed = { readOnly: true, position: "sidebar" } as const;

const utmField: Field = {
  name: "utm",
  type: "group",
  label: "UTM-метки",
  fields: UTM_KEYS.map((key) => ({ name: key, type: "text", label: key })),
};

/**
 * Leads (ТЗ §6.1) — the CRM inside the site.
 *
 * Public forms create leads via the Local API with `overrideAccess` (task 17), never via REST.
 * Versions keep the change history; personal-data erasure on request (task 32) deletes the lead
 * together with its versions.
 */
export const Leads: CollectionConfig = {
  slug: "leads",
  labels: { singular: "Заявка", plural: "Заявки" },
  admin: {
    group: "Заявки",
    useAsTitle: "name",
    // `formType` renders the source (form, label, entry page), `name` the whole contact.
    defaultColumns: [
      "createdAt",
      "formType",
      "company",
      "name",
      "area",
      "productType",
      "status",
      "assignee",
      "isDuplicate",
    ],
    // Phones are stored normalized (+7XXXXXXXXXX); a substring search finds partial numbers.
    listSearchableFields: ["company", "name", "phone", "email", "inn", "sourceLabel", "comment"],
    pagination: { defaultLimit: LEADS_PAGE_SIZE },
    components: {
      beforeListTable: [`${ADMIN_LEADS}/lead-list-quick-filters#LeadListQuickFilters`],
      edit: {
        editMenuItems: [`${ADMIN_LEADS}/erase-menu-item#EraseMenuItem`],
      },
      views: {
        edit: {
          summary: {
            Component: `${ADMIN_LEADS}/lead-summary-view#LeadSummaryView`,
            path: "/summary",
            tab: { label: "Сводка", href: "/summary", order: 150 },
          },
        },
      },
    },
  },
  defaultSort: "-createdAt",
  versions: { maxPerDoc: MAX_VERSIONS_PER_LEAD, drafts: false },
  access: {
    read: isAdminOrManager,
    create: isAdminOrManager,
    update: isAdminOrManager,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [normalizeContacts, validateLeadStatusReason],
    beforeChange: [
      assignDefaultStatus,
      touchStatusChangedAt,
      detectDuplicate,
      stampInternalComments,
    ],
    // Order matters: the assignee e-mail job first, then the order (task 33).
    afterChange: [notifyAssigneeChange, orderFromLead],
  },
  fields: [
    // --- Source ---------------------------------------------------------------------------
    {
      name: "formType",
      type: "select",
      label: "Форма",
      required: true,
      index: true,
      options: toOptions(LEAD_FORM_TYPES),
      admin: { components: { Cell: `${ADMIN_LEADS}/cells/source-cell#SourceCell` } },
    },
    {
      name: "sourceLabel",
      type: "text",
      label: "Источник",
      admin: { description: "«Квиз», «Форма: Отправить чертёж», «Форма: Заказать звонок» …" },
    },
    {
      name: "entryPage",
      type: "text",
      label: "Страница входа",
      admin: { description: "Путь страницы, с которой открыт квиз или форма." },
    },
    { name: "pageUrl", type: "text", label: "Страница отправки" },
    { name: "referrer", type: "text", label: "Referrer" },
    utmField,
    {
      name: "metrikaClientId",
      type: "text",
      label: "ClientID Метрики",
      admin: { description: "Пусто, если посетитель не дал согласие на аналитику." },
    },

    // --- Contacts -------------------------------------------------------------------------
    { name: "company", type: "text", label: "Компания" },
    { name: "inn", type: "text", label: "ИНН", validate: validateInn },
    {
      name: "name",
      type: "text",
      label: "Имя",
      required: true,
      admin: { components: { Cell: `${ADMIN_LEADS}/cells/contact-cell#ContactCell` } },
    },
    {
      name: "phone",
      type: "text",
      label: "Телефон",
      required: true,
      index: true,
      validate: validatePhone,
      admin: { description: "Хранится в формате +7XXXXXXXXXX." },
    },
    {
      name: "phoneRaw",
      type: "text",
      label: "Телефон (как ввёл клиент)",
      // Set by `normalizeContacts` (collection hook, runs after field access) or by intake.
      access: systemOnly,
      admin: { readOnly: true },
    },
    { name: "email", type: "email", label: "E-mail", index: true },
    { name: "role", type: "select", label: "Роль клиента", options: toOptions(LEAD_ROLES) },
    { name: "city", type: "text", label: "Город доставки" },

    // --- Request --------------------------------------------------------------------------
    { name: "area", type: "number", label: "Площадь, м²", min: 0 },
    {
      name: "productType",
      type: "select",
      label: "Тип изделия",
      options: toOptions(LEAD_PRODUCT_TYPES),
    },
    { name: "comment", type: "textarea", label: "Комментарий клиента" },
    {
      name: "answers",
      type: "json",
      label: "Ответы (как есть)",
      admin: { description: "Все ответы квиза или формы без преобразования." },
    },
    { name: "answersSummary", type: "textarea", label: "Сводка ответов" },
    {
      name: "estimate",
      type: "group",
      label: "Ориентир стоимости",
      fields: [
        { name: "from", type: "number", label: "От, ₽", min: 0 },
        { name: "priceDate", type: "date", label: "Дата прайса" },
        { name: "shown", type: "checkbox", label: "Показан клиенту", defaultValue: false },
      ],
    },
    {
      name: "flags",
      type: "select",
      label: "Флаги",
      hasMany: true,
      options: toOptions(LEAD_FLAGS),
      admin: { components: { Cell: `${ADMIN_LEADS}/cells/flags-cell#FlagsCell` } },
    },
    {
      name: "files",
      type: "relationship",
      label: "Файлы",
      relationTo: rel("lead-files"),
      hasMany: true,
    },

    // --- Processing -----------------------------------------------------------------------
    {
      name: "status",
      type: "relationship",
      label: "Статус",
      relationTo: rel("lead-statuses"),
      index: true,
      validate: validateLeadStatus,
      admin: {
        position: "sidebar",
        components: { Cell: `${ADMIN_LEADS}/cells/status-cell#StatusCell` },
      },
    },
    {
      name: "statusChangedAt",
      type: "date",
      label: "Статус изменён",
      access: systemOnly,
      admin: { ...computed, date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "refuseReason",
      type: "textarea",
      label: "Причина отказа",
      validate: validateRefuseReason,
    },
    {
      name: "assignee",
      type: "relationship",
      label: "Ответственный",
      relationTo: rel("users"),
      index: true,
      filterOptions: { role: { in: [...STAFF_ROLES] } },
      admin: { position: "sidebar" },
    },
    {
      name: "internalComments",
      type: "array",
      label: "Внутренние комментарии",
      labels: { singular: "Комментарий", plural: "Комментарии" },
      access: { read: adminOrManagerFieldAccess },
      // Row shape `{ author, text, date }` is the contract with task 32. `author` and `date`
      // are stamped from the defaults for new rows (rows are matched by id, so existing rows keep
      // their stored values) and cannot be forged through the APIs.
      fields: [
        {
          name: "author",
          type: "relationship",
          label: "Автор",
          relationTo: rel("users"),
          defaultValue: ({ user }) => user?.id,
          access: systemOnly,
          admin: { readOnly: true },
        },
        { name: "text", type: "textarea", label: "Текст", required: true },
        {
          name: "date",
          type: "date",
          label: "Дата",
          defaultValue: () => new Date().toISOString(),
          access: systemOnly,
          admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
        },
      ],
    },

    // --- Duplicates (computed by detectDuplicate) -----------------------------------------
    {
      name: "isDuplicate",
      type: "checkbox",
      label: "Дубль",
      defaultValue: false,
      index: true,
      access: systemOnly,
      admin: {
        ...computed,
        components: { Cell: `${ADMIN_LEADS}/cells/duplicate-cell#DuplicateCell` },
      },
    },
    {
      name: "duplicateOf",
      type: "relationship",
      label: "Дубль заявки",
      relationTo: rel("leads"),
      access: systemOnly,
      admin: computed,
    },
    {
      name: "duplicateReason",
      type: "select",
      label: "Совпадение по",
      options: toOptions(DUPLICATE_REASONS),
      access: systemOnly,
      admin: computed,
    },

    // --- Links ----------------------------------------------------------------------------
    {
      name: "consent",
      type: "relationship",
      label: "Согласие на ПДн",
      relationTo: rel("consent-log"),
      access: systemOnly,
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      name: "orders",
      type: "join",
      label: "Заказы",
      collection: rel("orders"),
      on: "lead",
    },

    // --- Notification idempotency (task 18) -----------------------------------------------
    {
      name: "newLeadNotifiedAt",
      type: "date",
      label: "Письмо о заявке отправлено",
      access: systemOnly,
      admin: { ...computed, date: { pickerAppearance: "dayAndTime" } },
    },
    {
      name: "assigneeNotifiedAt",
      type: "date",
      label: "Ответственный уведомлён",
      access: systemOnly,
      admin: { ...computed, date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
