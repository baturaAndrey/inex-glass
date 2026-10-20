import { expect, test } from "@playwright/test";
import { VIEWPORTS } from "./helpers/viewports";

/**
 * The 404 page is SERVER-rendered (task 15): fetched without JavaScript (`request.get`, raw
 * HTML) an unknown URL inside the site answers HTTP 404 with the site layout, the H1
 * «Страница не найдена», the search form, the 9 section links and `noindex` — not Next's empty
 * `<html id="__next_error__">` shell (see `src/components/page/not-found-response.tsx`).
 *
 * `next dev` renders every request dynamically, and Next does not update the status of a
 * dynamic render for a `notFound()` inside Suspense (it stays 200; the body is the same). The
 * status is therefore asserted only against a production server (`next start`), which is how
 * the e2e suite and staging run. Viewport-independent: one project only.
 */

const NOT_FOUND_URLS = ["/net-takoj-stranicy/", "/zakalennoe-steklo/nope/"] as const;

const NOT_FOUND_TITLE = "Страница не найдена";
const SECTION_LINKS = 9;

/** Dev pages ship the Next dev tools bundle; production pages never do. */
function isDevServerHtml(html: string): boolean {
  return html.includes("next-devtools");
}

test.describe("404 is rendered on the server", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== VIEWPORTS.laptop.name,
      "Raw HTTP check does not depend on the viewport"
    );
  });

  for (const url of NOT_FOUND_URLS) {
    test(`${url} → 404 with the 404 body in the raw HTML`, async ({ request }) => {
      // Twice: the first render and the ISR-cached answer must both be complete 404s.
      for (let attempt = 0; attempt < 2; attempt++) {
        const response = await request.get(url, { maxRedirects: 0 });
        const html = await response.text();

        if (!isDevServerHtml(html)) expect(response.status()).toBe(404);
        expect(response.headers()["content-type"]).toContain("text/html");

        // Not Next's empty error shell: the site document with header and footer.
        expect(html).not.toContain('id="__next_error__"');
        expect(html).toMatch(/<html[^>]*\blang="ru"/);
        expect(html).toMatch(/<header[\s>]/);
        expect(html).toMatch(/<footer[\s>]/);

        // H1, search form and section links are in the server HTML of <main>, before any JS
        // runs (the header has its own search form, hence the scoping).
        const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? "";
        expect(main).toMatch(new RegExp(`<h1[^>]*>${NOT_FOUND_TITLE}</h1>`));
        const form = /<form[^>]*>/.exec(main)?.[0] ?? "";
        expect(form).toContain('role="search"');
        expect(form).toContain('action="/poisk/"');
        expect(main).toMatch(/<input[^>]*name="q"/);
        const nav = /<nav[^>]*aria-label="Разделы сайта"[^>]*>([\s\S]*?)<\/nav>/.exec(main);
        expect(nav, "section links nav").not.toBeNull();
        expect(nav?.[1]?.match(/<a\s/g)).toHaveLength(SECTION_LINKS);

        expect(html).toMatch(/<meta name="robots" content="noindex/);
        expect(html).toContain(`<title>${NOT_FOUND_TITLE}`);
      }
    });
  }
});
