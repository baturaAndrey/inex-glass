import { expect, request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

/**
 * Mailpit HTTP API client for acceptance specs (task 42): the local stand and a staging stand
 * with an API-accessible interceptor send every mail to a Mailpit instance.
 *
 * `MAILPIT_URL` (e.g. `http://localhost:8025`) enables the mail checks; without it specs mark
 * the mail assertions as `[ЧЕЛОВЕК]` (manual check in the interceptor mailbox) and skip them.
 *
 * API reference: https://mailpit.axllent.org/docs/api-v1/ — `GET /api/v1/search?query=…`
 * (the same query syntax as the UI: `to:`, `subject:`, free text), `GET /api/v1/message/<ID>`.
 */

export const MAILPIT_URL = process.env.MAILPIT_URL?.replace(/\/+$/, "") || undefined;

export interface MailAddress {
  Name: string;
  Address: string;
}

export interface MailSummary {
  ID: string;
  Subject: string;
  To: MailAddress[];
  From: MailAddress;
  Created: string;
  Snippet: string;
}

export interface MailMessage extends MailSummary {
  HTML: string;
  Text: string;
}

const POLL_INTERVAL_MS = 1_000;
/** Mail goes through the Payload jobs queue (autorun every few seconds) — be patient. */
export const DEFAULT_MAIL_TIMEOUT_MS = 90_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Mailpit {
  private constructor(private readonly api: APIRequestContext) {}

  /** `null` when `MAILPIT_URL` is not set (mail checks are then manual). */
  static async connect(): Promise<Mailpit | null> {
    if (!MAILPIT_URL) return null;
    const api = await playwrightRequest.newContext({ baseURL: MAILPIT_URL });
    return new Mailpit(api);
  }

  async dispose(): Promise<void> {
    await this.api.dispose();
  }

  /** Messages matching a Mailpit search query, newest first. */
  async search(query: string, limit = 50): Promise<MailSummary[]> {
    const url = `/api/v1/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    // A dropped keep-alive connection (Mailpit restarted) is retried once.
    const response = await this.api.get(url).catch(async () => {
      await sleep(POLL_INTERVAL_MS);
      return this.api.get(url);
    });
    expect(response.status(), `mailpit search ${query}`).toBe(200);
    return ((await response.json()) as { messages: MailSummary[] | null }).messages ?? [];
  }

  async message(id: string): Promise<MailMessage> {
    const response = await this.api.get(`/api/v1/message/${id}`);
    expect(response.status(), `mailpit message ${id}`).toBe(200);
    return (await response.json()) as MailMessage;
  }

  /**
   * Polls until a message matching `query` (and the optional predicate on the full message)
   * arrives, then returns it. Throws a readable error on timeout.
   */
  async waitFor(
    query: string,
    predicate: (message: MailMessage) => boolean = () => true,
    timeoutMs = DEFAULT_MAIL_TIMEOUT_MS
  ): Promise<MailMessage> {
    const deadline = Date.now() + timeoutMs;
    const seen = new Set<string>();
    for (;;) {
      // While polling, a Mailpit that is (re)starting answers errors: try again next round.
      const found = await this.search(query).catch(() => [] as MailSummary[]);
      for (const summary of found) {
        if (seen.has(summary.ID)) continue;
        const full = await this.message(summary.ID).catch(() => null);
        if (!full) continue; // deleted meanwhile

        if (predicate(full)) return full;
        seen.add(summary.ID);
      }
      if (Date.now() > deadline) {
        throw new Error(`mailpit: no message for «${query}» within ${timeoutMs} ms`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }

  /** Best-effort removal of the messages a spec produced (keeps the shared mailbox tidy). */
  async deleteMessages(ids: string[]): Promise<void> {
    // Unique ids only: Mailpit (v1.2x) answers 400 to a repeated id and leaves its database
    // locked — every later API call then hangs until the container is restarted.
    const unique = [...new Set(ids)];
    if (unique.length === 0) return;
    await this.api.delete("/api/v1/messages", { data: { IDs: unique } }).catch(() => undefined);
  }
}

/** Plain text of an HTML mail body (tags stripped, entities of interest decoded, spaces collapsed). */
export function mailText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** `href` values of the links in an HTML mail body. */
export function mailLinks(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!.replace(/&amp;/g, "&"));
}
