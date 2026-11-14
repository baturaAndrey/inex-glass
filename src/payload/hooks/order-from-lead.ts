import { buildComposition } from "@/lib/orders/composition";
import { todayStoredDate } from "@/lib/orders/status";
import { relationId } from "@/payload/hooks/lead-hooks";
import type { CollectionAfterChangeHook, PayloadRequest } from "payload";

/**
 * `leads.afterChange`: creates the order when a lead moves to a status with `isContract`
 * («Договор», ТЗ §6.2).
 *
 * - Fires on an update whose status changed to a contract status, or on a create directly in
 *   such a status. Skipped with `req.context.skipOrderFromLead`.
 * - Idempotent: a lead that already has an order never gets a second one (moving the lead out
 *   of «Договор» and back keeps the first order).
 * - Runs in the lead's transaction (`req`): the order exists exactly when the status change is
 *   committed. Number, link and the first e-mail come from the `orders` hooks.
 * - A failure is logged (ids only, no personal data) and does NOT fail the lead update: the
 *   manager moves the lead out of «Договор» and back, or creates the order by hand. Note:
 *   validation errors happen before any SQL, so the shared transaction stays usable; a database
 *   error inside the insert aborts the transaction and the lead save fails with it.
 */

type LeadDoc = {
  id: string;
  status?: unknown;
  company?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  assignee?: unknown;
  productType?: string | null;
  area?: number | null;
  answers?: unknown;
};

const ORDER_WRITE_CONTEXT = { disableRevalidate: true } as const;

async function isContractStatus(req: PayloadRequest, statusId: string): Promise<boolean> {
  const status = await req.payload.findByID({
    collection: "lead-statuses",
    id: statusId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    select: { isContract: true },
    req,
  });
  return status?.isContract === true;
}

async function hasOrder(req: PayloadRequest, leadId: string): Promise<boolean> {
  const { totalDocs } = await req.payload.count({
    collection: "orders",
    where: { lead: { equals: leadId } },
    overrideAccess: true,
    req,
  });
  return totalDocs > 0;
}

const textOrUndefined = (value: string | null | undefined): string | undefined => {
  const text = value?.trim();
  return text ? text : undefined;
};

export const orderFromLead: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
  context,
}) => {
  if (context.skipOrderFromLead === true) return doc;
  if (operation !== "create" && operation !== "update") return doc;

  const lead = doc as LeadDoc;
  const statusId = relationId(lead.status);
  if (!statusId) return doc;
  if (
    operation === "update" &&
    relationId((previousDoc as LeadDoc | undefined)?.status) === statusId
  ) {
    return doc;
  }

  try {
    if (!(await isContractStatus(req, statusId))) return doc;
    if (await hasOrder(req, lead.id)) return doc;

    const managerId = relationId(lead.assignee);
    const company = textOrUndefined(lead.company);
    const clientEmail = textOrUndefined(lead.email);
    const order = await req.payload.create({
      collection: "orders",
      data: {
        lead: lead.id,
        ...(company ? { company } : {}),
        composition: buildComposition(lead),
        ...(clientEmail ? { clientEmail } : {}),
        clientName: textOrUndefined(lead.name) ?? null,
        clientPhone: textOrUndefined(lead.phone) ?? null,
        ...(managerId ? { manager: managerId } : {}),
        currentStatus: "spec_agreed",
        statusHistory: [{ status: "spec_agreed", date: todayStoredDate() }],
      },
      depth: 0,
      overrideAccess: true,
      context: ORDER_WRITE_CONTEXT,
      req,
    });
    req.payload.logger.info({
      msg: "orders: created from lead",
      leadId: lead.id,
      orderId: order.id,
    });
  } catch (error) {
    req.payload.logger.error({
      msg: "orders: failed to create the order from a lead",
      leadId: lead.id,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
  return doc;
};
