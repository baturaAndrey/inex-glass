import { randomUUID } from "node:crypto";
import { expect, request as playwrightRequest, test } from "@playwright/test";
import { IS_STAGING, STAGING_CREDENTIALS, isHttps, onlyProject } from "../helpers/acceptance-env";
import { createStaffUser, deleteStaffUser } from "../helpers/admin";
import { adminApi } from "../helpers/admin-api";
import type { APIRequestContext, APIResponse } from "@playwright/test";

/**
 * Acceptance: security checks over HTTP (task 42, «Security-аудит» A01/A02/A04/A05/A07).
 *
 * Every check is about server responses, not layout, so the whole file runs once — in the
 * desktop-1366 project (the throwaway lockout user and the first-register probe must not run three
 * times in parallel either).
 *
 * - Anonymous REST / GraphQL access to the private collections → 401/403, no documents leak.
 * - GraphQL playground closed, introspection off.
 * - IDOR on the lead-file download and the order document route.
 * - Security headers on pages and API, no `X-Powered-By`, HSTS on https only.
 * - `/admin` and `/api` are not indexable; errors do not expose stack traces.
 * - Source maps and `.env` are not served.
 * - First-register is closed once an admin exists; login lockout after `maxLoginAttempts`;
 *   admin cookie flags.
 * - Staging only (`ACCEPTANCE_EXPECT_ENV=staging`): basic auth, noindex everywhere, `Disallow: /`.
 */

/** Collections that must never be readable anonymously (REST slug → GraphQL list query). */
const PRIVATE_COLLECTIONS = [
  { slug: "leads", graphql: "Leads" },
  { slug: "orders", graphql: "Orders" },
  { slug: "lead-files", graphql: "LeadFiles" },
  { slug: "order-files", graphql: "OrderFiles" },
  { slug: "consent-log", graphql: "ConsentLogs" },
  { slug: "rate-limits", graphql: "RateLimits" },
  { slug: "search", graphql: "Searches" },
  { slug: "users", graphql: "Users" },
] as const;

/** Representative public pages and API endpoints for the header checks. */
const HEADER_PATHS = [
  "/",
  "/zakalennoe-steklo/",
  "/zakalennoe-steklo/10-mm/",
  "/kontakty/",
  "/net-takoy-stranitsy-e2e/",
  "/api/health/",
  "/api/leads/",
  "/admin/login/",
] as const;

/** Pages checked for staging noindex. */
const STAGING_PAGES = ["/", "/zakalennoe-steklo/", "/kontakty/", "/blog/", "/poisk/"] as const;

/** Traces of a server stack in an error body. */
const STACK_TRACE = /\bat [\w$.<>]+ \(|node_modules|webpack-internal|\.tsx?:\d+:\d+|"stack"\s*:/;

/** Payload's `maxLoginAttempts` of `users` (src/payload/collections/users.ts). */
const MAX_LOGIN_ATTEMPTS = 5;

/** Statuses that mean «no access» for an anonymous request. */
const DENIED = [401, 403];

async function bodyText(response: APIResponse): Promise<string> {
  return response.text().catch(() => "");
}

/** Asserts a JSON list answer carries no documents (an access-filtered empty list is fine). */
async function expectNoDocs(response: APIResponse, what: string): Promise<void> {
  const text = await bodyText(response);
  if (DENIED.includes(response.status())) return;
  expect(response.status(), `${what}: unexpected status, body ${text.slice(0, 300)}`).toBe(200);
  const body = JSON.parse(text) as { docs?: unknown[]; totalDocs?: number };
  expect(body.docs ?? [], `${what}: documents leaked`).toHaveLength(0);
  expect(body.totalDocs ?? 0, `${what}: totalDocs leaked`).toBe(0);
}

/** Fresh request context WITHOUT staging credentials and without cookies. */
async function anonymousContext(baseURL: string): Promise<APIRequestContext> {
  // Explicit `undefined`: inside the test runner a new context inherits `use.httpCredentials`
  // of playwright.config.ts (set from STAGING_BASIC_AUTH) unless the option is given.
  // (an own `httpCredentials: undefined` key; set via defineProperty because of
  // exactOptionalPropertyTypes).
  const options: NonNullable<Parameters<typeof playwrightRequest.newContext>[0]> = { baseURL };
  Object.defineProperty(options, "httpCredentials", { value: undefined, enumerable: true });
  return playwrightRequest.newContext(options);
}

test.describe("acceptance: security", () => {
  test.beforeEach(({}, testInfo) => {
    onlyProject(testInfo, undefined, "HTTP-level checks are viewport-independent: run once");
  });

  test("A01: private collections are closed to anonymous REST requests", async ({ request }) => {
    for (const { slug } of PRIVATE_COLLECTIONS) {
      await expectNoDocs(await request.get(`/api/${slug}/?limit=5&depth=0`), `GET /api/${slug}/`);
      // A query cannot widen access.
      await expectNoDocs(
        await request.get(`/api/${slug}/?where[id][exists]=true&limit=5&depth=0`),
        `GET /api/${slug}/?where`
      );
      const byId = await request.get(`/api/${slug}/${randomUUID()}/?depth=0`);
      expect([...DENIED, 404], `GET /api/${slug}/<uuid>/`).toContain(byId.status());
      const count = await request.get(`/api/${slug}/count/`);
      if (count.ok()) {
        expect(((await count.json()) as { totalDocs?: number }).totalDocs ?? 0).toBe(0);
      } else {
        expect(DENIED, `GET /api/${slug}/count/`).toContain(count.status());
      }
    }
    // Upload collections: the static file routes are protected as well.
    for (const path of ["/api/lead-files/file/x.pdf", "/api/order-files/file/x.png"]) {
      const response = await request.get(path);
      expect([...DENIED, 404], path).toContain(response.status());
    }
    // Writes are refused as well.
    const write = await request.post("/api/leads/", {
      data: { formType: "callback", name: "TEST security", phone: "+79000000000" },
    });
    expect(DENIED, "anonymous POST /api/leads/").toContain(write.status());
  });

  test("A01: private collections are closed to anonymous GraphQL; playground closed", async ({
    request,
  }) => {
    const query = `{ ${PRIVATE_COLLECTIONS.map(({ graphql }) => `${graphql} { docs { id } }`).join(" ")} }`;
    const response = await request.post("/api/graphql/", { data: { query } });
    const text = await bodyText(response);
    const body = JSON.parse(text) as {
      data?: Record<string, { docs?: unknown[] } | null> | null;
      errors?: unknown[];
    };
    for (const { graphql } of PRIVATE_COLLECTIONS) {
      const list = body.data?.[graphql];
      expect(list?.docs ?? [], `GraphQL ${graphql} leaked documents`).toHaveLength(0);
    }
    expect(body.errors?.length ?? 0, "GraphQL must answer Forbidden errors").toBeGreaterThan(0);

    const introspection = await request.post("/api/graphql/", {
      data: { query: "{ __schema { types { name } } }" },
    });
    expect(await bodyText(introspection)).not.toContain('"types"');

    const playground = await request.get("/api/graphql-playground/");
    expect(playground.status(), "GraphQL playground must be closed in production").toBe(404);
  });

  test("A01: IDOR on lead-file downloads and order documents", async ({ request }) => {
    const leadFile = `/api/lead-files/${randomUUID()}/download/`;
    const anonymous = await request.get(leadFile);
    expect(DENIED, `anonymous ${leadFile}`).toContain(anonymous.status());
    expect(await bodyText(anonymous)).not.toMatch(STACK_TRACE);

    // As staff a random id is simply «not found» — no path, no stack.
    const admin = await adminApi(request);
    const missing = await admin.get(leadFile);
    expect(missing.status(), `admin ${leadFile}`).toBe(404);
    const missingText = await bodyText(missing);
    expect(missingText).not.toMatch(STACK_TRACE);
    expect(missingText).not.toMatch(/lead-files[\\/]|[A-Z]:\\|\/app\//);

    // Order documents: random token and id, malformed id, path traversal attempt.
    const token = randomUUID().replaceAll("-", "");
    for (const path of [
      `/zakaz/${token}/docs/${randomUUID()}/`,
      `/zakaz/${token}/docs/not-a-uuid/`,
      `/zakaz/${token}/docs/..%2f..%2f.env/`,
    ]) {
      const response = await request.get(path);
      expect([...DENIED, 404], path).toContain(response.status());
      const text = await bodyText(response);
      expect(text, path).not.toMatch(STACK_TRACE);
      expect(text, path).not.toMatch(/PAYLOAD_SECRET|DATABASE_URL/);
    }
  });

  test("A02: security headers on pages and API, no X-Powered-By", async ({ request, baseURL }) => {
    const failures: string[] = [];
    for (const path of HEADER_PATHS) {
      const response = await request.get(path, { maxRedirects: 0 });
      const headers = response.headers();
      const problems: string[] = [];
      if (headers["x-content-type-options"]?.toLowerCase() !== "nosniff")
        problems.push(`X-Content-Type-Options=${headers["x-content-type-options"]}`);
      if (headers["x-frame-options"]?.toUpperCase() !== "SAMEORIGIN")
        problems.push(`X-Frame-Options=${headers["x-frame-options"]}`);
      if (!headers["referrer-policy"]) problems.push("no Referrer-Policy");
      if (!headers["permissions-policy"]) problems.push("no Permissions-Policy");
      if (headers["x-powered-by"]) problems.push(`X-Powered-By=${headers["x-powered-by"]}`);
      if (isHttps(baseURL) && !headers["strict-transport-security"]) problems.push("no HSTS");
      if (problems.length) failures.push(`${path} (${response.status()}): ${problems.join(", ")}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("A02: /admin and /api are not indexable", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const text = await robots.text();
    if (IS_STAGING) {
      expect(text).toMatch(/^Disallow:\s*\/\s*$/m);
    } else {
      expect(text).toMatch(/^Disallow:\s*\/admin\/?\s*$/m);
      expect(text).toMatch(/^Disallow:\s*\/api\/\s*$/m);
    }

    const admin = await request.get("/admin/login/");
    const adminHtml = await admin.text();
    const adminNoindex =
      /noindex/i.test(admin.headers()["x-robots-tag"] ?? "") ||
      /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(adminHtml);
    expect(adminNoindex, "/admin/ must carry noindex (meta or X-Robots-Tag)").toBe(true);
  });

  test("A10: errors do not expose stack traces", async ({ request }) => {
    const malformed = await request.post("/api/forms/lead/", {
      headers: { "Content-Type": "application/json" },
      data: "{not json",
    });
    expect(malformed.status(), "malformed JSON → 4xx").toBeGreaterThanOrEqual(400);
    expect(malformed.status(), "malformed JSON must not be a 5xx").toBeLessThan(500);
    expect(await bodyText(malformed)).not.toMatch(STACK_TRACE);

    const probes: Array<Promise<APIResponse>> = [
      request.get("/api/pages/not-a-uuid/"),
      request.get("/api/leads/not-a-uuid/"),
      request.get(`/api/lead-files/not-a-uuid/download/`),
      request.get("/api/site-search/?q=%00%ff%fe"),
      request.post("/api/graphql/", { data: { query: "{ broken " } }),
      request.post("/api/upload/", {
        headers: { "Content-Type": "multipart/form-data; boundary=x" },
        data: "--x\r\nbroken",
      }),
      request.get("/api/users/me/?depth=-1"),
    ];
    for (const response of await Promise.all(probes)) {
      const text = await bodyText(response);
      expect(response.status(), `${response.url()} must not fail with 5xx`).toBeLessThan(500);
      expect(text, `${response.url()} exposes a stack trace`).not.toMatch(STACK_TRACE);
    }
  });

  test("A02: source maps and .env are not served", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const scripts = [
      ...new Set([...html.matchAll(/\/_next\/static\/[^"'\s]+?\.js/g)].map((m) => m[0])),
    ];
    expect(scripts.length, "home page references Next chunks").toBeGreaterThan(0);
    for (const script of scripts.slice(0, 8)) {
      const chunk = await request.get(script);
      expect(chunk.status(), script).toBe(200);
      expect(chunk.headers()["sourcemap"] ?? chunk.headers()["x-sourcemap"]).toBeUndefined();
      expect(await chunk.text(), `${script} links a source map`).not.toMatch(
        /\/\/# sourceMappingURL=(?!data:)/
      );
      const map = await request.get(`${script}.map`);
      expect(map.status(), `${script}.map must not be served`).toBe(404);
    }

    for (const path of ["/.env", "/.env.local", "/.env.production", "/.git/config", "/api/.env"]) {
      // Followed redirects: Next may first add the trailing slash (308) — the target must 404.
      const response = await request.get(path);
      expect([...DENIED, 404], path).toContain(response.status());
      expect(await bodyText(response), path).not.toMatch(/PAYLOAD_SECRET|DATABASE_URL|\[core\]/);
    }
  });

  test("A07: first-register is closed once an admin exists", async ({ request }) => {
    // The shared e2e admin exists after this call (registered on an empty users table), so a
    // further first-register must be refused.
    const admin = await adminApi(request);
    const email = `e2e-staff-first-register-${randomUUID().slice(0, 8)}@inexglass.test`;
    const response = await request.post("/api/users/first-register/", {
      data: { email, password: `Pw-${randomUUID()}`, name: "TEST first-register" },
    });
    const body = (await response.json().catch(() => ({}))) as {
      token?: string;
      user?: { id?: string };
    };
    if (body.user?.id) await deleteStaffUser(request, admin.token, body.user.id);
    expect(response.ok(), `first-register must fail (HTTP ${response.status()})`).toBe(false);
    expect(body.token).toBeUndefined();
  });

  test("A07: login lockout after maxLoginAttempts and admin cookie flags", async ({
    request,
    baseURL,
  }) => {
    const admin = await adminApi(request);
    const staff = await createStaffUser(request, admin.token, "manager", "TEST lockout");
    try {
      // Cookie flags of a successful login (the throwaway user, never the shared admin).
      const login = await request.post("/api/users/login/", {
        data: { email: staff.email, password: staff.password },
      });
      expect(login.status()).toBe(200);
      const cookie = login
        .headersArray()
        .filter((header) => header.name.toLowerCase() === "set-cookie")
        .map((header) => header.value)
        .find((value) => value.startsWith("payload-token="));
      expect(cookie, "login sets the payload-token cookie").toBeDefined();
      expect(cookie).toMatch(/;\s*HttpOnly/i);
      expect(cookie).toMatch(/;\s*SameSite=(Lax|Strict)/i);
      if (isHttps(baseURL)) expect(cookie).toMatch(/;\s*Secure/i);

      for (let attempt = 1; attempt <= MAX_LOGIN_ATTEMPTS; attempt++) {
        const wrong = await request.post("/api/users/login/", {
          data: { email: staff.email, password: `wrong-${attempt}` },
        });
        expect(wrong.ok(), `wrong password #${attempt}`).toBe(false);
      }
      const locked = await request.post("/api/users/login/", {
        data: { email: staff.email, password: staff.password },
      });
      const lockedBody = (await locked.json().catch(() => ({}))) as { token?: string };
      expect(locked.ok(), "the correct password is refused while the user is locked").toBe(false);
      expect(lockedBody.token).toBeUndefined();
    } finally {
      await deleteStaffUser(request, admin.token, staff.id);
    }
  });

  test.describe("staging only", () => {
    test.skip(!IS_STAGING, "ACCEPTANCE_EXPECT_ENV is not staging");

    test("basic auth is required on pages", async ({ baseURL }) => {
      expect(STAGING_CREDENTIALS, "STAGING_BASIC_AUTH must be set for staging").not.toBeNull();
      const anonymous = await anonymousContext(baseURL!);
      try {
        for (const path of STAGING_PAGES) {
          const response = await anonymous.get(path, { maxRedirects: 0 });
          expect(response.status(), `${path} without credentials`).toBe(401);
          expect(response.headers()["www-authenticate"] ?? "").toMatch(/^Basic/i);
        }
      } finally {
        await anonymous.dispose();
      }
    });

    test("noindex everywhere and robots Disallow: /", async ({ request }) => {
      for (const path of STAGING_PAGES) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
        const html = await response.text();
        const noindex =
          /noindex/i.test(response.headers()["x-robots-tag"] ?? "") ||
          /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);
        expect(noindex, `${path} must be noindex on staging`).toBe(true);
      }
      const robots = await (await request.get("/robots.txt")).text();
      expect(robots).toMatch(/^Disallow:\s*\/\s*$/m);
    });
  });
});
