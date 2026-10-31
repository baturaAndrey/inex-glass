/**
 * Local API integration tests for task-08 CRM hooks and access: computed fields closed for
 * staff, lead default status, order numbering under concurrency, optional order manager,
 * internal comment stamps, the lead-file upload policy and per-contact consent-log hashes.
 *
 * Skipped unless `PAYLOAD_INT_DATABASE_URL` points to a throwaway database whose name ends with
 * `_test`. The suite drops and recreates that database, pushes the current schema into it
 * (`PAYLOAD_DB_PUSH=true`, allowed only on a personal throwaway DB) and drops it afterwards:
 *
 *   PAYLOAD_INT_DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/inex_glass_t08_test \
 *     pnpm vitest run --project unit src/payload/collections/crm/crm.int.test.ts
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, dropTestDb, resolveTestDbTarget } from "../../../../e2e/helpers/test-db";
import { orderYear } from "../../hooks/order-hooks";
import { rel } from "../../slugs";
import { consentEmailHash, consentPhoneHash } from "../../utils/normalize";
import type { Payload } from "payload";

const DATABASE_URL = process.env.PAYLOAD_INT_DATABASE_URL;
const SETUP_TIMEOUT_MS = 600_000;
const TEST_SECRET = "int-test-secret-int-test-secret-0000";
const CONCURRENT_ORDERS = 5;
const POOL_END_GRACE_MS = 2_000;

type Doc = Record<string, unknown> & { id: string };

async function rejectionText(promise: Promise<unknown>): Promise<string> {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason
  );
  expect(error, "expected the operation to fail").toBeInstanceOf(Error);
  const details = (error as { data?: { errors?: { message?: string }[] } }).data?.errors ?? [];
  return [(error as Error).message, ...details.map((item) => item.message ?? "")].join(" | ");
}

const idOf = (value: unknown): unknown =>
  typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;

describe.skipIf(!DATABASE_URL)("task-08 CRM (Local API, throwaway DB)", () => {
  let payload: Payload;
  let manager: Doc;
  let uploadsDir: string;
  const target = DATABASE_URL
    ? resolveTestDbTarget(DATABASE_URL, process.env.DATABASE_ADMIN_URL)
    : null;

  /** System write (Local API default `overrideAccess: true`). */
  const create = async (collection: string, data: Record<string, unknown>, extra = {}) =>
    (await payload.create({
      collection: rel(collection),
      data: data as never,
      ...extra,
    })) as unknown as Doc;
  /** Write as the manager, with access control (what REST/admin do). */
  const asManager = { overrideAccess: false } as const;
  const createAsManager = (collection: string, data: Record<string, unknown>) =>
    create(collection, data, { ...asManager, user: manager });
  const updateAsManager = async (collection: string, id: string, data: Record<string, unknown>) =>
    (await payload.update({
      collection: rel(collection),
      id,
      data: data as never,
      ...asManager,
      user: manager,
    })) as unknown as Doc;
  const read = async (collection: string, id: string) =>
    (await payload.findByID({ collection: rel(collection), id, depth: 0 })) as unknown as Doc;

  beforeAll(async () => {
    if (!target || !DATABASE_URL) return;
    await dropTestDb(target);
    await createTestDb(target);
    uploadsDir = await mkdtemp(path.join(os.tmpdir(), "inex-glass-int-uploads-"));

    process.env.DATABASE_URL = DATABASE_URL;
    process.env.PAYLOAD_DB_PUSH = "true";
    process.env.PAYLOAD_SECRET ??= TEST_SECRET;
    process.env.MEDIA_DIR = path.join(os.tmpdir(), "inex-glass-int-media");
    process.env.UPLOADS_DIR = uploadsDir;
    process.env.JOBS_ENABLED = "false";

    const [{ getPayload }, { default: config }] = await Promise.all([
      import("payload"),
      import("@payload-config"),
    ]);
    payload = await getPayload({ config });

    // The first user is forced to admin; the second one is the manager under test.
    await create("users", { email: "admin@test.local", password: "admin-pass-123", name: "A" });
    manager = await create("users", {
      email: "manager@test.local",
      password: "manager-pass-123",
      name: "M",
      role: "manager",
    });
  }, SETUP_TIMEOUT_MS);

  afterAll(async () => {
    const pool = (payload?.db as unknown as { pool?: { end: () => Promise<void> } } | undefined)
      ?.pool;
    await payload?.destroy();
    // Payload's dev schema push keeps one pool client checked out for good, so `pool.end()`
    // never settles: close the idle clients, wait a moment, then drop the DB (WITH (FORCE)
    // terminates the leaked connection).
    await Promise.race([
      pool?.end().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, POOL_END_GRACE_MS)),
    ]);
    if (target) await dropTestDb(target);
    if (uploadsDir) await rm(uploadsDir, { recursive: true, force: true });
  }, SETUP_TIMEOUT_MS);

  describe("leads", () => {
    it("ignores computed fields sent by staff and computes them in hooks", async () => {
      const first = await createAsManager("leads", {
        formType: "callback",
        name: "Иван",
        phone: "9514890409",
      });
      expect(first.phone).toBe("+79514890409");
      expect(first.phoneRaw).toBe("9514890409");
      expect(first.isDuplicate).toBe(false);

      const forged = await createAsManager("leads", {
        formType: "callback",
        name: "Пётр",
        phone: "+7 951 489-04-09",
        phoneRaw: "forged",
        isDuplicate: false,
        duplicateOf: null,
        statusChangedAt: "2000-01-01T00:00:00.000Z",
        newLeadNotifiedAt: "2000-01-01T00:00:00.000Z",
      });
      expect(forged.phoneRaw).toBe("+7 951 489-04-09");
      expect(forged.isDuplicate).toBe(true);
      expect(idOf(forged.duplicateOf)).toBe(first.id);
      expect(forged.newLeadNotifiedAt ?? null).toBeNull();

      const updated = await updateAsManager("leads", forged.id, {
        isDuplicate: false,
        newLeadNotifiedAt: "2000-01-01T00:00:00.000Z",
      });
      expect(updated.isDuplicate).toBe(true);
      expect(updated.newLeadNotifiedAt ?? null).toBeNull();
    });

    it("rejects an INN without digits", async () => {
      const text = await rejectionText(
        createAsManager("leads", {
          formType: "callback",
          name: "И",
          phone: "9514890401",
          inn: "нет",
        })
      );
      expect(text).toMatch(/ИНН/);
    });

    it("saves leads without statuses, then heals them once a default exists", async () => {
      const lead = await create("leads", {
        formType: "callback",
        name: "Без статуса",
        phone: "9000000001",
      });
      expect(lead.status ?? null).toBeNull();

      // A job-style update while no status exists must not fail.
      const touched = await updateAsManager("leads", lead.id, { comment: "перезвонить" });
      expect(touched.status ?? null).toBeNull();

      const status = await create("lead-statuses", {
        name: "Новая",
        slug: "new",
        order: 1,
        isDefault: true,
      });
      const healed = await updateAsManager("leads", lead.id, { comment: "ещё раз" });
      expect(idOf(healed.status)).toBe(status.id);
      expect(healed.statusChangedAt).toBeTruthy();

      const text = await rejectionText(updateAsManager("leads", lead.id, { status: null }));
      expect(text).toMatch(/статус/i);
    });

    it("stamps internal comments and keeps existing stamps", async () => {
      const lead = await create("leads", { formType: "callback", name: "К", phone: "9000000002" });
      const withComment = await updateAsManager("leads", lead.id, {
        internalComments: [{ text: "первый", author: null, date: "2000-01-01T00:00:00.000Z" }],
      });
      const [comment] = withComment.internalComments as Doc[];
      expect(idOf(comment!.author)).toBe(manager.id);
      expect(comment!.date).not.toBe("2000-01-01T00:00:00.000Z");

      const again = await updateAsManager("leads", lead.id, {
        internalComments: [{ ...comment, date: "2000-01-01T00:00:00.000Z" }, { text: "второй" }],
      });
      const rows = again.internalComments as Doc[];
      expect(rows[0]!.date).toBe(comment!.date);
      expect(rows[1]!.date).toBeTruthy();
    });
  });

  describe("orders", () => {
    const history = [{ status: "spec_agreed", date: "2026-03-01T00:00:00.000Z" }];

    it("numbers concurrent orders without duplicates and without a manager", async () => {
      const orders = await Promise.all(
        Array.from({ length: CONCURRENT_ORDERS }, () =>
          create("orders", { company: "ООО", statusHistory: history })
        )
      );
      const numbers = orders.map((order) => order.number as string).sort();
      expect(new Set(numbers).size).toBe(CONCURRENT_ORDERS);
      const sequences = numbers.map((value) => Number(value.split("-")[1])).sort((a, b) => a - b);
      expect(sequences).toEqual([1, 2, 3, 4, 5]);
      expect(orders.every((order) => (order.manager ?? null) === null)).toBe(true);
    });

    it("continues numerically past 9999", async () => {
      const year = orderYear(new Date());
      await create("orders", { number: `${year}-9999`, statusHistory: history });
      await create("orders", { number: `${year}-10000`, statusHistory: history });
      const next = await create("orders", { statusHistory: history });
      expect(next.number).toBe(`${year}-10001`);
    });

    it("closes computed fields and never exposes tokenHash", async () => {
      const order = await createAsManager("orders", {
        number: "1999-0001",
        tokenHash: "forged",
        currentStatus: "received",
        statusHistory: history,
      });
      expect(order.number).not.toBe("1999-0001");
      expect(order.currentStatus).toBe("spec_agreed");

      await payload.update({
        collection: rel("orders"),
        id: order.id,
        data: { tokenHash: "secret-hash" } as never,
      });
      const asAdminApi = (await payload.findByID({
        collection: rel("orders"),
        id: order.id,
        overrideAccess: false,
        user: manager,
      })) as unknown as Doc;
      expect(asAdminApi.tokenHash).toBeUndefined();
      expect((await read("orders", order.id)).tokenHash).toBe("secret-hash");
    });

    it("lets deleting a manager clear the order reference", async () => {
      const temp = await create("users", {
        email: "temp@test.local",
        password: "temp-pass-1234",
        name: "T",
        role: "manager",
      });
      const order = await create("orders", { manager: temp.id, statusHistory: history });
      await payload.delete({ collection: rel("users"), id: temp.id });
      expect((await read("orders", order.id)).manager ?? null).toBeNull();
    });
  });

  describe("lead-files upload policy", () => {
    const upload = async (name: string, content: string | Buffer) => {
      const filePath = path.join(uploadsDir, name);
      await writeFile(filePath, content);
      return create("lead-files", { originalName: name }, { filePath });
    };

    it("accepts drawings and stores a canonical MIME type", async () => {
      const dxf = await upload("plan.dxf", "  0\nSECTION\n  2\nHEADER\n  0\nENDSEC\n  0\nEOF\n");
      expect(dxf.mimeType).toBe("image/vnd.dxf");
    });

    it("rejects HTML disguised as DXF and unknown extensions", async () => {
      expect(
        await rejectionText(upload("evil.dxf", "<html><script>alert(1)</script></html>"))
      ).toMatch(/\.dxf/);
      expect(await rejectionText(upload("evil.html", "<html></html>"))).toMatch(
        /не|not allowed|Invalid/i
      );
    });
  });

  describe("consent-log contact hashes", () => {
    it("finds a record by the phone hash alone and by the e-mail hash alone", async () => {
      const phoneHash = consentPhoneHash("+7 951 489-04-09", TEST_SECRET);
      const emailHash = consentEmailHash("Ivan@Example.ru", TEST_SECRET);
      const record = await create("consent-log", { formType: "int-test", phoneHash, emailHash });

      // An erasure request may know only one contact of the subject.
      for (const where of [
        { phoneHash: { equals: consentPhoneHash("89514890409", TEST_SECRET) } },
        { emailHash: { equals: consentEmailHash("ivan@example.ru", TEST_SECRET) } },
      ]) {
        const found = await payload.find({ collection: rel("consent-log"), where });
        expect(found.docs.map((doc) => doc.id)).toContain(record.id);
      }
    });
  });
});
