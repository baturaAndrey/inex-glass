import { isAdmin } from "@/payload/access";
import { rel } from "@/payload/slugs";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_STATUSES,
  toOptions,
} from "./constants";
import type { CollectionConfig } from "payload";

const denyAll = () => false;

/**
 * Journal of messenger notifications (MAX): idempotency of jobs (unique `key`) and the source of
 * the lead timeline (task 08). Written only via Local API by jobs (task 10); erased together with
 * the lead (task 10, `src/lib/leads-admin/erase.ts`).
 * Key format: `max:<event>:<leadId|orderId>[:<suffix>]`, e.g. `max:new-lead:<leadId>`,
 * `max:status:<leadId>:<statusChangedAt ISO>`, `max:assigned:<leadId>:<assigneeId>`,
 * `max:unassigned:<leadId>`, `max:order:<orderId>:<status>`.
 */
export const NotificationLog: CollectionConfig = {
  slug: "notification-log",
  labels: { singular: "Уведомление", plural: "Журнал уведомлений" },
  admin: {
    group: "Служебное",
    hidden: true,
    useAsTitle: "key",
    defaultColumns: ["sentAt", "event", "channel", "status"],
  },
  defaultSort: "-createdAt",
  access: { read: isAdmin, create: denyAll, update: denyAll, delete: denyAll },
  fields: [
    { name: "key", type: "text", label: "Ключ", required: true, unique: true, index: true },
    {
      name: "channel",
      type: "select",
      label: "Канал",
      required: true,
      options: toOptions(NOTIFICATION_CHANNELS),
    },
    {
      name: "event",
      type: "select",
      label: "Событие",
      required: true,
      options: toOptions(NOTIFICATION_EVENTS),
    },
    { name: "lead", type: "relationship", label: "Заявка", relationTo: rel("leads"), index: true },
    { name: "order", type: "relationship", label: "Заказ", relationTo: rel("orders"), index: true },
    { name: "recipient", type: "relationship", label: "Получатель", relationTo: rel("users") },
    { name: "chatId", type: "text", label: "ID чата" },
    { name: "messageId", type: "text", label: "ID сообщения" },
    {
      name: "status",
      type: "select",
      label: "Статус",
      required: true,
      defaultValue: "sent",
      options: toOptions(NOTIFICATION_STATUSES),
    },
    { name: "error", type: "text", label: "Ошибка" },
    {
      name: "sentAt",
      type: "date",
      label: "Отправлено",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
