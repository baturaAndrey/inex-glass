import { getEnv } from "@/lib/env";
import { truncateMaxText } from "./html";

/**
 * MAX Bot API client on plain `fetch` (task 06; OpenAPI: `res/max-api/schema.yaml`).
 *
 * - Auth: header `Authorization: <token>` (no `Bearer`).
 * - Errors: non-2xx → `MaxApiError` with the API's `{ code, message }`; network errors and
 *   timeouts → status 0. 401/403/404 are permanent (bad token, bot blocked, chat gone),
 *   429/5xx/0 are worth a retry (the job queue of task 10 retries); a 429/503 carries the
 *   server's `Retry-After` as `retryAfterMs`.
 * - A 2xx answer of `POST /messages` without a readable message id (non-JSON body, unexpected
 *   shape) is a PERMANENT error with code `MAX_UNCONFIRMED_CODE`: the API accepted the request,
 *   so the message most likely went out, and a retry would send it twice. It is not reported
 *   as a success because the `{ messageId: string }` contract (task 10 keeps the id to delete
 *   or edit the message later) cannot be honoured; the job records the failure and moves on.
 * - Neither the token, nor message texts, nor whole responses ever get into errors or logs.
 *
 * The base URL is overridable (`MAX_API_BASE_URL`) only to point tests at a local mock.
 */

export const MAX_API_BASE = process.env.MAX_API_BASE_URL || "https://platform-api2.max.ru";

const REQUEST_TIMEOUT_MS = 10_000;
/** API error messages are short; anything longer is cut so a log line stays a line. */
const ERROR_MESSAGE_LIMIT = 200;
/** Statuses whose `Retry-After` is passed on to the caller. */
const RETRY_AFTER_STATUSES = new Set([429, 503]);
/** An absurd `Retry-After` (or a date far ahead) is capped: the job queue has its own backoff. */
const RETRY_AFTER_MAX_MS = 60 * 60 * 1000;

/** `MaxApiError.code` of a 2xx answer whose result cannot be read (see the module comment). */
export const MAX_UNCONFIRMED_CODE = "unconfirmed_response";

export class MaxApiError extends Error {
  override name = "MaxApiError";

  /** Server-requested delay before a retry (429/503 `Retry-After`), when it sent one. */
  readonly retryAfterMs: number | undefined;

  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    options: { retryAfterMs?: number | undefined } = {}
  ) {
    super(message);
    this.retryAfterMs = options.retryAfterMs;
  }

  /**
   * 401/403/404: retrying will not help (bad token, bot blocked, chat/message gone).
   * An unconfirmed 2xx is permanent too: a retry could deliver the message twice.
   */
  get permanent(): boolean {
    return (
      this.status === 401 ||
      this.status === 403 ||
      this.status === 404 ||
      this.code === MAX_UNCONFIRMED_CODE
    );
  }
}

export interface MaxButton {
  text: string;
  url: string;
}

type Query = Record<string, string>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
}

function requireToken(): string {
  const token = getEnv().MAX_BOT_TOKEN;
  if (!token) throw new MaxApiError("MAX_BOT_TOKEN не задан", 401);
  return token;
}

function buildUrl(path: string, query: Query | undefined): URL {
  const url = new URL(`${MAX_API_BASE.replace(/\/+$/, "")}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  return url;
}

/** `{ code, message }` of an error response, if the body has that shape. */
async function readApiError(
  response: Response
): Promise<{ code: string | undefined; message: string | undefined }> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) return { code: undefined, message: undefined };
  const { code, message } = body as { code?: unknown; message?: unknown };
  return {
    code: typeof code === "string" ? code : undefined,
    message: typeof message === "string" ? message.slice(0, ERROR_MESSAGE_LIMIT) : undefined,
  };
}

/**
 * `Retry-After` in milliseconds: delta-seconds or an HTTP date (RFC 9110 §10.2.3).
 * Missing or unparsable → `undefined`; capped at `RETRY_AFTER_MAX_MS`.
 */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  let ms: number;
  if (/^\d+$/.test(trimmed)) {
    ms = Number(trimmed) * 1000;
  } else {
    // IMF-fixdate («Sun, 06 Nov 1994 08:49:37 GMT»); bare numbers like «-1» are not dates.
    if (!/^[A-Za-z]{3}, /.test(trimmed)) return undefined;
    const at = Date.parse(trimmed);
    if (Number.isNaN(at)) return undefined;
    ms = Math.max(0, at - now);
  }
  return Math.min(ms, RETRY_AFTER_MAX_MS);
}

/** Marker of a 2xx body that is not JSON. */
const UNREADABLE = Symbol("unreadable");

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T | typeof UNREADABLE> {
  const token = requireToken();
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: options.body === undefined ? null : JSON.stringify(options.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    // The cause may echo the request (URL with ids); it is deliberately dropped.
    throw new MaxApiError("network error", 0);
  }

  if (!response.ok) {
    const { code, message } = await readApiError(response);
    const retryAfterMs = RETRY_AFTER_STATUSES.has(response.status)
      ? parseRetryAfter(response.headers.get("retry-after"))
      : undefined;
    throw new MaxApiError(
      message || response.statusText || "request failed",
      response.status,
      code,
      { retryAfterMs }
    );
  }
  // An empty or non-JSON 2xx body is not an error by itself: each method decides.
  return (await response.json().catch(() => UNREADABLE)) as T | typeof UNREADABLE;
}

/** The parsed body, or `null` when it was not JSON (for methods where that is harmless). */
const orNull = <T>(result: T | typeof UNREADABLE): T | null =>
  result === UNREADABLE ? null : result;

/** `{ success: false, message }` answers of the API (HTTP 200) are failures too. */
function assertSuccess(result: unknown, what: string): void {
  if (typeof result === "object" && result !== null && "success" in result) {
    if ((result as { success: unknown }).success === false) {
      const message = (result as { message?: unknown }).message;
      throw new MaxApiError(
        typeof message === "string" && message ? message.slice(0, ERROR_MESSAGE_LIMIT) : what,
        400
      );
    }
  }
}

function recipientQuery(chatId: string | undefined, userId: string | undefined): Query {
  const hasChat = typeof chatId === "string" && chatId !== "";
  const hasUser = typeof userId === "string" && userId !== "";
  if (hasChat === hasUser)
    throw new TypeError("maxSendMessage: нужен ровно один из chatId / userId");
  return hasChat ? { chat_id: chatId } : { user_id: userId as string };
}

function keyboard(buttons: MaxButton[][] | undefined) {
  const rows = (buttons ?? []).filter((row) => row.length > 0);
  if (rows.length === 0) return undefined;
  for (const button of rows.flat()) {
    if (!button.url.startsWith("https://")) {
      throw new TypeError("maxSendMessage: URL кнопки должен начинаться с https://");
    }
  }
  return [
    {
      type: "inline_keyboard",
      payload: {
        buttons: rows.map((row) =>
          row.map((button) => ({ type: "link", text: button.text, url: button.url }))
        ),
      },
    },
  ];
}

export async function maxSendMessage(input: {
  chatId?: string;
  userId?: string;
  text: string;
  buttons?: MaxButton[][];
  notify?: boolean;
}): Promise<{ messageId: string }> {
  const query = recipientQuery(input.chatId, input.userId);
  const attachments = keyboard(input.buttons);
  const body = {
    text: truncateMaxText(input.text),
    format: "html",
    notify: input.notify ?? true,
    ...(attachments ? { attachments } : {}),
  };

  const result = orNull(
    await request<{ message?: { body?: { mid?: unknown } } } | null>("POST", "/messages", {
      query,
      body,
    })
  );
  const mid = result?.message?.body?.mid;
  if ((typeof mid !== "string" && typeof mid !== "number") || mid === "") {
    // 2xx: the message was most likely sent. Permanent, so the queue does not send it again.
    throw new MaxApiError("sent, but the response has no message id", 502, MAX_UNCONFIRMED_CODE);
  }
  return { messageId: String(mid) };
}

export async function maxDeleteMessage(messageId: string): Promise<void> {
  const result = orNull(
    await request<unknown>("DELETE", "/messages", { query: { message_id: messageId } })
  );
  assertSuccess(result, "message was not deleted");
}

export async function maxGetChat(chatId: string): Promise<{ title: string | null }> {
  const result = orNull(
    await request<{ title?: unknown } | null>("GET", `/chats/${encodeURIComponent(chatId)}`)
  );
  const title = result?.title;
  return { title: typeof title === "string" && title.trim() !== "" ? title : null };
}

export async function maxSubscribe(input: {
  url: string;
  secret: string;
  updateTypes: readonly string[];
}): Promise<void> {
  const result = orNull(
    await request<unknown>("POST", "/subscriptions", {
      body: { url: input.url, update_types: [...input.updateTypes], secret: input.secret },
    })
  );
  assertSuccess(result, "subscription was rejected");
}

export async function maxListSubscriptions(): Promise<{ url: string; updateTypes: string[] }[]> {
  const result = orNull(await request<{ subscriptions?: unknown } | null>("GET", "/subscriptions"));
  const list = Array.isArray(result?.subscriptions) ? result.subscriptions : [];
  return list.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null) return [];
    const { url, update_types: types } = item as { url?: unknown; update_types?: unknown };
    if (typeof url !== "string") return [];
    const updateTypes = Array.isArray(types)
      ? types.filter((type): type is string => typeof type === "string")
      : [];
    return [{ url, updateTypes }];
  });
}

export async function maxUnsubscribe(url: string): Promise<void> {
  const result = orNull(await request<unknown>("DELETE", "/subscriptions", { query: { url } }));
  assertSuccess(result, "subscription was not removed");
}
