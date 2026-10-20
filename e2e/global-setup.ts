import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { E2E_BASE_URL, E2E_DATABASE_URL, e2eServerEnv } from "./helpers/env";
import { ensureTestDb, resolveTestDbTarget } from "./helpers/test-db";

/**
 * Local preparation before the e2e run:
 * 1. creates `inex_glass_test` if missing (CI: the Postgres service already has it);
 * 2. applies Payload migrations;
 * 3. runs the full seed (idempotent; wave 5 slice specs rely on full content);
 * 4. creates upload/media directories.
 *
 * Skipped entirely when testing an external stand (`E2E_BASE_URL`). `E2E_SKIP_DB=1` skips
 * steps 1-3 (CI migrates and seeds in its own steps right before Playwright).
 * The database is never reset automatically: use `pnpm test:db:reset` for a clean slate.
 */

const SEED_ENTRY = path.join("src", "seed", "index.ts");

type ServerEnv = Record<string, string>;

function run(command: string, env: ServerEnv): void {
  execSync(command, { stdio: "inherit", env: { ...process.env, ...env } });
}

async function prepareDatabase(env: ServerEnv): Promise<void> {
  // Throws for a database without the `_test` suffix before anything touches it.
  const target = resolveTestDbTarget(E2E_DATABASE_URL, process.env.DATABASE_ADMIN_URL);
  if (await ensureTestDb(target)) {
    console.warn(`[e2e] created database "${target.name}"`);
  }

  // --force-accept-warning: never block on Payload's interactive "dev mode" prompt.
  run("pnpm migrate --force-accept-warning", env);

  if (existsSync(SEED_ENTRY)) {
    try {
      // The package.json seed script ends with `--`, so bare flags reach the script.
      run("pnpm seed --full", env);
    } catch (error) {
      // Not fatal until task 16 ships the real seed CLI; after that the command must succeed.
      console.warn(
        "[e2e] seed failed (non-fatal for now):",
        error instanceof Error ? error.message : error
      );
    }
  }
}

function createFileDirs(env: ServerEnv): void {
  for (const dir of [env.UPLOADS_DIR, env.MEDIA_DIR]) {
    if (dir) mkdirSync(dir, { recursive: true });
  }
}

export default async function globalSetup(): Promise<void> {
  if (E2E_BASE_URL) {
    console.warn("[e2e] global-setup: external stand, local preparation skipped");
    return;
  }

  const env = e2eServerEnv();
  if (process.env.E2E_SKIP_DB === "1") {
    console.warn("[e2e] global-setup: database preparation skipped (E2E_SKIP_DB=1)");
  } else {
    await prepareDatabase(env);
  }
  createFileDirs(env);
}
