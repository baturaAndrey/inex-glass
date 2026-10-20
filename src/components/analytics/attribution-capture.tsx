"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttribution } from "./attribution";

/**
 * Captures UTM tags and the entry page on the first load and on every client navigation
 * (an internal link may carry new `utm_*`). Renders nothing; must sit inside `<Suspense>`
 * because of `useSearchParams`. Independent of the cookie choice (see `attribution.ts`).
 */
export function AttributionCapture() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    captureAttribution();
  }, [pathname, search]);

  return null;
}
