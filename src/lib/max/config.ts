import { getEnv } from "@/lib/env";
import type { Env } from "@/lib/env";

/**
 * MAX integration constants and configuration checks (task 06).
 *
 * The webhook URL keeps the trailing slash: `next.config.ts` has `trailingSlash: true`, so
 * `/api/max/webhook` answers 308 and MAX does not repeat a POST after a redirect.
 */

export const MAX_WEBHOOK_PATH = "/api/max/webhook/";

export const MAX_UPDATE_TYPES = [
  "bot_started",
  "bot_added",
  "bot_removed",
  "bot_stopped",
  "message_created",
] as const;

type LinkEnv = Pick<Env, "MAX_WEBHOOK_SECRET" | "MAX_BOT_NAME">;

/** Linking needs the webhook and a bot nickname (sending replies additionally needs MAX_BOT_TOKEN). */
export function isMaxLinkConfigured(env: LinkEnv = getEnv()): boolean {
  return Boolean(env.MAX_WEBHOOK_SECRET && env.MAX_BOT_NAME);
}

/** Deep link that opens the bot and sends `bot_started` with `token` as the payload. */
export function maxDeepLink(token: string, env: Pick<Env, "MAX_BOT_NAME"> = getEnv()): string {
  if (!env.MAX_BOT_NAME) throw new Error("MAX_BOT_NAME не задан");
  return `https://max.ru/${env.MAX_BOT_NAME}?start=${encodeURIComponent(token)}`;
}
