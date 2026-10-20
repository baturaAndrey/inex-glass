import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Smoke tests for the foundation (run in all three viewport projects): the site, the
 * Payload admin and REST API respond, and the URL normalization rules from requirements
 * (uppercase -> 301 in proxy.ts, missing trailing slash -> 308 from Next) hold.
 */

test.describe("smoke", () => {
  test("home page renders in Russian with exactly one h1", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("home page has no critical accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((violation) => violation.impact === "critical");
    expect(critical.map((violation) => violation.id)).toEqual([]);
  });

  test("admin shows the Payload login or first-user form", async ({ page }) => {
    // With an empty users table Payload redirects to /admin/create-first-user/; with users
    // it redirects to /admin/login/. Both are asserted by their Russian (admin i18n) content.
    const response = await page.goto("/admin/");
    expect(response?.status()).toBe(200);

    if (new URL(page.url()).pathname.startsWith("/admin/create-first-user")) {
      await expect(page).toHaveTitle(/Создание первого пользователя/);
      await expect(page.getByRole("heading", { level: 1, name: "Добро пожаловать" })).toBeVisible();
      await expect(page.getByText("Чтобы начать - создайте первого пользователя.")).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/admin\/login\/?/);
    }
    await expect(page.locator('form input[name="email"]')).toBeVisible();
    await expect(page.locator('form input[name="password"]')).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test("REST /api/users/me/ answers anonymously", async ({ request }) => {
    const response = await request.get("/api/users/me/");
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ user: null });
  });

  test("uppercase path redirects 301 to lowercase", async ({ request }) => {
    const response = await request.get("/ZAKALENNOE-STEKLO/", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toMatch(/\/zakalennoe-steklo\/$/);
  });

  test("path without trailing slash redirects 308", async ({ request }) => {
    const response = await request.get("/some-page", { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toMatch(/\/$/);
  });

  test("unknown path answers 404", async ({ request }) => {
    const response = await request.get("/e2e-net-takoy-stranicy/");
    expect(response.status()).toBe(404);
  });
});
