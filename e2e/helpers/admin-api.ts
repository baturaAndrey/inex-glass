import { expect } from "@playwright/test";
import { createStaffUser, deleteStaffUser, loginAdmin } from "./admin";
import type { StaffRole } from "./admin";
import type { Lead, User } from "../../src/payload-types";
import type { APIRequestContext, APIResponse, BrowserContext } from "@playwright/test";

/**
 * REST helpers for admin e2e specs: staff sessions and fixtures through Payload's REST API
 * (`/api/<collection>/`, trailing slash). Authentication uses the JWT returned by
 * `POST /api/users/login/` as an `Authorization: JWT …` header, so API calls never depend on
 * browser cookies; `signInBrowser` puts the same token into the `payload-token` cookie.
 *
 * Sign-in goes through the shared helper `./admin`: ONE e2e admin for the whole suite, and
 * throwaway staff users (random credentials) instead of shared ones whose passwords would have
 * to be reset.
 */

type Json = Record<string, unknown>;

export class AdminApi {
  constructor(
    readonly request: APIRequestContext,
    readonly token: string,
    readonly user: User
  ) {}

  headers(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: `JWT ${this.token}`, ...extra };
  }

  get(path: string): Promise<APIResponse> {
    return this.request.get(path, { headers: this.headers() });
  }

  post(path: string, data: unknown, headers: Record<string, string> = {}): Promise<APIResponse> {
    return this.request.post(path, { headers: this.headers(headers), data: data as Json });
  }

  patch(path: string, data: unknown): Promise<APIResponse> {
    return this.request.patch(path, { headers: this.headers(), data: data as Json });
  }

  delete(path: string): Promise<APIResponse> {
    return this.request.delete(path, { headers: this.headers() });
  }

  /** `GET` that must succeed; returns the JSON body. */
  async json<T = Json>(path: string): Promise<T> {
    const response = await this.get(path);
    expect(response.status(), `GET ${path}`).toBe(200);
    return (await response.json()) as T;
  }
}

/** Signs in as the shared e2e admin (see `./admin`). */
export async function adminApi(request: APIRequestContext): Promise<AdminApi> {
  const session = await loginAdmin(request);
  return new AdminApi(request, session.token, session.user);
}

/**
 * Creates a throwaway staff user (random e-mail and password) and signs in as it. Remove it with
 * `deleteStaffApi` when the spec is done.
 */
export async function staffApi(admin: AdminApi, role: StaffRole): Promise<AdminApi> {
  const staff = await createStaffUser(admin.request, admin.token, role);
  return new AdminApi(admin.request, staff.token, staff.user);
}

/** Removes a user created by `staffApi`. */
export async function deleteStaffApi(admin: AdminApi, staff: AdminApi): Promise<void> {
  await deleteStaffUser(admin.request, admin.token, staff.user.id);
}

/** Puts the API session into the browser context (Payload reads the `payload-token` cookie). */
export async function signInBrowser(
  context: BrowserContext,
  api: AdminApi,
  baseURL: string
): Promise<void> {
  await context.clearCookies();
  await context.addCookies([{ name: "payload-token", value: api.token, url: baseURL }]);
}

export type LeadInput = Partial<Omit<Lead, "id" | "createdAt" | "updatedAt">> &
  Pick<Lead, "formType" | "name" | "phone">;

export async function createLead(api: AdminApi, data: LeadInput): Promise<Lead> {
  const response = await api.post("/api/leads/", data);
  expect(response.status(), `create lead: ${await response.text()}`).toBe(201);
  return ((await response.json()) as { doc: Lead }).doc;
}

export async function findStatusId(api: AdminApi, slug: string): Promise<string> {
  const { docs } = await api.json<{ docs: { id: string }[] }>(
    `/api/lead-statuses/?where[slug][equals]=${slug}&limit=1&depth=0`
  );
  const id = docs[0]?.id;
  if (!id) throw new Error(`Lead status "${slug}" is missing: run the seed (task 16)`);
  return id;
}

/** Best-effort cleanup: deletes the given documents, ignoring ones already gone. */
export async function deleteDocs(api: AdminApi, collection: string, ids: Iterable<string>) {
  for (const id of ids) {
    await api.delete(`/api/${collection}/${id}/`).catch(() => undefined);
  }
}

/** Uploads a tiny valid PDF into `lead-files` and returns its id. */
export async function uploadLeadPdf(api: AdminApi, name = "e2e-drawing.pdf"): Promise<string> {
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\n0000000000 65535 f \n" +
      "trailer<</Size 3/Root 1 0 R>>\nstartxref\n0\n%%EOF\n",
    "latin1"
  );
  const response = await api.request.post("/api/lead-files/", {
    headers: api.headers(),
    multipart: {
      file: { name, mimeType: "application/pdf", buffer: pdf },
      _payload: JSON.stringify({ originalName: name, kind: "pdf", source: "form" }),
    },
  });
  expect(response.status(), `upload lead file: ${await response.text()}`).toBe(201);
  return ((await response.json()) as { doc: { id: string } }).doc.id;
}

/** A unique Russian mobile number `+79XXXXXXXXX` for this run. */
export function uniquePhone(): string {
  const digits = String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  return `+79${digits}`;
}
