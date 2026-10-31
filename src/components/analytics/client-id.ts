import { isMetrikaReady } from "./reach-goal";

/** How long to wait for tag.js to answer before submitting a lead without a client id. */
export const CLIENT_ID_TIMEOUT_MS = 1500;

/**
 * Metrika client id for the lead field `metrikaClientId` (end-to-end analytics
 * «заявка → КП → договор»). Resolves `null` without consent/counter, on the server, if
 * tag.js does not answer within `CLIENT_ID_TIMEOUT_MS` (blocked by an ad blocker) or on error.
 * Never rejects.
 */
export function getClientId(): Promise<string | null> {
  if (!isMetrikaReady()) return Promise.resolve(null);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), CLIENT_ID_TIMEOUT_MS);

    try {
      window.ym!(window.__INEX_YM_ID__, "getClientID", (clientId: unknown) => {
        const id = typeof clientId === "number" ? String(clientId) : clientId;
        finish(typeof id === "string" && id.length > 0 ? id : null);
      });
    } catch {
      finish(null);
    }
  });
}
