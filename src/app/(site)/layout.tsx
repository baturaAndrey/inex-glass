import "./globals.css";
import { Suspense, type ReactNode } from "react";
import { Metrika } from "@/components/analytics/metrika";
import { FormDialogProvider } from "@/components/forms/form-dialog-provider";
import { CookieBanner } from "@/components/ig/cookie-banner";
import { StickyCta } from "@/components/ig/sticky-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PathTracker } from "@/components/quiz/path-tracker";
import { getEnv } from "@/lib/env";
import { rubik } from "./fonts";
import type { Metadata } from "next";

/**
 * Root layout of the public site (the admin has its own root layout in `(payload)`).
 * Title / description / robots come from each page (`buildMetadata`, task 15).
 */
export function generateMetadata(): Metadata {
  return {
    // Caveat: for statically prerendered pages this runs at build time, so the build-time
    // SITE_URL is baked into their HTML. Canonical/OG URLs are built per page from the runtime
    // SITE_URL (task 15), not from metadataBase.
    metadataBase: new URL(getEnv().SITE_URL),
    applicationName: "Inex Glass",
    formatDetection: { telephone: false },
  };
}

/**
 * Composition: skip link · header · `<main>` · footer · cookie banner · sticky CTA (phones) ·
 * form modals provider · `{modal}` slot of the quiz intercepting route (`@modal`, task 34) ·
 * `PathTracker` (last visited path → entry page of the quiz modal, task 34) · Yandex Metrika
 * (consent-gated; also captures UTM attribution on every page).
 * No sonner `<Toaster />`: the public site never calls `toast()` (forms report inline), and the
 * mounted toaster cost ~12 KB gzip of JS on every page (task 39). Mount it lazily if a site
 * feature ever needs toasts.
 * Must stay static/ISR: no `headers()` / `cookies()` here — the header picks the order-page
 * variant on the client by pathname.
 */
export default function SiteLayout({
  children,
  modal,
}: Readonly<{ children: ReactNode; modal: ReactNode }>) {
  return (
    <html lang="ru" className={rubik.variable}>
      <body className="bg-bg text-text flex min-h-screen flex-col antialiased">
        <a
          href="#main-content"
          className="bg-surface text-text shadow-dropdown sr-only z-[60] rounded-md px-4 py-3 font-medium focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Перейти к содержимому
        </a>
        <FormDialogProvider>
          <SiteHeader />
          <main id="main-content" className="flex-1 outline-none" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          <CookieBanner />
          <StickyCta />
          {modal}
          <Suspense fallback={null}>
            <PathTracker />
          </Suspense>
        </FormDialogProvider>
        <Metrika />
      </body>
    </html>
  );
}
