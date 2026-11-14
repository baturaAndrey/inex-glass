import type { TestInfo } from "@playwright/test";

/**
 * Per-test client IPs for the rate-limited intake API (form tokens: 60 / 10 min per IP; leads
 * and uploads have lower limits). Without `X-Forwarded-For` every request of the suite lands in
 * the shared `unknown` bucket and a full run exhausts it (429).
 *
 * Addresses come from the three documentation ranges (RFC 5737): they are public for the
 * server's trusted-proxy check (`src/lib/leads/client-ip.ts`), so the header value is taken as
 * the client, yet they never belong to a real host. 762 addresses in total.
 */
const DOCUMENTATION_NETS = ["192.0.2", "198.51.100", "203.0.113"] as const;
const HOSTS_PER_NET = 254;
const POOL_SIZE = DOCUMENTATION_NETS.length * HOSTS_PER_NET;
/** Spreads the workers over the pool (prime, so the strides do not line up). */
const WORKER_STRIDE = 101;

/** Random start per worker process: consecutive runs within one rate window reuse little. */
const runOffset = Math.floor(Math.random() * POOL_SIZE);
let counter = 0;

/** A fresh documentation-range IP; consecutive calls within a worker never repeat until the pool wraps. */
export function uniqueTestIp(testInfo: TestInfo): string {
  counter += 1;
  const index = (runOffset + testInfo.workerIndex * WORKER_STRIDE + counter) % POOL_SIZE;
  const net = DOCUMENTATION_NETS[Math.floor(index / HOSTS_PER_NET)];
  return `${net}.${(index % HOSTS_PER_NET) + 1}`;
}

/** `X-Forwarded-For` header for `page.setExtraHTTPHeaders` and `APIRequestContext` calls. */
export function clientIpHeaders(ip: string): Record<string, string> {
  return { "x-forwarded-for": ip };
}
