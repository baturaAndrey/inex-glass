import { randomUUID } from "node:crypto";
import { expect, request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext, APIResponse } from "@playwright/test";

/**
 * REST helpers of the acceptance admin scenarios (task 42): an API context authorised with a
 * staff JWT (+ the site `Origin`, which the custom admin routes require), TEST leads and their
 * erasure through the 152-ФЗ route, a minimal Lexical document, text normalisation.
 *
 * Sessions come from `./admin` (`loginAdmin` / `createStaffUser`): never sign in as the shared
 * e2e admin directly (parallel logins drop each other's sessions).
 */

export const ERASE_CONFIRM_WORD = "УДАЛИТЬ";

/** API context with `Authorization: JWT …` and `Origin: <site>`; dispose it when done. */
export async function staffContext(baseURL: string, token: string): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: { Authorization: `JWT ${token}`, Origin: new URL(baseURL).origin },
  });
}

export async function okJson<T>(response: APIResponse, what: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${what}: HTTP ${response.status()} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

/** A unique Russian mobile number `+79XXXXXXXXX`. */
export const testPhone = () => `+79${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

/** Short random tag for TEST names / e-mails. */
export const shortTag = () => randomUUID().slice(0, 8);

/** Id of a lead status by `where` (e.g. `[slug][equals]=new`), or `null`. */
export async function leadStatusId(api: APIRequestContext, where: string): Promise<string | null> {
  const body = await okJson<{ docs: { id: string }[] }>(
    await api.get(`/api/lead-statuses/?where${where}&limit=1&depth=0`),
    "lead statuses"
  );
  return body.docs[0]?.id ?? null;
}

export interface TestLeadInput {
  tag: string;
  phone?: string;
  email?: string | null;
  status?: string;
  files?: string[];
}

/** Creates a lead named `TEST Приёмка <tag>` through the REST API (as staff). */
export async function createTestLead(
  api: APIRequestContext,
  input: TestLeadInput
): Promise<{ id: string; phone: string; email: string | null }> {
  const phone = input.phone ?? testPhone();
  const email = input.email === undefined ? `test-accept-${input.tag}@example.com` : input.email;
  const { doc } = await okJson<{ doc: { id: string } }>(
    await api.post("/api/leads/", {
      data: {
        formType: "quiz",
        name: `TEST Приёмка ${input.tag}`,
        phone,
        ...(email ? { email } : {}),
        company: `ООО «TEST ${input.tag}»`,
        productType: "tempered",
        area: 80,
        answers: { type: "tempered", thickness: 10, positions: 12 },
        ...(input.status ? { status: input.status } : {}),
        ...(input.files ? { files: input.files } : {}),
      },
    }),
    "create TEST lead"
  );
  return { id: doc.id, phone, email };
}

/**
 * `POST /api/admin/leads/<id>/erase/` (admin only): deletes the lead, its versions and files.
 * Returns the response so callers can assert on it; 404 (already gone) is fine for cleanup.
 */
export function eraseLead(api: APIRequestContext, id: string): Promise<APIResponse> {
  return api.post(`/api/admin/leads/${id}/erase/`, {
    headers: { "Content-Type": "application/json" },
    data: { confirm: ERASE_CONFIRM_WORD },
  });
}

/** Best-effort erase of TEST leads (cleanup). */
export async function eraseLeads(api: APIRequestContext, ids: Iterable<string>): Promise<void> {
  for (const id of ids) {
    const response = await eraseLead(api, id).catch(() => null);
    // A lead whose order still exists answers 409: fall back to a plain delete.
    if (response?.status() === 409) await api.delete(`/api/leads/${id}/`).catch(() => undefined);
  }
}

/** Minimal Lexical document: one paragraph per string (shape of `@payloadcms/richtext-lexical`). */
export function lexicalDoc(paragraphs: readonly string[]) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        textFormat: 0,
        textStyle: "",
        children: [
          { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 },
        ],
      })),
    },
  };
}

/** Collapses every kind of space (NBSP, narrow NBSP, thin space, newlines) into one ASCII space. */
export function normalizeSpaces(text: string): string {
  return text.replace(/[\s   ]+/g, " ").trim();
}

/** `1511` → `1 511` (thousands grouping as rendered, after `normalizeSpaces`). */
export function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** JSON-LD objects of a raw HTML page (`<script type="application/ld+json">`), flattened. */
export function jsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      nodes.push(record);
      Object.values(record).forEach(visit);
    }
  };
  for (const match of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  )) {
    try {
      visit(JSON.parse(match[1]!));
    } catch {
      // not JSON: ignore
    }
  }
  return nodes;
}

/** `<title>` of a raw HTML page (entities of interest decoded, spaces normalised). */
export function htmlTitle(html: string): string {
  const raw = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  return normalizeSpaces(raw.replace(/&amp;/g, "&").replace(/&quot;/g, '"'));
}

/** Asserts a JSON body has `docs` — used to tell «access granted» from a denial. */
export async function expectStatus(
  response: APIResponse,
  expected: number | readonly number[],
  what: string
): Promise<void> {
  const allowed = typeof expected === "number" ? [expected] : expected;
  const status = response.status();
  expect(
    allowed,
    `${what}: HTTP ${status} ${allowed.includes(status) ? "" : await response.text()}`
  ).toContain(status);
}
