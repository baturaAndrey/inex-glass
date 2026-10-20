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
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
