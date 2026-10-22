import { MAINTENANCE_QUEUE, MAINTENANCE_RETRIES } from "./shared";
import type { TaskConfig } from "payload";

/**
 * `max-unassigned-reminder` (every 15 min): reminds the MAX group chat about new leads left
 * without an assignee for more than 2 hours, once per lead (task 10). Slug and schedule are a
 * contract frozen by the `admin_redesign` migration: task 10 changes only the handler body.
 */

export const MAX_UNASSIGNED_REMINDER = "max-unassigned-reminder";

export const maxUnassignedReminderTask: TaskConfig<{ input: object; output: object }> = {
  slug: MAX_UNASSIGNED_REMINDER,
  label: "Напоминание в MAX: заявки без ответственного",
  retries: MAINTENANCE_RETRIES,
  schedule: [{ cron: "*/15 * * * *", queue: MAINTENANCE_QUEUE }],
  // Stub (task 01): task 10 implements the reminder. Must stay a no-op until then.
  handler: async () => ({ output: {} }),
};
