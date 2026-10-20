import { getEnv } from "@/lib/env";
import type { MetadataRoute } from "next";

/** Temporary: task 36 replaces this with `src/app/robots.txt/route.ts`. */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const { SITE_URL } = getEnv();

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
