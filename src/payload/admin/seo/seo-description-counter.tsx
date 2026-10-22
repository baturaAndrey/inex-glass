"use client";

import { SEO_DESCRIPTION_SOFT_LIMIT } from "@/payload/fields/seo";
import { SeoCounter } from "./seo-counter";

/** `afterInput` of `seo.description` — character counter, soft limit 170 (task 07). */
export function SeoDescriptionCounter({ path }: { path?: string | undefined }) {
  return <SeoCounter limit={SEO_DESCRIPTION_SOFT_LIMIT} path={path} />;
}
