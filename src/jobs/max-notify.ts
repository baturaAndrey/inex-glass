import { MAIL_RETRIES } from "./shared";
import type { TaskConfig } from "payload";

/**
 * `max-notify`: one messenger (MAX) notification about a lead or order event. Queued by the
 * `leadMaxNotify` / `orderMaxNotify` hooks (task 10). Slug and input shape are a contract frozen
 * by the `admin_redesign` migration: task 10 changes only the handler body.
 */

export const MAX_NOTIFY = "max-notify";

export const MAX_NOTIFY_EVENTS = ["new_lead", "status_change", "assigned", "order_event"] as const;

export type MaxNotifyEvent = (typeof MAX_NOTIFY_EVENTS)[number];

export type MaxNotifyInput = {
  event: MaxNotifyEvent;
  leadId?: string;
  orderId?: string;
  assigneeId?: string;
  statusChangedAt?: string;
  /** Status id before the change — «из → в» in the message (task 10). */
  previousStatus?: string;
  orderStatus?: string;
};

export const maxNotifyTask: TaskConfig<{ input: MaxNotifyInput; output: object }> = {
  slug: MAX_NOTIFY,
  label: "Уведомление в MAX",
  inputSchema: [
    {
      name: "event",
      type: "select",
      required: true,
      options: MAX_NOTIFY_EVENTS.map((value) => ({ label: value, value })),
    },
    { name: "leadId", type: "text" },
    { name: "orderId", type: "text" },
    { name: "assigneeId", type: "text" },
    { name: "statusChangedAt", type: "text" },
    { name: "previousStatus", type: "text" },
    { name: "orderStatus", type: "text" },
  ],
  retries: MAIL_RETRIES,
  // Stub (task 01): task 10 implements sending. Must stay a no-op until then.
  handler: async () => ({ output: {} }),
};
