"use client";

import { SEO_TITLE_SOFT_LIMIT } from "@/payload/fields/seo";
import { SeoCounter } from "./seo-counter";

/** `afterInput` of `seo.title` — character counter, soft limit 70 (task 07). */
export function SeoTitleCounter({ path }: { path?: string | undefined }) {
  return <SeoCounter limit={SEO_TITLE_SOFT_LIMIT} path={path} />;
}
