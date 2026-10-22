/**
 * Incoming MAX webhook updates (task 06): narrow types of the events the site reacts to and a
 * defensive parser. Anything else — an unknown `update_type` or a malformed body — is `null`
 * and is acknowledged without processing.
 *
 * IDs are int64 in the API and are kept as strings. A plain `JSON.parse` loses precision above
 * `Number.MAX_SAFE_INTEGER` (2^53), and group chat IDs are large negative numbers, so the
 * webhook parses the body with `parseMaxJson`, which keeps such integers as their exact source
 * text. Should an unsafe number still reach `readMaxId`, it is rejected rather than stored wrong.
 */

/** `JSON.parse` reviver context (Node ≥ 21, «JSON.parse source text access»). */
type ReviverContext = { source?: string } | undefined;

const INTEGER_SOURCE = /^-?\d+$/;

/** `JSON.parse` that returns integers beyond 2^53 as their exact decimal string. */
export function parseMaxJson(text: string): unknown {
  const reviver = (_key: string, value: unknown, context?: ReviverContext): unknown => {
    if (typeof value === "number" && !Number.isSafeInteger(value)) {
      const source = context?.source;
      if (source && INTEGER_SOURCE.test(source)) return source;
    }
    return value;
  };
  return JSON.parse(text, reviver as (key: string, value: unknown) => unknown);
}

export type MaxChatType = "dialog" | "chat" | "channel";

export type MaxUpdate =
  | { type: "bot_started"; chatId: string; userId: string; payload: string | null }
  | { type: "bot_stopped"; chatId: string; userId: string }
  | { type: "bot_added"; chatId: string; isChannel: boolean }
  | { type: "bot_removed"; chatId: string; isChannel: boolean }
  | {
      type: "message_created";
      chatId: string;
      chatType: MaxChatType;
      senderId: string | null;
      text: string | null;
    };

export type MaxUpdateType = MaxUpdate["type"];

type Json = Record<string, unknown>;

const CHAT_TYPES: readonly MaxChatType[] = ["dialog", "chat", "channel"];
const ID_STRING = /^-?\d{1,20}$/;
/** `bot_started.payload` is at most 512 characters in the API. */
const START_PAYLOAD_LIMIT = 512;

const asObject = (value: unknown): Json | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : null;

/** An int64 ID as a string, or `null` when it is missing, not an integer or lost precision. */
export function readMaxId(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) ? String(value) : null;
  }
  if (typeof value === "string" && ID_STRING.test(value)) return value;
  return null;
}

function parseBotStarted(body: Json): MaxUpdate | null {
  const chatId = readMaxId(body.chat_id);
  const userId = readMaxId(asObject(body.user)?.user_id);
  if (!chatId || !userId) return null;
  const raw = body.payload;
  const payload =
    typeof raw === "string" && raw !== "" && raw.length <= START_PAYLOAD_LIMIT ? raw : null;
  return { type: "bot_started", chatId, userId, payload };
}

function parseBotStopped(body: Json): MaxUpdate | null {
  const chatId = readMaxId(body.chat_id);
  const userId = readMaxId(asObject(body.user)?.user_id);
  if (!chatId || !userId) return null;
  return { type: "bot_stopped", chatId, userId };
}

function parseBotMembership(body: Json, type: "bot_added" | "bot_removed"): MaxUpdate | null {
  const chatId = readMaxId(body.chat_id);
  if (!chatId) return null;
  return { type, chatId, isChannel: body.is_channel === true };
}

function parseMessageCreated(body: Json): MaxUpdate | null {
  const message = asObject(body.message);
  const recipient = asObject(message?.recipient);
  if (!message || !recipient) return null;
  const chatType = recipient.chat_type;
  if (!CHAT_TYPES.includes(chatType as MaxChatType)) return null;
  const chatId = readMaxId(recipient.chat_id);
  if (!chatId) return null;
  const text = asObject(message.body)?.text;
  return {
    type: "message_created",
    chatId,
    chatType: chatType as MaxChatType,
    senderId: readMaxId(asObject(message.sender)?.user_id),
    text: typeof text === "string" ? text : null,
  };
}

export function parseMaxUpdate(body: unknown): MaxUpdate | null {
  const update = asObject(body);
  if (!update) return null;
  switch (update.update_type) {
    case "bot_started":
      return parseBotStarted(update);
    case "bot_stopped":
      return parseBotStopped(update);
    case "bot_added":
      return parseBotMembership(update, "bot_added");
    case "bot_removed":
      return parseBotMembership(update, "bot_removed");
    case "message_created":
      return parseMessageCreated(update);
    default:
      return null;
  }
}
