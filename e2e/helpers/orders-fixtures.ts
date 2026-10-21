import { randomUUID } from "node:crypto";
import { request as playwrightRequest } from "@playwright/test";
import sharp from "sharp";
import { E2E_STAFF_EMAIL_PREFIX, loginAdmin } from "./admin";
import type { APIRequestContext, APIResponse } from "@playwright/test";

/**
 * REST fixtures of the orders e2e suite (task 33). Everything is created through the public
 * Payload REST API as an admin and removed again in `cleanup()`:
 * a manager, two lead statuses («Новая» / «Договор» with `isContract`), leads, order files
 * (PNG photos, PDF documents) and orders, plus the `send-order-status` jobs they queued.
 *
 * Admin session: the shared e2e admin of `./admin` (`loginAdmin`, which throws
 * `MissingAdminError` when the admin is missing on a database with other users).
 */

export type OrderStatus = "spec_agreed" | "in_production" | "packed" | "shipped" | "received";
export const ORDER_STATUSES: readonly OrderStatus[] = [
  "spec_agreed",
  "in_production",
  "packed",
  "shipped",
  "received",
];

export interface OrderDoc {
  id: string;
  number: string;
  currentStatus: OrderStatus | null;
  tokenCreatedAt: string | null;
  expiresAt: string | null;
  revoked: boolean | null;
  clientEmail?: string | null;
  statusHistory: { status: OrderStatus; date: string; plannedDate?: string | null }[];
  clientComment?: { text?: string | null } | null;
}

export interface JobDoc {
  id: string;
  taskSlug: string;
  input: { orderId?: string; status?: string };
}

/** Minimal valid PDF (magic bytes + trailer). */
export const PDF_BYTES = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n9\n%%EOF\n",
  "latin1"
);

const PHOTO_COLORS = ["#2B8C7E", "#324B64", "#8A5A00", "#B23B3B", "#2C5B86"];

/** 1200×900 solid-colour PNG (big enough for the 960 px thumbnail to be a real resize). */
export async function pngBytes(index: number): Promise<Buffer> {
  return sharp({
    create: {
      width: 1200,
      height: 900,
      channels: 3,
      background: PHOTO_COLORS[index % PHOTO_COLORS.length] ?? "#2B8C7E",
    },
  })
    .png()
    .toBuffer();
}

/** 10 national digits starting with 9: a mobile number unique enough per test. */
export const randomPhone = () => `+79${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

/** «Today» of the business (Chelyabinsk): the server dates order stages in this zone. */
const COMPANY_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Yekaterinburg",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Date key `YYYY-MM-DD`, `days` from today in the company time zone. */
export function dateKey(days = 0): string {
  return COMPANY_DATE.format(new Date(Date.now() + days * 86_400_000));
}

const GET_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const RETRY_STATUSES: ReadonlySet<number> = new Set([401, 403, 500, 502, 503, 504]);

async function json<T>(response: APIResponse, what: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(`${what}: HTTP ${response.status()} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export class OrdersFixtures {
  private readonly created = {
    orders: new Set<string>(),
    leads: new Set<string>(),
    files: new Set<string>(),
    statuses: new Set<string>(),
    users: new Set<string>(),
  };
  private readonly tag = randomUUID().slice(0, 8);

  private constructor(
    readonly api: APIRequestContext,
    readonly baseURL: string,
    readonly token: string
  ) {}

  /**
   * Idempotent GET of a fixture read with retries: on the shared dev server a request that hits
   * a recompile or a Postgres timeout can come back 5xx — or 401/403, when the session lookup
   * itself failed. Assertions about access rights never go through this helper.
   */
  /** Idempotent PATCH (same data every time), retried like `get` (5xx / failed session lookup). */
  private async patch(path: string, options: { data: unknown }): Promise<APIResponse> {
    let response = await this.api.patch(path, options);
    for (
      let attempt = 1;
      attempt < GET_ATTEMPTS && RETRY_STATUSES.has(response.status());
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      response = await this.api.patch(path, options);
    }
    return response;
  }

  private async get(path: string): Promise<APIResponse> {
    let response = await this.api.get(path);
    for (
      let attempt = 1;
      attempt < GET_ATTEMPTS && RETRY_STATUSES.has(response.status());
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      response = await this.api.get(path);
    }
    return response;
  }

  /** Signs in as the shared e2e admin (registers it on an empty database). */
  static async login(baseURL: string): Promise<OrdersFixtures> {
    const anon = await playwrightRequest.newContext({ baseURL });
    let token: string;
    try {
      ({ token } = await loginAdmin(anon));
    } finally {
      await anon.dispose();
    }
    const api = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: {
        Authorization: `JWT ${token}`,
        // The order admin API accepts mutations only from the site's own origin.
        Origin: new URL(baseURL).origin,
      },
    });
    return new OrdersFixtures(api, baseURL, token);
  }

  // --- Users and statuses ----------------------------------------------------------------

  async createUser(role: "manager" | "admin", extra: Record<string, unknown> = {}) {
    const email = `${E2E_STAFF_EMAIL_PREFIX}orders-${role}-${this.tag}-${randomUUID().slice(0, 6)}@inexglass.test`;
    const password = `Pw-${randomUUID()}`;
    const { doc } = await json<{ doc: { id: string } }>(
      await this.api.post("/api/users/", {
        data: { email, password, role, name: `E2E Менеджер ${this.tag}`, ...extra },
      }),
      "create user"
    );
    this.created.users.add(doc.id);
    return { id: doc.id, email, password };
  }

  async createStatuses(): Promise<{ newId: string; contractId: string }> {
    const make = async (name: string, slug: string, order: number, isContract: boolean) => {
      const { doc } = await json<{ doc: { id: string } }>(
        await this.api.post("/api/lead-statuses/", {
          data: { name, slug: `e2e-${slug}-${this.tag}`, order, isContract },
        }),
        "create lead status"
      );
      this.created.statuses.add(doc.id);
      return doc.id;
    };
    return {
      newId: await make("E2E Новая", "new", 900, false),
      contractId: await make("E2E Договор", "contract", 901, true),
    };
  }

  // --- Leads -------------------------------------------------------------------------------

  async createLead(statusId: string, options: { email?: string | null; phone?: string } = {}) {
    const phone = options.phone ?? randomPhone();
    const email =
      options.email === undefined ? `e2e-orders-client-${this.tag}@example.com` : options.email;
    const { doc } = await json<{ doc: { id: string } }>(
      await this.api.post("/api/leads/", {
        data: {
          formType: "quiz",
          name: `E2E Клиент ${this.tag}`,
          phone,
          ...(email ? { email } : {}),
          company: `ООО «E2E ${this.tag}»`,
          productType: "tempered",
          area: 86,
          answers: { type: "tempered", thickness: 10, positions: 42 },
          status: statusId,
        },
      }),
      "create lead"
    );
    this.created.leads.add(doc.id);
    return { id: doc.id, phone, email };
  }

  async setLeadStatus(leadId: string, statusId: string): Promise<void> {
    await json(
      await this.patch(`/api/leads/${leadId}/`, { data: { status: statusId } }),
      "update lead status"
    );
  }

  async ordersOfLead(leadId: string): Promise<OrderDoc[]> {
    const { docs } = await json<{ docs: OrderDoc[] }>(
      await this.get(`/api/orders/?where[lead][equals]=${leadId}&depth=0&limit=10`),
      "find orders"
    );
    docs.forEach((doc) => this.created.orders.add(doc.id));
    return docs;
  }

  /** A fresh order through the real path: lead → «Договор». */
  async createOrder(statuses: { newId: string; contractId: string }, email?: string | null) {
    const lead = await this.createLead(statuses.newId, { email: email ?? null });
    await this.setLeadStatus(lead.id, statuses.contractId);
    const [order] = await this.ordersOfLead(lead.id);
    if (!order) throw new Error("the order was not created from the lead");
    return { order, lead };
  }

  // --- Orders ------------------------------------------------------------------------------

  async getOrder(id: string): Promise<OrderDoc> {
    return json<OrderDoc>(await this.get(`/api/orders/${id}/?depth=0`), "get order");
  }

  async updateOrder(id: string, data: Record<string, unknown>): Promise<OrderDoc> {
    const { doc } = await json<{ doc: OrderDoc }>(
      await this.patch(`/api/orders/${id}/`, { data }),
      "update order"
    );
    return doc;
  }

  async uploadFile(kind: "photo" | "document", index = 0): Promise<string> {
    const isPhoto = kind === "photo";
    const { doc } = await json<{ doc: { id: string } }>(
      await this.api.post("/api/order-files/", {
        multipart: {
          file: isPhoto
            ? {
                name: `e2e-pack-${index + 1}.png`,
                mimeType: "image/png",
                buffer: await pngBytes(index),
              }
            : {
                name: `e2e-passport-${index + 1}.pdf`,
                mimeType: "application/pdf",
                buffer: PDF_BYTES,
              },
          _payload: JSON.stringify({ kind }),
        },
      }),
      "upload order file"
    );
    this.created.files.add(doc.id);
    return doc.id;
  }

  /** `POST /api/admin/orders/<id>/status/`. */
  async changeStatus(
    id: string,
    body: {
      status: OrderStatus;
      date?: string;
      plannedDate?: string;
      comment?: string;
      notify?: boolean;
      confirmRollback?: boolean;
    }
  ): Promise<APIResponse> {
    return this.api.post(`/api/admin/orders/${id}/status/`, {
      data: { date: dateKey(), notify: false, confirmRollback: true, ...body },
    });
  }

  /** Walks the order to `status` (all stages dated today unless `date` is given). */
  async setStatus(id: string, status: OrderStatus, date?: string): Promise<void> {
    // Idempotent (same stage, same date): retried like `get` on the overloaded dev server.
    let response = await this.changeStatus(id, { status, ...(date ? { date } : {}) });
    for (
      let attempt = 1;
      attempt < GET_ATTEMPTS && RETRY_STATUSES.has(response.status());
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      response = await this.changeStatus(id, { status, ...(date ? { date } : {}) });
    }
    await json(response, `set status ${status}`);
  }

  async link(id: string): Promise<string> {
    const body = await json<{ url: string | null }>(
      await this.get(`/api/admin/orders/${id}/token/`),
      "get order link"
    );
    if (!body.url) throw new Error("order has no link");
    return new URL(body.url).pathname;
  }

  async tokenAction(id: string, action: "reissue" | "revoke" | "restore" | "resend") {
    return json<{ ok: boolean; url?: string | null; revoked?: boolean }>(
      await this.api.post(`/api/admin/orders/${id}/token/`, { data: { action } }),
      `token ${action}`
    );
  }

  /** `send-order-status` jobs queued for the order (newest first). */
  async statusJobs(orderId: string): Promise<JobDoc[]> {
    const { docs } = await json<{ docs: JobDoc[] }>(
      await this.get(
        "/api/payload-jobs/?where[taskSlug][equals]=send-order-status&sort=-createdAt&limit=200&depth=0"
      ),
      "list jobs"
    );
    return docs.filter((job) => job.input?.orderId === orderId);
  }

  async siteSettingsTtlDays(): Promise<number> {
    const settings = await json<{ orderLinkTtlDays?: number }>(
      await this.get("/api/globals/site-settings/?depth=0"),
      "site settings"
    );
    return typeof settings.orderLinkTtlDays === "number" && settings.orderLinkTtlDays > 0
      ? settings.orderLinkTtlDays
      : 90;
  }

  // --- Cleanup -----------------------------------------------------------------------------

  private async remove(path: string): Promise<void> {
    await this.api.delete(path).catch(() => undefined);
  }

  async cleanup(): Promise<void> {
    for (const orderId of this.created.orders) {
      for (const job of await this.statusJobs(orderId).catch(() => [] as JobDoc[])) {
        await this.remove(`/api/payload-jobs/${job.id}/`);
      }
      await this.remove(`/api/orders/${orderId}/`);
    }
    for (const id of this.created.files) await this.remove(`/api/order-files/${id}/`);
    for (const id of this.created.leads) await this.remove(`/api/leads/${id}/`);
    for (const id of this.created.statuses) await this.remove(`/api/lead-statuses/${id}/`);
    for (const id of this.created.users) await this.remove(`/api/users/${id}/`);
    await this.api.dispose();
  }
}
