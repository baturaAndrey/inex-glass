import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { canonicalPathname, config, isScannerPath } from "./proxy";

describe("canonicalPathname", () => {
  it("returns null for an already lowercase path", () => {
    expect(canonicalPathname("/")).toBeNull();
    expect(canonicalPathname("/vidy-stekla/triplex/")).toBeNull();
  });

  it("lowercases ordinary paths", () => {
    expect(canonicalPathname("/Vidy-Stekla/TRIPLEX/")).toBe("/vidy-stekla/triplex/");
  });

  it("lowercases percent-encoded Cyrillic by its decoded form", () => {
    expect(canonicalPathname("/%D0%A1%D1%82%D0%B5%D0%BA%D0%BB%D0%BE/")).toBe("/стекло/");
  });

  it("does not loop on uppercase hex digits of an already lowercase path", () => {
    expect(canonicalPathname("/%D1%81%D1%82%D0%B5%D0%BA%D0%BB%D0%BE/")).toBeNull();
  });

  it("returns null for malformed percent-encoding", () => {
    expect(canonicalPathname("/%E0%A4%A/")).toBeNull();
  });

  it("keeps the case of an order token", () => {
    expect(canonicalPathname("/zakaz/AbC-dE_9xYz/")).toBeNull();
  });

  it.each([
    ["/ZAKAZ/AbC-dE_9xYz/", "/zakaz/AbC-dE_9xYz/"],
    ["/Zakaz/AbC-dE_9xYz/", "/zakaz/AbC-dE_9xYz/"],
    ["/ZaKaZ/abc/", "/zakaz/abc/"],
  ])("lowercases only the prefix of %j", (input, expected) => {
    expect(canonicalPathname(input)).toBe(expected);
  });

  it("lowercases a bare /ZAKAZ/ without a token", () => {
    expect(canonicalPathname("/ZAKAZ/")).toBe("/zakaz/");
  });

  it("treats /ZAKAZ without the slash as an ordinary path", () => {
    expect(canonicalPathname("/ZAKAZ")).toBe("/zakaz");
  });

  it("does not treat a longer segment as the order prefix", () => {
    expect(canonicalPathname("/ZAKAZY/AbC/")).toBe("/zakazy/abc/");
  });
});

const SCANNER_PROBES = [
  "/wp-login.php",
  "/xmlrpc.php",
  "/blog/wp-admin/setup-config.php",
  "/wp-admin/",
  "/wp-content/plugins/x/readme.txt",
  "/wp-includes/js/jquery.js",
  "/phpmyadmin/",
  "/cgi-bin/luci",
  "/.env",
  "/.env.local",
  "/api.env",
  "/.git/config",
  "/.git/HEAD",
  "/backup.sql",
  "/db.sql.gz",
  "/config.ini",
  "/index.aspx",
  "/login.jsp",
  "/%2Ewp-login%2Ephp",
] as const;

/** The same probes in upper/mixed case: matcher and check must both be case-insensitive. */
const UPPERCASE_SCANNER_PROBES = [
  "/WP-LOGIN.PHP",
  "/XmlRpc.Php",
  "/Index.PHP5",
  "/WP-Admin/",
  "/WP-CONTENT/plugins/x/readme.txt",
  "/Blog/WP-Includes/js/jquery.js",
  "/PhpMyAdmin/index.php",
  "/CGI-BIN/luci",
  "/.ENV",
  "/.Env.Local",
  "/.GIT/config",
  "/Backup.SQL",
  "/Config.INI",
  "/Index.ASPX",
  "/.HTACCESS",
  "/.HtPasswd",
] as const;

/** Real URLs (and static files) of the site that must never be blocked. */
const SITE_PATHS = [
  "/",
  "/zakalennoe-steklo/10-mm/",
  "/kontakty/",
  "/blog/markirovka-zakalennogo-stekla/",
  "/zakaz/AbC-dE_9xYz/",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/0123456789abcdef0123456789abcdef.txt",
  "/generated/a-markirovka.webp",
  "/fonts/x.woff2",
  "/.well-known/acme-challenge/abc.php",
  "/environment/",
  "/x.environment",
] as const;

describe("isScannerPath", () => {
  it.each(SCANNER_PROBES)("blocks %j", (path) => {
    expect(isScannerPath(path)).toBe(true);
  });

  it.each(UPPERCASE_SCANNER_PROBES)("blocks the mixed-case probe %j", (path) => {
    expect(isScannerPath(path)).toBe(true);
  });

  it.each(SITE_PATHS)("allows %j", (path) => {
    expect(isScannerPath(path)).toBe(false);
  });
});

describe("config.matcher", () => {
  const matches = (path: string) =>
    unstable_doesMiddlewareMatch({ config, url: `https://inexglass.ru${path}` });

  it.each([...SCANNER_PROBES, ...UPPERCASE_SCANNER_PROBES])(
    "routes the scanner probe %j to the proxy",
    (path) => {
      expect(matches(path)).toBe(true);
    }
  );

  it.each([
    "/robots.txt",
    "/sitemap.xml",
    "/favicon.ico",
    "/Favicon.ICO",
    "/0123456789abcdef0123456789abcdef.txt",
    "/fonts/Geist.WOFF2",
    "/generated/a-markirovka.webp",
    "/_next/static/chunks/main.js",
    "/admin/",
    "/admin/login.php",
    "/api/health/",
    "/api/x.env",
  ])("keeps %j away from the proxy", (path) => {
    expect(matches(path)).toBe(false);
  });

  it("still routes ordinary pages to the proxy", () => {
    expect(matches("/kontakty/")).toBe(true);
    expect(matches("/Kontakty/")).toBe(true);
  });
});
