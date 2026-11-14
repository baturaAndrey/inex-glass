import { describe, expect, it } from "vitest";
import { parseMaxJson, parseMaxUpdate, readMaxId } from "./updates";

/** Shapes follow the examples of `res/max-api/schema.yaml` (Update and its subtypes). */
const user = { user_id: 900000001, first_name: "Иван", is_bot: false, last_activity_time: 1 };

describe("parseMaxUpdate", () => {
  it("bot_started with a deep-link payload", () => {
    expect(
      parseMaxUpdate({
        update_type: "bot_started",
        timestamp: 1730000000000,
        chat_id: 123456,
        user,
        payload: "abc",
        user_locale: "ru",
      })
    ).toEqual({ type: "bot_started", chatId: "123456", userId: "900000001", payload: "abc" });
  });

  it("bot_started without payload", () => {
    expect(
      parseMaxUpdate({ update_type: "bot_started", timestamp: 1, chat_id: 1, user, payload: null })
    ).toEqual({ type: "bot_started", chatId: "1", userId: "900000001", payload: null });
    expect(
      parseMaxUpdate({ update_type: "bot_started", timestamp: 1, chat_id: 1, user })
    ).toMatchObject({
      payload: null,
    });
  });

  it("bot_stopped", () => {
    expect(parseMaxUpdate({ update_type: "bot_stopped", timestamp: 1, chat_id: 5, user })).toEqual({
      type: "bot_stopped",
      chatId: "5",
      userId: "900000001",
    });
  });

  it.each(["bot_added", "bot_removed"] as const)("%s", (type) => {
    expect(
      parseMaxUpdate({
        update_type: type,
        timestamp: 1,
        chat_id: -700000001,
        user,
        is_channel: false,
      })
    ).toEqual({ type, chatId: "-700000001", isChannel: false });
  });

  it("message_created in a group chat", () => {
    expect(
      parseMaxUpdate({
        update_type: "message_created",
        timestamp: 1,
        message: {
          sender: user,
          recipient: { chat_id: -700000001, chat_type: "chat", user_id: null },
          timestamp: 1,
          body: { mid: "mid.1", seq: 1, text: "inex-7f3k 9q2m", attachments: null },
        },
      })
    ).toEqual({
      type: "message_created",
      chatId: "-700000001",
      chatType: "chat",
      senderId: "900000001",
      text: "inex-7f3k 9q2m",
    });
  });

  it("message_created without text or sender (channel post)", () => {
    expect(
      parseMaxUpdate({
        update_type: "message_created",
        timestamp: 1,
        message: {
          sender: null,
          recipient: { chat_id: -1, chat_type: "channel" },
          body: { mid: "m", seq: 1, text: null },
        },
      })
    ).toEqual({
      type: "message_created",
      chatId: "-1",
      chatType: "channel",
      senderId: null,
      text: null,
    });
  });

  it.each([
    ["unknown type", { update_type: "message_callback", timestamp: 1 }],
    ["no type", { timestamp: 1 }],
    ["not an object", "bot_started"],
    ["null", null],
    ["array", [{ update_type: "bot_started" }]],
    ["bot_started without user", { update_type: "bot_started", chat_id: 1 }],
    [
      "bot_started with a text user id",
      { update_type: "bot_started", chat_id: 1, user: { user_id: "x" } },
    ],
    ["bot_removed without chat", { update_type: "bot_removed", user, is_channel: false }],
    ["message without recipient", { update_type: "message_created", message: { body: {} } }],
    [
      "message with an unknown chat type",
      { update_type: "message_created", message: { recipient: { chat_id: 1, chat_type: "x" } } },
    ],
  ])("%s → null", (_label, body) => {
    expect(parseMaxUpdate(body)).toBeNull();
  });

  it("ignores an oversized start payload", () => {
    expect(
      parseMaxUpdate({ update_type: "bot_started", chat_id: 1, user, payload: "x".repeat(513) })
    ).toMatchObject({ payload: null });
  });
});

describe("int64 IDs", () => {
  it("readMaxId: numbers → strings; unsafe numbers are rejected", () => {
    expect(readMaxId(42)).toBe("42");
    expect(readMaxId(-700000001)).toBe("-700000001");
    expect(readMaxId("-72057594037927937")).toBe("-72057594037927937");
    expect(readMaxId(2 ** 60)).toBeNull();
    expect(readMaxId(1.5)).toBeNull();
    expect(readMaxId("12a")).toBeNull();
    expect(readMaxId(undefined)).toBeNull();
  });

  it("parseMaxJson keeps integers beyond 2^53 exact", () => {
    const body = parseMaxJson(
      '{"update_type":"bot_removed","timestamp":1,"chat_id":-72057594037927937,' +
        '"user":{"user_id":9007199254740993,"first_name":"A","is_bot":false},"is_channel":false}'
    );
    expect(parseMaxUpdate(body)).toEqual({
      type: "bot_removed",
      chatId: "-72057594037927937",
      isChannel: false,
    });
    expect((body as { user: { user_id: unknown } }).user.user_id).toBe("9007199254740993");
  });

  it("parseMaxJson leaves safe numbers and floats as numbers", () => {
    expect(parseMaxJson('{"a":1,"b":1.5,"c":1e300}')).toEqual({ a: 1, b: 1.5, c: 1e300 });
  });

  it("parseMaxJson throws on invalid JSON", () => {
    expect(() => parseMaxJson("{")).toThrow(SyntaxError);
  });
});
