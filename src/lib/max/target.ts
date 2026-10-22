import { getEnv } from "@/lib/env";
import type { Env } from "@/lib/env";

/**
 * «Where to send» guard of MAX notifications (task 06, used by task 10).
 *
 * Outside production nothing reaches real people: every recipient is replaced by
 * `MAX_INTERCEPT_CHAT_ID`, or nothing is sent at all. The bot is shared with another site, so
 * every message also carries its source in the first line (`decorateMaxText`).
 */

export type MaxTarget = { chatId: string } | { userId: string };

type TargetEnv = Pick<Env, "SITE_ENV" | "MAX_ENABLED" | "MAX_BOT_TOKEN" | "MAX_INTERCEPT_CHAT_ID">;

interface TargetInput {
  chatId?: string | null;
  userId?: string | null;
}

/** Pure core for tests. */
export function resolveMaxTargetWith(env: TargetEnv, input: TargetInput): MaxTarget | null {
  if (!env.MAX_ENABLED || !env.MAX_BOT_TOKEN) return null;
  const chatId = input.chatId || null;
  const userId = input.userId || null;
  if (!chatId && !userId) return null;

  if (env.SITE_ENV !== "production") {
    return env.MAX_INTERCEPT_CHAT_ID ? { chatId: env.MAX_INTERCEPT_CHAT_ID } : null;
  }
  return chatId ? { chatId } : { userId: userId as string };
}

export function resolveMaxTarget(input: TargetInput): MaxTarget | null {
  return resolveMaxTargetWith(getEnv(), input);
}

const SOURCE_PRODUCTION = "<b>Inex Glass</b>";
const SOURCE_TEST = "<b>[ТЕСТ] Inex Glass</b>";

/** Pure core for tests. */
export function decorateMaxTextWith(env: Pick<Env, "SITE_ENV">, text: string): string {
  const source = env.SITE_ENV === "production" ? SOURCE_PRODUCTION : SOURCE_TEST;
  return `${source}\n${text}`;
}

/**
 * Prefixes the message with its source: `<b>Inex Glass</b>` in production,
 * `<b>[ТЕСТ] Inex Glass</b>` elsewhere. Every sender must call it (`maxSendMessage` does not).
 */
export function decorateMaxText(text: string): string {
  return decorateMaxTextWith(getEnv(), text);
}
