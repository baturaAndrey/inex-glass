import { expect, test } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * Container healthcheck contract (`src/app/api/health/route.ts`), relied on by the Docker
 * HEALTHCHECK, Dokploy/Swarm and the CI smoke tests in `.github/workflows/docker.yml`:
 * - `GET /api/health/` → 200 JSON `{status: "ok", release}`, never cached;
 * - no basic auth: on staging `src/proxy.ts` skips `/api`, so no credentials are sent here
 *   (also when run against staging via `E2E_BASE_URL`);
 * - `/api/health` without the trailing slash → 308 (orchestrators must use the slash).
 *
 * Viewport-independent, so it runs in a single project only.
 */

test.describe("health endpoint", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== VIEWPORTS.laptop.name,
      "API check does not depend on the viewport"
    );
  });

  test("GET /api/health/ answers 200 ok without credentials", async ({ request }) => {
    const response = await request.get("/api/health/", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(response.headers()["cache-control"]).toContain("no-store");

    const body: unknown = await response.json();
    expect(body).toMatchObject({ status: "ok", release: expect.any(String) });
  });

  test("/api/health without trailing slash redirects 308", async ({ request }) => {
    const response = await request.get("/api/health", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toMatch(/\/api\/health\/$/);
  });
});
