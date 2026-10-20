import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getEnv } from "@/lib/env";
import { rubik } from "./fonts";
import type { Metadata } from "next";

/**
 * Root layout of the public site: Rubik, Inex Glass tokens, `<main>` landmark and toasts.
 * Header/footer/cookie/sticky CTA composition is added in task 14.
 * The admin has its own root layout in the `(payload)` route group.
 */
export function generateMetadata(): Metadata {
  return {
    // Caveat: for statically prerendered pages this runs at build time, so the build-time
    // SITE_URL (e.g. localhost) is baked into their HTML — it is NOT resolved per request.
    // Do not rely on it for canonical/OG URLs: task 15 builds absolute URLs per request
    // from the runtime SITE_URL.
    metadataBase: new URL(getEnv().SITE_URL),
    title: {
      default: "Inex Glass",
      template: "%s | Inex Glass",
    },
    // Placeholder site: keep it out of search indexes until real pages ship.
    robots: { index: false, follow: false },
  };
}

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={rubik.variable}>
      <body className="flex min-h-screen flex-col">
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
