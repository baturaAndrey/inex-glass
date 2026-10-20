import { getEnv } from "@/lib/env";
import type { MetadataRoute } from "next";

/** Temporary: home page only. Task 36 rewrites this file. */
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const { SITE_URL } = getEnv();

  return [
    {
      url: new URL("/", SITE_URL).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
