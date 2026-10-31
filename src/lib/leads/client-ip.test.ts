import { describe, expect, it } from "vitest";
import { getClientIp, isTrustedIp, parseIp } from "./client-ip";

const headers = (init: Record<string, string>) => new Headers(init);

describe("getClientIp", () => {
  it("takes the right-most public address of X-Forwarded-For", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.5" }))).toBe("1.2.3.4");
    expect(getClientIp(headers({ "x-forwarded-for": "fake, 8.8.8.8, 172.18.0.3" }))).toBe(
      "8.8.8.8"
    );
  });

  it("ignores a spoofed left part of the chain", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "9.9.9.9, 5.6.7.8, 10.0.1.2" }))).toBe(
      "5.6.7.8"
    );
  });

  it("supports IPv6, brackets, ports and IPv4-mapped addresses", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "2001:db8::1, fd00::2" }))).toBe("2001:db8::1");
    expect(getClientIp(headers({ "x-forwarded-for": "[2001:DB8::2]:443" }))).toBe("2001:db8::2");
    expect(getClientIp(headers({ "x-forwarded-for": "5.6.7.8:1234" }))).toBe("5.6.7.8");
    expect(getClientIp(headers({ "x-forwarded-for": "::ffff:10.0.0.1, ::ffff:8.8.4.4" }))).toBe(
      "8.8.4.4"
    );
  });

  it("falls back to X-Real-IP, then unknown", () => {
    expect(getClientIp(headers({ "x-forwarded-for": "10.0.0.1", "x-real-ip": "4.4.4.4" }))).toBe(
      "4.4.4.4"
    );
    expect(getClientIp(headers({ "x-real-ip": "not-an-ip" }))).toBe("unknown");
    expect(getClientIp(headers({}))).toBe("unknown");
    expect(getClientIp(headers({ "x-forwarded-for": "" }))).toBe("unknown");
  });
});

describe("helpers", () => {
  it("parseIp rejects non-addresses", () => {
    expect(parseIp("fake")).toBeNull();
    expect(parseIp(" 1.2.3.4 ")).toBe("1.2.3.4");
  });

  it("isTrustedIp covers private, loopback and link-local ranges", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.31.0.1",
      "192.168.1.1",
      "169.254.1.1",
      "::1",
      "fc00::1",
      "fe80::1",
    ]) {
      expect(isTrustedIp(ip)).toBe(true);
    }
    for (const ip of ["172.32.0.1", "8.8.8.8", "2001:db8::1"]) {
      expect(isTrustedIp(ip)).toBe(false);
    }
  });
});
