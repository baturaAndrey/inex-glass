/**
 * Test database management: `tsx scripts/test-db.ts reset|drop`.
 *
 * - reset: DROP DATABASE IF EXISTS <name> WITH (FORCE) + CREATE DATABASE <name>
 * - drop:  DROP DATABASE IF EXISTS <name> WITH (FORCE)
 *
 * Target: `E2E_DATABASE_URL` (default: local docker-compose `inex_glass_test`). Admin
 * connection: `DATABASE_ADMIN_URL` (default: same server, `postgres` database).
 * Refuses to touch any database whose name does not end with `_test`, or on a non-local
 * host (localhost/loopback/`postgres`) unless `E2E_ALLOW_REMOTE_TEST_DB=1`.
 */
import { DEFAULT_E2E_DATABASE_URL } from "../e2e/helpers/env";
import { createTestDb, dropTestDb, resolveTestDbTarget } from "../e2e/helpers/test-db";

const COMMANDS = ["reset", "drop"] as const;
type Command = (typeof COMMANDS)[number];

function isCommand(value: string | undefined): value is Command {
  return COMMANDS.includes(value as Command);
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!isCommand(command)) {
    console.error(`Использование: tsx scripts/test-db.ts <${COMMANDS.join("|")}>`);
    process.exit(2);
  }

  const target = resolveTestDbTarget(
    process.env.E2E_DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL,
    process.env.DATABASE_ADMIN_URL ?? "postgresql://dev_user:dev_password@localhost:5432/postgres"
  );

  await dropTestDb(target);
  console.warn(`test-db: dropped "${target.name}" (if existed)`);

  if (command === "reset") {
    await createTestDb(target);
    console.warn(`test-db: created "${target.name}"`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
