import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import { defaultStatus } from "@/lib/leads-admin/report";
import type { OrderStatus } from "@/lib/orders/status";
import type { Role } from "@/payload/access";
import config from "@payload-config";
import { loadLeadStatuses } from "../leads/data";
import type { NavCounterKey } from "./nav-config";
import type { Payload, TypedUser } from "payload";

/**
 * Sidebar counters (server only): new leads (the default status) and orders in progress.
 *
 * At most three queries per render (`lead-statuses` + two `count`), cached for 60 s per user
 * with `unstable_cache` (tag `admin-nav-counters`, kept for future invalidation) and deduped
 * within one render by React `cache`. The cached function must not touch the request
 * (`headers()` / `cookies()`), so it takes Payload from `getPayload({ config })` and a minimal
 * user object: the collections' access functions only look at `getRole(user)`.
 *
 * Counts run with the user's access (`overrideAccess: false`). Any error hides the counter
 * (`null`) and logs one line without personal data; the menu still renders.
 */

export type NavCounters = Record<NavCounterKey, number | null>;
export type NavCounterNeeds = Record<NavCounterKey, boolean>;

export const NAV_COUNTERS_TAG = "admin-nav-counters";
const NAV_COUNTERS_TTL_SECONDS = 60;

/** Orders before shipping: not «Отгружено» and not «Получено». */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  "spec_agreed",
  "in_production",
  "packed",
];

type CounterUser = { id: string; role: Role; collection: "users" };

async function countNewLeads(payload: Payload, user: CounterUser): Promise<number | null> {
  const status = defaultStatus(await loadLeadStatuses(payload));
  if (!status) return null;
  const { totalDocs } = await payload.count({
    collection: "leads",
    where: { status: { equals: status.id } },
    overrideAccess: false,
    user: user as unknown as TypedUser,
  });
  return totalDocs;
}

async function countActiveOrders(payload: Payload, user: CounterUser): Promise<number | null> {
  const { totalDocs } = await payload.count({
    collection: "orders",
    where: { currentStatus: { in: [...ACTIVE_ORDER_STATUSES] } },
    overrideAccess: false,
    user: user as unknown as TypedUser,
  });
  return totalDocs;
}

/** Runs one counter; a failure yields `null` and one log line (counter name and error class). */
async function safely(
  payload: Payload,
  counter: NavCounterKey,
  run: () => Promise<number | null>
): Promise<number | null> {
  try {
    return await run();
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown error";
    payload.logger.error(`admin-nav: counter "${counter}" failed (${reason})`);
    return null;
  }
}

async function countAll(userId: string, role: Role, need: NavCounterNeeds): Promise<NavCounters> {
  const payload = await getPayload({ config });
  const user: CounterUser = { id: userId, role, collection: "users" };
  const [newLeads, activeOrders] = await Promise.all([
    need.newLeads ? safely(payload, "newLeads", () => countNewLeads(payload, user)) : null,
    need.activeOrders
      ? safely(payload, "activeOrders", () => countActiveOrders(payload, user))
      : null,
  ]);
  return { newLeads, activeOrders };
}

/** Counters of the visible items only (a user who cannot see «Заказы» pays no query for it). */
export const getNavCounters = cache(
  (userId: string, role: Role, needNewLeads: boolean, needActiveOrders: boolean) =>
    unstable_cache(
      () => countAll(userId, role, { newLeads: needNewLeads, activeOrders: needActiveOrders }),
      ["admin-nav-counters", userId, role, String(needNewLeads), String(needActiveOrders)],
      { revalidate: NAV_COUNTERS_TTL_SECONDS, tags: [NAV_COUNTERS_TAG] }
    )()
);
