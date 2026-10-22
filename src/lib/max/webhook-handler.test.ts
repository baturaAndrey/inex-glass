import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "./link-token";
import { decorateMaxText } from "./target";
import { handleMaxUpdate, REPLIES } from "./webhook-handler";
import type { MaxReply } from "./webhook-handler";
import type { Payload } from "payload";

/**
 * Webhook processing against an in-memory fake of the Payload Local API (`find`, `update`,
 * `findGlobal`, `updateGlobal`) and a fake `reply`. The Bot API is mocked (`maxGetChat`,
 * `maxSendMessage`); the atomic token claims (raw SQL in `link-service`) act on the fake state.
 */

const env = vi.hoisted(() => ({
  MAX_BOT_TOKEN: "token-0123456789abcdef" as string | undefined,
  SITE_ENV: "development",
}));
vi.mock("@/lib/env", () => ({ getEnv: () => env }));

const maxGetChat = vi.hoisted(() => vi.fn());
const maxSendMessage = vi.hoisted(() => vi.fn());
vi.mock("./client", () => ({ maxGetChat, maxSendMessage }));

const claims = vi.hoisted(() => ({
  user: vi.fn<(payload: unknown, userId: string, hash: string) => Promise<boolean>>(),
  group: vi.fn<(payload: unknown, hash: string) => Promise<boolean>>(),
}));
vi.mock("./link-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./link-service")>()),
  claimUserLinkToken: claims.user,
  claimGroupLinkCode: claims.group,
}));

const NOW = new Date("2026-10-22T10:00:00.000Z");
const FUTURE = "2026-10-22T10:20:00.000Z";
const PAST = "2026-10-22T09:59:00.000Z";
const TOKEN = `ig_${"A".repeat(16)}${"b".repeat(16)}`;
const CODE = "INEX-7F3K9Q2M";

type UserRow = {
  id: string;
  maxUserId?: string | null;
  maxLinkedAt?: string | null;
  maxBotStopped?: boolean | null;
  maxLinkTokenHash?: string | null;
  maxLinkTokenExpiresAt?: string | null;
};

type Where = Record<string, { equals: unknown }>;

function createFakePayload(users: UserRow[], settings: Record<string, unknown>) {
  const state = { users, settings };
  const matches = (row: UserRow, where: Where) =>
    Object.entries(where).every(([field, { equals }]) => row[field as keyof UserRow] === equals);

  // Conditional UPDATE … WHERE hash = $hash RETURNING id, as in `link-service`.
  claims.user.mockImplementation(async (_payload, userId, hash) => {
    const row = state.users.find((candidate) => candidate.id === userId);
    if (!row || row.maxLinkTokenHash !== hash) return false;
    Object.assign(row, { maxLinkTokenHash: null, maxLinkTokenExpiresAt: null });
    return true;
  });
  claims.group.mockImplementation(async (_payload, hash) => {
    const max = (state.settings.notifications as { max?: Record<string, unknown> } | undefined)
      ?.max;
    if (!max || max.groupLinkTokenHash !== hash) return false;
    Object.assign(max, { groupLinkTokenHash: null, groupLinkTokenExpiresAt: null });
    return true;
  });

  const api = {
    find: vi.fn(async ({ where, limit }: { where: Where; limit?: number }) => {
      const docs = state.users.filter((row) => matches(row, where)).slice(0, limit ?? 10);
      return { docs: docs.map((row) => ({ ...row })) };
    }),
    update: vi.fn(async ({ id, data }: { id: string; data: Partial<UserRow> }) => {
      const row = state.users.find((candidate) => candidate.id === id);
      if (!row) throw new Error(`no user ${id}`);
      Object.assign(row, data);
      return { ...row };
    }),
    findGlobal: vi.fn(async () => structuredClone(state.settings)),
    updateGlobal: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      state.settings = { ...state.settings, ...structuredClone(data) };
      return state.settings;
    }),
  };
  return { payload: api as unknown as Payload, api, state };
}

const maxOf = (settings: Record<string, unknown>) =>
  (settings.notifications as { max: Record<string, unknown> }).max;

/** What the bot actually says: every reply is decorated with its source. */
const said = (text: string) => decorateMaxText(text);

let reply: ReturnType<typeof vi.fn<MaxReply>>;

beforeEach(() => {
  env.MAX_BOT_TOKEN = "token-0123456789abcdef";
  reply = vi.fn<MaxReply>(async () => undefined);
  maxGetChat.mockReset();
  maxSendMessage.mockReset();
  maxSendMessage.mockResolvedValue({ messageId: "mid" });
});

describe("personal chat linking (bot_started with a token)", () => {
  it("links the token owner, clears the token and unlinks the same MAX account elsewhere", async () => {
    const { payload, state } = createFakePayload(
      [
        { id: "u1", maxLinkTokenHash: hashToken(TOKEN), maxLinkTokenExpiresAt: FUTURE },
        { id: "u2", maxUserId: "900000001", maxLinkedAt: PAST },
        { id: "u3", maxUserId: "555" },
      ],
      {}
    );

    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "900000001", payload: TOKEN },
      now: NOW,
      reply,
    });

    expect(result).toBe("user-linked");
    expect(state.users[0]).toEqual({
      id: "u1",
      maxUserId: "900000001",
      maxLinkedAt: NOW.toISOString(),
      maxBotStopped: false,
      maxLinkTokenHash: null,
      maxLinkTokenExpiresAt: null,
    });
    expect(state.users[1]).toMatchObject({ maxUserId: null, maxLinkedAt: null });
    expect(state.users[2]).toMatchObject({ maxUserId: "555" });
    expect(reply).toHaveBeenCalledWith({ userId: "900000001" }, said(REPLIES.userLinked));
  });

  it("the token is single-use: a second start with it is unknown", async () => {
    const { payload, state } = createFakePayload(
      [{ id: "u1", maxLinkTokenHash: hashToken(TOKEN), maxLinkTokenExpiresAt: FUTURE }],
      {}
    );
    await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "900000001", payload: TOKEN },
      now: NOW,
      reply,
    });
    const second = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "2", userId: "900000002", payload: TOKEN },
      now: NOW,
      reply,
    });
    expect(second).toBe("user-token-unknown");
    expect(state.users[0]?.maxUserId).toBe("900000001");
    expect(reply).toHaveBeenLastCalledWith({ userId: "900000002" }, said(REPLIES.userTokenUnknown));
  });

  it("an expired token is cleared and nothing is linked", async () => {
    const { payload, state } = createFakePayload(
      [{ id: "u1", maxLinkTokenHash: hashToken(TOKEN), maxLinkTokenExpiresAt: PAST }],
      {}
    );
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "900000001", payload: TOKEN },
      now: NOW,
      reply,
    });
    expect(result).toBe("user-token-expired");
    expect(state.users[0]).toEqual({
      id: "u1",
      maxLinkTokenHash: null,
      maxLinkTokenExpiresAt: null,
    });
    expect(reply).toHaveBeenCalledWith({ userId: "900000001" }, said(REPLIES.userTokenExpired));
  });

  it("an unknown token gets the «invalid link» reply", async () => {
    const { payload, api } = createFakePayload([{ id: "u1" }], {});
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "9", payload: TOKEN },
      now: NOW,
      reply,
    });
    expect(result).toBe("user-token-unknown");
    expect(api.update).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith({ userId: "9" }, said(REPLIES.userTokenUnknown));
  });

  it.each([
    ["promo-2026"],
    // Same length and alphabet as our token body, but without our prefix: a link of the other site.
    ["A".repeat(16) + "b".repeat(16)],
    ["IG_" + "A".repeat(32)],
  ])("a payload without our prefix (%s) is ignored silently", async (foreign) => {
    const { payload, api } = createFakePayload(
      [{ id: "u1", maxLinkTokenHash: hashToken(foreign), maxLinkTokenExpiresAt: FUTURE }],
      {}
    );
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "9", payload: foreign },
      now: NOW,
      reply,
    });
    expect(result).toBe("ignored");
    expect(api.update).not.toHaveBeenCalled();
    expect(claims.user).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });

  it("a malformed token with our prefix gets the «invalid link» reply only", async () => {
    const { payload, api } = createFakePayload([{ id: "u1" }], {});
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "9", payload: "ig_short" },
      now: NOW,
      reply,
    });
    expect(result).toBe("user-token-unknown");
    expect(api.find).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledExactlyOnceWith({ userId: "9" }, said(REPLIES.userTokenUnknown));
  });

  it("a concurrent delivery that loses the claim links nothing", async () => {
    const { payload, api, state } = createFakePayload(
      [{ id: "u1", maxLinkTokenHash: hashToken(TOKEN), maxLinkTokenExpiresAt: FUTURE }],
      {}
    );
    // The other delivery consumed the token between our read and our claim.
    claims.user.mockResolvedValueOnce(false);
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "900000002", payload: TOKEN },
      now: NOW,
      reply,
    });
    expect(result).toBe("user-token-unknown");
    expect(api.update).not.toHaveBeenCalled();
    expect(state.users[0]?.maxUserId).toBeUndefined();
    expect(claims.user).toHaveBeenCalledWith(payload, "u1", hashToken(TOKEN));
  });

  it("concurrent deliveries of the same token link exactly once", async () => {
    const { payload, state } = createFakePayload(
      [{ id: "u1", maxLinkTokenHash: hashToken(TOKEN), maxLinkTokenExpiresAt: FUTURE }],
      {}
    );
    const start = (userId: string) =>
      handleMaxUpdate({
        payload,
        update: { type: "bot_started", chatId: "1", userId, payload: TOKEN },
        now: NOW,
        reply,
      });
    const results = await Promise.all([start("900000001"), start("900000002")]);
    expect(results.filter((result) => result === "user-linked")).toHaveLength(1);
    expect(results.filter((result) => result === "user-token-unknown")).toHaveLength(1);
    expect(["900000001", "900000002"]).toContain(state.users[0]?.maxUserId);
  });
});

describe("bot_started without payload / bot_stopped", () => {
  it("bot_stopped marks the linked user", async () => {
    const { payload, state } = createFakePayload(
      [{ id: "u1", maxUserId: "900000001", maxBotStopped: false }, { id: "u2" }],
      {}
    );
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_stopped", chatId: "1", userId: "900000001" },
      now: NOW,
      reply,
    });
    expect(result).toBe("user-stopped");
    expect(state.users[0]?.maxBotStopped).toBe(true);
    expect(state.users[1]?.maxBotStopped).toBeUndefined();
    expect(reply).not.toHaveBeenCalled();
  });

  it("restarting the bot resumes notifications of a linked user", async () => {
    const { payload, state } = createFakePayload(
      [{ id: "u1", maxUserId: "900000001", maxBotStopped: true }],
      {}
    );
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "900000001", payload: null },
      now: NOW,
      reply,
    });
    expect(result).toBe("user-resumed");
    expect(state.users[0]?.maxBotStopped).toBe(false);
    // Silent: the other site sharing the bot may greet the user itself.
    expect(reply).not.toHaveBeenCalled();
  });

  it("a bare start of an unknown user is ignored silently", async () => {
    const { payload, api } = createFakePayload([{ id: "u1" }], {});
    const result = await handleMaxUpdate({
      payload,
      update: { type: "bot_started", chatId: "1", userId: "777", payload: null },
      now: NOW,
      reply,
    });
    expect(result).toBe("ignored");
    expect(api.update).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });
});

describe("group chat linking", () => {
  const settings = (max: Record<string, unknown>) => ({
    id: "s",
    experienceText: "keep",
    notifications: {
      leadNotifyEmails: [{ email: "a@example.com", id: "e1" }],
      fromName: "Inex",
      max: { newLead: true, statusChange: false, ...max },
    },
  });

  const groupMessage = (text: string, chatType: "chat" | "dialog" | "channel" = "chat") => ({
    type: "message_created" as const,
    chatId: "-700000001",
    chatType,
    senderId: "900000001",
    text,
  });

  it("a valid code links the chat, keeps sibling fields and asks the chat title", async () => {
    maxGetChat.mockResolvedValue({ title: "Менеджеры Inex" });
    const { payload, state, api } = createFakePayload(
      [],
      settings({ groupLinkTokenHash: hashToken(CODE), groupLinkTokenExpiresAt: FUTURE })
    );

    const result = await handleMaxUpdate({
      payload,
      update: groupMessage("  inex-7f3k9q2m\n"),
      now: NOW,
      reply,
    });

    expect(result).toBe("group-linked");
    expect(maxGetChat).toHaveBeenCalledWith("-700000001");
    expect(api.updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "site-settings",
        context: { disableRevalidate: true },
        depth: 0,
      })
    );
    expect(state.settings.experienceText).toBe("keep");
    const notifications = state.settings.notifications as Record<string, unknown>;
    expect(notifications.leadNotifyEmails).toEqual([{ email: "a@example.com", id: "e1" }]);
    expect(notifications.fromName).toBe("Inex");
    expect(maxOf(state.settings)).toEqual({
      newLead: true,
      statusChange: false,
      groupChatId: "-700000001",
      groupChatTitle: "Менеджеры Inex",
      groupLinkedAt: NOW.toISOString(),
      groupLinkTokenHash: null,
      groupLinkTokenExpiresAt: null,
    });
    expect(reply).toHaveBeenCalledWith({ chatId: "-700000001" }, said(REPLIES.groupLinked));
  });

  it("links with a null title when the chat lookup fails or there is no token", async () => {
    maxGetChat.mockRejectedValue(new Error("boom"));
    const first = createFakePayload(
      [],
      settings({ groupLinkTokenHash: hashToken(CODE), groupLinkTokenExpiresAt: FUTURE })
    );
    await handleMaxUpdate({ payload: first.payload, update: groupMessage(CODE), now: NOW, reply });
    expect(maxOf(first.state.settings)).toMatchObject({
      groupChatId: "-700000001",
      groupChatTitle: null,
    });

    env.MAX_BOT_TOKEN = undefined;
    maxGetChat.mockClear();
    const second = createFakePayload(
      [],
      settings({ groupLinkTokenHash: hashToken(CODE), groupLinkTokenExpiresAt: FUTURE })
    );
    await handleMaxUpdate({ payload: second.payload, update: groupMessage(CODE), now: NOW, reply });
    expect(maxGetChat).not.toHaveBeenCalled();
    expect(maxOf(second.state.settings)).toMatchObject({ groupChatTitle: null });
  });

  it("an expired code is cleared and the chat is told", async () => {
    const { payload, state } = createFakePayload(
      [],
      settings({ groupLinkTokenHash: hashToken(CODE), groupLinkTokenExpiresAt: PAST })
    );
    const result = await handleMaxUpdate({ payload, update: groupMessage(CODE), now: NOW, reply });
    expect(result).toBe("group-code-expired");
    expect(maxOf(state.settings)).not.toHaveProperty("groupChatId");
    expect(maxOf(state.settings)).toMatchObject({
      groupLinkTokenHash: null,
      groupLinkTokenExpiresAt: null,
      newLead: true,
    });
    expect(reply).toHaveBeenCalledWith({ chatId: "-700000001" }, said(REPLIES.groupCodeExpired));
  });

  it("a foreign code changes nothing and gets no reply", async () => {
    const { payload, api } = createFakePayload(
      [],
      settings({ groupLinkTokenHash: hashToken(CODE), groupLinkTokenExpiresAt: FUTURE })
    );
    const result = await handleMaxUpdate({
      payload,
      update: groupMessage("INEX-00000000"),
      now: NOW,
      reply,
    });
    expect(result).toBe("group-code-mismatch");
    expect(api.updateGlobal).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });

  it("ordinary messages and codes in dialogs/channels are ignored", async () => {
    const { payload, api } = createFakePayload(
      [],
      settings({ groupLinkTokenHash: hashToken(CODE), groupLinkTokenExpiresAt: FUTURE })
    );
    for (const update of [
      groupMessage("Всем привет"),
      groupMessage("INEX-7F3K 9Q2M"),
      groupMessage(`код ${CODE}`),
      groupMessage(CODE, "dialog"),
      groupMessage(CODE, "channel"),
    ]) {
      expect(await handleMaxUpdate({ payload, update, now: NOW, reply })).toBe("ignored");
    }
    expect(api.findGlobal).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
  });

  it("bot_removed from the linked chat unlinks it; from another chat changes nothing", async () => {
    const linked = settings({
      groupChatId: "-700000001",
      groupChatTitle: "Менеджеры",
      groupLinkedAt: PAST,
    });
    const other = createFakePayload([], linked);
    expect(
      await handleMaxUpdate({
        payload: other.payload,
        update: { type: "bot_removed", chatId: "-123", isChannel: false },
        now: NOW,
        reply,
      })
    ).toBe("ignored");
    expect(other.api.updateGlobal).not.toHaveBeenCalled();

    const current = createFakePayload([], linked);
    expect(
      await handleMaxUpdate({
        payload: current.payload,
        update: { type: "bot_removed", chatId: "-700000001", isChannel: false },
        now: NOW,
        reply,
      })
    ).toBe("group-unlinked");
    expect(maxOf(current.state.settings)).toMatchObject({
      groupChatId: null,
      groupChatTitle: null,
      groupLinkedAt: null,
      newLead: true,
      statusChange: false,
    });
    expect(reply).not.toHaveBeenCalled();
  });

  it("bot_added is only logged", async () => {
    const { payload, api } = createFakePayload([], settings({}));
    expect(
      await handleMaxUpdate({
        payload,
        update: { type: "bot_added", chatId: "-1", isChannel: false },
        now: NOW,
        reply,
      })
    ).toBe("ignored");
    expect(api.findGlobal).not.toHaveBeenCalled();
  });
});

describe("bot replies", () => {
  /**
   * Every situation in which the bot speaks. Fakes are created lazily: each one installs the claim
   * mocks over its own state.
   */
  const speakingScenarios = () => {
    const groupSettings = (expiresAt: string) => ({
      notifications: {
        max: { groupLinkTokenHash: hashToken(CODE), groupLinkTokenExpiresAt: expiresAt },
      },
    });
    const userWithToken = (expiresAt: string) => [
      { id: "u1", maxLinkTokenHash: hashToken(TOKEN), maxLinkTokenExpiresAt: expiresAt },
    ];
    const started = (payload: string) =>
      ({ type: "bot_started", chatId: "1", userId: "900000001", payload }) as const;
    const coded = {
      type: "message_created",
      chatId: "-700000001",
      chatType: "chat",
      senderId: "900000001",
      text: CODE,
    } as const;
    return [
      { fake: () => createFakePayload(userWithToken(FUTURE), {}), update: started(TOKEN) },
      { fake: () => createFakePayload(userWithToken(PAST), {}), update: started(TOKEN) },
      { fake: () => createFakePayload([], {}), update: started(TOKEN) },
      { fake: () => createFakePayload([], {}), update: started("ig_bad") },
      { fake: () => createFakePayload([], groupSettings(FUTURE)), update: coded },
      { fake: () => createFakePayload([], groupSettings(PAST)), update: coded },
    ];
  };

  it("every reply goes out through decorateMaxText (source line of the shared bot)", async () => {
    maxGetChat.mockResolvedValue({ title: null });
    const scenarios = speakingScenarios();
    for (const { fake, update } of scenarios) {
      await handleMaxUpdate({ payload: fake().payload, update, now: NOW });
    }

    expect(maxSendMessage).toHaveBeenCalledTimes(scenarios.length);
    const decorated = new Set(Object.values(REPLIES).map((text) => decorateMaxText(text)));
    for (const [message] of maxSendMessage.mock.calls as [{ text: string }][]) {
      expect(message.text.startsWith("<b>[ТЕСТ] Inex Glass</b>\n")).toBe(true);
      expect(decorated.has(message.text)).toBe(true);
    }
  });

  it("nothing is sent without a bot token", async () => {
    env.MAX_BOT_TOKEN = undefined;
    for (const { fake, update } of speakingScenarios()) {
      await handleMaxUpdate({ payload: fake().payload, update, now: NOW });
    }
    expect(maxSendMessage).not.toHaveBeenCalled();
  });
});
