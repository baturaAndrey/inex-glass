import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** `indexnow-submit` handler with a stubbed global `fetch` (no network, no Payload). */

const env = vi.hoisted(() => ({
  SITE_URL: "https://inexglass.ru",
  SITE_ENV: "production",
  INDEXNOW_KEY: "0123456789abcdef0123456789abcdef" as string | undefined,
}));
vi.mock("@/lib/env", () => ({ getEnv: () => env }));

const { indexNowSubmitTask } = await import("./indexnow");

const URLS = ["https://inexglass.ru/zakalennoe-steklo/10-mm/", "https://inexglass.ru/blog/"];

function makeReq() {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { req: { payload: { logger } }, logger };
}

type Handler = (args: unknown) => Promise<{ output: { submitted: number } }>;
const run = (urls: string[], req: unknown) =>
  (indexNowSubmitTask.handler as unknown as Handler)({ input: { urls }, req });

describe("indexnow-submit job", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    env.SITE_ENV = "production";
    env.INDEXNOW_KEY = "0123456789abcdef0123456789abcdef";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the frozen slug and retries at most 3 times with exponential backoff", () => {
    expect(indexNowSubmitTask.slug).toBe("indexnow-submit");
    expect(indexNowSubmitTask.retries).toMatchObject({
      attempts: 3,
      backoff: { type: "exponential" },
    });
  });

  it("200: posts the IndexNow body and reports the count", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const { req } = makeReq();
    await expect(run(URLS, req)).resolves.toEqual({ output: { submitted: 2 } });
    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(endpoint).toBe("https://yandex.com/indexnow");
    expect(JSON.parse(String(init.body))).toEqual({
      host: "inexglass.ru",
      key: env.INDEXNOW_KEY,
      keyLocation: `https://inexglass.ru/${env.INDEXNOW_KEY}.txt`,
      urlList: URLS,
    });
  });

  it("422: logs a configuration error and completes without retry", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 422 }));
    const { req, logger } = makeReq();
    await expect(run(URLS, req)).resolves.toEqual({ output: { submitted: 0 } });
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ status: 422 }));
  });

  it.each([429, 500])("%i: throws so that Payload retries the job", async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    const { req } = makeReq();
    await expect(run(URLS, req)).rejects.toThrow(String(status));
  });

  it("does nothing outside production or without a key", async () => {
    const { req } = makeReq();
    env.SITE_ENV = "staging";
    await expect(run(URLS, req)).resolves.toEqual({ output: { submitted: 0 } });
    env.SITE_ENV = "production";
    env.INDEXNOW_KEY = undefined;
    await expect(run(URLS, req)).resolves.toEqual({ output: { submitted: 0 } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
