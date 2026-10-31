import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { getSiteSettings } from "@/lib/cms/globals";
import { getEnv } from "@/lib/env";
import { AttributionCapture } from "./attribution-capture";
import { ClickTracker } from "./click-tracker";
import { MetrikaClient } from "./metrika-client";

interface CounterConfig {
  counterId: number;
  webvisor: boolean;
}

/** Positive integer counter id from the CMS text field, or `null` (empty/invalid). */
export function parseCounterId(raw: string | null | undefined): number | null {
  const value = raw?.trim();
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Counter settings, or `null` outside production / without an id / if the CMS is down. */
async function loadCounterConfig(): Promise<CounterConfig | null> {
  // Staging and dev statistics would pollute the real counter.
  if (getEnv().SITE_ENV !== "production") return null;
  try {
    const analytics = (await getSiteSettings())?.analytics;
    const counterId = parseCounterId(analytics?.metrikaId);
    return counterId === null ? null : { counterId, webvisor: analytics?.webvisor !== false };
  } catch (error) {
    // Let Next.js control-flow errors (dynamic bailout during build, etc.) through.
    unstable_rethrow(error);
    console.error("[metrika] site-settings unavailable, analytics disabled", error);
    return null;
  }
}

/**
 * Site analytics, mounted once in `src/app/(site)/layout.tsx` (task-14) on every page.
 * Always renders attribution capture and click tracking (harmless without a counter);
 * adds the consent-gated Metrika loader only in production with a counter id in
 * `site-settings.analytics.metrikaId`.
 */
export async function Metrika() {
  const config = await loadCounterConfig();

  return (
    <>
      <Suspense fallback={null}>
        <AttributionCapture />
      </Suspense>
      <ClickTracker />
      {config ? <MetrikaClient counterId={config.counterId} webvisor={config.webvisor} /> : null}
    </>
  );
}
