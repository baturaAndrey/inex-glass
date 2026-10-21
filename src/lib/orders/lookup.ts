import { timingSafeEqual } from "node:crypto";
import { getPayloadClient } from "@/lib/cms/payload";
import type { Order } from "@/payload-types";
import { deriveOrderToken, hashOrderToken, isOrderTokenFormat } from "./access-token";
import { isOrderLinkActive } from "./public-view";

/**
 * Resolves a client link token (`/zakaz/<token>/`, ТЗ §6.2) to its order.
 *
 * 1. Shape check `^[A-Za-z0-9_-]{22}$` before touching the database.
 * 2. Lookup by `tokenHash = sha256(token)` (unique index) through the Local API with
 *    `overrideAccess` and an explicit `select`/`populate` WHITE LIST: the client's contacts,
 *    the lead and internal fields are not even read.
 * 3. Control check: the token re-derived from `id` + `tokenCreatedAt` must equal the URL
 *    token (`timingSafeEqual`) — a stale hash left by a failed reissue can never match.
 * 4. Revoked or expired (`expiresAt <= now`) → `null`.
 *
 * Every failure is the same `null`, so callers answer one identical 404 and never reveal
 * whether an order exists. Never logs the token.
 */

/** Fields of the order the public page and the file route may use. */
const ORDER_SELECT = {
  number: true,
  company: true,
  composition: true,
  currentStatus: true,
  statusHistory: true,
  clientComment: true,
  packPhotos: true,
  shipment: true,
  documents: true,
  manager: true,
  tokenCreatedAt: true,
  revoked: true,
  expiresAt: true,
} as const;

/** Populated relations: work contacts of the manager, file metadata, the manager's photo. */
const ORDER_POPULATE = {
  users: { name: true, position: true, phone: true, email: true, messengerUrl: true, photo: true },
  "order-files": { filename: true, mimeType: true, filesize: true },
  media: { url: true, filename: true, alt: true },
} as const;

/** Depth 2: order → manager → photo (media). */
const POPULATE_DEPTH = 2;

/** The order as read for the public page (only the selected fields are present). */
export type PublicOrderDoc = Pick<Order, "id" | keyof typeof ORDER_SELECT>;

function tokensEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getOrderByToken(
  token: string,
  now: Date = new Date()
): Promise<PublicOrderDoc | null> {
  if (!isOrderTokenFormat(token)) return null;

  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "orders",
    where: { tokenHash: { equals: hashOrderToken(token) } },
    select: ORDER_SELECT,
    populate: ORDER_POPULATE,
    depth: POPULATE_DEPTH,
    limit: 1,
    pagination: false,
    overrideAccess: true,
  });
  const order = docs[0] as PublicOrderDoc | undefined;
  if (!order?.tokenCreatedAt) return null;

  let expected: string;
  try {
    expected = deriveOrderToken(order.id, order.tokenCreatedAt);
  } catch {
    return null;
  }
  if (!tokensEqual(expected, token)) return null;
  return isOrderLinkActive(order, now) ? order : null;
}
