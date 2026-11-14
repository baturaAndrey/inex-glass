import { cache } from "react";
import type { Payload } from "payload";

/**
 * Request-scoped lookups shared by the leads admin server components (list cells, quick
 * filters, summary, report). React `cache` dedupes them per server render, so a list page with
 * 25 status cells runs one query, not 25.
 */

export type StatusOption = {
  id: string;
  name: string;
  slug: string;
  order: number;
  color: string | null;
  isDefault: boolean;
  isFinal: boolean;
  isContract: boolean;
  requiresReason: boolean;
};

/** All lead statuses in funnel order (staff may read them; the table is tiny). */
export const loadLeadStatuses = cache(async (payload: Payload): Promise<StatusOption[]> => {
  const { docs } = await payload.find({
    collection: "lead-statuses",
    sort: "order",
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  return docs.map((doc) => ({
    id: String(doc.id),
    name: doc.name,
    slug: doc.slug,
    order: doc.order,
    color: doc.color ?? null,
    isDefault: doc.isDefault === true,
    isFinal: doc.isFinal === true,
    isContract: doc.isContract === true,
    requiresReason: doc.requiresReason === true,
  }));
});

/** Staff users (id → display name) for assignee labels; names only, never contacts. */
export const loadStaffNames = cache(async (payload: Payload): Promise<Map<string, string>> => {
  const { docs } = await payload.find({
    collection: "users",
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { name: true },
  });
  return new Map(docs.map((doc) => [String(doc.id), doc.name?.trim() || "Без имени"]));
});
