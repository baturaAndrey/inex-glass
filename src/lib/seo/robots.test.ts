import { describe, expect, it } from "vitest";
import { buildRobotsTxt, CLEAN_PARAMS, DISALLOW_RULES, QUIZ_CLEAN_PARAMS } from "./robots";

const SITE = "https://inexglass.ru";

/** Lines of one `User-agent` group (up to the next blank line). */
function groupOf(body: string, userAgent: string): string[] {
  const groups = body.split("\n\n").map((chunk) => chunk.split("\n"));
  const found = groups.find((lines) => lines[0] === `User-agent: ${userAgent}`);
  if (!found) throw new Error(`no group for ${userAgent}`);
  return found;
}

describe("buildRobotsTxt — production", () => {
  const body = buildRobotsTxt({ siteUrl: SITE, env: "production" });

  it.each(["*", "Yandex"])("group %s disallows every service path and filter", (agent) => {
    const lines = groupOf(body, agent);
    for (const rule of DISALLOW_RULES) expect(lines).toContain(`Disallow: ${rule}`);
    for (const rule of ["/admin/", "/api/", "/zakaz/", "/poisk/"]) {
      expect(lines).toContain(`Disallow: ${rule}`);
    }
    for (const param of ["product", "type", "city", "sort"]) {
      expect(lines).toContain(`Disallow: /obekty/*?${param}=`);
      expect(lines).toContain(`Disallow: /obekty/*&${param}=`);
    }
    expect(lines).toContain("Disallow: /*?filtr");
  });

  it.each(["*", "Yandex"])("group %s keeps media, Next assets and the site open", (agent) => {
    const lines = groupOf(body, agent);
    expect(lines).toContain("Allow: /api/media/file/");
    expect(lines.some((line) => line.includes("/_next"))).toBe(false);
    expect(lines).not.toContain("Disallow: /");
  });

  it("Clean-param with the full parameter list is in the Yandex group only", () => {
    const expected =
      "Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&utm_referrer" +
      "&yclid&gclid&fbclid&ysclid&roistat&_openstat&from /";
    expect(CLEAN_PARAMS).toHaveLength(13);
    expect(groupOf(body, "Yandex")).toContain(expected);
    expect(groupOf(body, "*").some((line) => line.startsWith("Clean-param"))).toBe(false);
  });

  it.each(["*", "Yandex"])("group %s leaves the quiz CTA URLs crawlable", (agent) => {
    const disallowed = groupOf(body, agent)
      .filter((line) => line.startsWith("Disallow: "))
      .map((line) => line.slice("Disallow: ".length));
    expect(disallowed.some((rule) => rule.startsWith("/raschet-stoimosti/"))).toBe(false);
    // No site-wide rule on a quiz parameter (`/*?type=` would close `?type=…&src=…` CTAs).
    for (const rule of disallowed) {
      expect(rule.startsWith("/*?type") || rule.startsWith("/*&type")).toBe(false);
    }
  });

  it("Yandex folds the quiz parameters into /raschet-stoimosti/ with Clean-param", () => {
    expect(QUIZ_CLEAN_PARAMS).toEqual(
      expect.arrayContaining(["type", "thick", "vid", "src", "resume", "w", "h", "q"])
    );
    expect(groupOf(body, "Yandex")).toContain(
      "Clean-param: type&thick&vid&src&w&h&q&t1&t2&film&resume /raschet-stoimosti/"
    );
  });

  it("names the absolute sitemap URL", () => {
    expect(body).toContain("Sitemap: https://inexglass.ru/sitemap.xml");
    expect(buildRobotsTxt({ siteUrl: `${SITE}/`, env: "production" })).toContain(
      "Sitemap: https://inexglass.ru/sitemap.xml"
    );
  });

  it("has no blank lines inside a group", () => {
    for (const agent of ["*", "Yandex"]) {
      expect(groupOf(body, agent).every((line) => line.trim() !== "")).toBe(true);
    }
    expect(body.endsWith("\n")).toBe(true);
  });
});

describe("buildRobotsTxt — staging / dev", () => {
  it.each(["staging", "development"] as const)(
    "%s closes the whole site without a sitemap",
    (env) => {
      expect(buildRobotsTxt({ siteUrl: SITE, env })).toBe("User-agent: *\nDisallow: /\n");
    }
  );
});
