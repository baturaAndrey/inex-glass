import { sql } from "@payloadcms/db-postgres/drizzle";
import { getEnv } from "@/lib/env";
import type { SiteSetting, User } from "@/payload-types";
import { isMaxLinkConfigured } from "./config";
import {
  generateGroupLinkCode,
  generateLinkToken,
  hashToken,
  isExpired,
  tokenExpiresAt,
} from "./link-token";
import type { Payload } from "payload";

/**
 * MAX linking operations shared by the API routes and the webhook (task 06): one-time
 * tokens/codes, unlinking, the link status and the merge-safe write of `notifications.max`.
 *
 * All writes go through the Local API (`overrideAccess` defaults to `true`): the MAX fields are
 * `systemOnly` / `neverReadable` for every API caller. `disableRevalidate` — nothing on the
 * public site depends on these fields.
 */

export type MaxSettings = NonNullable<NonNullable<SiteSetting["notifications"]>["max"]>;

const SETTINGS_SLUG = "site-settings";

export const MAX_WRITE_CONTEXT = { disableRevalidate: true } as const;

/** User fields cleared by unlinking (sent through the Local API only). */
export const USER_UNLINKED = {
  maxUserId: null,
  maxLinkedAt: null,
  maxBotStopped: false,
  maxLinkTokenHash: null,
  maxLinkTokenExpiresAt: null,
} satisfies Partial<User>;

/** Group binding fields cleared by unlinking (the one-time code included). */
export const GROUP_UNLINKED = {
  groupChatId: null,
  groupChatTitle: null,
  groupLinkedAt: null,
  groupLinkTokenHash: null,
  groupLinkTokenExpiresAt: null,
} satisfies Partial<MaxSettings>;

export async function readMaxSettings(payload: Payload): Promise<MaxSettings> {
  const settings = await payload.findGlobal({
    slug: SETTINGS_SLUG,
    depth: 0,
    overrideAccess: true,
  });
  return settings.notifications?.max ?? {};
}

/**
 * Writes `changes` into `notifications.max`. The whole `notifications` group is read and sent
 * back: a partial nested update could otherwise reset sibling fields (e-mail recipients,
 * toggles) to their defaults.
 */
export async function updateMaxSettings(
  payload: Payload,
  changes: Partial<MaxSettings>
): Promise<void> {
  const current = await payload.findGlobal({ slug: SETTINGS_SLUG, depth: 0, overrideAccess: true });
  const notifications = {
    ...current.notifications,
    max: { ...current.notifications?.max, ...changes },
  };
  await payload.updateGlobal({
    slug: SETTINGS_SLUG,
    data: { notifications },
    depth: 0,
    overrideAccess: true,
    context: MAX_WRITE_CONTEXT,
  });
}

type ClaimedRow = { id: unknown };

/** Rows of a raw `UPDATE … RETURNING` through the Postgres adapter. */
const claimedRows = (result: unknown): ClaimedRow[] =>
  (result as { rows?: ClaimedRow[] } | null)?.rows ?? [];

/**
 * Atomically consumes the personal link token of `userId`: clears it only while its hash is
 * still `tokenHash`. `true` — this caller owns the token; `false` — a concurrent webhook delivery
 * (MAX retries, double tap on «Начать») consumed it first, or a new token replaced it.
 *
 * A single conditional `UPDATE` instead of the Local API: `payload.update` reads and writes in
 * two steps, so two deliveries could both pass a read-then-write check and link the token twice.
 * Hooks are not needed here (system fields, no revalidation).
 */
export async function claimUserLinkToken(
  payload: Payload,
  userId: string,
  tokenHash: string
): Promise<boolean> {
  const result = await payload.db.drizzle.execute(sql`
    UPDATE users
    SET max_link_token_hash = NULL, max_link_token_expires_at = NULL, updated_at = now()
    WHERE id = ${userId} AND max_link_token_hash = ${tokenHash}
    RETURNING id`);
  return claimedRows(result).length > 0;
}

/** Same as `claimUserLinkToken` for the group link code in `site-settings`. */
export async function claimGroupLinkCode(payload: Payload, codeHash: string): Promise<boolean> {
  const result = await payload.db.drizzle.execute(sql`
    UPDATE site_settings
    SET notifications_max_group_link_token_hash = NULL,
        notifications_max_group_link_token_expires_at = NULL
    WHERE notifications_max_group_link_token_hash = ${codeHash}
    RETURNING id`);
  return claimedRows(result).length > 0;
}

/** New personal link token of `userId`; only its hash is stored. */
export async function issueUserLinkToken(
  payload: Payload,
  userId: string,
  now: Date
): Promise<{ token: string; expiresAt: string }> {
  const token = generateLinkToken();
  const expiresAt = tokenExpiresAt(now);
  await payload.update({
    collection: "users",
    id: userId,
    data: { maxLinkTokenHash: hashToken(token), maxLinkTokenExpiresAt: expiresAt },
    depth: 0,
    overrideAccess: true,
    context: MAX_WRITE_CONTEXT,
  });
  return { token, expiresAt };
}

/** New group link code; only its hash is stored. */
export async function issueGroupLinkCode(
  payload: Payload,
  now: Date
): Promise<{ code: string; expiresAt: string }> {
  const code = generateGroupLinkCode();
  const expiresAt = tokenExpiresAt(now);
  await updateMaxSettings(payload, {
    groupLinkTokenHash: hashToken(code),
    groupLinkTokenExpiresAt: expiresAt,
  });
  return { code, expiresAt };
}

export async function unlinkUser(payload: Payload, userId: string): Promise<void> {
  await payload.update({
    collection: "users",
    id: userId,
    data: USER_UNLINKED,
    depth: 0,
    overrideAccess: true,
    context: MAX_WRITE_CONTEXT,
  });
}

export async function unlinkGroup(payload: Payload): Promise<void> {
  await updateMaxSettings(payload, GROUP_UNLINKED);
}

export type MaxStatus = {
  configured: boolean;
  botName: string | null;
  /** `pending`: a link token was issued and has not expired yet. */
  user: { linked: boolean; linkedAt: string | null; botStopped: boolean; pending: boolean };
  /** Only for admins. */
  group?: {
    linked: boolean;
    title: string | null;
    chatId: string | null;
    linkedAt: string | null;
    pending: boolean;
  };
};

/**
 * Link status of `user` (and of the group chat when `includeGroup`). Only the public view
 * leaves this function: no hashes and no MAX user id.
 */
export async function getMaxStatus(
  payload: Payload,
  user: Pick<
    User,
    "maxUserId" | "maxLinkedAt" | "maxBotStopped" | "maxLinkTokenHash" | "maxLinkTokenExpiresAt"
  >,
  options: { includeGroup: boolean; now: Date }
): Promise<MaxStatus> {
  const env = getEnv();
  const linked = Boolean(user.maxUserId);
  const status: MaxStatus = {
    configured: isMaxLinkConfigured(env),
    botName: env.MAX_BOT_NAME ?? null,
    user: {
      linked,
      linkedAt: linked ? (user.maxLinkedAt ?? null) : null,
      botStopped: linked && user.maxBotStopped === true,
      pending:
        Boolean(user.maxLinkTokenHash) && !isExpired(user.maxLinkTokenExpiresAt, options.now),
    },
  };
  if (!options.includeGroup) return status;

  const max = await readMaxSettings(payload);
  const groupLinked = Boolean(max.groupChatId);
  status.group = {
    linked: groupLinked,
    title: groupLinked ? (max.groupChatTitle ?? null) : null,
    chatId: groupLinked ? (max.groupChatId ?? null) : null,
    linkedAt: groupLinked ? (max.groupLinkedAt ?? null) : null,
    pending:
      Boolean(max.groupLinkTokenHash) && !isExpired(max.groupLinkTokenExpiresAt, options.now),
  };
  return status;
}
