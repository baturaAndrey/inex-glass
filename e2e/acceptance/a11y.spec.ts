import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestObject } from "../helpers/acceptance-objects";
import {
  ACCEPTANCE_PAGES,
  CTA_LABEL,
  openPage,
  presetConsent,
  scrollThrough,
} from "../helpers/acceptance-pages";
import { VIEWPORTS } from "../helpers/viewports";
import type { TestObject } from "../helpers/acceptance-objects";
import type { AcceptancePage } from "../helpers/acceptance-pages";
import type { Locator, Page, TestInfo } from "@playwright/test";

/**
 * Acceptance scenario 12 (task 42): accessibility.
 *
 * 1. axe (`@axe-core/playwright`, WCAG 2.0/2.1 A + AA) over one page per template and the open
 *    quiz modal × 375 / 1366 / 1920: no `serious` / `critical` violations. Every violation (all
 *    impacts) is printed as a compact `[axe]` line and attached as JSON, so the coordinator can
 *    triage moderate/minor ones too. No rule is disabled.
 * 2. Keyboard: header + mega-menu (phones: the menu drawer), the quiz modal (focus trap, Esc,
 *    focus return), the objects filters drawer; the focused element always has a visible focus
 *    indicator (outline or focus-ring shadow).
 * 3. Contrast by tokens: the primary button (#267D70 under white text) and the success text.
 *
 * Motion is reduced (`reducedMotion: "reduce"`): fade/slide-in animations would otherwise be
 * caught mid-flight with partial opacity and produce false colour-contrast results. The site
 * honours `prefers-reduced-motion`, so this is a real rendering mode, not a workaround.
 * The cookie choice is preset to «Только необходимые» for the axe pass (the banner itself is
 * checked separately on the home page with no choice made).
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const BLOCKING_IMPACTS: ReadonlySet<string> = new Set(["serious", "critical"]);
const NAV_TIMEOUT = 60_000;
const QUIZ_DIALOG_TITLE = "Рассчитаем стоимость вашего заказа";
/** Tab presses while walking a region (header, modal); enough to cycle through each. */
const TAB_WALK = 30;

test.use({ reducedMotion: "reduce", navigationTimeout: NAV_TIMEOUT });
test.describe.configure({ timeout: 180_000 });

/** Fixture object of the running test; removed again in afterEach if the test timed out. */
let liveObject: TestObject | undefined;
test.afterEach(async () => {
  await liveObject?.remove();
  liveObject = undefined;
});

const isPhone = (testInfo: TestInfo) => testInfo.project.name === VIEWPORTS.mobile.name;

interface ViolationLine {
  page: string;
  viewport: string;
  rule: string;
  impact: string;
  count: number;
  help: string;
  targets: string[];
}

/** Runs axe, prints and attaches every violation; returns the blocking ones. */
async function audit(
  page: Page,
  testInfo: TestInfo,
  label: string,
  include?: string
): Promise<ViolationLine[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();

  const lines: ViolationLine[] = results.violations.map((violation) => ({
    page: label,
    viewport: testInfo.project.name,
    rule: violation.id,
    impact: violation.impact ?? "unknown",
    count: violation.nodes.length,
    help: violation.help,
    targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
  for (const line of lines) {
    console.warn(
      `[axe] ${line.viewport} ${line.page} ${line.impact} ${line.rule} ×${line.count} — ` +
        `${line.help} — ${line.targets.join(" | ")}`
    );
  }
  await testInfo.attach(`axe-${label.replace(/[^a-z0-9-]+/gi, "_")}.json`, {
    body: JSON.stringify({ url: page.url(), violations: lines }, null, 2),
    contentType: "application/json",
  });
  return lines.filter((line) => BLOCKING_IMPACTS.has(line.impact));
}

function describeBlocking(lines: ViolationLine[]): string {
  return lines
    .map((line) => `${line.impact} ${line.rule} ×${line.count}: ${line.targets.join(" | ")}`)
    .join("\n");
}

// ---------------------------------------------------------------------------------------------
// axe per page
// ---------------------------------------------------------------------------------------------

test.describe("axe: WCAG 2.1 AA, no serious/critical", () => {
  for (const target of ACCEPTANCE_PAGES) {
    test(`${target.id} ${target.path}`, async ({ page }, testInfo) => {
      await presetConsent(page, "necessary");
      await openPage(page, target);
      // Lazy content (images, below-the-fold sections) must be in the DOM for the audit.
      await scrollThrough(page);
      const blocking = await audit(page, testInfo, target.id);
      expect(blocking, describeBlocking(blocking)).toEqual([]);
    });
  }

  test("cookie banner (no choice yet) on the home page", async ({ page }, testInfo) => {
    const home = ACCEPTANCE_PAGES.find((entry) => entry.id === "home") as AcceptancePage;
    await openPage(page, home);
    const banner = page.getByRole("region", { name: "Уведомление о cookie" });
    await expect(banner).toBeVisible();
    const blocking = await audit(page, testInfo, "cookie-banner", ".ig-cookie");
    expect(blocking, describeBlocking(blocking)).toEqual([]);
  });

  test("quiz modal opened over a page", async ({ page }, testInfo) => {
    await presetConsent(page, "necessary");
    const dialog = await openQuizModal(page, testInfo);
    await expect(dialog).toBeVisible();
    const blocking = await audit(page, testInfo, "quiz-modal", "[data-slot=quiz-modal]");
    expect(blocking, describeBlocking(blocking)).toEqual([]);
  });

  test("objects listing and object card (TEST fixture object)", async ({
    page,
    request,
  }, testInfo) => {
    // Waits for the cross-process objects lock (other projects / objects.spec).
    test.setTimeout(420_000);
    const object = (liveObject = await createTestObject(request));
    try {
      await presetConsent(page, "necessary");
      await openPage(page, {
        id: "objects-with-cards",
        path: "/obekty/",
        status: 200,
        ctaInFirstScreen: true,
      });
      await expect(page.getByRole("button", { name: /Фильтры/ })).toBeVisible();
      const listing = await audit(page, testInfo, "objects-with-cards");

      await openPage(page, {
        id: "object-card",
        path: object.path,
        status: 200,
        ctaInFirstScreen: true,
      });
      await scrollThrough(page);
      const card = await audit(page, testInfo, "object-card");
      const blocking = [...listing, ...card];
      expect(blocking, describeBlocking(blocking)).toEqual([]);
    } finally {
      await object.remove();
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------------------------

interface FocusInfo {
  description: string;
  visibleIndicator: boolean;
  inside: boolean;
}

/** The focused element, whether it shows a focus indicator and whether it is inside `scope`. */
async function focusInfo(page: Page, scope?: string): Promise<FocusInfo | null> {
  return page.evaluate((scopeSelector) => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    const shadow = style.boxShadow !== "none" && style.boxShadow !== "";
    const label = (element.getAttribute("aria-label") ?? element.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    return {
      description: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""} «${label}»`,
      visibleIndicator: outline || shadow,
      inside: scopeSelector ? Boolean(element.closest(scopeSelector)) : true,
    };
  }, scope ?? null);
}

/** Presses Tab `presses` times; returns the focus stops (and fails on a missing indicator). */
async function tabWalk(page: Page, presses: number, scope?: string): Promise<FocusInfo[]> {
  const stops: FocusInfo[] = [];
  for (let index = 0; index < presses; index++) {
    await page.keyboard.press("Tab");
    const info = await focusInfo(page, scope);
    if (info) stops.push(info);
  }
  return stops;
}

/** Tabs until `target` has focus (max `limit` presses). */
async function tabTo(page: Page, target: Locator, limit = 80): Promise<void> {
  for (let index = 0; index < limit; index++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  await expect(target, `reachable with Tab within ${limit} presses`).toBeFocused();
}

/** Waits until the client router is ready (`PathTracker` stored the path; see quiz-routing). */
async function waitHydrated(page: Page, path: string): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("inex:last-path")), {
      timeout: 90_000,
    })
    .toBe(path);
}

function calcCta(page: Page, testInfo: TestInfo): Locator {
  return isPhone(testInfo)
    ? page.locator(".ig-sticky-cta a")
    : page.locator('header a[href^="/raschet-stoimosti/?src="]:visible').first();
}

/** Opens the quiz modal from the hub with the keyboard (Enter on the CTA). */
async function openQuizModal(page: Page, testInfo: TestInfo): Promise<Locator> {
  const source = "/zakalennoe-steklo/";
  await page.goto(source, { waitUntil: "load" });
  await waitHydrated(page, source);
  const cta = calcCta(page, testInfo);
  await expect(cta).toBeVisible();
  await expect(cta).toContainText(CTA_LABEL);
  await cta.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: QUIZ_DIALOG_TITLE });
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  return dialog;
}

test.describe("keyboard and focus", () => {
  test.beforeEach(async ({ page }) => {
    await presetConsent(page, "necessary");
  });

  test("header: Tab order with visible focus; mega-menu / menu drawer by keyboard", async ({
    page,
  }, testInfo) => {
    await page.goto("/", { waitUntil: "load" });
    await waitHydrated(page, "/");

    const stops = await tabWalk(page, TAB_WALK);
    expect(stops.length, "Tab reaches focusable elements").toBeGreaterThan(5);
    const invisible = stops.filter((stop) => !stop.visibleIndicator);
    expect(
      invisible.map((stop) => stop.description),
      "focus without a visible indicator"
    ).toEqual([]);

    if (isPhone(testInfo)) {
      const menuButton = page.getByRole("button", { name: "Меню" });
      await tabTo(page, menuButton);
      await page.keyboard.press("Enter");
      const drawer = page.getByRole("dialog");
      await expect(drawer).toBeVisible();
      const inside = await tabWalk(page, 10, "[role=dialog]");
      expect(
        inside.every((stop) => stop.inside),
        "focus stays in the menu drawer"
      ).toBe(true);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(menuButton).toBeFocused();
      return;
    }

    const trigger = page.locator('header button[aria-haspopup="true"][aria-controls]').first();
    await tabTo(page, trigger);
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panelId = (await trigger.getAttribute("aria-controls")) as string;
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel).toBeVisible();
    // Tab continues into the panel's links.
    await page.keyboard.press("Tab");
    const first = await focusInfo(page, `[id="${panelId}"]`);
    expect(first?.inside, `focus moves into the open panel (got ${first?.description})`).toBe(true);
    expect(first?.visibleIndicator).toBe(true);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("quiz modal: focus trapped, Esc closes, focus returns to the CTA", async ({
    page,
  }, testInfo) => {
    const dialog = await openQuizModal(page, testInfo);
    const stops = await tabWalk(page, TAB_WALK, "[role=dialog]");
    const escaped = stops.filter((stop) => !stop.inside);
    expect(
      escaped.map((stop) => stop.description),
      "focus left the modal"
    ).toEqual([]);
    const invisible = stops.filter((stop) => !stop.visibleIndicator);
    expect(
      invisible.map((stop) => stop.description),
      "focus without a visible indicator"
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(calcCta(page, testInfo)).toBeFocused();
  });

  test("objects filters: drawer by keyboard", async ({ page, request }) => {
    // Waits for the cross-process objects lock (other projects / objects.spec).
    test.setTimeout(420_000);
    const object = (liveObject = await createTestObject(request));
    try {
      await page.goto("/obekty/", { waitUntil: "load" });
      await waitHydrated(page, "/obekty/");
      const sort = page.getByRole("combobox", { name: "Сортировка" });
      await tabTo(page, sort, 120);
      expect((await focusInfo(page))?.visibleIndicator, "sort select focus ring").toBe(true);

      const filters = page.getByRole("button", { name: /Фильтры/ });
      await page.keyboard.press("Tab");
      await expect(filters).toBeFocused();
      expect((await focusInfo(page))?.visibleIndicator, "filters button focus ring").toBe(true);
      await page.keyboard.press("Enter");
      const drawer = page.getByRole("dialog", { name: "Фильтры" });
      await expect(drawer).toBeVisible();
      const inside = await tabWalk(page, 12, "[role=dialog]");
      expect(
        inside.filter((stop) => !stop.inside).map((stop) => stop.description),
        "focus left the filters drawer"
      ).toEqual([]);
      expect(
        inside.filter((stop) => !stop.visibleIndicator).map((stop) => stop.description),
        "focus without a visible indicator"
      ).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(filters).toBeFocused();
    } finally {
      await object.remove();
    }
  });
});

// ---------------------------------------------------------------------------------------------
// Contrast by tokens
// ---------------------------------------------------------------------------------------------

test.describe("contrast by tokens", () => {
  test("primary button #267D70 with white text and the success text ≥ 4.5:1", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== VIEWPORTS.laptop.name, "token check: one width");
    await presetConsent(page, "necessary");
    await page.goto("/", { waitUntil: "load" });

    const result = await page.evaluate(() => {
      const parse = (value: string): [number, number, number] => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.body.appendChild(probe);
        const rgb =
          getComputedStyle(probe)
            .color.match(/\d+(\.\d+)?/g)
            ?.map(Number) ?? [];
        probe.remove();
        return [rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0];
      };
      const luminance = ([r, g, b]: [number, number, number]) => {
        const channel = (c: number) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const ratio = (a: [number, number, number], b: [number, number, number]) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
        return (hi + 0.05) / (lo + 0.05);
      };
      const root = getComputedStyle(document.documentElement);
      const button = Array.from(document.querySelectorAll<HTMLElement>(".ig-btn--primary")).find(
        (element) => element.offsetParent !== null
      );
      const buttonStyle = button ? getComputedStyle(button) : null;
      const buttonBg = buttonStyle ? parse(buttonStyle.backgroundColor) : null;
      const buttonFg = buttonStyle ? parse(buttonStyle.color) : null;
      const successText = parse(root.getPropertyValue("--ig-success-text").trim());
      const successBg = parse(root.getPropertyValue("--ig-success-bg").trim() || "#fff");
      const white: [number, number, number] = [255, 255, 255];
      return {
        tokenButtonBg: parse(root.getPropertyValue("--ig-btn-primary-bg").trim()),
        buttonBg,
        buttonRatio: buttonBg && buttonFg ? ratio(buttonBg, buttonFg) : 0,
        successOnWhite: ratio(successText, white),
        successOnBg: ratio(successText, successBg),
      };
    });

    expect(result.tokenButtonBg, "--ig-btn-primary-bg").toEqual([38, 125, 112]);
    expect(result.buttonBg, "visible .ig-btn--primary background").toEqual([38, 125, 112]);
    expect(result.buttonRatio).toBeGreaterThanOrEqual(4.5);
    expect(result.successOnWhite).toBeGreaterThanOrEqual(4.5);
    expect(result.successOnBg).toBeGreaterThanOrEqual(4.5);
    await testInfo.attach("contrast.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });
  });
});
