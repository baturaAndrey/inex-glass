"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Client side of the lead intake (task-17 API): the form token and `POST /api/forms/lead/`.
 * Every difference between the server response shapes and what the forms need is isolated here
 * (and in `./upload-file.ts`). Shared by the quiz (task-20) and the site forms (task-21).
 *
 * Server error shape: `{ ok: false, code, message, fields? }` with codes `validation`, `rate`,
 * `token`, `expired`, `too_fast`, `bad_request`, `server` (see `src/lib/leads/responses.ts`).
 */

export const FORM_TOKEN_URL = "/api/form-token/";
export const LEAD_SUBMIT_URL = "/api/forms/lead/";

export type SubmitErrorCode = "validation" | "rate_limit" | "token" | "network" | "server";

export class SubmitError extends Error {
  readonly code: SubmitErrorCode;
  /** Field path (`answers.contact.phone`, `consent`, …) → message, for `validation`. */
  readonly fieldErrors?: Record<string, string>;
  /**
   * Raw server code (`too_fast`, `expired`, `bad_request`, …) when the server answered.
   * `too_fast` means the token is valid but younger than 3 s: retrying later succeeds with the
   * same token, so forms do not need to refresh it.
   */
  readonly serverCode?: string;

  constructor(
    code: SubmitErrorCode,
    message: string,
    extra: { fieldErrors?: Record<string, string>; serverCode?: string } = {}
  ) {
    super(message);
    this.name = "SubmitError";
    this.code = code;
    if (extra.fieldErrors) this.fieldErrors = extra.fieldErrors;
    if (extra.serverCode) this.serverCode = extra.serverCode;
  }
}

/**
 * Server codes reported as `token`. For `too_fast` the token itself is fine (see `serverCode`):
 * callers skip the refresh, otherwise the 3-second clock would restart on every retry.
 */
const TOKEN_CODES: ReadonlySet<string> = new Set(["token", "expired", "too_fast"]);

interface ServerErrorBody {
  code?: unknown;
  message?: unknown;
  fields?: unknown;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const entries = Object.entries(record).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Maps an error response of the intake API to a `SubmitError`. */
export function submitErrorFromResponse(status: number, body: unknown): SubmitError {
  const error = (asRecord(body) ?? {}) as ServerErrorBody;
  const serverCode = typeof error.code === "string" ? error.code : undefined;
  const message = typeof error.message === "string" ? error.message : "";
  const extra = serverCode ? { serverCode } : {};

  if (serverCode === "validation") {
    const fieldErrors = stringRecord(error.fields);
    return new SubmitError("validation", message, {
      ...extra,
      ...(fieldErrors ? { fieldErrors } : {}),
    });
  }
  if (serverCode === "rate" || status === 429) return new SubmitError("rate_limit", message, extra);
  if (serverCode !== undefined && TOKEN_CODES.has(serverCode)) {
    return new SubmitError("token", message, extra);
  }
  return new SubmitError("server", message, extra);
}

/**
 * Requests a fresh signed form token (`POST /api/form-token/`). Throws `SubmitError`
 * (`network`, `rate_limit`, `server`).
 */
export async function fetchFormToken(signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(FORM_TOKEN_URL, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new SubmitError("network", "");
  }
  const body = asRecord(await readJson(response));
  if (response.ok && body?.ok === true && typeof body.token === "string" && body.token) {
    return body.token;
  }
  throw submitErrorFromResponse(response.status, body);
}

/** Tokens live 2 h on the server; refresh well before that while the form stays open. */
export const FORM_TOKEN_REFRESH_MS = 90 * 60 * 1000;

/**
 * Form token of a mounted form. Requested right on mount (the server rejects a submission
 * earlier than 3 s and later than 2 h after issue) and refreshed every 90 minutes. Call
 * `refresh()` after a `SubmitError` with `code === 'token'` (unless `serverCode === 'too_fast'`).
 * `token` stays `null` while loading or when the request failed; `refresh()` never throws.
 */
export function useFormToken(): { token: string | null; refresh: () => Promise<void> } {
  const [token, setToken] = useState<string | null>(null);
  const mountedRef = useRef(true);

  /** Fetches a token and stores it while mounted; failures keep the previous value. */
  const load = useCallback(
    () =>
      fetchFormToken().then(
        (next) => {
          if (mountedRef.current) setToken(next);
        },
        () => {
          // Network/server trouble: the submission fails with a visible error and retries later.
        }
      ),
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    void load();
    const timer = window.setInterval(load, FORM_TOKEN_REFRESH_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [load]);

  return { token, refresh: load };
}

/**
 * `POST /api/forms/lead/` with a JSON body (validated by `leadSubmitSchema` on the server).
 * Resolves `{ ok: true, leadId }` (`leadId` is `''` when the server silently dropped a honeypot
 * submission); rejects with `SubmitError`.
 */
export async function submitLead(
  body: Record<string, unknown>
): Promise<{ ok: true; leadId: string }> {
  let response: Response;
  try {
    response = await fetch(LEAD_SUBMIT_URL, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SubmitError("network", "");
  }
  const json = asRecord(await readJson(response));
  if (response.ok && json?.ok === true) {
    return { ok: true, leadId: typeof json.leadId === "string" ? json.leadId : "" };
  }
  throw submitErrorFromResponse(response.status, json);
}
