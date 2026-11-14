import { describe, expect, it, vi } from "vitest";
import {
  buildIndexNowBody,
  chunk,
  classifyStatus,
  INDEXNOW_BATCH_LIMIT,
  ownHostUrls,
  submitToIndexNow,
  YANDEX_INDEXNOW_ENDPOINT,
} from "./indexnow";

const SITE = "https://inexglass.ru";
const KEY = "0123456789abcdef0123456789abcdef";

function fetchReturning(...statuses: number[]) {
  const queue = [...statuses];
  return vi.fn(async () => new Response(null, { status: queue.shift() ?? 200 }));
}

describe("IndexNow helpers", () => {
  it("classifies response codes", () => {
    expect(classifyStatus(200)).toBe("ok");
    expect(classifyStatus(202)).toBe("ok");
    for (const status of [400, 403, 422, 404]) expect(classifyStatus(status)).toBe("config-error");
    for (const status of [429, 500, 503]) expect(classifyStatus(status)).toBe("retryable");
  });

  it("keeps only unique URLs of the own host", () => {
    expect(
      ownHostUrls(
        [
          `${SITE}/a/`,
          `${SITE}/a/`,
          "https://other.ru/a/",
          "https://www.inexglass.ru/b/",
          "not a url",
          "ftp://inexglass.ru/x",
          42,
          ` ${SITE}/c/ `,
        ],
        SITE
      )
    ).toEqual([`${SITE}/a/`, `${SITE}/c/`]);
  });

  it("builds the protocol body from SITE_URL", () => {
    expect(buildIndexNowBody(`${SITE}/`, KEY, [`${SITE}/a/`])).toEqual({
      host: "inexglass.ru",
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList: [`${SITE}/a/`],
    });
  });

  it("chunks lists", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("submitToIndexNow", () => {
  it("POSTs JSON to Yandex and reports success on 200/202", async () => {
    const fetchImpl = fetchReturning(202);
    const result = await submitToIndexNow([`${SITE}/a/`, `${SITE}/b/`], {
      siteUrl: SITE,
      key: KEY,
      fetchImpl,
    });
    expect(result).toEqual({ outcome: "ok", submitted: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe(YANDEX_INDEXNOW_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json; charset=utf-8" });
    expect(JSON.parse(String(init.body))).toEqual({
      host: "inexglass.ru",
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList: [`${SITE}/a/`, `${SITE}/b/`],
    });
  });

  it("splits more than 10 000 URLs into batches", async () => {
    const fetchImpl = fetchReturning(200, 200);
    const urls = Array.from({ length: INDEXNOW_BATCH_LIMIT + 5 }, (_, i) => `${SITE}/p${i}/`);
    const result = await submitToIndexNow(urls, { siteUrl: SITE, key: KEY, fetchImpl });
    expect(result).toEqual({ outcome: "ok", submitted: INDEXNOW_BATCH_LIMIT + 5 });
    const sizes = fetchImpl.mock.calls.map(
      (call) =>
        JSON.parse(String((call as unknown as [string, RequestInit])[1].body)).urlList.length
    );
    expect(sizes).toEqual([INDEXNOW_BATCH_LIMIT, 5]);
  });

  it("422 is a configuration error, 429 / 500 are retryable", async () => {
    const options = { siteUrl: SITE, key: KEY };
    await expect(
      submitToIndexNow([`${SITE}/a/`], { ...options, fetchImpl: fetchReturning(422) })
    ).resolves.toMatchObject({ outcome: "config-error", status: 422 });
    await expect(
      submitToIndexNow([`${SITE}/a/`], { ...options, fetchImpl: fetchReturning(429) })
    ).resolves.toMatchObject({ outcome: "retryable", status: 429 });
    await expect(
      submitToIndexNow([`${SITE}/a/`], { ...options, fetchImpl: fetchReturning(500) })
    ).resolves.toMatchObject({ outcome: "retryable", status: 500 });
  });

  it("a network error is retryable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      submitToIndexNow([`${SITE}/a/`], { siteUrl: SITE, key: KEY, fetchImpl })
    ).resolves.toMatchObject({ outcome: "retryable", reason: "TypeError" });
  });

  it("rejects a malformed key and sends nothing for an empty list", async () => {
    const fetchImpl = fetchReturning(200);
    await expect(
      submitToIndexNow([`${SITE}/a/`], { siteUrl: SITE, key: "short", fetchImpl })
    ).resolves.toMatchObject({ outcome: "config-error" });
    await expect(
      submitToIndexNow(["https://other.ru/"], { siteUrl: SITE, key: KEY, fetchImpl })
    ).resolves.toEqual({ outcome: "ok", submitted: 0 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
