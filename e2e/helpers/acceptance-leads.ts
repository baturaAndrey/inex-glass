import http from "node:http";
import https from "node:https";
import { expect } from "@playwright/test";
import { clientIpHeaders } from "./test-ip";
import type { AdminApi } from "./admin-api";
import type { Lead } from "../../src/payload-types";
import type { APIRequestContext, APIResponse } from "@playwright/test";

/**
 * Public intake API helpers of the acceptance lead specs (task 42): form tokens, lead
 * submissions and uploads as an anonymous visitor with its own client IP, plus the
 * personal-data erasure that removes every TEST lead (lead, versions, files, consent PII).
 *
 * Contracts: `src/app/api/{form-token,forms/lead,upload}/route.ts`,
 * `src/app/api/admin/leads/[id]/erase/route.ts`.
 */

/** The server accepts a form token no earlier than 3 s after it was issued. */
export const FORM_TOKEN_MIN_AGE_MS = 3_100;

/** Lead creation limit per IP / phone / e-mail (`RATE_LIMITS.lead`, 10 minutes). */
export const LEAD_RATE_LIMIT = 5;

/** Marker of acceptance test data: `TEST` + a per-run tag (also searchable in mail subjects). */
export const TEST_PREFIX = "TEST";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface IntakeError {
  ok: false;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export async function issueFormToken(request: APIRequestContext, ip: string): Promise<string> {
  const response = await request.post("/api/form-token/", { headers: clientIpHeaders(ip) });
  expect(response.status(), `form token: ${await response.text()}`).toBe(200);
  return ((await response.json()) as { token: string }).token;
}

/** Waits out the 3-second minimum age of a form token. */
export const waitTokenAge = () => sleep(FORM_TOKEN_MIN_AGE_MS);

/** `POST /api/forms/lead/` as a visitor; `xff` overrides the whole `X-Forwarded-For` chain. */
export function submitLead(
  request: APIRequestContext,
  body: Record<string, unknown>,
  xff: string
): Promise<APIResponse> {
  return request.post("/api/forms/lead/", { headers: { "x-forwarded-for": xff }, data: body });
}

/** A minimal valid «Контакты» form submission. */
export function contactsLead(
  formToken: string,
  fields: { company: string; name?: string; phone: string; email?: string }
): Record<string, unknown> {
  return {
    formType: "contacts",
    name: fields.name ?? `${TEST_PREFIX} Приёмка`,
    phone: fields.phone,
    ...(fields.email ? { email: fields.email } : {}),
    company: fields.company,
    entryPage: "/kontakty/",
    consent: true,
    formToken,
    company_website: "",
  };
}

/**
 * Multipart upload through Node's `fetch` (Playwright's request buffers are capped at 50 MB, the
 * server limit is exactly what is being tested). Returns the status and the JSON body (or `null`
 * when the server closed the connection before the body could be read).
 */
export async function uploadRaw(
  baseURL: string,
  options: { token: string; ip: string; name: string; bytes: Uint8Array; purpose?: string }
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const form = new FormData();
  form.set("purpose", options.purpose ?? "quiz");
  form.set("file", new Blob([new Uint8Array(options.bytes)]), options.name);
  const response = await fetch(new URL("/api/upload/", baseURL), {
    method: "POST",
    headers: { "x-form-token": options.token, ...clientIpHeaders(options.ip) },
    body: form,
  });
  const text = await response.text().catch(() => "");
  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

/**
 * Sends only the headers of an upload that DECLARES `bytes` of body (plus a few real bytes) and
 * reads the answer: the server must refuse from `Content-Length` alone, before streaming. Raw
 * `node:http(s)` because `fetch`/Playwright always compute the length themselves.
 */
export function declaredOversizeUpload(
  baseURL: string,
  options: { token: string; ip: string; bytes: number }
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const url = new URL("/api/upload/", baseURL);
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=acceptance",
        "content-length": String(options.bytes),
        "x-form-token": options.token,
        ...clientIpHeaders(options.ip),
      },
    });
    req.on("response", (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => {
        req.destroy();
        let body: Record<string, unknown> | null = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
        } catch {
          body = null;
        }
        resolve({ status: response.statusCode ?? 0, body });
      });
    });
    req.on("error", reject);
    req.setTimeout(60_000, () => req.destroy(new Error("declared-size upload timed out")));
    // A first chunk only; the rest of the declared body is never sent.
    req.write("--acceptance\r\n");
  });
}

/** Leads whose `company` equals the value (admin REST; `[]` when none). */
export async function leadsByCompany(admin: AdminApi, company: string): Promise<Lead[]> {
  const { docs } = await admin.json<{ docs: Lead[] }>(
    `/api/leads/?where[company][equals]=${encodeURIComponent(company)}&depth=0&limit=50&sort=createdAt`
  );
  return docs;
}

/**
 * Erases TEST leads through the admin route (lead, versions, files on disk, consent PII).
 * Best effort: a lead already gone (404) is fine; other failures are reported, not thrown, so one
 * stuck lead does not hide the cleanup of the others.
 */
export async function eraseLeads(
  admin: AdminApi,
  origin: string,
  ids: Iterable<string>
): Promise<string[]> {
  const failures: string[] = [];
  for (const id of ids) {
    const response = await admin
      .post(`/api/admin/leads/${id}/erase/`, { confirm: "УДАЛИТЬ" }, { Origin: origin })
      .catch(() => null);
    if (!response) failures.push(`${id}: transport error`);
    else if (!response.ok() && response.status() !== 404) {
      failures.push(`${id}: HTTP ${response.status()} ${await response.text()}`);
    }
  }
  return failures;
}
