import { BlockList, isIP } from "node:net";

/**
 * Client IP behind Traefik (task 17): used for rate limits and the consent log.
 *
 * `X-Forwarded-For` is a chain `client, proxy1, proxy2`, where every proxy APPENDS the address it
 * received the request from. Only the right end is written by our own infrastructure; anything
 * on the left can be forged by the client. So the chain is walked from the right, skipping our
 * trusted (private/loopback/link-local) networks: the first public address is the client.
 * Entries that are not IP addresses are skipped. Fallbacks: `X-Real-IP`, then `unknown`.
 */

export const UNKNOWN_IP = "unknown";

/** Docker/Swarm overlays, loopback, link-local and unique-local ranges — never a real client. */
const TRUSTED = new BlockList();
TRUSTED.addSubnet("127.0.0.0", 8, "ipv4");
TRUSTED.addSubnet("10.0.0.0", 8, "ipv4");
TRUSTED.addSubnet("172.16.0.0", 12, "ipv4");
TRUSTED.addSubnet("192.168.0.0", 16, "ipv4");
TRUSTED.addSubnet("169.254.0.0", 16, "ipv4");
TRUSTED.addAddress("::1", "ipv6");
TRUSTED.addSubnet("fc00::", 7, "ipv6");
TRUSTED.addSubnet("fe80::", 10, "ipv6");

const IPV4_MAPPED_PREFIX = "::ffff:";
/** `1.2.3.4:5678` — some proxies append the port to IPv4 entries. */
const IPV4_WITH_PORT = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/;
/** `[2001:db8::1]` or `[2001:db8::1]:443`. */
const BRACKETED_IPV6 = /^\[([^\]]+)\](?::\d+)?$/;

/** Canonical form of one header entry, or `null` when it is not an IP address. */
export function parseIp(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  const bracketed = BRACKETED_IPV6.exec(value);
  if (bracketed?.[1]) value = bracketed[1];
  const withPort = IPV4_WITH_PORT.exec(value);
  if (withPort?.[1]) value = withPort[1];
  // `::ffff:10.0.0.1` is an IPv4 address in IPv6 notation (dual-stack sockets).
  if (value.startsWith(IPV4_MAPPED_PREFIX) && isIP(value.slice(IPV4_MAPPED_PREFIX.length)) === 4) {
    value = value.slice(IPV4_MAPPED_PREFIX.length);
  }
  return isIP(value) === 0 ? null : value;
}

export function isTrustedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 0) return false;
  return TRUSTED.check(ip, version === 4 ? "ipv4" : "ipv6");
}

/** Right-most public address of the `X-Forwarded-For` chain, else `X-Real-IP`, else `unknown`. */
export function getClientIp(headers: Headers): string {
  const chain = (headers.get("x-forwarded-for") ?? "").split(",");
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const ip = parseIp(chain[index] ?? "");
    if (ip !== null && !isTrustedIp(ip)) return ip;
  }

  const realIp = parseIp(headers.get("x-real-ip") ?? "");
  return realIp ?? UNKNOWN_IP;
}
