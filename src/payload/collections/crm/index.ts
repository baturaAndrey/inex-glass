import { ConsentLog } from "./consent-log";
import { LeadFiles } from "./lead-files";
import { LeadStatuses } from "./lead-statuses";
import { Leads } from "./leads";
import { NotificationLog } from "./notification-log";
import { OrderFiles } from "./order-files";
import { Orders } from "./orders";
import { RateLimits } from "./rate-limits";
import { Redirects } from "./redirects";
import type { CollectionConfig } from "payload";

/**
 * CRM collections registry (ТЗ §6.1–6.2): leads, orders, consent log, redirects, rate limits,
 * messenger notification log (admin redesign).
 */
export const crmCollections: CollectionConfig[] = [
  LeadFiles,
  LeadStatuses,
  Leads,
  Orders,
  OrderFiles,
  ConsentLog,
  Redirects,
  RateLimits,
  NotificationLog,
];
