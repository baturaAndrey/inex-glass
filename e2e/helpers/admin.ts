import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "@playwright/test";
import type { User } from "../../src/payload-types";
import type { APIRequestContext } from "@playwright/test";

/**
 * The ONE e2e admin of every spec and fixture helper.
 *
 * Credentials: `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (test-only defaults below, documented in
 * `.env.test.example`; CI sets them explicitly for its fresh database).
 *
 * - The user exists → sign in.
 * - The users table is empty (fresh CI / test DB) → register it via `first-register` (Payload
 *   makes the first user an admin) and sign in. Parallel workers may race here: the loser's
 *   registration fails and it simply signs in as the winner's user.
 * - Other users exist and the sign-in fails → `MissingAdminError` with a clear message. The
 *   helper NEVER creates a second admin or resets a password: a reset would invalidate the
 *   sessions of parallel workers (→ 403 in the middle of other specs).
 *
 * ONE session for the whole run: Payload stores sessions in the user document with a
 * read-modify-write, so two concurrent logins of the same user can drop each other's session
 * (its JWT then answers 401/403). Workers therefore share the admin JWT through a token file in
 * the OS temp dir, guarded by a cross-process lock; a cached token is verified with
 * `GET /api/users/me/` and a fresh one is verified right after the login.
 *
 * Extra staff users (a manager for rights checks) are throwaway accounts with a random e-mail
 * and password (`createStaffUser`), deleted by the spec that created them.
 */

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@inexglass.test";
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-password-0000";
const E2E_ADMIN_NAME = "E2E Админ";

/** Prefix of throwaway staff users; anything else under `e2e-*` is not created by the suite. */
export const E2E_STAFF_EMAIL_PREFIX = "e2e-staff-";
const E2E_STAFF_EMAIL_DOMAIN = "inexglass.test";

/** A loaded dev server compiles routes on demand: generous per-request timeout. */
const REQUEST_TIMEOUT_MS = 60_000;
/** Attempts for transport errors / 5xx only. A 401 is final: retries count towards the lockout. */
const LOGIN_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2_000;
/** Re-logins when a fresh session was dropped by a concurrent login of another process. */
const SESSION_ATTEMPTS = 4;

const SESSION_FILE = path.join(os.tmpdir(), "inex-glass-e2e-admin-session.json");
const SESSION_LOCK_DIR = path.join(os.tmpdir(), "inex-glass-e2e-admin-session.lock");
const SESSION_LOCK_TIMEOUT_MS = 5 * 60_000;
/** A crashed holder's lock expires: a sign-in never takes this long. */
const SESSION_LOCK_STALE_MS = 3 * 60_000;
const SESSION_LOCK_POLL_MS = 250;

export class MissingAdminError extends Error {
  override name = "MissingAdminError";
}

export interface AdminSession {
  token: string;
  user: User;
}

export type StaffRole = "admin" | "manager";

export interface StaffUser {
  id: string;
  email: string;
  password: string;
  token: string;
  user: User;
}

type LoginResult = { kind: "ok"; session: AdminSession } | { kind: "rejected"; status: number };

const auth = (token: string) => ({ Authorization: `JWT ${token}` });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<LoginResult> {
  let lastError = "";
  for (let attempt = 1; attempt <= LOGIN_ATTEMPTS; attempt++) {
    const response = await request
      .post("/api/users/login/", { data: { email, password }, timeout: REQUEST_TIMEOUT_MS })
      .catch((error: unknown) => {
        lastError = error instanceof Error ? error.message : String(error);
        return null;
      });
    if (response && response.status() < 500) {
      if (!response.ok()) return { kind: "rejected", status: response.status() };
      const body = (await response.json()) as { token?: string; user?: User };
      if (body.token && body.user)
        return { kind: "ok", session: { token: body.token, user: body.user } };
      return { kind: "rejected", status: response.status() };
    }
    if (response) lastError = `HTTP ${response.status()}`;
    await sleep(RETRY_DELAY_MS * attempt);
  }
  throw new Error(`e2e: login as ${email} failed after ${LOGIN_ATTEMPTS} attempts: ${lastError}`);
}

async function usersInitialized(request: APIRequestContext): Promise<boolean> {
  const response = await request.get("/api/users/init/", { timeout: REQUEST_TIMEOUT_MS });
  if (!response.ok()) throw new Error(`e2e: GET /api/users/init/ → ${response.status()}`);
  return Boolean(((await response.json()) as { initialized?: boolean }).initialized);
}

function assertAdmin(session: AdminSession): AdminSession {
  if (session.user.role !== "admin") {
    throw new MissingAdminError(
      `e2e: ${E2E_ADMIN_EMAIL} signed in but has role "${session.user.role}", not "admin".`
    );
  }
  return session;
}

/** Signs in (or registers on an empty users table) — one new session. */
async function signInAdmin(request: APIRequestContext): Promise<AdminSession> {
  const first = await login(request, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  if (first.kind === "ok") return assertAdmin(first.session);

  if (await usersInitialized(request)) {
    throw new MissingAdminError(
      `e2e: cannot sign in as ${E2E_ADMIN_EMAIL} (HTTP ${first.status}) and the database ` +
        "already has users. Create this admin once (Local API / admin panel) or set " +
        "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD to an existing admin — see .env.test.example."
    );
  }

  // Empty users table. A losing parallel registration fails; the sign-in below still works.
  await request
    .post("/api/users/first-register/", {
      data: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD, name: E2E_ADMIN_NAME },
      timeout: REQUEST_TIMEOUT_MS,
    })
    .catch(() => null);
  const registered = await login(request, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  if (registered.kind === "ok") return assertAdmin(registered.session);
  throw new MissingAdminError(
    `e2e: first-register of ${E2E_ADMIN_EMAIL} did not produce a working login ` +
      `(HTTP ${registered.status}). Was the users table filled by another process?`
  );
}

/** The user of a JWT, or `null` when the session is invalid / was revoked. */
async function currentUser(request: APIRequestContext, token: string): Promise<User | null> {
  const response = await request
    .get("/api/users/me/", { headers: auth(token), timeout: REQUEST_TIMEOUT_MS })
    .catch(() => null);
  if (!response?.ok()) return null;
  return ((await response.json()) as { user?: User | null }).user ?? null;
}

function readCachedToken(): string | null {
  try {
    const cached = JSON.parse(readFileSync(SESSION_FILE, "utf8")) as {
      email?: string;
      token?: string;
    };
    return cached.email === E2E_ADMIN_EMAIL && cached.token ? cached.token : null;
  } catch {
    return null; // no file yet / unreadable: sign in
  }
}

function writeCachedToken(token: string): void {
  writeFileSync(SESSION_FILE, JSON.stringify({ email: E2E_ADMIN_EMAIL, token }));
}

/** Runs `fn` while this process owns the cross-process admin session lock. */
async function withSessionLock<T>(fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + SESSION_LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(SESSION_LOCK_DIR);
      break;
    } catch {
      try {
        if (Date.now() - statSync(SESSION_LOCK_DIR).mtimeMs > SESSION_LOCK_STALE_MS) {
          rmSync(SESSION_LOCK_DIR, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue; // released meanwhile
      }
      if (Date.now() > deadline)
        throw new Error(`e2e: admin session lock ${SESSION_LOCK_DIR} is busy`);
      await sleep(SESSION_LOCK_POLL_MS);
    }
  }
  try {
    return await fn();
  } finally {
    rmSync(SESSION_LOCK_DIR, { recursive: true, force: true });
  }
}

/**
 * Session of the shared e2e admin: the run's cached JWT while it is valid, otherwise a new
 * login (registering the admin on an empty users table) that is verified before it is shared.
 */
export async function loginAdmin(request: APIRequestContext): Promise<AdminSession> {
  return withSessionLock(async () => {
    const cached = readCachedToken();
    if (cached) {
      const user = await currentUser(request, cached);
      if (user) return assertAdmin({ token: cached, user });
    }
    for (let attempt = 1; attempt <= SESSION_ATTEMPTS; attempt++) {
      const session = assertAdmin(await signInAdmin(request));
      // A concurrent login outside this suite may have dropped the new session already.
      const user = await currentUser(request, session.token);
      if (user) {
        writeCachedToken(session.token);
        return { token: session.token, user };
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
    throw new Error(
      `e2e: every new session of ${E2E_ADMIN_EMAIL} was revoked right after the login — another ` +
        "process keeps signing in as the same user concurrently."
    );
  });
}

/** JWT of the shared e2e admin. */
export async function adminToken(request: APIRequestContext): Promise<string> {
  return (await loginAdmin(request)).token;
}

/**
 * Handles a failed admin sign-in inside a hook or test: a missing admin skips locally (a dev DB
 * without the e2e admin) but fails in CI, where the admin is always registered on the fresh DB.
 * Any other error is rethrown.
 */
export function skipOnMissingAdmin(error: unknown): void {
  if (error instanceof MissingAdminError && !process.env.CI) {
    test.skip(true, error.message);
    return;
  }
  throw error;
}

/**
 * Creates a throwaway staff user with a random e-mail and password and signs in as it. The
 * caller deletes it with `deleteStaffUser` (afterAll).
 */
export async function createStaffUser(
  request: APIRequestContext,
  adminJwt: string,
  role: StaffRole,
  name = `E2E ${role}`
): Promise<StaffUser> {
  const email = `${E2E_STAFF_EMAIL_PREFIX}${role}-${randomUUID().slice(0, 8)}@${E2E_STAFF_EMAIL_DOMAIN}`;
  const password = `Pw-${randomUUID()}`;
  const response = await request.post("/api/users/", {
    headers: auth(adminJwt),
    data: { email, password, role, name },
    timeout: REQUEST_TIMEOUT_MS,
  });
  if (response.status() !== 201) {
    throw new Error(
      `e2e: create ${role} ${email} → ${response.status()}: ${await response.text()}`
    );
  }
  const { doc } = (await response.json()) as { doc: { id: string } };
  const signedIn = await login(request, email, password);
  if (signedIn.kind !== "ok") {
    throw new Error(`e2e: login as the new ${role} ${email} → HTTP ${signedIn.status}`);
  }
  return { id: doc.id, email, password, ...signedIn.session };
}

/** Best-effort removal of a throwaway staff user (never touches the shared admin). */
export async function deleteStaffUser(
  request: APIRequestContext,
  adminJwt: string,
  id: string
): Promise<void> {
  await request
    .delete(`/api/users/${id}/`, { headers: auth(adminJwt), timeout: REQUEST_TIMEOUT_MS })
    .catch(() => undefined);
}
