import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MAX Bot API client against a mocked `fetch`. `getEnv()` memoizes, so every case imports a
 * fresh copy of the module after stubbing `process.env`.
 */

const TOKEN = "test-bot-token-0123456789abcdef";
const SECRET_TEXT = "Секретный текст заявки";

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

async function loadClient(env: Record<string, string> = {}) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
  vi.stubEnv("PAYLOAD_SECRET", "test-secret-test-secret-test-secret-00");
  vi.stubEnv("MAX_API_BASE_URL", "");
  vi.stubEnv("MAX_BOT_TOKEN", TOKEN);
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("./client");
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function lastCall(): { url: URL; init: RequestInit } {
  const [input, init] = fetchMock.mock.calls.at(-1) ?? [];
  return { url: new URL(String(input)), init: init ?? {} };
}

describe("maxSendMessage", () => {
  it("posts to /messages with chat_id, the raw token and an HTML body", async () => {
    const { maxSendMessage } = await loadClient();
    fetchMock.mockResolvedValue(jsonResponse({ message: { body: { mid: "mid.123" } } }));

    const result = await maxSendMessage({ chatId: "-700000001", text: "<b>Новая</b> заявка" });

    expect(result).toEqual({ messageId: "mid.123" });
    const { url, init } = lastCall();
    expect(url.origin + url.pathname).toBe("https://platform-api2.max.ru/messages");
    expect(url.searchParams.get("chat_id")).toBe("-700000001");
    expect(url.searchParams.has("user_id")).toBe(false);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(TOKEN);
    expect(init.cache).toBe("no-store");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init.body))).toEqual({
      text: "<b>Новая</b> заявка",
      format: "html",
      notify: true,
    });
  });

  it("addresses a user and builds an inline keyboard of link buttons", async () => {
    const { maxSendMessage } = await loadClient();
    fetchMock.mockResolvedValue(jsonResponse({ message: { body: { mid: 42 } } }));

    const result = await maxSendMessage({
      userId: "900000001",
      text: "Назначена заявка",
      notify: false,
      buttons: [[{ text: "Открыть заявку", url: "https://inexglass.ru/admin/" }]],
    });

    expect(result.messageId).toBe("42");
    const { url, init } = lastCall();
    expect(url.searchParams.get("user_id")).toBe("900000001");
    expect(url.searchParams.has("chat_id")).toBe(false);
    expect(JSON.parse(String(init.body))).toEqual({
      text: "Назначена заявка",
      format: "html",
      notify: false,
      attachments: [
        {
          type: "inline_keyboard",
          payload: {
            buttons: [
              [{ type: "link", text: "Открыть заявку", url: "https://inexglass.ru/admin/" }],
            ],
          },
        },
      ],
    });
  });

  it("omits attachments for empty buttons and truncates long texts", async () => {
    const { maxSendMessage } = await loadClient();
    fetchMock.mockResolvedValue(jsonResponse({ message: { body: { mid: "m" } } }));

    await maxSendMessage({ chatId: "1", text: "x".repeat(5000), buttons: [[]] });

    const body = JSON.parse(String(lastCall().init.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty("attachments");
    expect(String(body.text).length).toBeLessThanOrEqual(4000);
  });

  it("uses MAX_API_BASE_URL when set (mocks)", async () => {
    const { maxSendMessage } = await loadClient({ MAX_API_BASE_URL: "http://127.0.0.1:4010/" });
    fetchMock.mockResolvedValue(jsonResponse({ message: { body: { mid: "m" } } }));

    await maxSendMessage({ chatId: "1", text: "t" });

    expect(lastCall().url.href).toBe("http://127.0.0.1:4010/messages?chat_id=1");
  });

  it.each([
    ["both recipients", { chatId: "1", userId: "2" }],
    ["no recipient", {}],
  ])("rejects %s with TypeError", async (_label, recipient) => {
    const { maxSendMessage } = await loadClient();
    await expect(maxSendMessage({ ...recipient, text: "t" })).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-https button URL with TypeError", async () => {
    const { maxSendMessage } = await loadClient();
    await expect(
      maxSendMessage({
        chatId: "1",
        text: "t",
        buttons: [[{ text: "x", url: "http://inexglass.ru/" }]],
      })
    ).rejects.toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["JSON without a message id", () => jsonResponse({ message: { body: {} } })],
    ["a non-JSON body", () => new Response("OK", { status: 200 })],
    ["an empty body", () => new Response(null, { status: 200 })],
  ])(
    "a 2xx with %s is a permanent «unconfirmed» error (no duplicate on retry)",
    async (_l, make) => {
      const { maxSendMessage, MaxApiError, MAX_UNCONFIRMED_CODE } = await loadClient();
      fetchMock.mockResolvedValue(make());
      const error = await maxSendMessage({ chatId: "1", text: "t" }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(MaxApiError);
      const apiError = error as InstanceType<typeof MaxApiError>;
      expect(apiError.code).toBe(MAX_UNCONFIRMED_CODE);
      expect(apiError.permanent).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it("is a permanent 401 without a token and sends nothing", async () => {
    const { maxSendMessage, MaxApiError } = await loadClient({ MAX_BOT_TOKEN: "" });
    const error = await maxSendMessage({ chatId: "1", text: "t" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MaxApiError);
    expect((error as InstanceType<typeof MaxApiError>).permanent).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("errors", () => {
  it.each([
    [401, true],
    [403, true],
    [404, true],
    [429, false],
    [500, false],
    [503, false],
  ])("HTTP %i → permanent %s, API code and message kept", async (status, permanent) => {
    const { maxSendMessage, MaxApiError } = await loadClient();
    fetchMock.mockResolvedValue(
      jsonResponse({ code: "some.code", message: "Something went wrong" }, status)
    );

    const error = await maxSendMessage({ chatId: "1", text: SECRET_TEXT }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MaxApiError);
    const apiError = error as InstanceType<typeof MaxApiError>;
    expect(apiError.status).toBe(status);
    expect(apiError.code).toBe("some.code");
    expect(apiError.message).toBe("Something went wrong");
    expect(apiError.permanent).toBe(permanent);
    expect(apiError.message).not.toContain(TOKEN);
    expect(apiError.message).not.toContain(SECRET_TEXT);
  });

  it("network error / timeout → status 0, temporary, no request details", async () => {
    const { maxSendMessage, MaxApiError } = await loadClient();
    fetchMock.mockRejectedValue(new TypeError(`fetch failed ${TOKEN} ${SECRET_TEXT}`));

    const error = await maxSendMessage({ chatId: "1", text: SECRET_TEXT }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MaxApiError);
    const apiError = error as InstanceType<typeof MaxApiError>;
    expect(apiError.status).toBe(0);
    expect(apiError.permanent).toBe(false);
    expect(apiError.message).toBe("network error");
    expect(String(apiError.stack)).not.toContain(TOKEN);
  });

  it("passes Retry-After of a 429 on as retryAfterMs", async () => {
    const { maxSendMessage } = await loadClient();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "too.many.requests", message: "Slow down" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "3" },
      })
    );
    await expect(maxSendMessage({ chatId: "1", text: "t" })).rejects.toMatchObject({
      status: 429,
      permanent: false,
      retryAfterMs: 3000,
    });
  });

  it("has no retryAfterMs without the header or on other statuses", async () => {
    const { maxSendMessage } = await loadClient();
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: "x" }, 429));
    const noHeader = await maxSendMessage({ chatId: "1", text: "t" }).catch((e: unknown) => e);
    expect(noHeader).toMatchObject({ status: 429, retryAfterMs: undefined });

    fetchMock.mockResolvedValueOnce(
      new Response("{}", { status: 500, headers: { "Retry-After": "5" } })
    );
    const other = await maxSendMessage({ chatId: "1", text: "t" }).catch((e: unknown) => e);
    expect(other).toMatchObject({ status: 500, retryAfterMs: undefined });
  });

  it("parseRetryAfter: seconds, HTTP date, garbage, cap", async () => {
    const { parseRetryAfter } = await loadClient();
    const now = Date.parse("2026-10-22T10:00:00Z");
    expect(parseRetryAfter("2", now)).toBe(2000);
    expect(parseRetryAfter(" 0 ", now)).toBe(0);
    expect(parseRetryAfter("Thu, 22 Oct 2026 10:00:05 GMT", now)).toBe(5000);
    expect(parseRetryAfter("Thu, 22 Oct 2026 09:00:00 GMT", now)).toBe(0);
    expect(parseRetryAfter("soon", now)).toBeUndefined();
    expect(parseRetryAfter("-1", now)).toBeUndefined();
    expect(parseRetryAfter(null, now)).toBeUndefined();
    expect(parseRetryAfter("999999", now)).toBe(60 * 60 * 1000);
  });

  it("falls back to statusText for a non-JSON error body", async () => {
    const { maxDeleteMessage } = await loadClient();
    fetchMock.mockResolvedValue(new Response("<html>", { status: 502, statusText: "Bad Gateway" }));
    await expect(maxDeleteMessage("mid.1")).rejects.toMatchObject({
      status: 502,
      message: "Bad Gateway",
    });
  });
});

describe("other methods", () => {
  it("maxDeleteMessage: DELETE /messages?message_id=…; success:false is an error", async () => {
    const { maxDeleteMessage } = await loadClient();
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    await maxDeleteMessage("mid.1");
    const { url, init } = lastCall();
    expect(init.method).toBe("DELETE");
    expect(url.pathname).toBe("/messages");
    expect(url.searchParams.get("message_id")).toBe("mid.1");

    fetchMock.mockResolvedValueOnce(jsonResponse({ success: false, message: "too old" }));
    await expect(maxDeleteMessage("mid.1")).rejects.toMatchObject({ message: "too old" });
  });

  it("maxGetChat: GET /chats/{id} → title (blank → null)", async () => {
    const { maxGetChat } = await loadClient();
    fetchMock.mockResolvedValueOnce(jsonResponse({ chat_id: -7, title: "Менеджеры" }));
    await expect(maxGetChat("-700000001")).resolves.toEqual({ title: "Менеджеры" });
    expect(lastCall().url.pathname).toBe("/chats/-700000001");

    fetchMock.mockResolvedValueOnce(jsonResponse({ chat_id: -7, title: null }));
    await expect(maxGetChat("-7")).resolves.toEqual({ title: null });
  });

  it("maxSubscribe: POST /subscriptions with url, update_types and secret", async () => {
    const { maxSubscribe } = await loadClient();
    fetchMock.mockResolvedValue(jsonResponse({ success: true }));
    await maxSubscribe({
      url: "https://inexglass.ru/api/max/webhook/",
      secret: "s".repeat(32),
      updateTypes: ["bot_started", "message_created"],
    });
    const { url, init } = lastCall();
    expect(init.method).toBe("POST");
    expect(url.pathname).toBe("/subscriptions");
    expect(JSON.parse(String(init.body))).toEqual({
      url: "https://inexglass.ru/api/max/webhook/",
      update_types: ["bot_started", "message_created"],
      secret: "s".repeat(32),
    });
  });

  it("maxListSubscriptions maps the list; maxUnsubscribe sends ?url=", async () => {
    const { maxListSubscriptions, maxUnsubscribe } = await loadClient();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        subscriptions: [
          { url: "https://a.example/hook", time: 1, update_types: ["bot_started"] },
          { url: "https://b.example/hook", time: 2, update_types: null },
          { time: 3 },
        ],
      })
    );
    await expect(maxListSubscriptions()).resolves.toEqual([
      { url: "https://a.example/hook", updateTypes: ["bot_started"] },
      { url: "https://b.example/hook", updateTypes: [] },
    ]);

    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
    await maxUnsubscribe("https://a.example/hook");
    const { url, init } = lastCall();
    expect(init.method).toBe("DELETE");
    expect(url.searchParams.get("url")).toBe("https://a.example/hook");
  });
});
