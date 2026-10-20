/**
 * Schema freeze check (task 10): `pnpm payload run scripts/verify-schema.ts`.
 *
 * Boots Payload through the Local API against `DATABASE_URL` (migrations must be applied) and
 * verifies the frozen schema contract:
 * - collection slugs (without Payload's `payload-*` system collections) and global slugs match
 *   the expected lists exactly;
 * - every global can be read and every collection can be queried (works on an empty database);
 * - the main table of every collection has a `uuid` primary key;
 * - unique indexes that other tasks rely on exist (`rate_limits.key` for `ON CONFLICT` in
 *   task 17, `orders.token_hash` and `orders.number`);
 * - private collections are closed for anonymous REST/GraphQL access, `consent-log` and
 *   `rate-limits` cannot be created through the APIs, `rate-limits` is hidden in the admin.
 *
 * Prints "OK" and exits 0, or lists every problem and exits 1.
 */
import config from "@payload-config";
import { sql } from "@payloadcms/db-postgres";
import { createLocalReq, Forbidden, getPayload } from "payload";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest } from "payload";

const EXPECTED_COLLECTIONS = [
  "users",
  "media",
  "pages",
  "thicknesses",
  "thickness-groups",
  "glass-types",
  "processing-services",
  "constructions",
  "shower-configs",
  "articles",
  "objects",
  "object-types",
  "products",
  "cities",
  "team",
  "lead-files",
  "lead-statuses",
  "leads",
  "orders",
  "order-files",
  "consent-log",
  "redirects",
  "rate-limits",
] as const satisfies readonly CollectionSlug[];

const EXPECTED_GLOBALS = [
  "prices",
  "promo",
  "conditions",
  "contacts",
  "requisites",
  "tech-params",
  "site-settings",
  "navigation",
  "snippets",
  // Payload's own jobs global (stats of scheduled tasks), present once any task has a `schedule`.
  "payload-jobs-stats",
] as const satisfies readonly GlobalSlug[];

/** Collections whose documents must never be readable without a staff session. */
const PRIVATE_COLLECTIONS = [
  "lead-files",
  "order-files",
  "leads",
  "orders",
  "consent-log",
  "rate-limits",
] as const satisfies readonly CollectionSlug[];

/** Collections that no API caller may create (Local API with `overrideAccess` only). */
const API_CREATE_FORBIDDEN = [
  "consent-log",
  "rate-limits",
] as const satisfies readonly CollectionSlug[];

/** `table.column` pairs that must be covered by a single-column unique index. */
const REQUIRED_UNIQUE_INDEXES = [
  ["rate_limits", "key"],
  ["orders", "token_hash"],
  ["orders", "number"],
] as const;

const SYSTEM_COLLECTION_PREFIX = "payload-";
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Payload's default table name for a collection without `dbName`. */
const tableName = (slug: string) => slug.replaceAll("-", "_");

function diffSlugs(kind: string, actual: readonly string[], expected: readonly string[]): string[] {
  const problems: string[] = [];
  const missing = expected.filter((slug) => !actual.includes(slug));
  const extra = actual.filter((slug) => !expected.includes(slug));
  if (missing.length > 0) problems.push(`${kind}: нет ожидаемых slug: ${missing.join(", ")}`);
  if (extra.length > 0) problems.push(`${kind}: лишние slug: ${extra.join(", ")}`);
  for (const slug of actual) {
    if (!KEBAB_CASE.test(slug)) problems.push(`${kind}: slug не в kebab-case: ${slug}`);
  }
  return problems;
}

/** Runs `operation`, recording a problem with `label` if it throws. */
async function attempt(problems: string[], label: string, operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    problems.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function checkSlugs(payload: Payload): Promise<string[]> {
  const collections = Object.keys(payload.collections).filter(
    (slug) => !slug.startsWith(SYSTEM_COLLECTION_PREFIX)
  );
  const globals = payload.config.globals.map((global) => global.slug);
  return [
    ...diffSlugs("collections", collections, EXPECTED_COLLECTIONS),
    ...diffSlugs("globals", globals, EXPECTED_GLOBALS),
  ];
}

async function checkReads(payload: Payload): Promise<string[]> {
  const problems: string[] = [];
  for (const slug of EXPECTED_GLOBALS) {
    await attempt(problems, `findGlobal(${slug})`, () => payload.findGlobal({ slug, depth: 0 }));
  }
  for (const collection of EXPECTED_COLLECTIONS) {
    await attempt(problems, `find(${collection})`, () =>
      payload.find({ collection, limit: 1, depth: 0 })
    );
  }
  return problems;
}

async function checkDatabase(payload: Payload): Promise<string[]> {
  const problems: string[] = [];
  const db = payload.db as unknown as Partial<PostgresAdapter>;
  if (!db.drizzle) return ["payload.db.drizzle недоступен (ожидается @payloadcms/db-postgres)"];

  const idColumns = await db.drizzle.execute<{ table_name: string; data_type: string }>(sql`
    SELECT table_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'id'
  `);
  const idTypes = new Map(idColumns.rows.map((row) => [row.table_name, row.data_type]));
  for (const slug of EXPECTED_COLLECTIONS) {
    const type = idTypes.get(tableName(slug));
    if (type !== "uuid")
      problems.push(`${tableName(slug)}.id: тип ${type ?? "нет таблицы"}, нужен uuid`);
  }

  // Unique single-column indexes per table, parsed from the index definition.
  const indexes = await db.drizzle.execute<{ tablename: string; indexdef: string }>(sql`
    SELECT tablename, indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND indexdef LIKE 'CREATE UNIQUE INDEX%'
  `);
  for (const [table, column] of REQUIRED_UNIQUE_INDEXES) {
    const covered = indexes.rows.some(
      (row) => row.tablename === table && row.indexdef.endsWith(`(${column})`)
    );
    if (!covered) problems.push(`нет уникального индекса ${table}(${column})`);
  }
  return problems;
}

/** Anonymous request, as REST/GraphQL see a visitor without a session. */
const anonymousRequest = (payload: Payload): Promise<PayloadRequest> => createLocalReq({}, payload);

async function expectForbidden(
  problems: string[],
  label: string,
  operation: () => Promise<unknown>
) {
  try {
    await operation();
    problems.push(`${label}: доступ открыт, ожидался Forbidden`);
  } catch (error) {
    if (!(error instanceof Forbidden)) {
      problems.push(`${label}: ожидался Forbidden, получено ${String(error)}`);
    }
  }
}

async function checkAccess(payload: Payload): Promise<string[]> {
  const problems: string[] = [];
  const req = await anonymousRequest(payload);

  for (const collection of PRIVATE_COLLECTIONS) {
    await expectForbidden(problems, `anonymous read ${collection}`, () =>
      payload.find({ collection, limit: 1, overrideAccess: false, req })
    );
  }

  // Collection-level `create` must deny even an admin: these records come from server code only.
  const adminReq = {
    ...req,
    user: { id: "verify-schema", role: "admin" },
  } as unknown as PayloadRequest;
  for (const slug of API_CREATE_FORBIDDEN) {
    const create = payload.collections[slug].config.access.create;
    const allowed = await create({ req: adminReq });
    if (allowed !== false) problems.push(`${slug}: access.create должен быть () => false`);
  }

  if (payload.collections["rate-limits"].config.admin.hidden !== true) {
    problems.push("rate-limits: admin.hidden должен быть true");
  }
  return problems;
}

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const problems = [
    ...(await checkSlugs(payload)),
    ...(await checkReads(payload)),
    ...(await checkDatabase(payload)),
    ...(await checkAccess(payload)),
  ];

  if (problems.length > 0) {
    console.error(`verify-schema: ${problems.length} проблем(ы):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log("OK");
  process.exit(0);
}

// Top-level await: `payload run` exits as soon as the imported module settles.
try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
