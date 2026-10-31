import { createHash, createHmac } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Order page tokens (`/zakaz/<token>/`, ТЗ §6.2).
 *
 * Only the SHA-256 of a token is stored (`orders.tokenHash`), yet every status e-mail must carry
 * the link. So the token is DERIVED deterministically: HMAC-SHA256 keyed with
 * `ORDER_TOKEN_SECRET` over the order id and the link issue time (`orders.tokenCreatedAt`).
 *
 * - reissue a link = set a new `tokenCreatedAt` (new token, new hash);
 * - revoke = `orders.revoked: true`;
 * - rotating `ORDER_TOKEN_SECRET` invalidates every link already sent (see `docs/deploy.md`).
 *
 * The key is deliberately NOT `PAYLOAD_SECRET`: rotating Payload's secret must not break links.
 * Task 33 issues and resolves tokens with these functions only.
 */

/** 128 bits: 16 bytes of the HMAC → 22 base64url characters. */
const TOKEN_BYTES = 16;
export const ORDER_TOKEN_LENGTH = 22;
const ORDER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function toIsoTimestamp(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("deriveOrderToken: некорректная дата выпуска ссылки");
  }
  return date.toISOString();
}

/**
 * Token of the order link. `tokenCreatedAt` is normalized to ISO-8601 UTC, so a `Date` and its
 * ISO string (as Payload returns it) give the same token.
 */
export function deriveOrderToken(
  orderId: string,
  tokenCreatedAt: Date | string,
  secret: string = getEnv().ORDER_TOKEN_SECRET
): string {
  if (!orderId) throw new TypeError("deriveOrderToken: пустой id заказа");
  const message = `order:${orderId}:${toIsoTimestamp(tokenCreatedAt)}`;
  return createHmac("sha256", secret)
    .update(message)
    .digest()
    .subarray(0, TOKEN_BYTES)
    .toString("base64url");
}

/** Hex SHA-256 of a token — the value of `orders.tokenHash` (lookup by URL token). */
export function hashOrderToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cheap shape check before hashing/looking up a token taken from a URL. */
export function isOrderTokenFormat(value: string): boolean {
  return ORDER_TOKEN_PATTERN.test(value);
}

/** Absolute order page URL with the trailing slash (`trailingSlash: true`). */
export function buildOrderUrl(token: string, siteUrl: string = getEnv().SITE_URL): string {
  return new URL(`/zakaz/${encodeURIComponent(token)}/`, siteUrl).toString();
}
