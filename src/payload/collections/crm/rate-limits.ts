import type { CollectionConfig } from "payload";

const denyAll = () => false;

/**
 * Anti-spam counters (fixed window) for public forms.
 *
 * Contract with task 17: table `rate_limits` with columns `key` (unique), `count`,
 * `window_start`; it runs `INSERT … ON CONFLICT (key) DO UPDATE` through `payload.db.drizzle`.
 * Closed for REST/GraphQL and hidden in the admin.
 */
export const RateLimits: CollectionConfig = {
  slug: "rate-limits",
  labels: { singular: "Rate limit", plural: "Rate limits" },
  admin: { group: "Служебное", hidden: true, useAsTitle: "key" },
  access: {
    read: denyAll,
    create: denyAll,
    update: denyAll,
    delete: denyAll,
  },
  fields: [
    {
      name: "key",
      type: "text",
      label: "Ключ",
      required: true,
      unique: true,
      admin: { description: "Например: lead:ip:1.2.3.4" },
    },
    { name: "count", type: "number", label: "Счётчик", required: true, defaultValue: 0 },
    { name: "windowStart", type: "date", label: "Начало окна", required: true },
  ],
};
