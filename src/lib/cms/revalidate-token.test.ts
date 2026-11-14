import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { signToken } from "@/lib/uploads/tokens";
import {
  REVALIDATE_TOKEN_TTL_MS,
  type RevalidateTransport,
  requestSiteRevalidation,
  signRevalidateToken,
  tokenFromAuthorization,
  verifyRevalidateToken,
} from "./revalidate-token";
import type { AddressInfo } from "node:net";

const SECRET = "test-payload-secret-0123456789-abcdefghij";
const NOW = 1_800_000_000_000;

describe("revalidate token", () => {
  it("accepts a fresh token signed with the same secret", () => {
    expect(verifyRevalidateToken(signRevalidateToken(SECRET, NOW), SECRET, NOW + 1000)).toBe(true);
  });

  it("rejects an expired token", () => {
    const token = signRevalidateToken(SECRET, NOW);
    expect(verifyRevalidateToken(token, SECRET, NOW + REVALIDATE_TOKEN_TTL_MS + 1)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    const token = signRevalidateToken(`${SECRET}-other`, NOW);
    expect(verifyRevalidateToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects tokens of another context and garbage", () => {
    const foreign = signToken("upload-token:v1", { x: NOW + 1000 }, SECRET);
    expect(verifyRevalidateToken(foreign, SECRET, NOW)).toBe(false);
    expect(verifyRevalidateToken("abc.def", SECRET, NOW)).toBe(false);
    expect(verifyRevalidateToken(undefined, SECRET, NOW)).toBe(false);
  });

  it("rejects a token whose expiry exceeds the TTL", () => {
    const forged = signToken(
      "cms-revalidate:v1",
      { x: NOW + REVALIDATE_TOKEN_TTL_MS * 10 },
      SECRET
    );
    expect(verifyRevalidateToken(forged, SECRET, NOW)).toBe(false);
  });

  it("POSTs a valid bearer token to /api/revalidate/ of the site (real HTTP)", async () => {
    let seen: {
      method?: string | undefined;
      url?: string | undefined;
      authorization?: string | undefined;
    } = {};
    const server = createServer((req, res) => {
      seen = { method: req.method, url: req.url, authorization: req.headers.authorization };
      res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    try {
      const result = await requestSiteRevalidation({
        siteUrl: `http://127.0.0.1:${port}`,
        secret: SECRET,
        now: NOW,
      });
      expect(result).toEqual({ ok: true, url: `http://127.0.0.1:${port}/api/revalidate/` });
      expect(seen.method).toBe("POST");
      expect(seen.url).toBe("/api/revalidate/");
      const token = tokenFromAuthorization(seen.authorization ?? null);
      expect(verifyRevalidateToken(token, SECRET, NOW)).toBe(true);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("reports failures instead of throwing", async () => {
    const failing: RevalidateTransport = async () => {
      throw new Error("ECONNREFUSED");
    };
    await expect(
      requestSiteRevalidation({ siteUrl: "http://localhost:1", secret: SECRET, transport: failing })
    ).resolves.toMatchObject({ ok: false, reason: "ECONNREFUSED" });

    const denied: RevalidateTransport = async () => 401;
    await expect(
      requestSiteRevalidation({
        siteUrl: "http://localhost:3000",
        secret: SECRET,
        transport: denied,
      })
    ).resolves.toMatchObject({ ok: false, reason: "HTTP 401" });

    await expect(
      requestSiteRevalidation({ siteUrl: "not a url", secret: SECRET, transport: denied })
    ).resolves.toMatchObject({ ok: false });
  });

  it("reads the bearer token from the Authorization header", () => {
    expect(tokenFromAuthorization("Bearer abc.def")).toBe("abc.def");
    expect(tokenFromAuthorization("Basic abc")).toBeNull();
    expect(tokenFromAuthorization("Bearer ")).toBeNull();
    expect(tokenFromAuthorization(null)).toBeNull();
  });
});
