import http from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Local stand-in for the MAX Bot API (`res/max-api/schema.yaml`) for e2e runs that execute the
 * real client (`src/lib/max/client.ts`) through `MAX_API_BASE_URL`. It records every request and
 * answers with the minimal MAX-shaped bodies the client reads:
 *
 * - `POST /messages`        → `{ message: { body: { mid } } }` (`mid` = `mid.e2e.<n>`);
 * - `DELETE /messages`      → `{ success: true }`;
 * - `GET /subscriptions`    → `{ subscriptions }` (set with `setSubscriptions`);
 * - `POST /subscriptions`   → `{ success: true }`;
 * - `DELETE /subscriptions` → `{ success: true }`;
 * - anything else           → 404 `{ code: "not.found", message: "..." }`.
 *
 * Listens on 127.0.0.1 only. Nothing is forwarded anywhere.
 */

export interface MaxMockRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  authorization: string | undefined;
  body: unknown;
}

export interface MaxMockSubscription {
  url: string;
  update_types?: string[];
}

export interface MaxMock {
  /** Base URL for `MAX_API_BASE_URL`, e.g. `http://127.0.0.1:3199`. */
  baseUrl: string;
  /** Recorded requests in arrival order. */
  readonly requests: MaxMockRequest[];
  /** Requests of one method + path. */
  calls(method: string, path: string): MaxMockRequest[];
  /** Forget recorded requests (and the message counter keeps going: ids stay unique). */
  reset(): void;
  setSubscriptions(list: MaxMockSubscription[]): void;
  close(): Promise<void>;
}

/** Bodies above this size are not parsed (the client never sends anything close to it). */
const MAX_BODY_BYTES = 256 * 1024;

function readBody(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    request.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (raw === "") return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
    request.on("error", () => resolve(null));
  });
}

function send(response: http.ServerResponse, status: number, body: unknown): void {
  // `Connection: close`: keep-alive sockets do not pile up between requests. It does NOT fully
  // prevent the Windows libuv abort on `process.exit()` (see `isWindowsExitAbort` in the spec).
  response.writeHead(status, { "Content-Type": "application/json", Connection: "close" });
  response.end(JSON.stringify(body));
}

export async function startMaxMock(port: number): Promise<MaxMock> {
  const requests: MaxMockRequest[] = [];
  let subscriptions: MaxMockSubscription[] = [];
  let messageCounter = 0;

  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const body = await readBody(request);
      const method = request.method ?? "GET";
      requests.push({
        method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        authorization: request.headers.authorization,
        body,
      });

      const route = `${method} ${url.pathname}`;
      switch (route) {
        case "POST /messages": {
          messageCounter += 1;
          const mid = `mid.e2e.${messageCounter}`;
          send(response, 200, {
            message: {
              recipient: { chat_id: Number(url.searchParams.get("chat_id") ?? 0) },
              timestamp: Date.now(),
              body: { mid, seq: messageCounter, text: "" },
            },
          });
          return;
        }
        case "DELETE /messages":
        case "POST /subscriptions":
        case "DELETE /subscriptions":
          send(response, 200, { success: true });
          return;
        case "GET /subscriptions":
          send(response, 200, {
            subscriptions: subscriptions.map((item) => ({
              url: item.url,
              time: Date.now(),
              update_types: item.update_types ?? null,
              version: null,
            })),
          });
          return;
        default:
          send(response, 404, { code: "not.found", message: `mock: no route ${route}` });
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const { port: boundPort } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${boundPort}`,
    requests,
    calls: (method, path) => requests.filter((r) => r.method === method && r.path === path),
    reset: () => {
      requests.length = 0;
    },
    setSubscriptions: (list) => {
      subscriptions = list;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
