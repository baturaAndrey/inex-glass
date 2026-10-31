import { getEnv } from "@/lib/env";
import { maxGetChat, maxSendMessage } from "./client";
import {
  claimGroupLinkCode,
  claimUserLinkToken,
  GROUP_UNLINKED,
  MAX_WRITE_CONTEXT,
  readMaxSettings,
  updateMaxSettings,
} from "./link-service";
import {
  hasLinkTokenPrefix,
  hashToken,
  isExpired,
  isLinkTokenFormat,
  normalizeGroupLinkCode,
  safeEqualHex,
} from "./link-token";
import { decorateMaxText } from "./target";
import type { MaxUpdate } from "./updates";
import type { Payload } from "payload";

/**
 * Processing of MAX webhook updates (task 06): linking/unlinking recipients and the bot's
 * replies to those actions. Runs in `after()` of the webhook route, so errors never change the
 * webhook's answer; the route logs only `{ type, result }`.
 *
 * The bot is shared with another live site, so this handler is deliberately quiet:
 * - it reacts only to OUR secrets — deep-link payloads with the `ig_` prefix and messages that
 *   are exactly one group code; everything else (a bare «Начать», foreign payloads, ordinary
 *   chat messages) gets no reply at all;
 * - replies go only to the person who used our link (their dialog, `userId`) or to the group
 *   whose code matched — never to `MAX_INTERCEPT_CHAT_ID`;
 * - every reply carries its source: `handleMaxUpdate` passes each text through
 *   `decorateMaxText` before it reaches `reply`.
 */

export const REPLIES = {
  userLinked: "MAX подключён. Сюда будут приходить уведомления о заявках, назначенных на вас.",
  userTokenExpired: "Ссылка устарела. Нажмите «Подключить MAX» в профиле админки ещё раз.",
  userTokenUnknown: "Ссылка недействительна. Нажмите «Подключить MAX» в профиле админки.",
  groupLinked: "Чат привязан: сюда будут приходить уведомления о новых заявках Inex Glass.",
  groupCodeExpired:
    "Код устарел. Получите новый в админке: Настройки сайта → Уведомления и заказы.",
} as const;

export type MaxReplyTarget = { userId: string } | { chatId: string };
export type MaxReply = (target: MaxReplyTarget, text: string) => Promise<void>;

/** Short outcome for the log line (no names, texts or IDs). */
export type MaxUpdateResult =
  | "user-linked"
  | "user-token-expired"
  | "user-token-unknown"
  | "user-resumed"
  | "user-stopped"
  | "group-linked"
  | "group-code-expired"
  | "group-code-mismatch"
  | "group-unlinked"
  | "ignored";

/**
 * Default reply: sends via the Bot API only when MAX is switched on (`MAX_ENABLED`) and a token
 * is configured, otherwise does nothing. The bot is shared with another live site, so a token
 * alone (e.g. copied into a dev/staging env) must not make this site speak in it: `MAX_ENABLED`
 * is the single switch for everything this site sends. Linking itself still works without it.
 * `text` arrives already decorated (`handleMaxUpdate` does it, so an injected `reply` gets the
 * same final text).
 */
export const sendMaxReply: MaxReply = async (target, text) => {
  const env = getEnv();
  if (!env.MAX_ENABLED || !env.MAX_BOT_TOKEN) return;
  try {
    await maxSendMessage({ ...target, text });
  } catch (error) {
    console.error("[max-webhook] reply failed:", error instanceof Error ? error.name : "unknown");
  }
};

interface HandleArgs {
  payload: Payload;
  update: MaxUpdate;
  now: Date;
  reply?: MaxReply;
}

/** Local API options of every write here. */
const WRITE = { depth: 0, overrideAccess: true, context: MAX_WRITE_CONTEXT } as const;

type UserLinkRow = { id: string; maxLinkTokenExpiresAt?: string | null };

async function findUsersByMaxId(payload: Payload, maxUserId: string) {
  const { docs } = await payload.find({
    collection: "users",
    where: { maxUserId: { equals: maxUserId } },
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: true,
  });
  return docs;
}

/**
 * `token` carries our `ig_` prefix, so the person did open one of our links: a reply about an
 * invalid or expired link is addressed to them (their dialog) and is not spam.
 */
async function linkUserByToken(
  payload: Payload,
  token: string,
  maxUserId: string,
  now: Date,
  reply: MaxReply
): Promise<MaxUpdateResult> {
  const unknown = async (): Promise<MaxUpdateResult> => {
    await reply({ userId: maxUserId }, REPLIES.userTokenUnknown);
    return "user-token-unknown";
  };
  if (!isLinkTokenFormat(token)) return unknown();

  const tokenHash = hashToken(token);
  const { docs } = await payload.find({
    collection: "users",
    where: { maxLinkTokenHash: { equals: tokenHash } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  const user = docs[0] as UserLinkRow | undefined;
  if (!user) return unknown();

  // Single use under races: only the delivery that clears the token (still matching its hash)
  // goes on. A concurrent duplicate of this update, or a token re-issued meanwhile, loses here.
  // The token is consumed even when expired, so an expired link is cleared the same way.
  if (!(await claimUserLinkToken(payload, String(user.id), tokenHash))) return unknown();

  if (isExpired(user.maxLinkTokenExpiresAt, now)) {
    await reply({ userId: maxUserId }, REPLIES.userTokenExpired);
    return "user-token-expired";
  }

  // One MAX account notifies one staff user: unlink it from anyone who had it before.
  for (const other of await findUsersByMaxId(payload, maxUserId)) {
    if (String(other.id) === String(user.id)) continue;
    await payload.update({
      collection: "users",
      id: other.id,
      data: { maxUserId: null, maxLinkedAt: null },
      ...WRITE,
    });
  }

  await payload.update({
    collection: "users",
    id: user.id,
    // The token is already cleared by the claim above.
    data: { maxUserId, maxLinkedAt: now.toISOString(), maxBotStopped: false },
    ...WRITE,
  });
  await reply({ userId: maxUserId }, REPLIES.userLinked);
  return "user-linked";
}

async function setBotStopped(payload: Payload, maxUserId: string, stopped: boolean) {
  const users = await findUsersByMaxId(payload, maxUserId);
  for (const user of users) {
    await payload.update({
      collection: "users",
      id: user.id,
      data: { maxBotStopped: stopped },
      ...WRITE,
    });
  }
  return users.length;
}

async function linkGroupByCode(
  payload: Payload,
  code: string,
  chatId: string,
  now: Date,
  reply: MaxReply
): Promise<MaxUpdateResult> {
  const max = await readMaxSettings(payload);
  const storedHash = max.groupLinkTokenHash;
  const codeHash = hashToken(code);
  if (!storedHash || !safeEqualHex(codeHash, storedHash)) {
    // Somebody else's chat or an old code: stay silent, do not spam foreign chats.
    return "group-code-mismatch";
  }
  // Single use under races (see `claimGroupLinkCode`); the loser stays silent.
  if (!(await claimGroupLinkCode(payload, codeHash))) return "group-code-mismatch";

  if (isExpired(max.groupLinkTokenExpiresAt, now)) {
    await reply({ chatId }, REPLIES.groupCodeExpired);
    return "group-code-expired";
  }

  const title = await chatTitle(chatId);
  await updateMaxSettings(payload, {
    groupChatId: chatId,
    groupChatTitle: title,
    groupLinkedAt: now.toISOString(),
  });
  await reply({ chatId }, REPLIES.groupLinked);
  return "group-linked";
}

/** Group title for the settings panel; unknown (no token, API error) → `null`. */
async function chatTitle(chatId: string): Promise<string | null> {
  if (!getEnv().MAX_BOT_TOKEN) return null;
  try {
    return (await maxGetChat(chatId)).title;
  } catch {
    return null;
  }
}

export async function handleMaxUpdate({
  payload,
  update,
  now,
  reply: sendReply = sendMaxReply,
}: HandleArgs): Promise<MaxUpdateResult> {
  // The only path to the bot's voice: every reply is marked with its source.
  const reply: MaxReply = (target, text) => sendReply(target, decorateMaxText(text));

  switch (update.type) {
    case "bot_started": {
      if (hasLinkTokenPrefix(update.payload)) {
        return linkUserByToken(payload, update.payload, update.userId, now, reply);
      }
      // A bare «Начать» or a deep link of the other site sharing the bot: never answer (that
      // site may answer itself). A linked user who restarts the bot gets notifications again.
      const resumed = await setBotStopped(payload, update.userId, false);
      return resumed > 0 ? "user-resumed" : "ignored";
    }

    case "bot_stopped":
      await setBotStopped(payload, update.userId, true);
      return "user-stopped";

    case "message_created": {
      if (update.chatType !== "chat") return "ignored";
      const code = normalizeGroupLinkCode(update.text);
      if (!code) return "ignored";
      return linkGroupByCode(payload, code, update.chatId, now, reply);
    }

    case "bot_removed": {
      const max = await readMaxSettings(payload);
      if (!max.groupChatId || max.groupChatId !== update.chatId) return "ignored";
      await updateMaxSettings(payload, {
        groupChatId: GROUP_UNLINKED.groupChatId,
        groupChatTitle: GROUP_UNLINKED.groupChatTitle,
        groupLinkedAt: GROUP_UNLINKED.groupLinkedAt,
      });
      return "group-unlinked";
    }

    default:
      return "ignored";
  }
}
