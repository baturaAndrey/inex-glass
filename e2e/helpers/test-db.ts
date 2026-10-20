import pg from "pg";

/**
 * Test database administration shared by `scripts/test-db.ts` (reset/drop) and
 * `e2e/global-setup.ts` (create if missing).
 *
 * Safety: every destructive or creating operation refuses to run unless the database name
 * ends with `_test`, and target resolution refuses non-local hosts (loopback or the CI
 * service host `postgres`) unless `E2E_ALLOW_REMOTE_TEST_DB=1` is set explicitly, so a
 * mistyped URL can never wipe the dev, a shared or a remote database.
 */

const TEST_DB_SUFFIX = "_test";
/** Plain identifiers only: the name is interpolated into DDL (DDL cannot take parameters). */
const SAFE_DB_NAME = /^[a-z][a-z0-9_]*$/;
const ADMIN_DB_NAME = "postgres";
/**
 * Hosts considered local: loopback plus `postgres`, the conventional service hostname of a
 * containerised CI job. `URL.hostname` keeps the brackets around IPv6 literals.
 */
const LOCAL_DB_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "postgres",
]);
const ALLOW_REMOTE_ENV = "E2E_ALLOW_REMOTE_TEST_DB";

function remoteTestDbAllowed(): boolean {
  return process.env[ALLOW_REMOTE_ENV] === "1";
}

export type TestDbTarget = {
  /** Connection to the maintenance database (`postgres`) on the same server. */
  adminUrl: string;
  /** Name of the test database to manage. */
  name: string;
};

/** Throws unless `name` is a plain identifier ending with `_test`. */
export function assertTestDbName(name: string): void {
  if (!SAFE_DB_NAME.test(name)) {
    throw new Error(`Недопустимое имя БД "${name}": ожидаются [a-z0-9_]`);
  }
  if (!name.endsWith(TEST_DB_SUFFIX)) {
    throw new Error(`Отказ: БД "${name}" не оканчивается на "${TEST_DB_SUFFIX}"`);
  }
}

/**
 * Throws unless the connection URL points at a local host, or remote targets were allowed
 * explicitly with `E2E_ALLOW_REMOTE_TEST_DB=1`.
 */
export function assertTestDbHost(
  connectionUrl: string,
  allowRemote: boolean = remoteTestDbAllowed()
): void {
  if (allowRemote) return;
  const host = new URL(connectionUrl).hostname.toLowerCase();
  if (!LOCAL_DB_HOSTS.has(host)) {
    throw new Error(
      `Отказ: хост БД "${host}" не локальный; для удалённой тестовой БД задайте ${ALLOW_REMOTE_ENV}=1`
    );
  }
}

/**
 * Derives the target from a test database URL. The admin URL is `DATABASE_ADMIN_URL`
 * when given, otherwise the same server and credentials with the `postgres` database.
 */
export function resolveTestDbTarget(databaseUrl: string, adminUrl?: string): TestDbTarget {
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  assertTestDbName(name);
  assertTestDbHost(databaseUrl);

  if (adminUrl) {
    assertTestDbHost(adminUrl);
    return { adminUrl, name };
  }
  url.pathname = `/${ADMIN_DB_NAME}`;
  return { adminUrl: url.toString(), name };
}

async function withAdminClient<T>(
  adminUrl: string,
  run: (client: pg.Client) => Promise<T>
): Promise<T> {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export async function testDbExists(target: TestDbTarget): Promise<boolean> {
  assertTestDbName(target.name);
  return withAdminClient(target.adminUrl, async (client) => {
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      target.name,
    ]);
    return (result.rowCount ?? 0) > 0;
  });
}

export async function dropTestDb(target: TestDbTarget): Promise<void> {
  assertTestDbName(target.name);
  await withAdminClient(target.adminUrl, async (client) => {
    // WITH (FORCE) terminates leftover connections (e.g. a still-running e2e server).
    await client.query(`DROP DATABASE IF EXISTS "${target.name}" WITH (FORCE)`);
  });
}

export async function createTestDb(target: TestDbTarget): Promise<void> {
  assertTestDbName(target.name);
  await withAdminClient(target.adminUrl, async (client) => {
    await client.query(`CREATE DATABASE "${target.name}"`);
  });
}

/** Creates the test database only if it does not exist yet. Returns true when created. */
export async function ensureTestDb(target: TestDbTarget): Promise<boolean> {
  if (await testDbExists(target)) return false;
  await createTestDb(target);
  return true;
}
