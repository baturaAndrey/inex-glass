import path from "node:path";
import { fileURLToPath } from "node:url";
import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Security headers shared by every response.
 *
 * Only static values belong here: `headers()` is evaluated at build time and the same
 * image runs on staging and prod, so nothing may depend on SITE_ENV or other runtime env.
 * HSTS is set by Traefik (Dokploy middleware, task 41). X-XSS-Protection is obsolete
 * and intentionally omitted.
 */
const SECURITY_HEADERS = [
  // SAMEORIGIN (not DENY): Payload live preview renders the site inside an admin iframe.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Missing slash -> 308 (Next built-in). Uppercase -> 301 is handled in src/proxy.ts.
  trailingSlash: true,
  poweredByHeader: false,
  compress: true,
  // Standalone output is enabled only by the Docker build (task 03): NEXT_OUTPUT=standalone
  // (spread, because exactOptionalPropertyTypes forbids an explicit `output: undefined`)
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // `payload` stays a plain Node module in production too (withPayload externalizes it in dev
  // only). Bundled, every Next entry (admin page, REST route, site pages) gets its own copy of
  // Payload's classes, while the Payload instance is a process-wide singleton created by
  // whichever entry runs first. Once the admin page initialized it, `formatErrors` in the REST
  // route failed `instanceof ValidationError` and dropped `name`/`data` (field paths and
  // messages) from every 400 response. One external copy keeps error classes identical.
  serverExternalPackages: ["payload"],
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      { pathname: "/api/media/file/**" },
      { pathname: "/generated/**" },
      { pathname: "/images/**" },
    ],
  },
  // From the official Payload template: lets webpack resolve ESM-style `.js` imports to TS sources.
  webpack: (webpackConfig: { resolve: { extensionAlias?: Record<string, string[]> } }) => {
    webpackConfig.resolve.extensionAlias = {
      ".cjs": [".cts", ".cjs"],
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };
    return webpackConfig;
  },
  turbopack: {
    root: path.resolve(dirname),
  },
  experimental: {
    // Two root layouts ((site), (payload)): unmatched URLs need src/app/global-not-found.tsx.
    globalNotFound: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return [
      // IndexNow key file `/<32 hex>.txt` (task 36). Paths with a file extension get no
      // trailing-slash redirect; the destination carries the slash of `trailingSlash: true`.
      {
        source: "/:key([a-f0-9]{32}).txt",
        destination: "/indexnow-key/:key/",
      },
    ];
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
