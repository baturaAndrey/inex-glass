import { expect, test } from "@playwright/test";
import {
  createTestLead,
  eraseLeads,
  expectStatus,
  shortTag,
  staffContext,
} from "../helpers/acceptance-admin";
import { onlyProject } from "../helpers/acceptance-env";
import { createStaffUser, deleteStaffUser, loginAdmin, skipOnMissingAdmin } from "../helpers/admin";
import type { StaffUser } from "../helpers/admin";
import type { APIRequestContext } from "@playwright/test";

/**
 * Acceptance scenario 6 (task 42, ТЗ §2.1 / §6.1): roles.
 *
 * `manager` (a throwaway user, `createStaffUser`):
 * - reads the staff directory (accepted deviation FL-05: «Ответственный» needs it) but never
 *   their sessions; cannot create users or escalate its role (`PATCH /api/users/<id>`
 *   with `role`), cannot touch other users;
 * - reads and works leads/orders, cannot delete leads;
 * - may edit `prices` and `promo`;
 * - cannot edit pages, articles, objects and the other globals.
 * `admin`: full access (users list, lead deletion, globals).
 *
 * Write rights to the shared globals are proven WITHOUT changing them: the request carries
 * invalid data, so an allowed role gets 400 (validation runs after access) and a denied one 403.
 * The real manager edit of `prices`/`promo` is part of `prices-promo.spec.ts` (serial, restores).
 * API-only: runs once, in desktop-1366.
 */

const ADMIN_ONLY_GLOBALS = [
  "contacts",
  "conditions",
  "navigation",
  "requisites",
  "site-settings",
  "snippets",
  "tech-params",
] as const;

let baseURL: string;
let admin: APIRequestContext;
let adminUserId: string;
let manager: StaffUser;
let asManager: APIRequestContext;
const leads = new Set<string>();

test.describe.configure({ timeout: 180_000 });

test.beforeAll(async ({ request, baseURL: url }) => {
  baseURL = url ?? "";
  try {
    const session = await loginAdmin(request);
    adminUserId = session.user.id;
    admin = await staffContext(baseURL, session.token);
    manager = await createStaffUser(request, session.token, "manager", "TEST Менеджер приёмки");
    asManager = await staffContext(baseURL, manager.token);
  } catch (error) {
    skipOnMissingAdmin(error);
  }
});

test.afterAll(async ({ request }) => {
  if (admin) {
    await eraseLeads(admin, leads);
    if (manager) await deleteStaffUser(request, (await loginAdmin(request)).token, manager.id);
    await admin.dispose();
  }
  await asManager?.dispose();
});

test.beforeEach(({}, testInfo) => onlyProject(testInfo, undefined, "API check, one project"));

test("6a. manager: users — only itself, no escalation", async () => {
  const list = await asManager.get("/api/users/?limit=100&depth=0");
  expect(list.status()).toBe(200);
  const { docs } = (await list.json()) as { docs: { id: string; sessions?: unknown }[] };
  // ТЗ / task-42 scenario 6 says «manager не видит коллекцию users (кроме себя)». Accepted
  // deviation (src/payload/collections/users.ts, `read: isLoggedIn`; fix-list FL-05): managers
  // read the staff directory because the «Ответственный» relationship on leads/orders needs it.
  // What must hold: the manager sees itself, and nothing secret of the others.
  test.info().annotations.push({
    type: "deviation",
    description: "manager reads the staff list (users.ts read: isLoggedIn) — fix-list FL-05",
  });
  expect(docs.map((doc) => doc.id)).toContain(manager.id);
  for (const doc of docs.filter((doc) => doc.id !== manager.id)) {
    expect.soft(doc.sessions ?? [], "sessions of other users must never be readable").toEqual([]);
  }

  // Escalation: the role field is admin-only — the update is refused or the role is ignored.
  const escalate = await asManager.patch(`/api/users/${manager.id}/`, { data: { role: "admin" } });
  expect([200, 400, 403]).toContain(escalate.status());
  const me = await asManager.get("/api/users/me/");
  expect(((await me.json()) as { user: { role: string } }).user.role).toBe("manager");

  await expectStatus(
    await asManager.patch(`/api/users/${adminUserId}/`, { data: { name: "TEST hijack" } }),
    [403, 404],
    "manager updates the admin"
  );
  await expectStatus(
    await asManager.patch(`/api/users/${adminUserId}/`, { data: { role: "manager" } }),
    [403, 404],
    "manager demotes the admin"
  );
  await expectStatus(
    await asManager.post("/api/users/", {
      data: {
        email: `e2e-staff-escalate-${shortTag()}@inexglass.test`,
        password: `Pw-${shortTag()}${shortTag()}`,
        role: "admin",
        name: "TEST escalate",
      },
    }),
    403,
    "manager creates a user"
  );
  await expectStatus(
    await asManager.delete(`/api/users/${adminUserId}/`),
    [403, 404],
    "manager deletes the admin"
  );
});

test("6b. manager: leads and orders — work yes, delete no", async () => {
  const lead = await createTestLead(admin, { tag: shortTag() });
  leads.add(lead.id);

  await expectStatus(
    await asManager.get("/api/leads/?limit=5&depth=0"),
    200,
    "manager lists leads"
  );
  await expectStatus(await asManager.get(`/api/leads/${lead.id}/`), 200, "manager reads a lead");
  await expectStatus(
    await asManager.patch(`/api/leads/${lead.id}/`, { data: { company: "ООО «TEST правка»" } }),
    200,
    "manager edits a lead"
  );
  await expectStatus(
    await asManager.get("/api/orders/?limit=5&depth=0"),
    200,
    "manager lists orders"
  );
  await expectStatus(
    await asManager.delete(`/api/leads/${lead.id}/`),
    403,
    "manager deletes a lead"
  );
  await expectStatus(
    await asManager.post(`/api/admin/leads/${lead.id}/erase/`, {
      headers: { "Content-Type": "application/json" },
      data: { confirm: "УДАЛИТЬ" },
    }),
    403,
    "manager erases a lead"
  );
  // Still there.
  await expectStatus(await admin.get(`/api/leads/${lead.id}/`), 200, "lead survives");
});

test("6c. manager: prices and promo — editable; pages and other globals — not", async () => {
  // Invalid data: 400 = the role may write (validation runs after access), 403 = denied.
  await expectStatus(
    await asManager.post("/api/globals/prices/", { data: { rows: [] } }),
    400,
    "manager writes prices"
  );
  await expectStatus(
    await asManager.post("/api/globals/promo/", { data: { active: true, text: "" } }),
    400,
    "manager writes promo"
  );

  for (const slug of ADMIN_ONLY_GLOBALS) {
    await expectStatus(
      await asManager.post(`/api/globals/${slug}/`, { data: {} }),
      403,
      `manager writes global ${slug}`
    );
  }

  const pages = (await (await admin.get("/api/pages/?limit=1&depth=0")).json()) as {
    docs: { id: string }[];
  };
  const pageId = pages.docs[0]?.id;
  expect(pageId, "a seeded page").toBeTruthy();
  await expectStatus(
    await asManager.patch(`/api/pages/${pageId}/`, { data: { title: "TEST manager edit" } }),
    403,
    "manager edits a page"
  );
  await expectStatus(
    await asManager.post("/api/pages/", { data: { title: "TEST", slug: `test-${shortTag()}` } }),
    403,
    "manager creates a page"
  );
  await expectStatus(
    await asManager.post("/api/articles/", { data: { title: "TEST", slug: `test-${shortTag()}` } }),
    403,
    "manager creates an article"
  );
  await expectStatus(
    await asManager.post("/api/objects/", { data: { name: "TEST", slug: `test-${shortTag()}` } }),
    403,
    "manager creates an object"
  );
});

test("6d. admin: full access", async () => {
  const users = (await (await admin.get("/api/users/?limit=100&depth=0")).json()) as {
    docs: { id: string }[];
  };
  const ids = users.docs.map((doc) => doc.id);
  expect(ids).toContain(adminUserId);
  expect(ids).toContain(manager.id);

  // Write access to globals (invalid data → validation, not access, rejects it).
  await expectStatus(
    await admin.post("/api/globals/prices/", { data: { rows: [] } }),
    400,
    "admin writes prices"
  );
  await expectStatus(
    await admin.post("/api/globals/promo/", { data: { active: true, text: "" } }),
    400,
    "admin writes promo"
  );

  const lead = await createTestLead(admin, { tag: shortTag() });
  leads.add(lead.id);
  await expectStatus(await admin.delete(`/api/leads/${lead.id}/`), 200, "admin deletes a lead");
  leads.delete(lead.id);
});
